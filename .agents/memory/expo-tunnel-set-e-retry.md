---
name: expo-tunnel set -e kills retry loop
description: set -e at top of expo-tunnel.sh exits the script on first pnpm expo start failure, preventing the 5-attempt retry loop from running.
---

**Rule:** Wrap `pnpm exec expo start` in `set +e` / `set -e` guards inside the Replit-native tunnel retry loop so exit code is captured and retries run.

**Why:** `set -e` is active at the top of expo-tunnel.sh. When `pnpm exec expo start --tunnel` fails (e.g. "remote gone away" on exp.direct), bash exits the script immediately before `EXIT_CODE=$?` can be assigned, so the for-loop never retries.

**How to apply:**
```bash
set +e
pnpm exec expo start --tunnel --port "$PORT" "$@" < "$_FIFO"
EXIT_CODE=$?
set -e
```
This is in the REPLIT_EXPO_DEV_DOMAIN branch of `scripts/expo-tunnel.sh`, lines ~94-100.
