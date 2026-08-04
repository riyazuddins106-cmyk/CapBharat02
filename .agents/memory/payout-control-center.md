---
name: Partner payout control centre
description: Scaling and accounting rules for the Admin partner payout dashboard.
---

The Admin partner payout worklist must be server-aggregated and paginated. It summarizes one row per partner with completed paid earnings, current-month earnings, pending payout requests, paid-out requests, and available balance. Full payout history is fetched only for the selected partner.

**Why:** The marketplace may have more than 10,000 partners, so loading all payout requests or calculating totals in the browser will be slow and can double-count when earnings and payout history are joined directly.

**How to apply:** Aggregate earnings and payout requests independently by partner before joining them. Keep search, status filters, and pagination in the API. Preserve provider payout references and UPI destination in the lazy-loaded detail view.