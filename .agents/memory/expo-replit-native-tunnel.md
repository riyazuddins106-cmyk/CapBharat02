---
name: Expo Replit-native tunnel
description: How to run Expo Go on Replit — native exp.direct tunnel with retry and QR cache synchronization.
---

# Expo Replit-native tunnel

## Rule
**Prefer the Replit-native `REPLIT_EXPO_DEV_DOMAIN` path on current sisko workspaces.** The native `exp.direct` tunnel provides HTTPS bundle URLs and can recover from a transient first-attempt `remote gone away` error through the existing retry loop.

**Why:** The current Partner workflow connected successfully on the second native attempt, and its SDK 54 manifest and Android bundle returned successfully. Forcing ngrok can leave Expo Go on a generic project/runtime error when a tunnel or QR becomes stale.

**How to apply:** Do not unset `REPLIT_EXPO_DEV_DOMAIN` in Replit Expo workflow commands. Keep the native branch before the ngrok fallback, persist the active URL to `/tmp/expo-tunnel-<port>.url`, and regenerate the QR page after each tunnel session.

## Generic Expo Go error screen
When the Partner workflow has a fresh QR, the Android manifest returns 200, and
the exact `launchAsset` bundle returns 200, a blue Expo Go “Something went
wrong” screen is not enough to identify the fault. It is a pre-app Expo Go
error, not the app's own ErrorBoundary.

**Why:** A current Partner session produced a valid SDK 54 manifest and
11.5 MB Android bundle with no Metro resolution or transform failure, while
the uploaded device screenshot contained no underlying error text.

**How to apply:** Confirm the user scanned the current QR from the QR Codes
page, update/reopen Expo Go, and request the text from Expo Go’s “View error
log” before changing app code. Do not infer a native module bug from the blue
screen alone.

## Static QR page freshness
The standalone QR Codes workflow serves `tmp-qr/scanner.html` and image files,
so updating only `/tmp/expo-tunnel-<port>.url` does not update what a user scans.

**Why:** The Partner scanner showed an old ngrok URL while the live cache and
API `/qr` page already showed a current `exp.direct` URL, producing
`java.io.IOException: Failed to download remote update`.

**How to apply:** Every successful tunnel detection must regenerate the
current app PNG and rewrite the full scanner page using the sibling app's
live cache, not the previous HTML contents. Verify both the displayed URL and
the QR payload after a restart.

## Workflow commands
- Customer App: use the native branch when `REPLIT_EXPO_DEV_DOMAIN` is present.
- Partner App: use the native branch when `REPLIT_EXPO_DEV_DOMAIN` is present; retain the retry delay for tunnel startup collisions.

## Token assignment
- Customer App (port 8080): uses `NGROK_AUTHTOKEN`
- Partner App (port 8099): uses `NGROK_AUTHTOKEN_2` (separate token avoids slot conflict)

## Domain pattern (now defunct — do not use)
- `REPLIT_EXPO_DEV_DOMAIN` = `<repl-id>-00-<suffix>.expo.sisko.replit.dev`
- Per-port substitution (`-00-` → `-8080-`) returns 404 on sisko hosts

## Stale .expo/settings.json
If you previously used exp.direct and it left a `.expo/settings.json` with a `urlRandomness` key,
delete it before restarting. File locations: `apps/mobile/.expo/settings.json`, `apps/mobile-partner/.expo/settings.json`.
