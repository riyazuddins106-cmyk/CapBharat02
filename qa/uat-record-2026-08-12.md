# ServeNow UAT Record — 2026-08-12

## Scope

This UAT was performed against the reset development database after the user
confirmed that all existing development data was disposable. The goal was to
create fresh records through real Customer, Partner, Admin, dispatch, payment,
and order operations, then retain the resulting records for review.

## Database reset

- Removed rows from all 37 public application tables.
- Preserved the database schema and Drizzle migration ledger.
- Reseeded:
  - 6 service categories
  - 12 services
  - Admin, Customer, and Partner baseline accounts
  - One active, available partner qualified for AC Service
  - Payment test mode
- No item remained stuck in the itemized `assigned` state after UAT.

## UAT and regression results

| Area | Result |
|---|---:|
| Legacy booking payment flow | 21 passed, 0 failed |
| Itemized UAT: Admin controls, manual assignment, cash lifecycle | 32 passed, 0 failed |
| Itemized UAT: partner acceptance, payment, refund | Included in the 32 checks |
| Itemized contract smoke test | 17 passed, 0 failed |
| Admin browser features | 17 passed, 0 failed |
| API CRUD regression | 71 passed, 0 failed |
| GPS dispatch regression | 66 passed, 0 failed |
| Full legacy flow regression | 45 passed, 0 failed, 3 expected skips |
| Server TypeScript build | Passed |
| `git diff --check` | Passed |

The UAT-specific itemized flow verified:

1. Customer registration and OTP verification.
2. Catalog lookup and itemized checkout.
3. Admin eligible-partner lookup.
4. Admin Stop searching.
5. Admin Restart Dispatch.
6. Admin manual assignment.
7. Customer item QR generation.
8. Partner item check-in.
9. Customer cash payment reporting.
10. Partner cash confirmation.
11. Partner service completion.
12. Automatic partner request acceptance on a second item.
13. Non-cash test payment.
14. Admin refund of a paid item.
15. Admin unpaid-item cancellation.
16. Customer and Admin order/payment verification.

## Retained UAT records

### Legacy booking

- Booking ID: `8dcf41cd-a759-4499-9cf7-a0d29a5e53e5`
- Final status: `completed`
- Payment: `paid`, method `cash`
- Coverage: customer checkout, dispatch, partner acceptance, QR check-in,
  completion, Pay Now state, payment submission, and Admin payment stats.

### Itemized manual-assignment lifecycle

- Order ID: `78eda5f8-731f-44f8-89bb-b55c1f1cf3a5`
- Item ID: `19f5bed8-f00d-4020-9bda-7d7f8f8632bc`
- Final order status: `completed`
- Final item status: `service_completed`
- Payment: `paid`, method `cash`

### Itemized partner-acceptance/refund lifecycle

- Order ID: `9db79e40-b826-4d28-b7a0-d981d4217a77`
- Item ID: `aed5a080-055d-4941-a20b-ce8cd02fc77e`
- Final order status: `completed`
- Final item status: `cancelled` after refund
- Payment: `refunded`, method `upi_manual`

### Repaired pre-fix UAT record

One record created before the manual-assignment fix was intentionally retained
and repaired instead of deleted:

- Order ID: `8ebea3e6-ce1d-4690-9e1c-f7a6c762061f`
- Item ID: `3725dba3-9692-49f5-8970-8c7eee4899a5`
- Final item status: `service_completed`
- Payment: `paid`, method `cash`

## Defect found and fixed during UAT

Admin manual assignment left an item in `assigned`, but itemized QR generation,
partner active-job visibility, and check-in require `partner_accepted`. This
blocked a manually assigned service from proceeding.

Fixes:

- `server/src/services/orderDispatch.service.ts`
  - Manual assignment now transitions the item to `partner_accepted`.
- `server/src/e2e/order-item-flow.e2e.ts`
  - The smoke test now verifies that payment is correctly rejected before
    partner check-in instead of treating that valid guard as a failure.
- `server/src/e2e/dispatch.e2e.ts`
  - GPS fixtures now resolve catalog IDs by name instead of using stale UUIDs
    from the pre-reset database.

## Remaining limitations

- Live Razorpay/Stripe payments and refunds were not executed because provider
  credentials and live test configuration are not available.
- Live RazorpayX payout transfer was not executed.
- Binary upload, customer review moderation, partner issue/evidence creation,
  and Admin account-management mutation flows remain outside this UAT run.
- Mobile Expo UI interaction was not run as part of this database UAT; mobile
  TypeScript validation remains previously verified.

## Final status

**UAT PASSED for the exercised development scope.**

All exercised flows passed with no known regression after the manual-assignment
fix. The retained data is suitable for Admin, Customer, and Partner review.