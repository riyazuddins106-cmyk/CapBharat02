---
name: worklets-version-pin
description: react-native-worklets must be pinned to 0.5.1 for Expo SDK 54; newer versions break Expo Go with "installTurboModule called with 1 arguments".
---

**Rule:** Pin `react-native-worklets` to exactly `"0.5.1"` and `react-native-reanimated` to `"4.1.1"` in both mobile app package.json files.

**Why:** Expo SDK 54's Expo Go binary bundles `react-native-worklets@0.5.1` as a native module. In `0.5.1`, the JS calls `installTurboModule()` with 0 arguments. In `0.8.3` (the latest, pulled in by `reanimated@4.1.7`), it was changed to `installTurboModule(bundleModeEnabled)` — 1 argument. Expo Go's native binary only knows the 0-argument signature, so loading `0.8.3` crashes immediately with "exception in HostFunction: TurboModule method 'installTurboModule' called with 1 arguments". The `bundledNativeModules.json` in Expo SDK 54 explicitly lists `react-native-worklets: "0.5.1"` and `react-native-reanimated: "~4.1.1"`.

**How to apply:**
- In both `apps/mobile/package.json` and `apps/mobile-partner/package.json`, set:
  ```json
  "react-native-reanimated": "4.1.1",
  "react-native-worklets": "0.5.1"
  ```
- Use exact pins (no `~`), because `~4.1.1` resolves to the latest `4.1.x` (currently `4.1.7`) which pulls in `worklets@0.8.3`.
- The existing metro.config.js worklets redirect (`lib/module/index.js`) still applies to `0.5.1` — it has the same `"react-native": "./src/index"` field issue.
- Run `pnpm install` after pinning to confirm both pnpm entries show `react-native-worklets@0.5.1`.
