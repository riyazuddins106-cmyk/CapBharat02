---
name: Partner search timer
description: Durable rules for customer-visible partner search windows across legacy and itemized bookings.
---

Persist the partner-search deadline on the job record and treat the client countdown as presentation only. Expire pending requests when the customer feed is refreshed, and enforce the deadline again in partner acceptance so stale requests cannot win a race.

**Why:** A timer held only in browser/mobile state resets across reloads and backgrounding, while partner requests can remain actionable after the customer sees the window as finished.

**How to apply:** New checkout and Continue Searching must calculate the deadline from the Admin booking configuration. Customer surfaces should show Searching plus remaining time while active, and expose Continue Searching only after expiry. For pre-deadline rows without a stored deadline, use a bounded fallback rather than searching indefinitely.