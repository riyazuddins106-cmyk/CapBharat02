---
name: Scheduled partner payouts
description: Safety and operational rules for automatic RazorpayX partner payout runs.
---

Scheduled payouts are disabled by default and process only payout requests explicitly approved for schedule. Normal pending requests remain in the Admin review queue; immediate Admin Send remains available separately.

**Why:** Automatic payment must never interpret a partner request as approval to transfer money. Large runs also need caps, locking, and recovery to avoid duplicate or permanently stuck payouts.

**How to apply:** Keep weekly/monthly schedule settings in the platform settings store. Use a PostgreSQL advisory lock, per-run count/amount caps, a processing state, provider idempotency, payout-run history, and recovery of stale processing requests. Require RazorpayX Payouts configuration and Test Mode off before enabling.