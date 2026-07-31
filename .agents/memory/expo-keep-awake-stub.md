---
name: expo-keep-awake Metro stub
description: How to suppress "Unable to activate keep awake" in Expo Go — removing from package.json is NOT enough due to pnpm hoisting + Metro's nodeModulesPaths.
---

# expo-keep-awake Metro Stub

## Rule
**Do NOT just remove expo-keep-awake from package.json.** The package remains in `node_modules/.pnpm/node_modules/` because `expo` itself depends on it. Metro's `nodeModulesPaths` explicitly includes that directory, so Metro still resolves and loads the real native module, which throws `CodedError: Unable to activate keep awake` on Android Expo Go.

**Why:** `expo/src/launch/withDevTools.tsx` auto-requires `expo-keep-awake` in dev mode when the module is resolvable. The `try/catch` there only protects the `require()` call — not the `activateKeepAwakeAsync()` that fires inside `useKeepAwake()` as a React effect. The native Android module throws at that point, uncaught.

**How to apply:** Add `expo-keep-awake` to `FORCED_MODULES` in both `apps/mobile/metro.config.js` and `apps/mobile-partner/metro.config.js`, pointing to a local stub file. Also clear Metro cache (`rm -f /tmp/metro-file-map-*`) and restart Expo workflows so the fresh bundle is built with the stub.

## Stub files
- `apps/mobile/stubs/expo-keep-awake.js`
- `apps/mobile-partner/stubs/expo-keep-awake.js`

Both export `{ ExpoKeepAwakeTag, useKeepAwake, activateKeepAwakeAsync, deactivateKeepAwake, activateKeepAwake, isAvailableAsync, addListener }` as no-ops.

## Metro config entry (both apps)
```js
'expo-keep-awake': path.resolve(projectRoot, 'stubs/expo-keep-awake.js'),
```
Added to `FORCED_MODULES` so `resolveRequest` intercepts it before Metro's nodeModulesPaths lookup.
