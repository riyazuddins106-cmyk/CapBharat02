---
name: Partner availability field name mismatch
description: partner.controller.ts updateAvailability read req.body.status but mobile sends req.body.availabilityStatus — controller now accepts both.
---

**Rule:** Partner availability controller must accept both `req.body.availabilityStatus` (mobile) and `req.body.status` (legacy) via `req.body.availabilityStatus ?? req.body.status`.

**Why:** The mobile partner app sends `{ availabilityStatus: 'available' | 'offline' | 'busy' }`, but the original controller read `req.body.status`. This caused "Invalid availability status." (400) for every availability toggle in the partner mobile app.

**How to apply:** Check `server/src/controllers/partner.controller.ts` updateAvailability handler. Fix: `const status = req.body.availabilityStatus ?? req.body.status;`.
