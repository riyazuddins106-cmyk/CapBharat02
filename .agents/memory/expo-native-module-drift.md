---
name: Expo native module version drift
description: expo-device / expo-notifications (or similar native modules) pinned to versions that don't match the installed Expo SDK, causing Expo Go incompatibility warnings and runtime issues.
---

In this project, `expo-device` and `expo-notifications` were pinned to `^57.x` in package.json while the app used Expo SDK 54 (which expects `~8.0.10` and `~0.32.17` respectively). This caused Expo CLI startup warnings and unreliable behavior in Expo Go (data not loading, push token registration issues).

**Why:** Someone likely hand-typed or auto-upgraded these packages to a version number that coincidentally matches a different Expo SDK's numbering scheme, not the actual compatible package version. Expo's native modules are versioned independently per-package and must match the SDK's compatibility matrix, not be assumed from the SDK version number.

**How to apply:** After adding/upgrading any `expo-*` native module, run `npx expo install --check` (or `--fix`) in that app directory to validate/correct versions against the installed Expo SDK. Never hand-pin expo native module versions without checking. If Expo Go behaves oddly (blank data, native errors, turbo module registration errors), check `expo install --check` first before deeper debugging.
