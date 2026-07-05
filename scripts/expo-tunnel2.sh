#!/usr/bin/env bash
# expo-tunnel2.sh <port> [expo-args...]
# Uses a second ngrok binary + separate config so two tunnels can run simultaneously.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGROK2="$WORKSPACE_ROOT/bin/ngrok2"
NGROK2_CONFIG="$HOME/.config/ngrok/ngrok2.yml"

PORT=${1:-8081}
shift || true

# Kill only stale tunnels on this specific port
pkill -f "ngrok2.*$PORT" 2>/dev/null || true
sleep 2

# Configure second authtoken into its own config file
"$NGROK2" config add-authtoken "$NGROK_AUTHTOKEN_2" --config "$NGROK2_CONFIG" 2>/dev/null || true

# Start a raw ngrok2 tunnel in background on the Expo port
"$NGROK2" http "$PORT" --config "$NGROK2_CONFIG" --log stdout --log-format json &
NGROK2_PID=$!

# Wait for the public URL to appear
sleep 5
NGROK2_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4 || true)

# If ngrok inspector port 4040 is already taken by partner, try 4041
if [ -z "$NGROK2_URL" ]; then
  NGROK2_URL=$(curl -s http://127.0.0.1:4041/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4 || true)
fi

if [ -n "$NGROK2_URL" ]; then
  # Strip https:// and port, build exp:// URL
  NGROK2_HOST=$(echo "$NGROK2_URL" | sed 's|https://||' | cut -d: -f1)
  echo "Tunnel URL: exp://$NGROK2_HOST"
  # Override EXPO_TUNNEL_SUBDOMAIN is not reliable; use REACT_NATIVE_PACKAGER_HOSTNAME
  export REACT_NATIVE_PACKAGER_HOSTNAME="$NGROK2_HOST"
fi

# Start Expo without tunnel (the external tunnel above handles it)
exec yes | pnpm expo start --port "$PORT" --host lan "$@"
