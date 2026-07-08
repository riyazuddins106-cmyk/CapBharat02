---
name: Expo Replit-native tunnel
description: How to bypass ngrok for Expo Go QR codes on Replit using REPLIT_EXPO_DEV_DOMAIN
---

# Expo Replit-native tunnel

## Rule
When `REPLIT_EXPO_DEV_DOMAIN` is set (always on Replit), skip ngrok entirely. Set `EXPO_TUNNEL_URL` to that domain and run `expo start --tunnel`. The Replit-native check MUST come before the ngrok authtoken/binary validation in the script, or it still fails without ngrok.

**Why:** Replit provides `REPLIT_EXPO_DEV_DOMAIN` specifically for Expo. ngrok static domains conflict when the same token is reused across sessions (ERR_NGROK_334), and `--pooling-enabled` only works when both endpoints opted in at startup.

## How to apply
In `scripts/expo-tunnel.sh`:
- Port 8081 (Customer): `EXPO_TUNNEL_URL=https://$REPLIT_EXPO_DEV_DOMAIN`
- Port 8082 (Partner): replace `-00-` with `-8082-` in the domain string

Place the Replit-native block immediately after argument parsing and the start-delay sleep, before any ngrok-specific code.

## Domain pattern (observed)
- `REPLIT_EXPO_DEV_DOMAIN` = `<repl-id>-00-<suffix>.expo.pike.replit.dev`
- Port-specific: `<repl-id>-<PORT>-<suffix>.expo.pike.replit.dev`
