#!/usr/bin/env bash
# expo-tunnel.sh <port> [expo-args...]
# Kills stale ngrok, pre-configures authtoken, then starts Expo in --tunnel mode.
# @expo/ngrok is patched to work with ngrok v3.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGROK="$WORKSPACE_ROOT/bin/ngrok"

PORT=${1:-8081}
shift || true   # remaining args passed to expo start

# Kill any lingering ngrok processes so the old session closes cleanly
pkill -f ngrok 2>/dev/null || true
sleep 2

# Pre-configure ngrok v3 authtoken (writes to ~/.ngrok2/ngrok.yml)
"$NGROK" config add-authtoken "$NGROK_AUTHTOKEN" 2>/dev/null || true

# Start Expo in tunnel mode — @expo/ngrok (patched for v3) handles the tunnel.
# Expo will get the public_url (https://xxx.ngrok-free.dev), strip the port,
# and advertise exp://xxx.ngrok-free.dev which Expo Go connects to on port 80.
exec yes | pnpm expo start --tunnel --port "$PORT" "$@"
