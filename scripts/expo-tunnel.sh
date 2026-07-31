#!/usr/bin/env bash
# expo-tunnel.sh <port> [--authtoken-var VARNAME] [--config-home DIR] [--start-delay N]
#
# Uses bin/ngrok (v3) directly with CLI flags — no config file needed.
#
# How it works:
#  1. Starts bin/ngrok http <port> --authtoken <token> --web-addr <port> --log-format json
#  2. Parses JSON log stream for the "started tunnel" URL
#  3. Exports EXPO_TUNNEL_URL — the patched @expo/ngrok returns this immediately
#     instead of spawning the old v2 binary
#  4. Launches Expo in LAN mode with the ngrok hostname
#  5. Keeps ngrok alive in the background; cleans up on exit
set -e

# ── Bundle pre-warmer ─────────────────────────────────────────────────────────
# Runs in the background after Metro starts. Compiles and caches the Android
# and iOS JS bundles so the first Expo Go scan loads in seconds, not 30-60s.
prewarm_bundles() {
  local port=$1
  echo "[prewarm] Waiting for Metro on port $port…"
  for i in $(seq 1 90); do
    if curl -s --max-time 2 "http://localhost:$port/status" 2>/dev/null | grep -q "running"; then
      break
    fi
    sleep 2
  done

  # Derive the bundle path from the Metro manifest
  local MANIFEST BUNDLE_PATH
  MANIFEST=$(curl -s --max-time 10 "http://localhost:$port" \
    -H "Expo-Platform: android" 2>/dev/null)
  BUNDLE_PATH=$(echo "$MANIFEST" | node -e "
let d=''; process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const url = JSON.parse(d).launchAsset?.url || '';
    process.stdout.write(url.replace(/https?:\/\/[^/]*/,''));
  } catch {}
})" 2>/dev/null)

  if [[ -z "$BUNDLE_PATH" ]]; then
    echo "[prewarm] Could not get bundle path — skipping"
    return
  fi

  local IOS_PATH="${BUNDLE_PATH/platform=android/platform=ios}"
  echo "[prewarm] Warming Android bundle (background)…"
  curl -s --max-time 180 -o /dev/null "http://localhost:$port${BUNDLE_PATH}" \
    && echo "[prewarm] Android bundle ready ✓" &
  echo "[prewarm] Warming iOS bundle (background)…"
  curl -s --max-time 180 -o /dev/null "http://localhost:$port${IOS_PATH}" \
    && echo "[prewarm] iOS bundle ready ✓" &
  wait
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGROK_V3="$WORKSPACE_ROOT/bin/ngrok"

PORT=${1:-8081}
shift || true

AUTHTOKEN_VAR="NGROK_AUTHTOKEN"
CONFIG_HOME=""
START_DELAY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --authtoken-var)  AUTHTOKEN_VAR="$2"; shift 2 ;;
    --config-home)    CONFIG_HOME="$2";   shift 2 ;;
    --app-home)       CONFIG_HOME="$2";   shift 2 ;;
    --start-delay)    START_DELAY="$2";   shift 2 ;;
    *) break ;;
  esac
done

# Native Expo builds need an absolute API origin. When using ngrok for the
# Metro tunnel, the API remains available through the project's public dev
# domain; pass it into Metro so Expo Go does not try to fetch a relative URL.
if [[ -z "$EXPO_PUBLIC_API_URL" && -n "$REPLIT_DEV_DOMAIN" ]]; then
  export EXPO_PUBLIC_API_URL="https://$REPLIT_DEV_DOMAIN"
fi

# Optional startup delay (stagger Partner App behind Customer App)
if [[ "$START_DELAY" -gt 0 ]]; then
  echo "Waiting ${START_DELAY}s before starting tunnel (stagger)…"
  sleep "$START_DELAY"
fi

# ── Replit-native mode: use Expo's --tunnel for correct HTTPS bundle URLs ─────
# MUST run before the ngrok token/binary checks below.
#
# Root cause why --host lan fails on Replit: Metro generates bundle URLs as
#   http://hostname:PORT/...bundle
# but Replit's proxy only accepts TLS connections — plain HTTP returns 400.
# Expo Go downloads the manifest fine (via TLS WebSocket) but fails on the
# bundle fetch ("failed to download").
#
# Fix: use `expo start --tunnel` which creates an exp.direct HTTPS tunnel.
# Bundle URLs become https://xxxx.exp.direct/...bundle — no port, TLS-only.
# The tunnel URL is parsed from Metro stdout and used to regenerate QR PNG.
if [[ -n "$REPLIT_EXPO_DEV_DOMAIN" ]]; then
  echo "=== Replit: using expo --tunnel (HTTPS bundle URLs required) ==="

  if [[ -z "$EXPO_PUBLIC_API_URL" && -n "$REPLIT_DEV_DOMAIN" ]]; then
    export EXPO_PUBLIC_API_URL="https://$REPLIT_DEV_DOMAIN"
  fi
  echo "API URL: $EXPO_PUBLIC_API_URL"

  QR_DIR="$WORKSPACE_ROOT/tmp-qr"
  if [[ "$PORT" -eq 8099 ]]; then
    QR_PNG="$QR_DIR/partner-qr.png"
    QR_KEY="partner"
  else
    QR_PNG="$QR_DIR/customer-qr.png"
    QR_KEY="customer"
  fi

  export EXPO_NO_INTERACTIVE=1
  unset EXPO_TOKEN

  # Helper: parse the exp[s]:// tunnel URL from a line of Metro output and
  # regenerate QR PNG + scanner.html.  Called once per successful tunnel start.
  regenerate_qr() {
    local url="$1"
    node -e "
const QRCode = require('qrcode');
const fs = require('fs');
const qrPng = '$QR_PNG';
const expoUrl = '$url';
const qrKey = '$QR_KEY';
const htmlPath = '${QR_DIR}/scanner.html';

// Always write the full scanner page so both QR codes are fresh and
// the HTML structure is guaranteed to match the update regex.
const writeFullPage = (custUrl, partUrl) => {
  return QRCode.toDataURL(custUrl, { width: 320, margin: 2 }).then(cd =>
    QRCode.toDataURL(partUrl, { width: 320, margin: 2 }).then(pd => {
      const now = new Date().toISOString();
      const html = \`<!DOCTYPE html>
<html><head><meta charset=\"utf-8\"><title>ServeNow QR Codes</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;}
.wrap{display:flex;gap:28px;flex-wrap:wrap;justify-content:center;padding:28px;}
.card{background:#fff;border-radius:20px;padding:28px 24px 20px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.10);width:310px;}
.badge.customer{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:99px;font-size:11px;font-weight:700;margin-bottom:14px;letter-spacing:.6px;text-transform:uppercase;background:#ebf5ff;color:#0066cc;}
.badge.partner{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:99px;font-size:11px;font-weight:700;margin-bottom:14px;letter-spacing:.6px;text-transform:uppercase;background:#fff3eb;color:#cc4400;}
h2{font-size:20px;font-weight:700;color:#111;margin-bottom:4px;}
.sub{font-size:12px;color:#999;margin-bottom:18px;}
img{border-radius:10px;border:1.5px solid #eee;}
.url{margin-top:14px;font-size:10px;color:#bbb;word-break:break-all;font-family:monospace;}
.ts{margin-top:6px;font-size:9px;color:#ddd;}
</style></head>
<body><div class=\"wrap\">
<div class=\"card\">
  <div class=\"badge customer\">📱 Customer App</div>
  <h2>Customer</h2><p class=\"sub\">Open Expo Go → scan to launch</p>
  <img src=\"\${cd}\" width=\"262\" height=\"262\"/>
  <div class=\"url\">\${custUrl}</div>
  <div class=\"ts\">Generated \${now}</div>
</div>
<div class=\"card\">
  <div class=\"badge partner\">🔧 Partner App</div>
  <h2>Partner</h2><p class=\"sub\">Open Expo Go → scan to launch</p>
  <img src=\"\${pd}\" width=\"262\" height=\"262\"/>
  <div class=\"url\">\${partUrl}</div>
  <div class=\"ts\">Generated \${now}</div>
</div>
</div></body></html>\`;
      fs.writeFileSync(htmlPath, html);
      console.log('[qr] scanner.html fully rewritten (' + custUrl + ' / ' + partUrl + ')');
    })
  );
};

QRCode.toFile(qrPng, expoUrl, { width: 400, margin: 2 }, err => {
  if (err) { console.error('[qr] Failed:', err.message); return; }
  console.log('[qr] QR PNG written for ' + expoUrl);

  // Read the sibling QR URL from the other app's PNG data-url or fall back to a placeholder.
  let existingHtml = '';
  try { existingHtml = fs.readFileSync(htmlPath, 'utf8'); } catch {}

  // Extract the OTHER key's URL from the existing page.
  const otherKey = qrKey === 'customer' ? 'partner' : 'customer';
  const otherMatch = existingHtml.match(new RegExp('<div class=\"badge ' + otherKey + '\">.*?<div class=\"url\">([^<]*)</div>', 's'));
  const otherUrl = (otherMatch && otherMatch[1].trim()) || (qrKey === 'customer' ? 'exp://partner-pending' : 'exp://customer-pending');

  const custUrl = qrKey === 'customer' ? expoUrl : otherUrl;
  const partUrl = qrKey === 'partner'  ? expoUrl : otherUrl;
  writeFullPage(custUrl, partUrl).catch(e => console.warn('[qr] full page write failed:', e.message));
});
" 2>/dev/null || true
  }

  NATIVE_MAX_RETRIES=5
  NATIVE_RETRY_DELAY=15

  for attempt in $(seq 1 $NATIVE_MAX_RETRIES); do
    echo "Starting Expo --tunnel on port $PORT… (attempt $attempt/$NATIVE_MAX_RETRIES)"

    # Kill any stale Metro/Node process occupying this port before we start,
    # otherwise Expo asks "Use port X+1 instead?" in non-interactive mode and exits.
    _STALE=$(lsof -ti :"$PORT" 2>/dev/null || true)
    if [[ -n "$_STALE" ]]; then
      echo "[cleanup] Killing stale process(es) on port $PORT: $_STALE"
      kill -9 $_STALE 2>/dev/null || true
      sleep 1
    fi

    prewarm_bundles "$PORT" &
    PREWARM_PID=$!

    _FIFO="$(mktemp -u -p /tmp expo_stdin_XXXXXX)"
    mkfifo "$_FIFO"
    exec 9<>"$_FIFO"

    QR_DONE=0
    set +e
    # Pipe output through awk to intercept the tunnel URL on first appearance.
    pnpm exec expo start --tunnel --port "$PORT" "$@" < "$_FIFO" 2>&1 | \
    while IFS= read -r line; do
      echo "$line"
      if [[ $QR_DONE -eq 0 ]]; then
        # Metro prints: "Metro waiting on exp[s]://xxxx"  OR  "› Metro waiting on ..."
        TUNNEL_URL=$(echo "$line" | grep -oE 'exp[s]?://[^ ]+' | head -1)
        if [[ -n "$TUNNEL_URL" ]]; then
          echo "[tunnel] URL: $TUNNEL_URL"
          regenerate_qr "$TUNNEL_URL"
          QR_DONE=1
        fi
      fi
    done
    EXPO_EXIT=${PIPESTATUS[0]}
    set -e

    exec 9>&-
    rm -f "$_FIFO"
    kill "$PREWARM_PID" 2>/dev/null || true

    if [[ $EXPO_EXIT -eq 0 ]]; then
      exit 0
    fi
    if [[ $attempt -lt $NATIVE_MAX_RETRIES ]]; then
      echo "Expo exited (code $EXPO_EXIT). Retrying in ${NATIVE_RETRY_DELAY}s…"
      sleep "$NATIVE_RETRY_DELAY"
    fi
  done
  echo "All $NATIVE_MAX_RETRIES tunnel attempts failed."
  exit 1
fi

# ── ngrok fallback (outside Replit) ──────────────────────────────────────────
AUTHTOKEN="${!AUTHTOKEN_VAR}"
if [[ -z "$AUTHTOKEN" ]]; then
  echo "ERROR: $AUTHTOKEN_VAR is not set. Add it to Replit Secrets."
  exit 1
fi

if [[ ! -x "$NGROK_V3" ]]; then
  echo "ERROR: bin/ngrok not found or not executable at $NGROK_V3"
  exit 1
fi

# Per-app log directory
if [[ -z "$CONFIG_HOME" ]]; then
  CONFIG_HOME="/tmp/ngrok-${PORT}"
fi
mkdir -p "$CONFIG_HOME"

NGROK_CONFIG="$CONFIG_HOME/ngrok-v3.yml"
NGROK_LOG="$CONFIG_HOME/ngrok-v3.log"

# Use distinct web UI ports per tunnel to avoid conflicts.
if [[ "$PORT" -eq 8080 ]]; then
  WEB_PORT=4041
elif [[ "$PORT" -eq 8099 ]]; then
  WEB_PORT=4042
else
  WEB_PORT=4043
fi

# Write ngrok v3 config — authtoken and web_addr live under the "agent:" key
write_config() {
  cat > "$NGROK_CONFIG" <<NGROK_EOF
version: "3"
agent:
  authtoken: ${AUTHTOKEN}
  web_addr: "127.0.0.1:${WEB_PORT}"
NGROK_EOF
  echo "Wrote ngrok v3 config → $NGROK_CONFIG (web_addr 127.0.0.1:$WEB_PORT)"
}

# ── Cleanup handler ──────────────────────────────────────────────────────────
NGROK_PID=""
cleanup() {
  if [[ -n "$NGROK_PID" ]]; then
    echo "Stopping ngrok v3 (pid $NGROK_PID)…"
    kill "$NGROK_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# ── Start ngrok v3 and wait for tunnel URL ───────────────────────────────────
start_ngrok() {
  write_config
  : > "$NGROK_LOG"
  NGROK_PID=""

  echo "Starting ngrok v3 tunnel for port $PORT (web-addr 127.0.0.1:$WEB_PORT)…"

  "$NGROK_V3" http "$PORT" \
    --config "$NGROK_CONFIG" \
    --log-format json \
    --log "$NGROK_LOG" \
    --pooling-enabled \
    --request-header-add "ngrok-skip-browser-warning:true" &
  NGROK_PID=$!

  echo "ngrok v3 pid: $NGROK_PID — waiting for tunnel URL…"

  local TUNNEL_URL=""
  for i in $(seq 1 120); do
    if ! kill -0 "$NGROK_PID" 2>/dev/null; then
      echo "ngrok v3 exited early. Log tail:"
      tail -10 "$NGROK_LOG" 2>/dev/null || true
      return 1
    fi

    # Primary: query the ngrok web API (instant once the agent is up)
    TUNNEL_URL=$(curl -s --max-time 2 "http://127.0.0.1:${WEB_PORT}/api/tunnels" 2>/dev/null \
      | node -e "
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const tunnel = (data.tunnels || []).find(t => (t.public_url || '').startsWith('https://'));
    if (tunnel) process.stdout.write(tunnel.public_url);
  } catch {}
});
" 2>/dev/null)

    # Fallback: parse the JSON log file
    if [[ -z "$TUNNEL_URL" && -s "$NGROK_LOG" ]]; then
      TUNNEL_URL=$(node - "$NGROK_LOG" <<'NODE' 2>/dev/null
const fs = require('fs');
try {
  for (const line of fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)) {
    try {
      const data = JSON.parse(line);
      const url = data.msg === 'started tunnel' ? data.url : data.url;
      if (typeof url === 'string' && url.startsWith('https://')) {
        process.stdout.write(url);
        break;
      }
    } catch {}
  }
} catch {}
NODE
)
    fi

    if [[ -n "$TUNNEL_URL" ]]; then
      echo "Tunnel ready: $TUNNEL_URL"
      NGROK_HOST="${TUNNEL_URL#https://}"
      # The ngrok public HTTPS URL is exposed on 443, so tell Expo CLI to use
      # the public proxy
      # URL for both the QR and the manifest bundle URLs. Do not include the
      # internal Metro port here; ngrok terminates HTTPS on its public host.
      export EXPO_PACKAGER_PROXY_URL="https://${NGROK_HOST}"
      # ngrok terminates HTTP on port 80 with a 307 redirect to HTTPS.
      # Expo Go does NOT follow that redirect — it just fails with
      # "failed to download remote update". Using exps:// makes Expo Go
      # connect directly to HTTPS:443, bypassing the redirect entirely.
      EXPO_GO_URL="exps://${NGROK_HOST}"
      echo "$EXPO_GO_URL" > "/tmp/expo-tunnel-${PORT}.url"
      export REACT_NATIVE_PACKAGER_HOSTNAME="$NGROK_HOST"

      # Regenerate QR PNG and patch scanner.html with the exps:// URL
      QR_DIR="$WORKSPACE_ROOT/tmp-qr"
      if [[ "$PORT" -eq 8099 ]]; then
        QR_PNG="$QR_DIR/partner-qr.png"; QR_KEY="partner"
      else
        QR_PNG="$QR_DIR/customer-qr.png"; QR_KEY="customer"
      fi
      node -e "
const QRCode = require('qrcode');
const fs = require('fs');
const qrPng = '$QR_PNG';
const expoUrl = '$EXPO_GO_URL';
const qrKey = '$QR_KEY';
const htmlPath = '${QR_DIR}/scanner.html';
QRCode.toFile(qrPng, expoUrl, { width: 400, margin: 2 }, err => {
  if (err) { console.error('[qr] Failed:', err.message); return; }
  console.log('[qr] Written ' + qrPng + ' for ' + expoUrl);
  try {
    let html = fs.readFileSync(htmlPath, 'utf8');
    const re = new RegExp('(<div class=\"badge ' + qrKey + '\">.*?<div class=\"url\">)[^<]*(</div>)', 's');
    html = html.replace(re, (_, b, a) => b + expoUrl + a);
    fs.writeFileSync(htmlPath, html);
    console.log('[qr] Patched scanner.html for ' + qrKey);
  } catch(e) { console.warn('[qr] Could not patch scanner.html:', e.message); }
});
" 2>/dev/null || echo "[qr] qrcode module unavailable"

      return 0
    fi

    sleep 1
  done

  echo "Timed out waiting for ngrok v3 tunnel URL. Log tail:"
  tail -15 "$NGROK_LOG" 2>/dev/null || true
  kill "$NGROK_PID" 2>/dev/null || true
  NGROK_PID=""
  return 1
}

# ── Main retry loop ──────────────────────────────────────────────────────────
MAX_RETRIES=5
RETRY_DELAY=60

for attempt in $(seq 1 $MAX_RETRIES); do
  echo "=== Tunnel attempt $attempt/$MAX_RETRIES ==="

  if start_ngrok; then
    echo "Launching Expo --host lan through ngrok: $REACT_NATIVE_PACKAGER_HOSTNAME"
    if [[ "$PORT" -eq 8099 ]]; then
      APP_DIR="$WORKSPACE_ROOT/apps/mobile-partner"
    else
      APP_DIR="$WORKSPACE_ROOT/apps/mobile"
    fi
    cd "$APP_DIR"
    prewarm_bundles "$PORT" &
    set +e
    yes | pnpm exec expo start --host lan --port "$PORT" "$@"
    EXPO_EXIT=$?
    set -e

    echo "Expo exited (code $EXPO_EXIT). Checking ngrok…"
    if kill -0 "$NGROK_PID" 2>/dev/null; then
      echo "ngrok still alive — restarting Expo only…"
      prewarm_bundles "$PORT" &
      set +e
      yes | pnpm exec expo start --host lan --port "$PORT" "$@"
      EXPO_EXIT=$?
      set -e
    fi
  fi

  if [[ $attempt -lt $MAX_RETRIES ]]; then
    echo "Retrying in ${RETRY_DELAY}s…"
    [[ -n "$NGROK_PID" ]] && kill "$NGROK_PID" 2>/dev/null || true
    NGROK_PID=""
    sleep "$RETRY_DELAY"
  fi
done

echo "All $MAX_RETRIES attempts failed."
exit 1
