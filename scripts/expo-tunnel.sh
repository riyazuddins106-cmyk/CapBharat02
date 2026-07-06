#!/usr/bin/env bash
# expo-tunnel.sh <port> [--authtoken-var VARNAME] [--config-home DIR] [expo-args...]
# Pre-configures ngrok authtoken then starts Expo in --tunnel mode.
# Use --config-home to isolate each app's ngrok config so tokens don't overwrite each other.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGROK="$WORKSPACE_ROOT/bin/ngrok"

PORT=${1:-8081}
shift || true

AUTHTOKEN_VAR="NGROK_AUTHTOKEN"
CONFIG_HOME=""
START_DELAY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --authtoken-var)
      AUTHTOKEN_VAR="$2"; shift 2 ;;
    --config-home)
      CONFIG_HOME="$2"; shift 2 ;;
    --start-delay)
      START_DELAY="$2"; shift 2 ;;
    *)
      break ;;
  esac
done

AUTHTOKEN="${!AUTHTOKEN_VAR}"
if [[ -z "$AUTHTOKEN" ]]; then
  echo "ERROR: $AUTHTOKEN_VAR is not set. Add it to Replit Secrets."
  exit 1
fi

# If a custom config home is requested, isolate this app's ngrok config there.
# This prevents two apps from overwriting each other's authtoken in the shared
# $XDG_CONFIG_HOME/ngrok/ngrok.yml file.
if [[ -n "$CONFIG_HOME" ]]; then
  mkdir -p "$CONFIG_HOME/ngrok"
  export XDG_CONFIG_HOME="$CONFIG_HOME"
fi

# Write this app's authtoken into its own config directory (for bin/ngrok v3)
"$NGROK" config add-authtoken "$AUTHTOKEN" 2>/dev/null || true

# Also export as env var so expo-cli / @expo/ngrok picks it up
export NGROK_AUTHTOKEN="$AUTHTOKEN"

# Optional startup delay — lets the other app's tunnel establish first
if [[ "$START_DELAY" -gt 0 ]]; then
  echo "Waiting ${START_DELAY}s before starting tunnel (stagger to avoid ngrok conflicts)…"
  sleep "$START_DELAY"
fi

# Retry loop — ngrok tunnels sometimes fail on first attempt when two are
# started in rapid succession; retrying with a short pause usually succeeds.
MAX_RETRIES=5
RETRY_DELAY=15

for attempt in $(seq 1 $MAX_RETRIES); do
  echo "Starting Expo tunnel (attempt $attempt/$MAX_RETRIES)…"
  yes | pnpm expo start --tunnel --port "$PORT" "$@" && exit 0

  EXIT_CODE=$?
  if [[ $attempt -lt $MAX_RETRIES ]]; then
    echo "Tunnel exited with code $EXIT_CODE. Retrying in ${RETRY_DELAY}s…"
    sleep "$RETRY_DELAY"
  fi
done

echo "All $MAX_RETRIES tunnel attempts failed."
exit 1
