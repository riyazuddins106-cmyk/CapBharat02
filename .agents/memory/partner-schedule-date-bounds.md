---
name: Partner Schedule date bounds
description: Date filtering rule for the Partner Mobile Schedule endpoint.
---

When filtering PostgreSQL timestamp columns from Partner Mobile’s date-only Schedule range, convert the calculated bounds to ISO strings and explicitly cast them to `timestamptz` inside raw Drizzle SQL fragments.

**Why:** Passing JavaScript `Date` objects directly into those raw comparison fragments caused the Schedule request to fail at runtime.

**How to apply:** Preserve the UTC start-of-day/end-of-day boundaries generated from the client’s `YYYY-MM-DD` values, and use the explicit cast for both legacy bookings and service-order items.