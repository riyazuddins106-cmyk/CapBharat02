# Active Task Tracker — ServeNow

> ⚠️ AI INSTRUCTION — MANDATORY, NO EXCEPTIONS:
> You MUST update this file after every completed step during a task.
> Do not finish a step and move on without updating the checklist below first.

---

## ▶ Current Task
**Task:** Send approved partner payouts through RazorpayX UPI
**Status:** COMPLETE

### Latest Git synchronization — 2026-08-04
- [x] Integrated Admin Panel and backend account-management changes on top of current GitHub `main`
- [x] Integrated remaining Customer Web and Customer Mobile refinements
- [x] Confirmed Partner Web and Partner Mobile work was already present on GitHub `main`
- [x] Integrated Expo API routing and workflow port refinements
- [x] Customer Web, Admin Web, and Partner Web production builds passed
- [x] Partner Mobile type check passed
- [x] Customer Mobile type check remains blocked by pre-existing `@servenow/shared` and `checkout.tsx` errors
- [x] Pushed and verified GitHub `main` at commit `e5c927233`
- [x] Left lockfile-only metadata churn uncommitted because it was unrelated to the app changes
- [x] Fixed Expo Go QR deep-link scheme from `exps://` to `exp://` after validating live manifests and bundles
- [x] Added Partner Mobile payout history parity with Partner Web, including payout notes, statuses, dates, pull-to-refresh, and immediate post-request updates

### Checklist
- [x] Add typed master-order and per-service APIs to customer and partner clients
- [x] Route customer cart checkout through `/orders/checkout`
- [x] Add customer web per-service order details and actions
- [x] Add partner mobile service-level requests and actions
- [x] Trigger per-service payment pending state at partner check-in
- [x] Add customer mobile per-service order details and actions
- [x] Add admin order hierarchy, earnings, refunds, and dispatch controls
- [x] Run focused verification and update project memory
- [x] Add partner service-job detail route, data, and mobile screen
- [x] Add provider-backed per-service payment and refund endpoints
- [x] Connect customer web and mobile payment sheets to item-level endpoints
- [x] Run current-contract service-order validation
- [x] Add admin-configurable booking hours and 24-hour mode
- [x] Add full legacy booking detail endpoint with customer, address, services, dispatch, assignment, and payment data
- [x] Add full service-order detail endpoint with complete order ID, customer/address, items, payment, and earnings data
- [x] Add Service Details actions to Booking History, Operations Centre, and Service Orders
- [x] Add admin Stop Searching and Cancel Booking controls with safe server-side state guards
- [x] Refresh admin data after successful operations and verify authenticated endpoints
- [x] Count completed, paid service-order payouts in partner earnings
- [x] Require confirmed customer payment before legacy earnings become withdrawable
- [x] Include legacy booking line-item partner payouts with a safe fallback for older bookings
- [x] Add available, pending, and paid-out balance fields to partner payout screens
- [x] Enforce a ₹100 minimum payout and available-balance validation server-side and client-side
- [x] Verify partner earnings and payout APIs with the seeded partner account
- [x] Add partner UPI payout destination to Partner Web and Partner Mobile
- [x] Add RazorpayX payout account number to Admin Payment Config
- [x] Create/reuse RazorpayX contacts and UPI fund accounts for partners
- [x] Send approved payouts through RazorpayX with idempotency protection
- [x] Store provider payout ID/status and failed payout reasons
- [x] Keep payout requests pending when RazorpayX rejects or is not configured
- [x] Add a server-aggregated Partner Payout Control Centre for large partner counts
- [x] Show total partners, this-month earnings, amount to pay, pending, and already-paid totals
- [x] Add server-side search, status filters, pagination, and lazy-loaded partner payout details
- [x] Show per-partner earnings, completed jobs, UPI destination, payout history, and RazorpayX references
- [x] Run migrations, rebuild affected apps, restart workflows, and smoke-test live APIs

### RazorpayX setup required before real transfers
- [ ] Enable RazorpayX Payouts for the Razorpay account
- [ ] Enter the RazorpayX Payout Account Number in Admin → Payment Config
- [ ] Disable Test / Sandbox Mode
- [ ] Have each partner save a valid UPI ID in their profile

### Automatic scheduled payouts
- [x] Add disabled-by-default weekly/monthly payout scheduler
- [x] Require Admin approval before a request can enter an automatic run
- [x] Add per-run payout-count and amount caps
- [x] Add PostgreSQL advisory lock and payout-run history
- [x] Recover interrupted processing requests after 15 minutes
- [x] Add Admin schedule controls, Run Now, recent run history, and Approve for schedule
- [x] Verify default-disabled settings and guarded manual-run response without sending money

### Expo Go bundle investigation (2026-08-04)
- [x] Confirmed both ngrok manifests were reachable; the failure was Metro bundling, not QR/tunnel connectivity.
- [x] Found Babel 8 transform plugins conflicting with the Expo SDK 54 Babel 7 toolchain.
- [x] Pinned the mobile transform plugins to Babel 7.29.7.
- [x] Added the missing Babel generator/traverse/types dependencies required by react-native-worklets 0.5.1 under pnpm.
- [x] Restarted both Expo workflows and verified customer and partner Android/iOS bundles return HTTP 200.

### Customer/partner order flow fixes (2026-08-04)
- [x] Loaded the MaterialCommunityIcons font used by customer category tiles; removed the duplicate subcategory floating cart.
- [x] Added service-order tracking details, full order IDs, cancellation details, and customer check-in QR display.
- [x] Added signed service-order QR tokens and required QR validation on partner check-in.
- [x] Replaced direct partner service-order arrival actions with the camera QR scanner.
- [x] Added optional cancellation reasons and recorded 25% post-acceptance / 50% post-check-in cancellation fees.
- [x] Applied idempotent cancellation columns and restarted API, Customer Expo, and Partner Expo workflows.

### Payment timing fix (2026-08-04)
- [x] Removed legacy Pay Now from confirmed/upcoming customer bookings.
- [x] Kept payment available after legacy partner check-in (`in_progress`) and for unpaid completed bookings.
- [x] Kept service-order payment available only after partner check-in (`payment_pending` / `partner_arrived`).
- [x] Enforced the same timing rules in legacy and service-order payment APIs.

### Partner request visibility (2026-08-04)
- [x] Added service-level request cards to the Partner Dashboard with request count, customer/service details, payout, and Accept/Reject actions.
- [x] Separated “New requests” and “Active Jobs” on Dashboard and “New service requests” from “In progress services” on Jobs.
- [x] Kept service-level requests visible in Jobs Active even when no legacy jobs exist; included payment-pending and payment-completed states.
- [x] Added service/customer names to the partner request API response and verified server/Partner Expo bundles.

### Web parity (2026-08-04)
- [x] Partner Web now consumes service-level request data on Dashboard and Jobs, with request counts, Accept/Reject, QR check-in, completion, polling, and active-state separation.
- [x] Customer Web now supports service-order customer QR display, cancellation-fee guidance/reason submission, and post-check-in legacy payment visibility.
- [x] Customer Web and Partner Web production builds pass.

### QR refresh (2026-08-04)
- [x] Regenerated Customer and Partner Expo QR PNGs from the currently active tunnels.
- [x] Replaced the legacy `show-qr.html` page with a no-cache redirect to the canonical live scanner page.

### Partner App icon rendering (2026-08-04)
- [x] Investigated missing Ionicons in the Partner Dashboard screenshot.
- [x] Increased the native icon-font loading grace period from 300ms to 3 seconds.
- [x] Restarted the Partner Expo workflow and verified Metro rebuilt cleanly.
- [x] Partner mobile TypeScript check and git diff check passed.

### Customer and Partner App icon rendering (2026-08-04)
- [x] Standardized the Customer App on `expo-font` for Google fonts plus Ionicons and MaterialCommunityIcons.
- [x] Kept a 3-second native icon-font grace period in both apps.
- [x] Restarted both Expo workflows and verified fresh Android/iOS or Metro bundles.
- [x] Verified both current Expo tunnel roots and both QR PNGs return HTTP 200.
- [ ] Customer app full TypeScript check remains blocked by unrelated pre-existing checkout typing errors.
- [x] Verified the uploaded Customer screenshot showed the remaining issue: font state could be loaded while visible glyphs were still blank.
- [x] Added font-independent native fallback icons for Customer/Partner tabs, Customer categories, and Partner dashboard surfaces.
- [x] Verified Customer web preview shows visible Home, Services, Bookings, and Profile icons; Partner check and both mobile bundles pass.

### Verification Notes
- Customer web production build passed.
- Admin panel production build passed.
- Main application workflow started successfully; API migrations completed and API is listening.
- Server build passes after correcting four logger call signatures in `server/src/controllers/payment.controller.ts`.
- API health and unauthenticated `/api/orders` protection smoke checks pass.

**Status:** COMPLETE for the requested implementation; real transfer execution requires RazorpayX Payouts to be enabled and configured.

### Previous Task — Complete
- [x] DB Schema: `orders.ts` — master order table + orderStatusEnum
- [x] DB Schema: `orderItems.ts` — per-service order_items table + orderItemStatusEnum
- [x] DB Schema: `orderItemRequests.ts` — per-item partner request tracking
- [x] DB Schema: `orderItemPayments.ts` — per-item payment records
- [x] Schema index.ts updated — all 4 new schemas exported
- [x] Migration added to `migrate.ts` — all 4 tables + indexes + enums (idempotent)
- [x] `orderDispatch.service.ts` — per-item broadcast, accept, reject, checkIn, complete
- [x] `orders.controller.ts` — checkout (uses max duration not sum), list, getById, cancelItem, continueSearching, getItemPayment, payItem, testPayItem
- [x] `orders.routes.ts` — all customer-facing order routes
- [x] `routes/index.ts` — `/api/orders` mounted
- [x] `partner.controller.ts` — listOrderItemJobs, acceptOrderItemJob, rejectOrderItemJob, checkInOrderItem, completeOrderItem
- [x] `partner.routes.ts` — /api/partner/order-item-jobs/* routes added
- [x] TypeScript check: clean (only pre-existing payment.controller.ts logger.warn errors remain)
- [x] Run migrations on DB — all 4 new tables created ✓
- [x] Secrets set — server running on port 8000 ✓

---

## 📋 Task History

| # | Task | Given By | Status | Date |
|---|------|----------|--------|------|
| 1 | Set up .ai-memory project continuity system | user | ✅ Done | 2026-08-02 |
| 2 | Enhance booking time logic with configurable minimum advance time | user | ✅ Done | 2026-08-02 |
| 3 | Full booking slot config enhancement (slotInterval, per-service advance in frontend) | user | ✅ Done | 2026-08-02 |
| 4 | Add all Supabase + JWT secrets, connect database | user | ✅ Done | 2026-08-02 |
| 5 | Fix Expo "failed to download" — unset REPLIT_EXPO_DEV_DOMAIN in both workflows | user | ✅ Done | 2026-08-02 |
| 6 | Complete AI memory system — 10 module INDEX files + GOTCHAS additions | user | ✅ Done | 2026-08-02 |
| 7 | Fix checkout → payment flow: 6 bugs fixed | user | ✅ Done | 2026-08-02 |
| 8 | Multi-service orders architecture (Task #2) | user | ✅ Done | 2026-08-03 |
