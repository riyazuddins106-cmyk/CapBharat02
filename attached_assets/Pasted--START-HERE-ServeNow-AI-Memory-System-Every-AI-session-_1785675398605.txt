# 🚀 START HERE — ServeNow AI Memory System
> Every AI session MUST read this file first, before doing any work.
> This file contains both the project context AND your behavioral rules for this session.

---

## ▶ RESUME PROMPT (copy-paste this to start any session)

```
Read .ai-memory/START_HERE.md, CURRENT_STATUS.md, ACTIVE_TASK.md, and GOTCHAS.md — then continue from where you left off.
```

That single line is all anyone needs. The AI will orient itself and continue automatically.

---

---

## MANDATORY RULES FOR THIS SESSION

These are not suggestions. Follow them automatically, without being asked:

### Rule 1 — Update ACTIVE_TASK.md after EVERY step
Every time you complete a meaningful step (a file changed, an API built, a screen updated, a bug fixed), you MUST immediately update `.ai-memory/ACTIVE_TASK.md` before moving to the next step. Do not wait until the end. Do not batch multiple steps. Update after each one.

### Rule 2 — Update CURRENT_STATUS.md when a task finishes
When a full task is complete, mark it done in `.ai-memory/CURRENT_STATUS.md` and move the entry in ACTIVE_TASK.md to the history table.

### Rule 3 — Never leave ACTIVE_TASK.md stale
If you start a task, write it into ACTIVE_TASK.md immediately — before doing any work. This way, even if the session ends after the first step, the next session knows what was started.

### Rule 4 — Read these three files at the start of every session
1. `.ai-memory/MASTER_INDEX.md` — project map, structure, secrets
2. `.ai-memory/CURRENT_STATUS.md` — what's done, what's pending
3. `.ai-memory/ACTIVE_TASK.md` — active task + which step to resume from

### Rule 5 — "Start from where you left off" means:
Read ACTIVE_TASK.md → find the first unchecked step → continue from there. No questions needed.

---

## ACTIVE_TASK.md Format (use this exact format)

When starting a task, write this into ACTIVE_TASK.md:

```
## ▶ Current Task
Task: [exact task description]
Started: [today's date]
Status: IN PROGRESS — Step X of Y complete

### Steps
- [x] Step 1: description — ✅ done
- [x] Step 2: description — ✅ done
- [ ] Step 3: description — ⬅ NEXT
- [ ] Step 4: description
- [ ] Step 5: description

### Files changed so far
- `path/to/file.ts` — what changed and why

### Notes for next session
[Any decisions made, blockers found, or important context]
```

Update the checklist and "Files changed so far" after every single step.

---

## Project: ServeNow
Urban Clap-style service marketplace. Full details in MASTER_INDEX.md.

- Backend: Node.js + Express + TypeScript + Drizzle ORM (port 8000)
- Customer Web: React + Vite (port 5000)
- Admin Panel: React + Vite (port 5001)
- Partner Web: React + Vite (port 5002)
- Customer Mobile: Expo SDK 54 (port 8080)
- Partner Mobile: Expo SDK 54 (port 8099)
- Database: PostgreSQL via Supabase

**Test accounts:**
- Admin: admin@servenow.in / Admin@1234
- Partner: partner@servenow.in / Partner@1234
- Customer: customer@servenow.in / Customer@1234

Full project map → `.ai-memory/MASTER_INDEX.md`
All feature status → `.ai-memory/CURRENT_STATUS.md`
Active work → `.ai-memory/ACTIVE_TASK.md`
Module details → `.ai-memory/MODULES.md`
