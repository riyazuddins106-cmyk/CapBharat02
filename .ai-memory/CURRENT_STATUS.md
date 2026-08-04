# ServeNow — Current Status
> Update this file at the end of every session. It is the fastest way for a new session to know what's done and what's next.

---

## Overall Completion: ~99%

The service-level order implementation is complete for customer web/mobile, partner mobile, provider-backed payment/refund handling, payment gating, admin controls, and admin-configurable booking hours. The main customer web/API/admin workflows are running in preview. The current-contract order-item flow passes 17/17 checks; live gateway transactions still require Razorpay/Stripe provider configuration.

---

## ✅ Completed Features

### Backend (server/)
- [x] JWT auth with access + refresh tokens (OTP email verification)
- [x] User roles: admin / customer / partner
- [x] Service catalog: categories, sub-categories, services, service details
- [x] Bookings: create, view, cancel, reschedule, QR check-in
- [x] Dispatch engine: auto-matches available partners by skills
- [x] Partner management: availability, skills, jobs, earnings, payouts
- [x] Payments: test mode + real gateway hooks
- [x] Points & Rewards: earn on booking, redeem at checkout (1pt/₹10 earn, 1pt=₹1 redeem, min 100)
- [x] Reviews: customers rate completed bookings
- [x] Offers & Coupons: admin creates, customers apply at checkout
- [x] Favorites & Wishlists
- [x] Addresses: CRUD with default address
- [x] Notifications: in-app + Expo push notifications
- [x] Support tickets
- [x] Platform policies (terms, privacy, etc.)
- [x] Platform settings (admin-controlled)
- [x] Reels: short video content for services
- [x] Audit logs (admin)
- [x] Admin stats dashboard

### Customer Web (apps/customer-web)
- [x] Browse categories & services
- [x] Book a service
- [x] My bookings
- [x] Profile & addresses
- [x] Points balance

### Admin Panel (apps/admin-web)
- [x] Stats dashboard
- [x] User management
- [x] Booking management
- [x] Professional management
- [x] Category & service management
- [x] Offers management
- [x] Payout management
- [x] Audit logs
- [x] Platform settings

### Partner Web (apps/partner-web)
- [x] Partner portal (view jobs, manage availability)

### Customer Mobile (apps/mobile)
- [x] Auth (login, register, OTP verify)
- [x] Home with categories + reels
- [x] Sub-categories drill-down
- [x] Service listing & detail
- [x] Booking & checkout (with points redemption)
- [x] My bookings with QR code
- [x] Addresses
- [x] Wishlist / Favorites
- [x] Points & Rewards screen
- [x] Notifications
- [x] Help & Support (tickets)
- [x] Privacy & Security

### Partner Mobile (apps/mobile-partner)
- [x] Auth
- [x] Job list (new / accepted / completed)
- [x] Job acceptance / check-in (QR scan) / completion
- [x] Document upload
- [x] Notifications

### Service-level order completion (2026-08-04)
- [x] Added full partner service-job detail route and screen, including pending request accept/reject, customer contact/address, timing, notes, payout, payment status, check-in, and completion.
- [x] Added per-service Razorpay order creation/signature verification and Stripe Checkout session/success handling.
- [x] Added provider-aware admin refunds for real Razorpay/Stripe payments, with status-only handling for cash/test payments.
- [x] Customer web and mobile service payment sheets now use item-level payment endpoints instead of silently defaulting to legacy booking cash payment.
- [x] Current-contract smoke test: 17/17 passed across health, auth, multi-service cart, `/orders/checkout`, item listing, cancellation, continue-searching, test payment, and auth protection.
- [!] Existing legacy `full-flow.e2e.ts` and `dispatch.e2e.ts` scripts still assert retired booking/cart contracts and were not used as release gates.

### Admin-configurable booking hours (2026-08-04)
- [x] Admin Booking Settings now supports custom windows such as 09:00–18:00 or 09:00–21:00.
- [x] Added a 24-hour booking switch; when enabled, customer web/mobile can select overnight starts such as 03:00 and 23:30.
- [x] Backend validation uses the same setting for both current multi-service checkout and legacy single-service checkout.
- [x] Partner acceptance remains controlled by partner availability, service skill, location, and dispatch eligibility; booking hours do not force an unavailable partner to accept.
- [x] Server, customer web, admin web, both mobile web exports, runtime health, and slot-generation checks passed.

### Expo Go “failed to download” investigation (2026-08-04)
- [x] Confirmed the Customer and Partner ngrok manifests were reachable with HTTP 200, so the QR/tunnel was not the root cause.
- [x] Root cause was Metro’s Babel graph: both Expo apps declared Babel transform plugins at 8.x while Expo SDK 54/Reanimated/Worklets use Babel 7. The generic Expo Go error was a Metro HTTP 500.
- [x] Pinned the three mobile transform plugins to Babel 7.29.7 and added a pnpm package extension supplying Babel 7 generator, traverse, and types modules omitted by react-native-worklets 0.5.1.
- [x] Restarted both Expo workflows; Customer and Partner Android and iOS bundles return HTTP 200 and Metro reports successful bundling.
- [x] Verified web entry points: customer `/`, partner `/partner/`, admin `/admin-panel/` on the current Replit development domain.

### Customer/partner order flow fixes (2026-08-04)
- [x] Customer category icons now include the MaterialCommunityIcons font; the stale `professional/[id]` route registration was removed.
- [x] Customer service-order cards now expose full order IDs, service details, status tracking, cancellation reason/fee, and a short-lived check-in QR.
- [x] Service-order QR tokens are signed for the specific order item and required by the backend before partner check-in.
- [x] Partner service-order requests and detail screens now open a camera QR scanner instead of allowing direct “Mark Arrived”.
- [x] Cancellation reasons are optional, including empty notes; the backend records 25% fee after partner acceptance and 50% after partner check-in.
- [x] Migration, API health, Customer/Partner Metro ports, and changed server/partner TypeScript checks passed. The customer TypeScript command still reports unrelated pre-existing checkout/shared-package errors.

### Payment timing fix (2026-08-04)
- [x] Removed the Customer legacy Pay Now action from confirmed/upcoming bookings.
- [x] Legacy payment is available after partner check-in (`in_progress`) and remains available for unpaid completed bookings.
- [x] Service-order payment is available only after partner check-in (`payment_pending` / `partner_arrived`).
- [x] Backend payment endpoints now reject payment attempts before those states instead of relying only on UI visibility.

### Partner request visibility (2026-08-04)
- [x] Partner Dashboard now fetches service-level requests and shows a “New requests” queue with count, service/customer, schedule, payout, and Accept/Reject actions.
- [x] Dashboard also shows accepted service jobs alongside legacy active jobs.
- [x] Partner Jobs Active now labels separate “New service requests” and “In progress services” sections and no longer shows a false empty state when only service jobs exist.
- [x] Partner backend includes service/customer labels and retains jobs through `partner_accepted`, `payment_pending`, `payment_completed`, and `service_started`.
- [x] Server and Partner mobile TypeScript checks pass; Partner Expo web bundle completed successfully.

### Web parity (2026-08-04)
- [x] Partner Web Dashboard and Jobs now load `/api/partner/order-item-jobs` alongside legacy jobs.
- [x] Partner Web supports service-request Accept/Reject, QR check-in, completion, 30-second refresh, and separate New Requests/In Progress sections.
- [x] Customer Web service-order cards now show customer check-in QR, cancellation-fee guidance, and optional cancellation reasons.
- [x] Customer Web legacy Pay Now is hidden until `in_progress` (or unpaid `completed` compatibility state), matching mobile and backend guards.
- [x] `pnpm --filter @servenow/customer-web build` and `pnpm --filter @servenow/partner-web build` pass.

### QR refresh (2026-08-04)
- [x] QR Codes workflow serves current Customer and Partner tunnel QR codes at `/scanner.html`.
- [x] `/show-qr.html` now redirects to `/scanner.html`, preventing stale embedded Expo URLs from being shown.
- [x] QR PNGs were regenerated and visually verified.

### Admin service details and operations controls (2026-08-04)
- [x] Added `GET /api/admin/bookings/:id` with the complete legacy booking record, customer/contact, address, service items, partner requests, assignment history, and payments.
- [x] Added `GET /api/admin/orders/:orderId` with the complete master order ID, customer/contact, address, service items, payment status, and earnings breakdown.
- [x] Booking History and Operations Centre now expose a Service Details action with a full-screen detail view.
- [x] Service Orders now expose full service-order details instead of only the shortened table ID.
- [x] Operations Centre now supports Stop Searching and Cancel Booking with confirmation, refresh, and backend state restrictions.
- [x] Stop Searching expires pending partner requests and records a `SEARCH_STOPPED` assignment event; admin cancellation expires requests, releases assigned partners, and sets dispatch status to cancelled.
- [x] Admin Web build, server TypeScript check, API health, authenticated detail endpoints, and dispatch listing smoke tests passed.

### Partner payout balance correction (2026-08-04)
- [x] Partner earnings now include completed service-order items using their stored `partnerPayout` multiplied by quantity.
- [x] Service-order earnings require both `service_completed` status and a paid order-item payment.
- [x] Legacy earnings require a completed booking and a paid customer payment; booking-item partner payout is used when available, with the legacy booking price as fallback.
- [x] Partner Web and Partner Mobile now show available, pending, and paid-out balances.
- [x] Payout requests enforce a ₹100 minimum and cannot exceed the available confirmed balance.
- [x] Server, Partner Web, Partner Mobile TypeScript checks and Partner Web build passed.
- [x] Live seeded-partner smoke test returned the new balance fields successfully.

### RazorpayX UPI partner payouts (2026-08-04)
- [x] Reused the existing Admin → Payment Config Razorpay Key ID and Secret instead of adding a second payment integration.
- [x] Added partner payout UPI ID capture in Partner Web and Partner Mobile.
- [x] Added RazorpayX Payout Account Number configuration in Admin Payment Config.
- [x] Admin approval now creates/reuses a RazorpayX contact and UPI fund account, then creates the payout with an idempotency key.
- [x] Payout requests are marked `paid` only after RazorpayX returns a provider payout ID.
- [x] Provider payout ID, provider status, destination UPI ID, and failure reason are visible to Admin.
- [x] Failed or unconfigured RazorpayX payouts remain pending and record the failure reason.
- [x] Added idempotent schema migration for payout destination and provider-tracking fields.
- [x] Server, Admin Web, Partner Web, and Partner Mobile checks passed; workflows restarted; live partner profile/earnings/payout APIs passed.
- [ ] RazorpayX Payouts must be enabled and the RazorpayX account number entered before real money can be sent.

### Partner payout control centre (2026-08-04)
- [x] Replaced the Admin payout navigation target with a server-aggregated partner worklist suitable for 10,000+ partners.
- [x] Added KPI cards for partner count, current-month earnings, amount available to pay, pending payout requests, and already-paid amount.
- [x] Added server-side search by partner/email/UPI, payable/pending/missing-UPI filters, and 25/50/100-row pagination.
- [x] Added lazy-loaded partner detail drawer with earnings, completed jobs, UPI destination, payout history, provider references, and Send/Reject actions.
- [x] Live smoke test returned 93 partners, ₹1,860 current-month earnings, ₹5,941 available, ₹200 pending, and ₹700 paid for seeded data.
- [x] Server TypeScript check, Admin production build, API smoke test, workflow restart, and git diff check passed.

### Automatic scheduled partner payouts (2026-08-04)
- [x] Added a disabled-by-default weekly/monthly scheduler inside the API process.
- [x] Automatic runs process only payout requests explicitly marked `approved`; ordinary pending requests remain under Admin review.
- [x] Added per-run maximum payout count and rupee amount caps, PostgreSQL advisory locking, and database payout-run history.
- [x] Added `processing` state with 15-minute recovery to `approved` after an interrupted server/process run.
- [x] Added Admin controls for enable/disable, weekly or monthly schedule, UTC run hour, limits, Run approved payouts now, and recent run history.
- [x] Added Admin Approve for schedule action while preserving immediate Send via RazorpayX.
- [x] Server/Admin checks passed; migration completed; workflow restarted; schedule API returned enabled=false by default; guarded manual run returned skipped without sending money.
- [ ] Before production use: enable RazorpayX Payouts, configure the account number, turn off Test Mode, save the schedule, and approve payout requests.

### Partner App icons (2026-08-04)
- [x] Fixed blank dashboard/tab Ionicons caused by the Partner App rendering after a 300ms font timeout, before the Ionicons font had loaded.
- [x] Native timeout is now 3 seconds; web timeout is 1 second, preserving tunnel resilience without sacrificing icon loading.
- [x] Restarted Expo Partner App; Metro is running and the current partner QR remains `exps://arose-unframed-eclipse.ngrok-free.dev`.

### Customer and Partner App icons (2026-08-04)
- [x] Customer App now uses the same explicit `expo-font` loader pattern for Google fonts, Ionicons, and MaterialCommunityIcons.
- [x] Both native apps wait up to 3 seconds for icon fonts before using the fallback render path.
- [x] Both Expo workflows restarted successfully; Customer Android/iOS bundles completed and Partner Metro is serving.
- [x] Customer and Partner tunnel roots and the current scanner QR assets returned HTTP 200.
- [ ] Customer mobile `tsc --noEmit` still reports unrelated pre-existing checkout errors (`@servenow/shared`, cart declaration order, implicit callback types).
- [x] Added font-independent `NativeIcon` fallbacks after the uploaded Customer screenshot showed blank visible glyphs despite `fontsLoaded: true`.
- [x] Customer home category tiles now use the native fallback instead of allowing a broken category image URL to mask the icon.
- [x] Customer web preview visibly renders bottom-tab icons; fresh Customer Android/iOS bundles completed; Partner type check passed.

---

## ⚠️ Pending / Needs Attention

| Item | Details |
|------|---------|
| **Live gateway verification** | Execute a real Razorpay/Stripe transaction and provider refund after enabling provider credentials in Admin → Payment Config. |
| **Partner overnight staffing** | 24-hour customer booking permits overnight requests, but partners still need to mark themselves available and be eligible for the requested service/time. |
| **Email (SMTP)** | Optional — OTP codes log to console if not set. |
| **EAS projectId** | Not set — push tokens use Expo Go anonymous identity. Needed only for standalone builds. |
| **Dependencies** | Run `pnpm install --frozen-lockfile` before first start. |

---

## 🔄 Last Session Summary (2026-08-04)
- GitHub `main` is synchronized with the Repl at commit `e5c927233`.
- The pushed history preserves GitHub's newer marketplace/mobile commits and adds the Admin Panel/backend work plus the remaining Customer Web, Customer Mobile, and Expo routing refinements.
- Partner Web and Partner Mobile had no remaining source differences and were already present on GitHub.
- Customer Web, Admin Web, and Partner Web production builds passed; Partner Mobile type checking passed.
- Customer Mobile type checking still reports pre-existing errors in `app/checkout.tsx` and cannot resolve `@servenow/shared`; these errors are unrelated to the icon fallback changes.
- The local tree is clean. A lockfile-only metadata difference remains on the preserved local comparison branch and was intentionally not pushed.


### Task: Add Admin service detail views and booking operations controls
- Added full legacy booking and service-order detail APIs for the Admin Panel.
- Added Service Details actions to Booking History, Operations Centre, and Service Orders.
- Added Stop Searching and Cancel Booking operations with confirmation and automatic refresh.
- Verified admin-authenticated booking detail, order detail, and dispatch endpoints against seeded data.

### Task: Make partner payout balances include completed service orders
- Corrected partner earnings aggregation across legacy bookings and service-order items.
- Added payment-confirmed gating, available/pending/paid-out balance visibility, and withdrawal limits.
- Verified the live seeded partner response: earnings and payout endpoints returned successfully with the new balance fields.

### Task: Send approved partner payouts through RazorpayX UPI
- Connected the existing Admin Razorpay configuration to an outbound RazorpayX UPI payout flow.
- Added partner UPI destination management, RazorpayX recipient reuse, idempotency, transfer references, and failure tracking.
- Verified all affected builds/type checks, migrations, workflow restarts, and live partner API responses.

### Task: Diagnose Expo Go download failure
The QR codes and ngrok manifests were healthy. The actual failure was Metro returning a transform error from an incompatible Babel 8/Babel 7 dependency mix, followed by missing Babel modules in the strict pnpm package layout. The targeted Babel 7 pin and Worklets package extension fixed both mobile apps; Android/iOS bundle checks passed for Customer and Partner.

### Earlier task: Fix checkout → payment flow (6 bugs)

### Task: Fix checkout → payment flow (6 bugs)
**Server — `server/src/controllers/payment.controller.ts`:**
- Removed booking status gate (`in_progress/completed` only) — now allows payment on any non-cancelled booking
- `getPaymentForBooking` returns null (200) instead of 404 when no payment record exists yet
- Razorpay test-mode: short-circuits before calling real SDK, returns fake order
- Stripe test-mode: short-circuits before calling real SDK, returns `testMode: true`

**Frontend — `apps/customer-web/src/lib/api.ts`:**
- Added `testMode` field to `getPaymentConfig` return type
- Added `bookingsApi.testPay(id, method)` — calls `/bookings/:id/test-pay`
- Added `bookingsApi.createStripeSession(id)` — calls `/bookings/:id/stripe/create-session`

**Frontend — `apps/customer-web/src/app/CustomerApp.tsx`:**
- `PaymentModal.handlePay`: detects `testMode` → calls `testPay` instead of real gateways
- `PaymentModal.handlePay`: added Stripe branch → calls `createStripeSession`, redirects to `checkoutUrl`
- Fixed null `proName` crash in PaymentModal header
- "Pay Now" button in My Bookings now shows for `pending` bookings too (not just upcoming/in_progress/completed)
- Added `onPaymentComplete` callback to `CheckoutFlow` — after payment, closes cart and navigates to Bookings tab with refreshed data

### Task: Dynamic 30-minute booking start times and longest-duration windows (2026-08-03)
- Replaced stale fixed-slot checkout references with the shared 30-minute slot generator.
- Both customer web and mobile now honor the configured `slotIntervalMinutes` and only show starts that fit the longest service duration before closing.
- Checkout summaries and expected-window displays now use the longest parallel service duration rather than a summed duration.
- Aligned public API, admin settings, and client fallback defaults to a 30-minute interval.
- Customer web now declares its workspace dependency on `@servenow/shared`.
- Customer web and admin production builds passed; main workflow migrations and API startup passed.
- Server build remains blocked by four pre-existing logger signature errors in `server/src/controllers/payment.controller.ts`.

### Task: Booking slot config enhancement
- `server/src/controllers/cart.controller.ts` — added `minAdvanceMinutes` per cart item
- `server/src/controllers/platformSettings.controller.ts` — added configurable `slotIntervalMinutes` to default
- `apps/admin-web/src/app/App.tsx` — added Slot Duration slider in Booking Settings
- `apps/mobile/lib/api.ts` + `apps/mobile/app/checkout.tsx` — effectiveMinAdvance from cart items
- `apps/customer-web/src/lib/api.ts` + `apps/customer-web/src/app/CustomerApp.tsx` — same

### Task: Secrets + database connected
- All 8 secrets added: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, NGROK_AUTHTOKEN, NGROK_AUTHTOKEN_2
- Server started, migrations ran successfully, DB connected ✅

### Task: Imported master prompt and project setup verified (2026-08-03)
- Read the uploaded marketplace requirements from `attached_assets/`.
- Installed the locked pnpm workspace dependencies successfully.
- Started the main application workflow and confirmed the customer web preview renders.
- Confirmed the database startup migration path is idempotent against the configured Supabase database.

### Task: Expo tunnel fix
- Root cause: `REPLIT_EXPO_DEV_DOMAIN` set → script took exp.direct path → "failed to download" in Expo Go
- Fix: both Expo workflow commands now prepend `unset REPLIT_EXPO_DEV_DOMAIN &&`
- Both ngrok tunnels confirmed working. QR codes live at port 3000.

### Task: AI memory system completed
- Created all 10 module INDEX.md files: auth, booking, dispatch, payment, admin, mobile-customer, mobile-partner, catalog, points, notifications
- Added 7 new entries to GOTCHAS.md: Expo tunnel fix, Metro project root, native module drift, worklets crash, useFonts hang, API field names, category serviceCount

---

## 📋 How to Start a New Session

1. Read `MASTER_INDEX.md` — understand the project map.
2. Read this file — know what's done and what's pending.
3. Check `MODULES.md` for the relevant domain.
4. If a module detail file exists under `modules/<name>/`, read it.
5. Make changes, then update this file and the relevant module file.
