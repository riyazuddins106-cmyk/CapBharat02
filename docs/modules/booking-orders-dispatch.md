# Booking, Orders, and Dispatch Module

## Purpose

Represent customer service requests, match partners, and move work through
acceptance, arrival, payment, and completion.

## Responsibilities

- Legacy booking and booking-item operations
- New master order and per-service order-item checkout
- Partner request broadcast/accept/reject
- Automatic and manual dispatch
- Item cancellation and continue-searching
- Order status recomputation

## APIs

`/api/bookings`, `/api/orders`, `/api/partner`, and
`/api/operations/dispatch`.

## Database Tables

`bookings`, `booking_items`, `booking_partner_requests`,
`booking_assignment_logs`, `orders`, `order_items`, `order_item_requests`,
`order_item_payments`, `professionals`, `partner_services`.

## Business Rules

The legacy booking model remains in use alongside the newer itemized order
model. The order model stores a separate status and financial amount per
service item. Admin operational monitoring reads both models so a partner-visible
order-item request is not mistaken for a missing legacy booking dispatch row.

Itemized cancellation fees are configured in `booking_config` as a percentage
rate with minimum and maximum rupee bounds. After acceptance or check-in, the
fee is `MAX(minimum, MIN(rate × service amount, maximum))`, rounded to rupees and
capped at the service amount. No fee applies before partner acceptance.

## Important Source Files

- `server/src/controllers/booking.controller.ts`
- `server/src/controllers/orders.controller.ts`
- `server/src/services/booking.service.ts`
- `server/src/services/dispatch.service.ts`
- `server/src/services/orderDispatch.service.ts`
- `server/src/routes/booking.routes.ts`
- `server/src/routes/orders.routes.ts`
- `server/src/routes/dispatch.routes.ts`
- `server/src/database/schema/orders.ts`
- `server/src/database/schema/orderItems.ts`

## Related Workflows

[`../workflows/booking-order-lifecycle.md`](../workflows/booking-order-lifecycle.md),
[`../workflows/partner-dispatch-service.md`](../workflows/partner-dispatch-service.md)
