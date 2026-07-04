---
name: SUPABASE_URL vs DATABASE_URL
description: Common misconfiguration — user may set SUPABASE_URL to the postgres string instead of the REST URL
---

**Rule:** `SUPABASE_URL` must be the Supabase project REST URL in the format `https://xxxx.supabase.co`. It is **not** the postgres connection string.

**Why:** The Supabase JS client (`@supabase/supabase-js`) uses `SUPABASE_URL` to make HTTP calls to the REST API and Storage API. If set to a `postgresql://` connection string, the storage bucket setup will fail with: `Request cannot be constructed from a URL that includes credentials: postgresql://...`

**Observed symptom:**
```
[storage] Failed to list buckets: Request cannot be constructed from a URL that includes credentials: postgresql://...
```

**Fix:** Ask the user to update the `SUPABASE_URL` secret to their Supabase project URL (found in Supabase dashboard → Settings → API → Project URL). The core database API still works when this is wrong because it uses `DATABASE_URL` directly via Drizzle ORM.
