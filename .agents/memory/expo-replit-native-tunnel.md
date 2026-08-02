---
name: Expo Replit-native tunnel
description: How to run Expo Go on Replit — Replit-native mode broken on sisko.replit.dev; use ngrok instead.
---

# Expo Replit-native tunnel

## Rule
**Always force ngrok — never use the Replit-native (REPLIT_EXPO_DEV_DOMAIN) path.** This applies to both `pike.replit.dev` and `sisko.replit.dev`. The exp.direct `--tunnel` path triggered by `REPLIT_EXPO_DEV_DOMAIN` causes "failed to download" in Expo Go on Replit (bundle download fails). ngrok with HTTPS works reliably.

**Why:** When `REPLIT_EXPO_DEV_DOMAIN` is set, `expo-tunnel.sh` takes the Replit-native branch and runs `expo start --tunnel` (exp.direct). The exp.direct bundle download fails in Expo Go on this environment. Unsetting the variable forces the ngrok branch which generates correct HTTPS bundle URLs.

**How to apply:** In both Expo workflow commands, prefix with `unset REPLIT_EXPO_DEV_DOMAIN &&` so the script's Replit-native block is skipped and the ngrok fallback runs.

## Workflow commands (correct)
- Customer App: `unset REPLIT_EXPO_DEV_DOMAIN && cd apps/mobile && ../../scripts/expo-tunnel.sh 8080 2>&1 | tee /tmp/metro-live.log`
- Partner App: `unset REPLIT_EXPO_DEV_DOMAIN && cd apps/mobile-partner && ../../scripts/expo-tunnel.sh 8099 --authtoken-var NGROK_AUTHTOKEN_2 --start-delay 25`

## Token assignment
- Customer App (port 8080): uses `NGROK_AUTHTOKEN`
- Partner App (port 8099): uses `NGROK_AUTHTOKEN_2` (separate token avoids slot conflict)

## Domain pattern (now defunct — do not use)
- `REPLIT_EXPO_DEV_DOMAIN` = `<repl-id>-00-<suffix>.expo.sisko.replit.dev`
- Per-port substitution (`-00-` → `-8080-`) returns 404 on sisko hosts

## Stale .expo/settings.json
If you previously used exp.direct and it left a `.expo/settings.json` with a `urlRandomness` key,
delete it before restarting. File locations: `apps/mobile/.expo/settings.json`, `apps/mobile-partner/.expo/settings.json`.
