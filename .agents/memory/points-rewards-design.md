---
name: Points & Rewards system design
description: Product rules chosen when building the ServeNow points/loyalty feature from scratch (no spec existed).
---

Built because no backend existed at all (table, routes, service) — only a hardcoded "Points: 0" in the customer profile UI.

Rules chosen (no product spec was given, so these were picked as reasonable defaults):
- Earn: 1 point per ₹10 spent, awarded automatically when a partner marks a booking `completed` (hooked into `partner.service.ts` completeJob).
- Earning is idempotent per booking — a ledger lookup by `(userId, bookingId, type='earn')` prevents double-earning if completion logic ever runs twice for the same booking.
- Redeem: 1 point = ₹1, minimum redemption 100 points. Redeeming only records a ledger debit + returns a redeemable rupee value — it does NOT auto-apply a discount to any booking, since no coupon/discount-code system exists in the booking flow. That integration is a follow-up if the user wants redemption to actually reduce a booking price.
- Balance is always derived via `SUM(points)` over an append-only ledger table (`points_ledger`), not a cached counter — avoids drift, acceptable at this app's scale.

**Why:** user asked to "create it and test it" without specifying earn/redeem rules; rather than blocking on more questions, picked simple defaults and documented them so they can be revisited.
