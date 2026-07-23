---
name: Category serviceCount live query
description: The service_count column in service_categories drifts from actual data. Fixed by computing live in findAll().
---

The `service_count` column in `service_categories` is a stored integer seeded at import time and does not update when services are added/deleted via admin.

**Why:** Laundry was seeded with serviceCount=55 (placeholder) but had 0 real services. The mobile app filtered categories by `serviceCount > 0`, so Laundry passed the filter but showed an empty service list when tapped.

**Fix:** `server/src/repositories/category.repository.ts` `findAll()` now does a LEFT JOIN to the services table and computes `COUNT(CASE WHEN is_active = true THEN 1 END)` live, overriding the stored column. 6 real Laundry services added via `server/src/database/seed-laundry.ts`.

**How to apply:** The stored `service_count` column is now irrelevant for display — the live JOIN is the source of truth. Any admin CRUD on services automatically reflects in the category count.
