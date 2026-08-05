---
name: Partner payout filter parity
description: Shared behavior required for payout date-range and status filters across Partner Web and Partner Mobile.
---

Partner Web and Partner Mobile payout history must provide the same local filters: Today as the default, one calendar for an inclusive start/end date range, and All statuses/Pending/Processing/Paid/Rejected status filtering. The All time date option is intentionally not part of the payout-history controls.

**Why:** Partners use both clients for the same operational workflow, so different filter behavior creates inconsistent payout-history results.

**How to apply:** Update both `apps/partner-web` and `apps/mobile-partner` whenever payout-history date or status filtering changes; keep backend payout data and status normalization consistent.