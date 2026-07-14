---
name: hermesc-jsc-workaround
description: pnpm-installed react-native 0.81.5 ships hermesc 0.12.0 which doesn't support private class fields. Fix for EAS Update: set jsEngine:jsc in app.json.
---

**Rule:** Add "jsEngine": "jsc" to the expo section of app.json for EAS Update builds from Replit.

**Why:** hermesc at react-native/sdks/hermesc/linux64-bin/hermesc is version 0.12.0. react-native-reanimated and react-native-worklets ship pre-compiled JS with private class fields (#x, #y, #focused) that hermesc 0.12 rejects. Setting jsEngine:jsc skips hermesc entirely — the bundle is plain JS, and Expo Go's built-in current Hermes JIT-compiles it at runtime.

**Trying to fix via Babel:** Adding assumptions:{privateFieldsAsProperties} + transformIgnorePatterns hits the worklets-src-redirect bug. JSC flag is simpler.

**How to apply:** apps/mobile/app.json and apps/mobile-partner/app.json, under "expo": { "jsEngine": "jsc", ... }. Safe for Expo Go UAT; does not affect native runtime Hermes usage.
