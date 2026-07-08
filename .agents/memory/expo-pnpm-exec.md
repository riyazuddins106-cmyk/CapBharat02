---
name: Expo pnpm exec fix
description: pnpm expo start is invalid syntax; always use pnpm exec expo start
---

# Expo pnpm exec fix

The command `pnpm expo start` is NOT valid pnpm syntax and fails with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "expo" not found`.

**Why:** `pnpm <script>` runs a package.json script, not a binary. The Expo CLI binary lives in the app's local `node_modules/.bin/expo`. The correct command is `pnpm exec expo start` which resolves binaries from the nearest `node_modules/.bin`.

**How to apply:** Every branch of `scripts/expo-tunnel.sh` that launches Expo must use `pnpm exec expo start`, including the Replit-native path and both ngrok-fallback path occurrences (initial launch and ngrok-still-alive restart).
