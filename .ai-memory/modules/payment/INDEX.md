# Module: Payments
**Status:** ✅ Complete

## Key Files
| File | Purpose |
|------|---------|
| `server/src/controllers/payment.controller.ts` | initiate, verify, webhook handlers |
| `server/src/database/seed-test-mode.ts` | enables test mode (skips real gateway) |
| `server/src/database/schema/payments.ts` | payments table |

## Test Mode
Run `pnpm --filter @servenow/server exec tsx src/database/seed-test-mode.ts` to enable test mode.
In test mode the gateway is bypassed — payments are auto-confirmed without hitting a real provider.

## Payment Flow
1. Customer completes checkout → booking created → payment initiated
2. Payment record created with status `pending`
3. Real mode: redirects to gateway → webhook confirms → status → `completed`
4. Test mode: auto-completes immediately

## Points Integration
Points are awarded when a partner marks a booking `completed` (hooked in `partner.service.ts`).
Earn rate: 1 point per ₹10 spent. See modules/points/INDEX.md for full rules.
