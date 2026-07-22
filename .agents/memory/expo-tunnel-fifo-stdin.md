---
name: Expo tunnel FIFO stdin fix
description: Why the retry loop in expo-tunnel.sh hung and how to fix it.
---

## Rule
Use a FIFO opened with `exec 9<>"$_FIFO"` (O_RDWR, non-blocking) to keep Expo's stdin open across retries. Do NOT use `{ sleep 3; ...; sleep 999999; } | expo start` — the trailing `sleep 999999` never receives SIGPIPE (it doesn't write to the pipe after expo exits) so the shell waits forever and the retry loop never fires.

**Why:** bash pipeline waits for ALL commands on both sides before returning. A `sleep 999999` on the left side that doesn't write to the pipe won't get SIGPIPE when expo exits, so it runs for 999999 seconds, blocking the retry loop indefinitely.

**How to apply:** In `scripts/expo-tunnel.sh` Replit-native retry loop:
1. `mkfifo "$_FIFO"`
2. `exec 9<>"$_FIFO"` — O_RDWR open does NOT block; holds write-end open so expo never sees EOF
3. Launch keypress sender writing to fd 9 in background
4. Run `expo start ... < "$_FIFO"`
5. After expo exits, close with `exec 9>&-` and clean up
