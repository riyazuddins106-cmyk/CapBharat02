#!/usr/bin/env bash
# expo-tunnel.sh <port> [--authtoken-var VARNAME] [--config-home DIR] [--start-delay N]
#
# Uses bin/ngrok (v3) to create the HTTP tunnel — completely bypasses @expo/ngrok
# (v2) which shares ~/.ngrok2/ngrok.yml and can only run one session at a time.
#
# How it works:
#  1. Writes a per-app ngrok v3 config (separate web_addr to avoid port 4040 clash)
#  2. Starts bin/ngrok in the background, logging JSON to a per-app log file
#  3. Parses the log for the "started tunnel" URL
#  4. Sets EXPO_TUNNEL_URL — the patched @expo/ngrok/index.js returns this immediately
#     instead of spawning the v2 binary, so expo start --tunnel uses our URL
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

AUTHTOKEN="${!AUTHTOKEN_VAR}"
if [[ -z "$AUTHTOKEN" ]]; then
  echo "ERROR: $AUTHTOKEN_VAR is not set. Add it to Replit Secrets."
  exit 1
fi

if [[ ! -x "$NGROK_V3" ]]; then
  echo "ERROR: bin/ngrok not found or not executable at $NGROK_V3"
  exit 1
fi

# Per-app config directory.
if [[ -z "$CONFIG_HOME" ]]; then
  CONFIG_HOME="/tmp/ngrok-${PORT}"
fi
mkdir -p "$CONFIG_HOME"

NGROK_CONFIG="$CONFIG_HOME/ngrok-v3.yml"
NGROK_LOG="$CONFIG_HOME/ngrok-v3.log"

# Use different local web UI ports so two simultaneous ngrok v3 processes
# don't fight over 127.0.0.1:4040.
# Port 8081 → web_addr 4041 | Port 8082 → web_addr 4042 | fallback 4043
WEB_PORT=$(( 4040 + PORT - 8080 ))
if [[ $WEB_PORT -le 4040 || $WEB_PORT -ge 4050 ]]; then
  WEB_PORT=4043
fi

write_config() {
  cat > "$NGROK_CONFIG" <<NGROK_EOF
version: "3"
authtoken: ${AUTHTOKEN}
web_addr: "127.0.0.1:${WEB_PORT}"
NGROK_EOF
  echo "Wrote ngrok v3 config → $NGROK_CONFIG (web_addr 127.0.0.1:$WEB_PORT)"
}

# Optional startup delay (stagger Partner App behind Customer App).
if [[ "$START_DELAY" -gt 0 ]]; then
  echo "Waiting ${START_DELAY}s before starting tunnel (stagger)…"
  sleep "$START_DELAY"
fi

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
  : > "$NGROK_LOG"   # truncate log

  echo "Starting ngrok v3 tunnel for port $PORT…"
  "$NGROK_V3" http "$PORT" \
    --config "$NGROK_CONFIG" \
    --log-format json \
    --log "$NGROK_LOG" &
  NGROK_PID=$!

  echo "ngrok v3 pid: $NGROK_PID — waiting for tunnel URL…"

  # Parse JSON log lines until we find "started tunnel" or ngrok exits.
  local TUNNEL_URL=""
  for i in $(seq 1 60); do
    # Check if ngrok exited unexpectedly.
    if ! kill -0 "$NGROK_PID" 2>/dev/null; then
      echo "ngrok v3 exited early. Log tail:"
      tail -5 "$NGROK_LOG" 2>/dev/null || true
      return 1
    fi

    if [[ -s "$NGROK_LOG" ]]; then
      TUNNEL_URL=$(python3 - "$NGROK_LOG" <<'PY' 2>/dev/null
import json, sys
try:
  with open(sys.argv[1]) as f:
    for line in f:
      try:
        d = json.loads(line)
        if d.get('msg') == 'started tunnel' and 'url' in d:
          print(d['url'])
          break
        # v3 sometimes uses different field names
        if 'url' in d and d.get('lvl') in ('info', 'INFO'):
          u = d['url']
          if u.startswith('http'):
            print(u)
            break
      except Exception:
        pass
except Exception:
  pass
PY
)
      if [[ -n "$TUNNEL_URL" ]]; then
        echo "Tunnel ready: $TUNNEL_URL"
        export EXPO_TUNNEL_URL="$TUNNEL_URL"
        return 0
      fi
    fi
    sleep 1
  done

  echo "Timed out waiting for ngrok v3 tunnel URL. Log tail:"
  tail -10 "$NGROK_LOG" 2>/dev/null || true
  kill "$NGROK_PID" 2>/dev/null || true
  NGROK_PID=""
  return 1
}

# ── Main retry loop ──────────────────────────────────────────────────────────
MAX_RETRIES=3
RETRY_DELAY=20

for attempt in $(seq 1 $MAX_RETRIES); do
  echo "=== Tunnel attempt $attempt/$MAX_RETRIES ==="

  if start_ngrok; then
    echo "Starting Expo with tunnel URL: $EXPO_TUNNEL_URL"
    # expo start --tunnel uses the patched @expo/ngrok which returns EXPO_TUNNEL_URL
    # immediately without spawning the ngrok v2 binary.
    yes | pnpm expo start --tunnel --port "$PORT" "$@"
    EXPO_EXIT=$?

    echo "Expo exited (code $EXPO_EXIT). Checking ngrok…"
    # If ngrok is still alive, Expo crashed — try restarting Expo only.
    if kill -0 "$NGROK_PID" 2>/dev/null; then
      echo "ngrok still alive; restarting Expo…"
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
