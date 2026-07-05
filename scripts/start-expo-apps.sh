#!/usr/bin/env bash
# start-expo-apps.sh
# Starts a single ngrok agent with two tunnels, then both Expo servers.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGROK="$WORKSPACE_ROOT/bin/ngrok"

if [[ -z "$NGROK_AUTHTOKEN" ]]; then
  echo "ERROR: NGROK_AUTHTOKEN is not set."
  exit 1
fi

# Kill stale processes
pkill -f "ngrok" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 2

# Write ngrok config (tunnels only; authtoken passed via --authtoken flag)
NGROK_CONFIG="/tmp/ngrok-servenow.yml"
cat > "$NGROK_CONFIG" <<'YMLEOF'
version: "3"
tunnels:
  customer:
    proto: http
    addr: 8081
  partner:
    proto: http
    addr: 8082
YMLEOF

echo "=== Starting ngrok tunnels (Customer:8081, Partner:8082) ==="
"$NGROK" start --all \
  --authtoken "$NGROK_AUTHTOKEN" \
  --config "$NGROK_CONFIG" \
  --log stdout \
  > /tmp/ngrok-all.log 2>&1 &
NGROK_PID=$!

# Poll for both tunnels
echo "Waiting for ngrok tunnels..."
CUSTOMER_URL=""
PARTNER_URL=""
for i in $(seq 1 30); do
  sleep 2
  API_RESP=$(curl -s "http://127.0.0.1:4040/api/tunnels" 2>/dev/null || true)
  if [[ -n "$API_RESP" ]]; then
    CUSTOMER_URL=$(echo "$API_RESP" | python3 -c "
import sys,json
try:
  t=json.load(sys.stdin)['tunnels']
  r=next((x['public_url'] for x in t if 'customer' in x.get('name','') or x.get('config',{}).get('addr','')=='http://localhost:8081'),'')
  print(r)
except: pass
" 2>/dev/null || true)
    PARTNER_URL=$(echo "$API_RESP" | python3 -c "
import sys,json
try:
  t=json.load(sys.stdin)['tunnels']
  r=next((x['public_url'] for x in t if 'partner' in x.get('name','') or x.get('config',{}).get('addr','')=='http://localhost:8082'),'')
  print(r)
except: pass
" 2>/dev/null || true)
    if [[ -n "$CUSTOMER_URL" && -n "$PARTNER_URL" ]]; then
      break
    fi
  fi
done

if [[ -z "$CUSTOMER_URL" || -z "$PARTNER_URL" ]]; then
  echo "ERROR: One or both tunnels did not start. ngrok log:"
  cat /tmp/ngrok-all.log | tail -30
  kill $NGROK_PID 2>/dev/null || true
  exit 1
fi

CUSTOMER_HOST="${CUSTOMER_URL#https://}"
PARTNER_HOST="${PARTNER_URL#https://}"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  CUSTOMER tunnel: $CUSTOMER_URL"
echo "  PARTNER  tunnel: $PARTNER_URL"
echo "══════════════════════════════════════════════════════════"
echo ""

# Start Customer Expo app in background
echo "=== Starting Customer App (port 8081) ==="
(cd "$WORKSPACE_ROOT/apps/mobile" && \
  REACT_NATIVE_PACKAGER_HOSTNAME="$CUSTOMER_HOST" yes | pnpm expo start --port 8081 --host lan) &
CUSTOMER_PID=$!

sleep 8

# Start Partner Expo app in foreground (keeps this process alive)
echo "=== Starting Partner App (port 8082) ==="
cd "$WORKSPACE_ROOT/apps/mobile-partner"
exec env REACT_NATIVE_PACKAGER_HOSTNAME="$PARTNER_HOST" bash -c 'yes | pnpm expo start --port 8082 --host lan'
