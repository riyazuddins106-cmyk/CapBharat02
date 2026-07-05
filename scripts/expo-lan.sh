#!/usr/bin/env bash
# expo-lan.sh <port> [expo-args...]
# Starts Expo using Replit's public domain so phones can connect without ngrok.
# Works simultaneously alongside expo-tunnel.sh on a different port.
set -e

PORT=${1:-8081}
shift || true

# Replit's public dev domain is reachable from any device on the internet
PUBLIC_HOST="${REPLIT_DEV_DOMAIN:-localhost}"

echo "Starting Expo on public host: $PUBLIC_HOST port $PORT"

exec yes | REACT_NATIVE_PACKAGER_HOSTNAME="$PUBLIC_HOST" pnpm expo start \
  --port "$PORT" \
  --host lan \
  "$@"
