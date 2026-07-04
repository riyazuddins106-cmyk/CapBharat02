---
name: SUPABASE_URL vs SUPABASE_DATABASE_URL
description: These are two different things; confusing them breaks the app.
---

# SUPABASE_URL vs SUPABASE_DATABASE_URL

**SUPABASE_URL** = the REST project URL: `https://xxx.supabase.co`
- Used by `@supabase/supabase-js` client for Auth and Storage APIs
- Must NOT be a postgres connection string

**SUPABASE_DATABASE_URL** = the Postgres connection string: `postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres?sslmode=require`
- Used by Drizzle ORM via the `postgres` npm package
- Must NOT be the REST URL

**Why:** Both look like URLs so users frequently mix them up. The Zod schema in `env.ts` validates `SUPABASE_URL` as a URL (it would accept either), so the mistake won't be caught at startup.

**How to apply:** When asking the user for Supabase credentials, explicitly say "SUPABASE_DATABASE_URL is the connection string from Settings → Database → URI, not the project URL."
