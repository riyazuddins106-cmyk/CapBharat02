# Booking and Order Lifecycle

## Trigger

A customer selects one or more centrally managed services and submits checkout.

## Preconditions

Authenticated customer, valid address/service data, valid scheduled time, and
the appropriate catalog/price data.

## Step-by-step flow

1. Customer loads catalog/configuration.
2. Client submits legacy booking checkout or new order checkout.
3. Backend creates the booking/order and associated service lines/items.
4. New order items begin in `searching_partner` and dispatch is initiated.
5. Partner requests are accepted/rejected or operations can assign manually.
6. Item/order status is recomputed as work progresses.
7. Payment and service completion update item/order state.
8. Customer can review completed work where permitted.

## API Calls

`/api/booking-config`, `/api/bookings/*`, `/api/orders/*`,
`/api/operations/dispatch/*`, and partner job routes.

## Database Changes

Legacy path uses `bookings`/`booking_items`; newer path uses `orders`,
`order_items`, request tables, and item payment tables.

## Notifications

Notification behavior varies by event and service implementation; exact event
matrix is `UNKNOWN — REQUIRES VERIFICATION`.

## Business Rules

Partner choice is dispatch-driven. The newer order model can represent multiple
service items under one master order.

## Final State

Order/item records are completed, cancelled, or still in an active dispatch/
service state.

## Error Scenarios

Invalid catalog/address, unavailable partner, cancellation, payment failure,
expired auth, and database/provider failures.

## Related Source Files

`server/src/controllers/booking.controller.ts`,
`server/src/controllers/orders.controller.ts`,
`server/src/services/booking.service.ts`,
`server/src/services/orderDispatch.service.ts`.
