---
name: Partner payout accounting
description: Rules for calculating partner earnings and withdrawal balances.
---

Partner earnings must be calculated from the configured partner payout, never the customer price. Legacy bookings require completed status and a paid booking payment; use booking-item partner payouts when present and fall back to the legacy booking amount only for old records without item rows. Service-order items require `service_completed` and a paid item payment. Withdrawable balance is total confirmed earnings minus pending and paid payout requests.

**Why:** ServeNow has two booking systems with different payout storage, and service orders can reach completion while payment is still unresolved.

**How to apply:** Keep the accounting rules in the server repository/service. Partner clients should display total, pending, paid, and available balances, enforce the ₹100 minimum in the UI, and rely on the server as the final amount guard.

Razorpay customer checkout credentials are separate from RazorpayX outbound payouts. A real payout requires RazorpayX Payouts access, the Admin-configured RazorpayX payout account number, and a partner UPI ID. Reuse provider contact/fund-account IDs when available and only mark a payout paid after receiving a provider payout ID.

**Why:** An Admin payment configuration can be valid for collecting customer payments while still lacking RazorpayX payout permissions or the payout account number.

**How to apply:** Keep payout approval provider-backed and idempotent. Failed provider calls must leave the request pending with a failure reason instead of marking it paid.