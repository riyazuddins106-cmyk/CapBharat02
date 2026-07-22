---
name: Env variable contract
description: Which env vars the server reads and how they are named.
---

# Env Variable Contract

The preferred secret for the Supabase Postgres connection is `DATABASE_URL`. The server maps it to the legacy `SUPABASE_DATABASE_URL` configuration name when needed; the legacy name remains a fallback for compatibility.

**Why:** The project documentation and configured development environment use `DATABASE_URL`, while older server modules still reference `SUPABASE_DATABASE_URL`. Keeping the alias in one place avoids breaking either convention.

**How to apply:** New code should prefer `DATABASE_URL` and preserve the server's compatibility alias. Never print or expose the value.

**Full required secrets:**
- `SUPABASE_URL` — REST project URL (https://xxx.supabase.co), NOT the postgres string
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` — Supabase Postgres connection string (URI format, ?sslmode=require)
- `JWT_SECRET` (min 16 chars)
- `JWT_REFRESH_SECRET` (min 16 chars)
- `PORT` (optional, defaults to 8000)
