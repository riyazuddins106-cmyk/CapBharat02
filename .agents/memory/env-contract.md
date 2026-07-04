---
name: Env variable contract
description: Which env vars the server reads and how they are named.
---

# Env Variable Contract

The server reads `SUPABASE_DATABASE_URL` (NOT `DATABASE_URL`) as the Postgres connection string.

**Why:** `DATABASE_URL` is runtime-managed by Replit's built-in Postgres and cannot be set as a secret. The user's Supabase connection string must live in `SUPABASE_DATABASE_URL`. All server code (`env.ts`, `config/database.ts`, `drizzle.config.ts`, and all DB utility scripts in `server/src/database/`) have been aligned to this name.

**How to apply:** Any new script or config that needs the Postgres URL must read `process.env.SUPABASE_DATABASE_URL`. Never use `DATABASE_URL` in this project.

**Full required secrets:**
- `SUPABASE_URL` — REST project URL (https://xxx.supabase.co), NOT the postgres string
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DATABASE_URL` — postgres connection string (URI format, ?sslmode=require)
- `JWT_SECRET` (min 16 chars)
- `JWT_REFRESH_SECRET` (min 16 chars)
- `PORT` (optional, defaults to 8000)
