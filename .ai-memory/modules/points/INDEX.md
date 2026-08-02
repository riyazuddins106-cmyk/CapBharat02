# Module: Points & Rewards
**Status:** ✅ Complete

## Key Files
| File | Purpose |
|------|---------|
| `server/src/controllers/points.controller.ts` | balance, history, redeem |
| `server/src/database/schema/pointsLedger.ts` | append-only ledger table |
| `apps/mobile/app/(tabs)/points.tsx` | customer points screen |

## Business Rules (chosen defaults — no spec was given)
| Rule | Value |
|------|-------|
| Earn rate | 1 point per ₹10 spent |
| When earned | When partner marks booking `completed` |
| Redeem rate | 1 point = ₹1 |
| Minimum redemption | 100 points |
| Balance source | Live `SUM(points)` over ledger — no cached counter |

## How Earning Works
- Hooked into `partner.service.ts` `completeJob()`
- Idempotent: checks for existing `(userId, bookingId, type='earn')` ledger entry before inserting
- Prevents double-earning if completion runs twice for same booking

## How Redeeming Works
- Records a ledger debit + returns redeemable rupee value
- Does NOT auto-apply a discount to a booking (no coupon integration yet)
- Redemption shown at checkout as optional — customer chooses how many points to use

## API Routes
```
GET  /api/points/balance     → { balance, totalEarned, totalRedeemed }
GET  /api/points/history     → ledger entries
POST /api/points/redeem      → { points } → { rupeesValue }
```
