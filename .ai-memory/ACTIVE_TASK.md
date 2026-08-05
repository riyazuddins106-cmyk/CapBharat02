# Active Task Tracker — ServeNow

> ⚠️ AI INSTRUCTION — MANDATORY, NO EXCEPTIONS:
> You MUST update this file after every completed step during a task.
> Do not finish a step and move on without updating the checklist below first.

---

## ▶ Current Task
**Task:** Remove multilingual support and return ServeNow to English-only
**Status:** COMPLETE. All language selectors, locale providers, translation catalogs, RTL behavior, and Admin language settings were removed from the web, mobile, and server surfaces.

### Admin and Operations role separation — 2026-08-05
- [x] Restrict regular Users to customer and partner accounts
- [x] Keep Admin Management limited to admin and operations_manager accounts, with admin-only mutation/access
- [ ] Align Admin API guards with the existing Operations sidebar permissions
- [ ] Prevent Operations login from requesting admin-only data
- [ ] Build, restart, and verify role-protected endpoints and Admin Panel behavior

### Admin Create Professional scroll fix — 2026-08-05
- [x] Give the Create Professional page its own vertical scroll area inside the fixed Admin Panel shell
- [x] Rebuild and verify the Admin Web workflow starts cleanly

### Admin Panel clickable sitemap — 2026-08-05
- [x] Reverted the sitemap page, sidebar entry, header links, and sitemap navigation state at the user's request

### Admin Panel breadcrumbs — 2026-08-05
- [x] Removed the breadcrumb navigation from all Admin Panel pages at the user's request
- [x] Removed the remaining Categories and Sub-category page breadcrumb rows
- [x] Rebuild, restart, and verify the compact page headers

### Admin Partner Payout fix — 2026-08-04
- [x] Fixed the Partner Payout Control Centre action handler to support `approved`, `paid`, and `rejected`
- [x] Added clear success messaging for scheduled approval versus immediate RazorpayX payment
- [x] Removed remaining stale Admin Web translation-helper calls that caused the login screen to crash after the English-only rollback
- [x] Rebuilt and restarted Admin Web; fresh preview renders the login screen without application errors
- [x] Reverted an unrelated temporary `.replit` module change

### Partner account/professional visibility fix — 2026-08-05
- [x] Confirmed `partner@servenow.in` logs in successfully as a partner
- [x] Confirmed the login is linked to the active `Rajan Verma` professional profile used by payouts
- [x] Added server-side professional search by name, title, partner name, or login email
- [x] Added linked partner email/status to Admin Professionals rows
- [x] Left the separate unlinked duplicate Rajan Verma profile untouched
- [x] Rebuilt Admin Web and Server; live search returned Rajan Verma with `partner@servenow.in`
- [x] Changed Admin Professionals default view to linked partner profiles only
- [x] Added a separate Unlinked Profiles view for legacy/catalog records
- [x] Added multi-select Category and Sub-category filters to both views
- [x] Fixed Professionals search focus loss while typing by avoiding global loading remounts and debouncing the search request
- [x] Verified category and non-null sub-category server filters against live data

### Partner dispatch category/payment timing fix — 2026-08-05
- [x] Removed premature Pay Now from the Customer Mobile booking confirmation screen
- [x] Enforced partner category and exact sub-category eligibility during service-order dispatch
- [x] Added matching eligibility guards to Partner Mobile request listing, detail, and accept paths
- [x] Reconciled partner@servenow.in / Rajan Verma to AC Service → AC Service & Repair
- [x] Removed 17 unrelated service links and expired 2 stale unrelated requests
- [x] Verified Rajan's live queue contains AC Service only
- [x] Rebuilt Server and restarted API, Customer Expo, and Partner Expo workflows

### Partner Mobile completed-job history — 2026-08-05
- [x] Added completion timestamps to legacy bookings and service-order items
- [x] Recorded the timestamp when a partner completes either job flow
- [x] Exposed completion time in Partner Mobile job APIs and both completed-job detail screens
- [x] Server build and Partner Mobile type-check passed; main application restarted successfully

### Partner Mobile Jobs parity — 2026-08-05
- [x] Read the uploaded Partner Web My Jobs reference from `attached_assets/image_1785931638710.png`
- [x] Added All, Upcoming, In progress, Pending, Completed, and Cancelled filters to Partner Mobile
- [x] Added live counts to the mobile filters
- [x] Aligned new service requests, active service jobs, and completed service jobs with the corresponding filters
- [x] Added explicit empty-state copy for new requests and active service jobs
- [x] Partner Mobile type-check, Android export, `git diff --check`, workflow restart, and preview verification passed

### Partner Mobile payout history filters — 2026-08-05
- [x] Added payout history date filtering with Today as the default
- [x] Added one calendar picker with start-date and end-date selection, month navigation, and Start over with today
- [x] Removed the All time option at the user's request
- [x] Added status dropdown options: All statuses, Pending, Processing, Paid, and Rejected
- [x] Combined date and status filters so both can be applied at once
- [x] Partner Mobile type-check, Android export, `git diff --check`, workflow restart, and live local Metro bundle verification passed; range labels present and All time absent

### Full web/mobile end-to-end verification — 2026-08-05
- [x] Customer Web, Admin Web, Partner Web, and Server production builds passed
- [x] Partner Mobile type-check passed; Customer Mobile Expo Android/iOS bundles passed
- [x] Current order-item smoke test passed 16/16 after using a valid in-window tomorrow 10:00 fixture
- [x] Customer, Partner, and Admin authenticated read surfaces returned HTTP 200
- [x] Customer/Partner/Admin role protection returned HTTP 403 for unauthorized surfaces
- [x] Full order lifecycle passed: checkout → dispatch → accept → QR → check-in → payment → completion
- [x] Confirmed payment is blocked before partner check-in
- [x] Verified Customer Web, Admin Web, Partner Web, Customer Expo, and Partner Expo are serving
- [x] Fixed Customer Mobile TypeScript errors in checkout and shared-package path resolution
- [x] Customer Mobile strict TypeScript check passes with no errors
- [x] Fresh Customer Expo Android and iOS Metro bundles both completed successfully after the fix
- [x] Repeated the Customer Mobile type-check and fresh Expo Android/iOS bundle verification; all passed again
- [ ] Live Razorpay/Stripe transaction and refund remain unverified until provider credentials are configured

### Emergency partner payout pause — 2026-08-05
- [x] Added persisted `payoutsPaused` control to the existing payout configuration
- [x] Added Admin Partner Payouts emergency control with pause/unpause messaging
- [x] Disabled manual RazorpayX send and payout-run controls in Admin while paused
- [x] Added server-side guard before every RazorpayX partner transfer
- [x] Added server-side guard for scheduled and manual payout runs
- [x] Verified live payout-run endpoint skips with the pause reason
- [x] Verified direct transfer creation is blocked before provider access
- [x] Restored the original payout configuration after testing

### Final verification refresh — 2026-08-05
- [x] Re-ran the current order-item contract smoke test: 16/16 passed; test-mode payment was correctly skipped because payment test mode is disabled
- [x] Confirmed admin, partner, and customer logins plus `/profile/me` access; unauthenticated `/orders` returned 401
- [x] Confirmed booking config exposes 30-minute slots and the shared slot generator returned the expected 21 slots for an 08:00–20:00, 120-minute maximum service window
- [x] Confirmed payout pause blocks both manual transfer creation and payout runs, then restored the original setting
- [x] Fresh Customer and Partner Expo Android/iOS exports completed successfully
- [x] Captured clean Customer Web, Admin Panel, and Partner Web previews; Partner Web is served on port 4000
- [x] Confirmed `git diff --check` passes and local `main` is synchronized with `origin/main` at `9ecec1d88`
- [ ] Live Razorpay/Stripe/RazorpayX provider transactions and refunds remain unverified until provider credentials are configured

### Partner job operations parity — 2026-08-05
- [x] Recovered the API after clearing stale Supabase migration locks held by an older application query
- [x] Confirmed idempotent migrations completed, including partner evidence and job-linked support-ticket fields
- [x] Added Partner Web legacy job-detail evidence gallery with before/after image upload
- [x] Added Partner Web structured issue/no-show reporting with issue type, details, and priority
- [x] Reused the existing typed partner evidence and issue APIs; no new integration or storage system was introduced
- [x] Fixed the existing Partner Web service-request callback typing mismatch
- [x] Partner Web strict TypeScript check, production build, workflow restart, API health, and preview passed

### Partner Expo QR scanner refresh — 2026-08-05
- [x] Updated the canonical QR scanner page to match the uploaded light reference layout
- [x] Increased QR cards and QR panels to the reference proportions
- [x] Kept the Partner QR image sourced from the current `partner-qr.png` file
- [x] Restarted the Partner Expo workflow so the QR points to the refreshed Partner app bundle
- [x] Verified the Partner tunnel manifest, Partner QR PNG, scanner HTML, and QR Codes preview
- [x] Passed `bash -n scripts/expo-tunnel.sh` and `git diff --check`

### Admin Customers and Professionals histories — 2026-08-05
- [x] Renamed the Admin sidebar Users entry to Customers
- [x] Limited the customer list to customer accounts and added server-backed name/email/phone search
- [x] Added searchable Customer Details with profile, legacy bookings, service orders, payment history, assigned partners, and totals
- [x] Added searchable Professional Details with linked login, legacy bookings, service jobs, customer details, payments, reviews, payouts, and totals
- [x] Added detail routes and typed Admin API contracts for both customer and professional histories
- [x] Fixed the professional service-job response shape so order IDs are not overwritten by order-item fields
- [x] Admin Web and Server production builds passed; workflows restarted; API health returned HTTP 200
- [x] Cleared one confirmed stale PostgreSQL application query that blocked startup migration; no unrelated database sessions were terminated

### Partner Mobile Schedule fix — 2026-08-05
- [x] Confirmed Schedule is intended to show assigned legacy bookings and service-order jobs for a selected day, with time, duration, customer/address, payout, and performance metrics
- [x] Fixed Schedule date-range filtering by explicitly casting ISO bounds to `timestamptz` in both booking-model queries
- [x] Server build and Partner Mobile type-check passed
- [x] Restarted the API and Partner Expo workflows; Schedule requests returned HTTP 200 and Metro remained healthy

### Published image loading fix — 2026-08-05
- [x] Confirmed the published service, category, and reel APIs return data and valid image URLs
- [x] Confirmed published image requests succeed directly, but Helmet CSP was sending `img-src 'self' data:` and blocking HTTPS media in the browser
- [x] Updated the server CSP to allow HTTPS images and media from Supabase Storage/CDNs
- [x] Rebuilt the server, restarted the application workflow, and verified the local response header includes `img-src ... https:`
- [ ] Republish the project so the published deployment receives the CSP fix

### GitHub branch comparison — 2026-08-05
- [x] Confirmed `origin/main` already contains the full history of `origin/agent/30-minute-booking-slots`; that branch tip is the merge base of `main`.
- [x] Confirmed `origin/servenow-updates` has unrelated history and is not a superset of either existing GitHub branch.
- [ ] Do not make `servenow-updates` the default branch until its workspace content is reconciled with the existing GitHub `main`.

### English-only rollback — 2026-08-04
- [x] Removed Customer Web, Partner Web, and Admin Panel language selectors/providers
- [x] Removed Customer Mobile and Partner Mobile language pickers/providers and RTL handling
- [x] Removed the shared locale/translation catalog and related exports
- [x] Removed the Admin Languages section and language setting API contract
- [x] Removed the public `/api/platform-settings/languages` endpoint
- [x] Preserved English UI and dynamic admin-created category/service names exactly as entered
- [x] Rebuilt Customer Web, Admin Web, Partner Web, and Server successfully
- [x] Restarted affected workflows and verified the settled Customer Web preview renders normal English labels without browser errors

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
- [x] Recolored the Admin Management create-account card from saturated violet to slate and sky-blue accents
- [x] Reverted the Admin Panel-wide charcoal theme after clarifying that the uploaded reference applied only to the Create Admin Account form
- [x] Kept the neutral slate/graphite styling isolated to the Create Admin Account card, fields, role select, and button
- [x] Verified the restored purple Admin Panel preview, rebuilt Admin Web, restarted the workflow, and passed git diff checks
- [x] Strengthened the form-only colors with solid inline navy/graphite values after the first scoped styling remained too subtle
- [x] Rebuilt Admin Web, restarted the workflow, and confirmed no global theme files changed in the final correction
- [x] Matched the Create Admin Account form to the newly supplied reference palette and locked its colors into dedicated local style constants
- [x] Rebuilt Admin Web, restarted the workflow, and passed the final scoped diff check
- [x] Matched the latest reference's purple icon badge, purple gradient button, charcoal form surfaces, and purple focus states
- [x] Rebuilt Admin Web, restarted the workflow, and confirmed the final Admin Panel workflow is serving cleanly
- [x] Revalidated live Expo manifests and Android bundles, regenerated both QR PNGs, decoded both payloads, and confirmed the public QR scanner route
- [x] Verified public web routes: Customer Web `:5000/customer/`, Partner Web `:3000/partner/`, Admin Panel `/admin-panel/`, QR scanner `:3001/`
- [x] Left fresh QR PNGs/scanner HTML and uploaded/reference assets uncommitted as runtime/user artifacts

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
