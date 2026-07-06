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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --authtoken-var)
      AUTHTOKEN_VAR="$2"; shift 2 ;;
    --config-home)
      CONFIG_HOME="$2"; shift 2 ;;
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

# @expo/ngrok-bin has been replaced with the ngrok v3 binary (bin/ngrok).
# The v3 binary already uses XDG_CONFIG_HOME set above, so no extra setup needed.

exec yes | pnpm expo start --tunnel --port "$PORT" "$@"
