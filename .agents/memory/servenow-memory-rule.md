---
name: ServeNow memory update rule
description: Hard rule — must update all three .ai-memory files after every completed task, no exceptions.
---

# ServeNow — Memory Update Rule

**Why:** The .ai-memory system is the only continuity between sessions. Partial updates cause the next session to start with stale context and make wrong decisions. The user built this system specifically so the agent knows what to do without being told.

**Rule — after EVERY completed task:**
1. `ACTIVE_TASK.md` — mark task done, move to history table
2. `CURRENT_STATUS.md` — update "Last Session Summary" section with what changed and why
3. `GOTCHAS.md` — add entry if anything took more than one attempt

**How to apply:** Before writing the final response to the user after any task, check all three files are updated. Do not skip step 2 just because step 1 is done.

**What went wrong before:** Agent updated ACTIVE_TASK.md after the payment flow fix but skipped CURRENT_STATUS.md. User had to point it out manually. "Forgot" is not a valid explanation for an AI — it was a sequencing failure in the wrap-up steps.
