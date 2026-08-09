# AI Instructions

This repository is an existing ServeNow application. Preserve the current
architecture and treat source code as the implementation truth.

## Before making changes

1. Read this file.
2. Read [`CURRENT-STATE.md`](CURRENT-STATE.md).
3. Read [`../00-PROJECT-OVERVIEW.md`](../00-PROJECT-OVERVIEW.md).
4. Identify the affected module.
5. Read the relevant module documentation.
6. Read relevant workflow documents.
7. Read relevant business rules.
8. Identify exact source files.
9. Inspect only the necessary source code.
10. Do not scan the entire repository unless genuinely required.

## Before implementation

Write a concise plan covering requested change, affected modules, files,
database/API/UI/business-rule impact, tests, documentation updates, and risks.
Ask the user when requirements are ambiguous.

## During implementation

- Preserve the existing monorepo and API architecture.
- Reuse existing services, validators, components, and route conventions.
- Do not duplicate functionality or modify unrelated modules.
- Preserve backward compatibility between legacy bookings and itemized orders.
- Keep customer product ownership and partner dispatch rules intact.
- Never expose secrets or copy environment values into source/docs.

## After implementation

Run relevant tests/build/type checks, verify the affected workflow, and update
only the affected documentation. Always update `CURRENT-STATE.md` and
`CHANGELOG.md`; update module/workflow/business-rule documents when behavior
changes. Record the task in `TASK-HISTORY.md`.

## Import rule

When this project is imported or cloned:

1. Check whether `/docs` exists.
2. If absent, analyze the current project and create this documentation before
   unrelated feature work.
3. If present, read `AI-INSTRUCTIONS.md` and `CURRENT-STATE.md` first.
4. If docs are stale, update only affected docs from source.
5. Continue only after project context is understood.

## Documentation truth

If code and documentation disagree, actual source code wins. Correct the
affected documentation. Mark unverifiable areas as
`UNKNOWN — REQUIRES VERIFICATION`; never invent behavior.
