---
name: Service categories column drift
description: service_categories and sub_service_categories can be missing featured and image_url columns when DB was pre-existing and drizzle-kit push reported no changes.
---

## Rule
When deploying to a Supabase DB that already has `service_categories`, drizzle-kit push may report "No changes detected" yet the table is missing newer columns (`featured`, `image_url`). The migration SQL (0000_public_mole_man.sql) predates those columns.

**Why:** The old migration file created the table without these columns; subsequent schema additions were never captured in a new migration file, and drizzle-kit push against the Supabase pooler (port 6543) can silently match an incomplete schema.

**How to apply:** Run `npx tsx src/database/run-column-migration.ts` from the `server/` directory — uses `ADD COLUMN IF NOT EXISTS` so safe to re-run. Verify with `curl localhost:8000/api/categories`.
