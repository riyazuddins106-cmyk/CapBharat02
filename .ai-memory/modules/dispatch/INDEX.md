# Module: Dispatch
**Status:** ✅ Complete

## Key Files
| File | Purpose |
|------|---------|
| `server/src/services/dispatch.service.ts` | core matching logic |
| `server/src/controllers/booking.controller.ts` | triggers dispatch after checkout |

## How It Works
1. Customer places booking → `booking.controller.ts` calls `dispatchService.dispatch(bookingId)`
2. Dispatch finds available partners whose skills match the booked service's `requiredSkill`
3. Sends push notifications to matched partners via Expo push API
4. Partner accepts → booking assigned → status changes to `confirmed`
5. If no partner accepts within deadline → dispatch_status = `no_partner_found`

## Key Fields on Bookings Table
- `dispatch_status`: `searching_partner` | `partner_found` | `no_partner_found`
- `assigned_by`: partner who accepted
- `dispatch_deadline`: when dispatch times out

## Partner Availability
- Partner must have `availability_status = 'available'` to receive dispatch
- Skills matched via `professionals.skills` array vs `services.required_skill`

## Duplicate Booking Guard
Booking controller blocks a second booking if customer already has a `pending/searching_partner` booking created in the last 5 minutes.
