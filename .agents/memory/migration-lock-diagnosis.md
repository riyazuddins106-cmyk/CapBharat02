---
name: Migration lock diagnosis
description: Diagnose Supabase startup migrations that wait indefinitely on relation locks.
---

The API binds its listener only after the idempotent startup migration completes. If health remains 503 and migration output stops on an index or ALTER TABLE statement, inspect PostgreSQL activity and lock waiters before restarting again.

**Why:** An older application query can keep an open transaction and hold an `AccessShareLock` on a table such as `professionals`; repeated migration attempts then queue behind it and make the API look hung.

**How to apply:** Use `pg_stat_activity` plus `pg_locks` to identify the blocked migration PIDs and the blocking stale application PID. Terminate only those confirmed stale sessions, then let one clean migration process complete. Do not terminate unrelated active sessions or run overlapping migrations.