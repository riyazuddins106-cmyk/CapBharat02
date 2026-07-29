---
name: Expo Replit-native tunnel
description: How to run Expo Go on Replit using the per-port proxy domain instead of exp.direct or ngrok
---

# Expo Replit-native tunnel

## Rule
When `REPLIT_EXPO_DEV_DOMAIN` is set (always on Replit), skip exp.direct and ngrok entirely.
Derive a per-port domain from `REPLIT_EXPO_DEV_DOMAIN`, set `REACT_NATIVE_PACKAGER_HOSTNAME`, and run `expo start --host lan`.

**Why:** exp.direct only allows **one anonymous tunnel per Replit IP at a time**. With two Expo apps (Customer + Partner), the second one consistently fails with "remote gone away". Using Replit's own proxy domain bypasses exp.direct entirely — each port gets its own stable public URL, no slot competition, no retries needed.

## Domain pattern
- `REPLIT_EXPO_DEV_DOMAIN` = `<repl-id>-00-<suffix>.expo.pike.replit.dev`
- Per-port: replace `-00-` with `-<PORT>-`
  - Port 8080 (Customer): `<repl-id>-8080-<suffix>.expo.pike.replit.dev`
  - Port 8099 (Partner):  `<repl-id>-8099-<suffix>.expo.pike.replit.dev`
- Expo Go URL: `exp://<port-specific-domain>` (no port suffix needed; Replit proxy handles routing)

## How to apply in expo-tunnel.sh
```bash
if [[ -n "$REPLIT_EXPO_DEV_DOMAIN" ]]; then
  EXPO_HOST=$(echo "$REPLIT_EXPO_DEV_DOMAIN" | sed "s/-00-/-${PORT}-/")
  export REACT_NATIVE_PACKAGER_HOSTNAME="$EXPO_HOST"
  EXPO_URL="exp://${EXPO_HOST}"
  echo "$EXPO_URL" > "/tmp/expo-tunnel-${PORT}.url"
  pnpm exec expo start --host lan --port "$PORT"
fi
```

## Stale .expo/settings.json
If you previously used exp.direct and it left a `.expo/settings.json` with a `urlRandomness` key,
delete it before restarting. The old urlRandomness causes exp.direct to try to reclaim a dead session.
File locations: `apps/mobile/.expo/settings.json`, `apps/mobile-partner/.expo/settings.json`.
