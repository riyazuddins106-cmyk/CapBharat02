---
name: Env variable contract
description: The correct env variable names for this project — DATABASE_URL not SUPABASE_DATABASE_URL
---

The project was originally scaffolded with `SUPABASE_DATABASE_URL` but the Replit Secret is named `DATABASE_URL`.

**Rule:** Every file that reads the postgres connection string must use `process.env.DATABASE_URL` (or `env.DATABASE_URL` via the Zod env schema).

**Files that must use DATABASE_URL:**
- `server/src/config/env.ts` — Zod schema key
- `server/src/config/database.ts` — Drizzle ORM client
- `server/drizzle.config.ts` — drizzle-kit
- `server/src/database/migrate.ts` — raw migration script
- `server/src/database/reset.ts` — schema reset script
- `server/src/database/inspect.ts` — schema inspection script

**Why:** The Replit Secret was added as `DATABASE_URL`. Changing the secret name would require the user to re-enter credentials, so the code was updated to match the secret name instead.
