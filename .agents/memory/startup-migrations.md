---
name: Startup migrations
description: How this project keeps the Supabase schema aligned before serving API queries.
---

The development server runs the idempotent database migration before binding the API listener. This is required when Drizzle schema fields are added to an existing Supabase database.

**Why:** The TypeScript schema can compile while the existing database is missing new columns; serving requests first caused runtime 500 errors from missing availability fields.

**How to apply:** Keep migrations idempotent, use the project database secret contract, and run them before startup queries depend on newly added tables or columns.