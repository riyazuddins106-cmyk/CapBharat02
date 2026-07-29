---
name: Expo Replit-native tunnel
description: How to run Expo Go on Replit — Replit-native mode broken on sisko.replit.dev; use ngrok instead.
---

# Expo Replit-native tunnel

## Rule
**Do NOT use the Replit-native (REPLIT_EXPO_DEV_DOMAIN) mode on sisko.replit.dev.** The per-port subdomain substitution (replacing `-00-` with `-8080-` or `-8099-`) returns 404 — Replit's sisko proxy only routes the default port (-00-). Always force ngrok.

**Why:** The old `pike.replit.dev` proxy routed per-port subdomains. The newer `sisko.replit.dev` proxy does not — only the default (-00-) port subdomain works. The `REPLIT_EXPO_DEV_DOMAIN` variable is present but the derived per-port domain is unreachable externally, causing "failed to download" in Expo Go.

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
