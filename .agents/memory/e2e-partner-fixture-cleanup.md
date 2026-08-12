---
name: E2E partner fixture cleanup
description: Prevents GPS dispatch tests from leaking partner profiles into Admin operations.
---

The GPS dispatch E2E fixture creates temporary partner users and professional
profiles. The professional `user_id` foreign key uses `ON DELETE SET NULL`, so
deleting the users alone leaves orphaned profiles that can appear as eligible
Admin partners.

**Why:** Orphaned E2E profiles look like real operational partners and can
produce repeated names in the Assign Partner modal after interrupted or
partially completed test runs.

**How to apply:** When cleaning a dispatch fixture, delete its assigned test
bookings and professional profiles before deleting the temporary users. Keep
fixture registration fields aligned with the live validator, including required
partner location fields such as city.