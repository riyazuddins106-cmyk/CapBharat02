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
#  4. Launches expo start --tunnel (which uses the pre-set URL)
#  5. Keeps ngrok alive in the background; cleans up on exit
set -e

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

# Optional startup delay (stagger Partner App behind Customer App)
if [[ "$START_DELAY" -gt 0 ]]; then
  echo "Waiting ${START_DELAY}s before starting tunnel (stagger)…"
  sleep "$START_DELAY"
fi

# ── Replit-native mode (skip ngrok entirely) ─────────────────────────────────
# MUST run before the ngrok token/binary checks below.
#
# Expo SDK 53+ uses Expo's own tunnel relay (exp.direct) — NOT ngrok — when
# `expo start --tunnel` is invoked. ngrok is only a legacy fallback. On Replit
# we simply skip the ngrok validation and let Expo use its own service.
if [[ -n "$REPLIT_EXPO_DEV_DOMAIN" ]]; then
  echo "=== Replit: skipping ngrok, using Expo tunnel service (exp.direct) ==="
  echo "Starting Expo on port $PORT…"

  # Retry loop — exp.direct can transiently reject connections, especially
  # when both apps start near-simultaneously. Retry up to 5 times.
  REPLIT_MAX_RETRIES=5
  REPLIT_RETRY_DELAY=15
  for attempt in $(seq 1 $REPLIT_MAX_RETRIES); do
    echo "=== Tunnel attempt $attempt/$REPLIT_MAX_RETRIES ==="
    yes | pnpm expo start --tunnel --port "$PORT" "$@"
    EXIT_CODE=$?
    if [[ $EXIT_CODE -eq 0 ]]; then
      exit 0
    fi
    if [[ $attempt -lt $REPLIT_MAX_RETRIES ]]; then
      echo "Tunnel exited (code $EXIT_CODE). Retrying in ${REPLIT_RETRY_DELAY}s…"
      sleep "$REPLIT_RETRY_DELAY"
    fi
  done
  echo "All $REPLIT_MAX_RETRIES tunnel attempts failed."
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

# Use distinct web UI ports per tunnel to avoid conflicts
# Port 8081 → 4041 | Port 8082 → 4042 | fallback 4043
WEB_PORT=$(( 4040 + PORT - 8080 ))
if [[ $WEB_PORT -le 4040 || $WEB_PORT -ge 4050 ]]; then
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
    --pooling-enabled &
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
      | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  for t in d.get('tunnels',[]):
    u=t.get('public_url','')
    if u.startswith('https://'):
      print(u)
      sys.exit(0)
except:
  pass
" 2>/dev/null)

    # Fallback: parse the JSON log file
    if [[ -z "$TUNNEL_URL" && -s "$NGROK_LOG" ]]; then
      TUNNEL_URL=$(python3 - "$NGROK_LOG" <<'PY' 2>/dev/null
import json, sys
try:
  with open(sys.argv[1]) as f:
    for line in f:
      try:
        d = json.loads(line)
        if d.get('msg') == 'started tunnel' and 'url' in d:
          print(d['url'])
          sys.exit(0)
        if d.get('lvl') in ('info','INFO') and 'url' in d:
          u = d['url']
          if u.startswith('https://'):
            print(u)
            sys.exit(0)
      except Exception:
        pass
except Exception:
  pass
PY
)
    fi

    if [[ -n "$TUNNEL_URL" ]]; then
      echo "Tunnel ready: $TUNNEL_URL"
      export EXPO_TUNNEL_URL="$TUNNEL_URL"
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
    echo "Launching Expo --tunnel with pre-set URL: $EXPO_TUNNEL_URL"
    yes | pnpm expo start --tunnel --port "$PORT" "$@"
    EXPO_EXIT=$?

    echo "Expo exited (code $EXPO_EXIT). Checking ngrok…"
    if kill -0 "$NGROK_PID" 2>/dev/null; then
      echo "ngrok still alive — restarting Expo only…"
      yes | pnpm expo start --tunnel --port "$PORT" "$@" || true
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
