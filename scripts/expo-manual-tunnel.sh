#!/usr/bin/env bash
# expo-manual-tunnel.sh <port> [--authtoken-var VARNAME] [expo-args...]
# Works with ngrok v3. Starts a tunnel then launches Expo in LAN mode.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGROK="$WORKSPACE_ROOT/bin/ngrok"

PORT=${1:-8081}
shift || true

AUTHTOKEN_VAR="NGROK_AUTHTOKEN"
if [[ "$1" == "--authtoken-var" ]]; then
  AUTHTOKEN_VAR="$2"
  shift 2
fi

AUTHTOKEN="${!AUTHTOKEN_VAR}"
if [[ -z "$AUTHTOKEN" ]]; then
  echo "ERROR: $AUTHTOKEN_VAR is not set. Add it to Replit Secrets."
  exit 1
fi

# Pick app directory based on port
if [[ "$PORT" == "8081" ]]; then
  APP_DIR="$WORKSPACE_ROOT/apps/mobile"
else
  APP_DIR="$WORKSPACE_ROOT/apps/mobile-partner"
fi

EXPO_BIN="$APP_DIR/node_modules/.bin/expo"

if [[ ! -f "$EXPO_BIN" ]]; then
  echo "ERROR: expo not found at $EXPO_BIN — run pnpm install first"
  exit 1
fi

# Kill stale ngrok on this port
pkill -f "ngrok.*${PORT}" 2>/dev/null || true
sleep 1

echo "Starting ngrok tunnel for port $PORT..."
"$NGROK" http "$PORT" \
  --authtoken "$AUTHTOKEN" \
  --log stdout \
  --log-format json \
  > /tmp/ngrok-${PORT}.log 2>&1 &
NGROK_PID=$!

echo "Waiting for ngrok tunnel..."
TUNNEL_URL=""
for i in $(seq 1 30); do
  sleep 2
  TUNNEL_URL=$(curl -s "http://127.0.0.1:4040/api/tunnels" 2>/dev/null \
    | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  tunnels = data.get('tunnels', [])
  port = '$PORT'
  for t in tunnels:
    addr = t.get('config', {}).get('addr', '')
    if port in addr:
      print(t['public_url'])
      sys.exit(0)
  if tunnels:
    print(tunnels[-1]['public_url'])
except:
  pass
" 2>/dev/null || true)
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "ERROR: ngrok tunnel did not start. Log:"
  cat /tmp/ngrok-${PORT}.log | tail -20
  kill $NGROK_PID 2>/dev/null || true
  exit 1
fi

NGROK_HOST="${TUNNEL_URL#https://}"
echo ""
echo "Tunnel ready: $TUNNEL_URL"
echo "Expo QR: exp://$NGROK_HOST"
echo ""

# Run Expo from inside the app directory using its local binary
cd "$APP_DIR"
exec env REACT_NATIVE_PACKAGER_HOSTNAME="$NGROK_HOST" \
  bash -c "yes | '$EXPO_BIN' start --port $PORT --host lan"
