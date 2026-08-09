# Payments and Payouts Module

## Purpose

Collect customer payments and manage partner earnings and payout requests.

## Responsibilities

Razorpay/Stripe checkout and callbacks, webhook verification, test-mode
payments, cash/manual confirmation, payment records, payout requests, payout
batch scheduling, and partner earnings.

## APIs

Booking payment routes, order-item payment routes, payment provider webhooks,
partner earnings/payout routes, and admin payment/refund routes.

## Database Tables

`payments`, `order_item_payments`, `payout_requests`, `payout_runs`,
`order_items`.

## Important Source Files

- `server/src/controllers/payment.controller.ts`
- `server/src/routes/payment.routes.ts`
- `server/src/services/razorpayPayout.service.ts`
- `server/src/services/payoutScheduler.service.ts`
- `server/src/database/schema/payments.ts`
- `server/src/database/schema/payoutRequests.ts`
- `server/src/database/schema/payoutRuns.ts`

## Business Rules

Customer price and partner payout are distinct values. Never calculate partner
earnings from customer price when a stored payout is available.

## Related Workflows

[`../workflows/payment.md`](../workflows/payment.md),
[`../workflows/payout.md`](../workflows/payout.md)
