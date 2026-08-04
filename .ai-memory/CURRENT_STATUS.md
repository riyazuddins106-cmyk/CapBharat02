# ServeNow — Current Status
> Update this file at the end of every session. It is the fastest way for a new session to know what's done and what's next.

---

## Overall Completion: ~98%

The service-level order implementation is complete for customer web/mobile, partner mobile, payment gating, and admin controls. The main customer web/API/admin workflows are running in preview. Full end-to-end validation of every new order-item state remains the next verification phase.

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

---

## ⚠️ Pending / Needs Attention

| Item | Details |
|------|---------|
| **Full service-order E2E validation** | Run customer checkout → partner accept/check-in → per-item payment → completion, plus cancellation, re-dispatch, refund, and admin controls. |
| **Email (SMTP)** | Optional — OTP codes log to console if not set. |
| **EAS projectId** | Not set — push tokens use Expo Go anonymous identity. Needed only for standalone builds. |
| **Dependencies** | Run `pnpm install --frozen-lockfile` before first start. |

---

## 🔄 Last Session Summary (2026-08-02)

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
