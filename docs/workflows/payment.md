# Payment Workflow

## Trigger

A customer pays for a booking/order item, or an admin/partner confirms a
supported manual payment.

## Preconditions

The payment target exists and the selected provider/method is enabled. Provider
credentials and webhook configuration must exist outside source.

## Step-by-step flow

1. Client loads payment configuration.
2. Backend creates a provider checkout/session or accepts a test/manual path.
3. Provider redirects/callbacks or sends a webhook.
4. Backend verifies signatures using the raw request body where required.
5. Payment record is updated to `paid`, `failed`, or `refunded`.
6. Related booking/order-item state is advanced.

## API Calls

Booking payment endpoints, order-item payment endpoints, Razorpay callback/
webhook, and Stripe success/webhook endpoints.

## Database Changes

`payments` for legacy booking payments and `order_item_payments` for itemized
payments.

## Notifications

Exact payment notification events are `UNKNOWN — REQUIRES VERIFICATION`.

## Business Rules

Provider signature verification is required for webhook-driven state changes.
Customer price and partner payout are separate values.

## Final State

Payment is created, paid, failed, or refunded, with related service state
updated where applicable.

## Error Scenarios

Invalid signature, provider failure, duplicate webhook, invalid target, and
payment state conflict.

## Related Source Files

`server/src/controllers/payment.controller.ts`,
`server/src/routes/payment.routes.ts`,
`server/src/app.ts`.
