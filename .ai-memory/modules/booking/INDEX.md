# Module: Booking
**Status:** ✅ Complete

## Key Files
| File | Purpose |
|------|---------|
| `server/src/controllers/booking.controller.ts` | checkout, list, getById, cancel, reschedule |
| `server/src/services/booking.service.ts` | booking creation, status transitions |
| `server/src/routes/booking.routes.ts` | route bindings + public /booking-config |
| `server/src/routes/index.ts` | `GET /api/booking-config` public endpoint |
| `server/src/database/schema/bookings.ts` | bookings table |
| `server/src/database/schema/bookingItems.ts` | booking_items table |
| `apps/mobile/app/checkout.tsx` | mobile checkout flow (cart → address → date → slot → summary) |
| `apps/customer-web/src/app/CustomerApp.tsx` | web checkout flow (CheckoutFlow component) |
| `packages/shared/src/constants/timeSlots.ts` | TIME_SLOTS array + SLOT_HOURS map |

## Booking Config (stored in platform_settings key: 'booking_config')
```json
{
  "minAdvanceMinutes": 30,
  "sameDayBooking": true,
  "maxAdvanceDays": 30,
  "openingHour": 8,
  "closingHour": 20,
  "slotIntervalMinutes": 30
}
```
Admin configures at Admin Panel → Settings → Booking Settings. Changes apply immediately.

## Slot Disabling Logic (frontend)
- `disabledSlots` useMemo in both checkout files
- `effectiveMinAdvance = max(global minAdvanceMinutes, ...per-service overrides from cart items)`
- Cart API now returns `minAdvanceMinutes` per item (null = inherit global)
- Future dates: only business hours apply, not advance time

## Backend Validation (booking.controller.ts checkout, lines ~35–85)
Checks in order: past slot → same-day → max advance days → business hours → per-service effective min advance

## Public Endpoint
`GET /api/booking-config` — no auth required, used by checkout UI to load config.

## Time Slots
- Checkout generates start times at the configured interval (30 minutes by default).
- A start time is shown only when the longest service duration in the cart ends by the configured closing hour.
- The customer-facing service window is calculated as `start + max(cart item durations)` because services may run in parallel.
- Legacy fixed-slot exports remain only for backward compatibility.
