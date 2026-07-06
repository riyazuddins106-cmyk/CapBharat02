#!/usr/bin/env bash
# expo-tunnel.sh <port> [--authtoken-var VARNAME] [--config-home DIR] [expo-args...]
# Pre-configures ngrok v2 authtoken then starts Expo in --tunnel mode.
# Each app gets its own config file; ~/.ngrok2/ngrok.yml is symlinked per-app
# so @expo/ngrok picks up the right token even though it hardcodes that path.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# Find the @expo/ngrok-bin v2 binary bundled in node_modules
NGROK_V2=$(find "$WORKSPACE_ROOT/node_modules" -path "*/@expo/ngrok-bin-linux-x64*/ngrok" -type f 2>/dev/null | head -1)
if [[ -z "$NGROK_V2" ]]; then
  NGROK_V2=$(find "$WORKSPACE_ROOT/node_modules" -path "*/@expo/ngrok-bin-linux*/ngrok" -type f 2>/dev/null | head -1)
fi

if [[ -z "$NGROK_V2" ]]; then
  echo "ERROR: Could not find @expo/ngrok-bin binary."
  exit 1
fi

# Determine per-app config file path
if [[ -n "$CONFIG_HOME" ]]; then
  APP_NGROK_CONFIG="$CONFIG_HOME/ngrok.yml"
  mkdir -p "$CONFIG_HOME"
else
  APP_NGROK_CONFIG="/tmp/ngrok-default/ngrok.yml"
  mkdir -p "/tmp/ngrok-default"
fi

# Write this app's authtoken into its own dedicated config file
echo "Configuring ngrok authtoken → $APP_NGROK_CONFIG"
"$NGROK_V2" authtoken --config="$APP_NGROK_CONFIG" "$AUTHTOKEN" 2>/dev/null || true

# @expo/ngrok hardcodes ~/.ngrok2/ngrok.yml — atomically replace it with a
# symlink to our per-app config so the right token is always used.
mkdir -p "$HOME/.ngrok2"
# Remove any existing file/symlink, then symlink ours in
rm -f "$HOME/.ngrok2/ngrok.yml"
ln -sf "$APP_NGROK_CONFIG" "$HOME/.ngrok2/ngrok.yml"
echo "Symlinked $HOME/.ngrok2/ngrok.yml → $APP_NGROK_CONFIG"

# Export as env var too
export NGROK_AUTHTOKEN="$AUTHTOKEN"

# Optional startup delay — lets the first app's tunnel establish first
if [[ "$START_DELAY" -gt 0 ]]; then
  echo "Waiting ${START_DELAY}s before starting tunnel (stagger to avoid ngrok conflicts)…"
  sleep "$START_DELAY"
fi

# Retry loop
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
