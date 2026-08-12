---
name: Deployment artifact routing
description: Registered managed artifacts can participate in monorepo publishing and claim routes/ports independently of the main app.
---

Registered managed artifacts may be started during a monorepo publish even when
they are absent from the root pnpm workspace. Their production service
configuration can therefore fail promotion independently of the main app
build, and a generic artifact claiming `/api` can conflict with a product API.

**Why:** The ServeNow root build passed, but a stale generic API artifact failed
to create its bundled entry and returned 500 on its `/api` health check.

**How to apply:** When publishing fails after compilation, inspect artifact
process and health-check logs. Keep the main deployment's `/api` ownership
unique; remove obsolete artifact service declarations through the managed TOML
replacement flow instead of forcing unrelated artifact packages into the root
workspace.