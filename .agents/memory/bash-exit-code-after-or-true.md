---
name: Bash exit-code capture bug with `|| true`
description: Common bug pattern in retry-loop shell scripts that silently defeats retries.
---

In bash, `some_command || true; EXIT_CODE=$?` always sets `EXIT_CODE=0`, because `$?` reflects the exit status of the last executed command, which is `true` (from the `||`), not `some_command`. This silently defeats retry loops that check `EXIT_CODE` to decide whether to retry — they always take the "success" branch on the first attempt regardless of whether the wrapped command actually failed.

**Why:** Found in `scripts/expo-tunnel.sh`'s Replit-native tunnel retry loop — it looked like a retry loop (`for attempt in 1..N`) but always exited after attempt 1 even when the Expo tunnel failed to connect, because `|| true` was placed on the same line before capturing `$?`.

**How to apply:** When a script needs to run under `set -e` but also needs to capture a command's real exit code without aborting on failure, wrap the command with `set +e` / `set -e` around it instead of appending `|| true`:
```bash
set +e
some_command
EXIT_CODE=$?
set -e
```
Grep for `|| true` followed by `$?` captures in any retry/error-handling shell script as a red flag.
