---
name: worklets-src-redirect
description: react-native-worklets resolves to TypeScript source via "react-native" field, crashing the worklets Babel plugin on its own source files.
---

**Rule:** In metro.config.js resolveRequest, redirect 'react-native-worklets' to its compiled lib/module/index.js.

**Why:** react-native-worklets package.json has "react-native": "./src/index". Metro's Expo resolver prioritises this field and loads raw TypeScript. The worklets Babel plugin then crashes with "Cannot read properties of undefined (reading 'length')" when it encounters its own source in runtimes.ts.

**How to apply:** Any time react-native-worklets is in the dependency tree (peer dep of react-native-reanimated v4), add this redirect to BOTH apps' metro.config.js inside the resolveRequest handler.
