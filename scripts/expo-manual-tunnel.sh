#!/usr/bin/env bash
# expo-manual-tunnel.sh <port> [--authtoken-var VARNAME] [expo-args...]
#
# Bypasses @expo/ngrok entirely to avoid the shared-config-file conflict.
# Instead:
#   1. Starts the ngrok binary directly with --authtoken (no config file used)
#   2. Polls ngrok's local API to get the public tunnel URL
#   3. Passes that URL's hostname to Metro via REACT_NATIVE_PACKAGER_HOSTNAME
#   4. Starts Expo in --host lan mode — QR code uses the ngrok hostname
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

# Kill any stale ngrok or Metro process on this port
pkill -f "ngrok.*${PORT}" 2>/dev/null || true
sleep 2

# Pick an unused ngrok API port (default 4040 may be taken by the other app)
# Use port 4040 for the first app (8081) and 4042 for the second (8082)
if [[ "$PORT" == "8081" ]]; then
  NGROK_API_PORT=4040
else
  NGROK_API_PORT=4042
fi

echo "Starting ngrok tunnel for port $PORT (API on $NGROK_API_PORT)..."

# Start ngrok directly — pass authtoken via flag (not config file), so the
# two apps' tokens never touch the same config file.
"$NGROK" http "$PORT" \
  --authtoken "$AUTHTOKEN" \
  --log stdout \
  --web-addr "127.0.0.1:${NGROK_API_PORT}" \
  > /tmp/ngrok-${PORT}.log 2>&1 &
NGROK_PID=$!

# Poll until the tunnel URL appears in ngrok's local API
echo "Waiting for ngrok tunnel..."
TUNNEL_URL=""
for i in $(seq 1 30); do
  sleep 2
  TUNNEL_URL=$(curl -s "http://127.0.0.1:${NGROK_API_PORT}/api/tunnels" 2>/dev/null \
    | grep -o '"public_url":"https://[^"]*"' \
    | head -1 \
    | sed 's/"public_url":"//;s/"//')
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "ERROR: ngrok tunnel did not start. Check /tmp/ngrok-${PORT}.log"
  cat /tmp/ngrok-${PORT}.log
  kill $NGROK_PID 2>/dev/null || true
  exit 1
fi

# Extract just the hostname (strip https://)
NGROK_HOST="${TUNNEL_URL#https://}"
echo "Tunnel ready: $TUNNEL_URL"
echo "Expo QR code will use: exp://$NGROK_HOST:$PORT"

# Start Expo in LAN mode with the ngrok hostname injected.
# Expo Go reads exp://NGROK_HOST:PORT from the QR code and connects via ngrok.
exec yes | REACT_NATIVE_PACKAGER_HOSTNAME="$NGROK_HOST" \
  pnpm expo start \
  --port "$PORT" \
  --host lan \
  "$@"
