---
name: Expo SDK 57 upgrade blocked
description: pnpm release age policy on Replit blocks installing latest Expo SDK; partial upgrade leaves corrupted state.
---

# Expo SDK 57 upgrade blocked on Replit

## The rule
Do NOT attempt `npx expo install expo@~57.0.0 --fix` in this project on Replit.

**Why:** pnpm's `minimumReleaseAge` setting blocks publishing very new packages. The command partially runs — it updates `apps/mobile/package.json` to `expo: "~57.0.1"` and installs SDK 57 CLI packages into `.pnpm/` — then fails. This leaves a mixed state: package.json says SDK 57 but expo-router is still SDK 54, causing `Cannot find module 'expo-router/internal/routing'` crashes.

**How to apply:** If the user asks to upgrade Expo SDK, explain that Replit's pnpm release-age policy blocks the latest packages. The current SDK 54.0.35 is what's usable here. Recovery steps if partial upgrade occurs:
1. `git checkout HEAD -- apps/mobile/package.json pnpm-lock.yaml`
2. Manually delete `.pnpm/expo@57*`, `.pnpm/@expo+cli@57*`, `.pnpm/@expo+router-server@57*`, `.pnpm/babel-preset-expo@57*`, and any other `*@57*` expo dirs
3. `pnpm install --frozen-lockfile`
4. Restart Expo workflows
