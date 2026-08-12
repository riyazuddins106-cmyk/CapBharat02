# ServeNow — Current Status
> Update this file at the end of every session. It is the fastest way for a new session to know what's done and what's next.

---

## Customer Mobile bottom navigation — 2026-08-12

Customer Mobile's bottom tab layout now matches the working Partner Mobile
layout. The previous fixed Android tab-bar height and custom bottom padding
could draw the app bar into the Android system navigation area, making the
back/home/recents controls appear visually attached to or inside the app bar.

The Customer tab bar now leaves height and safe-area handling to Expo Router,
uses the same label spacing as Partner Mobile, and consumes the native icon
size supplied by the navigation library.

Validation completed: Customer Mobile TypeScript check, `git diff --check`,
Customer Expo workflow restart, and fresh Metro output with no error signature.

## Customer Mobile booking confirmation details — 2026-08-12

The Customer Mobile confirmation screen now uses the created order's persisted
`scheduledAt` value instead of displaying the internal slot number. A booking
that previously showed values such as `Tomorrow · 570` now shows a readable
date and service window such as `Tomorrow · 5:00 PM – 6:00 PM`.

The confirmation card also shows the booked service name, persisted service
duration, full selected address, and pending status. The duration is derived
from the created order items so the confirmation remains correct even after
the cart is invalidated.

Validation completed: Customer Mobile TypeScript check, `git diff --check`,
Customer Expo workflow restart, Metro bundle warm-up, and fresh logs without
new runtime errors.

## Schedule job counts and partner handoff — 2026-08-12

Partner Web and Partner Mobile Schedule date selectors now show an explicit
job count for every day in the 30-day planning range, including `No jobs`,
`1 job`, or plural counts.

Future accepted service-order jobs can be passed from Schedule with a required
reason. The server offers the job only to eligible partners with matching
service/category/sub-category coverage, approved mandatory documents, active
status, and availability. The current partner remains assigned while the
offer is open. If another partner accepts, the service-order assignment moves
to that partner atomically and the previous partner is released. If nobody
accepts, the original partner remains responsible.

The pass reason is persisted on the service-order item. The flow is limited to
future `partner_accepted` service-order items and does not alter customer price,
payment state, or payout amount.

Validation: server build, Partner Web build, Partner Mobile TypeScript check,
`git diff --check`, idempotent migration, workflow restarts, Partner Web
preview, and fresh logs without runtime errors.

## Partner Expo blue error screen — 2026-08-12

The uploaded blue screen is Expo Go’s generic “Something went wrong”
fallback, not the Partner App’s teal theme. The first Partner Expo tunnel
attempt failed in ngrok with a tunnel-side `TypeError`; no Partner App
JavaScript exception was present in the current Metro/workflow logs.

The Partner Expo workflow was restarted and recovered on retry. The scanner
was refreshed with a new current `exp://...exp.direct` URL. If a device still
shows the blue screen, it is using the stale failed QR/link; scan the current
Partner QR again and reload the project.

## Future partner bookings and Schedule separation — 2026-08-12

Accepted service-order work scheduled for a future date is no longer returned
as an active/in-progress partner service. Active service-order work begins at
partner arrival/check-in, payment pending/completed, or service started.

The Partner Web and Partner Mobile Schedule endpoints include assigned future
legacy and service-order jobs in the next 30 days, excluding cancelled and
completed work. Schedule cards identify accepted future work as Scheduled.
This makes Schedule the planning surface for work accepted today but happening
tomorrow, the day after tomorrow, or later.

Validation completed: server build, Partner Web build, Partner Mobile
TypeScript check, `git diff --check`, API/Partner Web/Partner Expo workflow
restarts, and fresh logs without runtime error signatures.

## Unconfigured UPI payment-state repair — 2026-08-12

The public payment configuration no longer exposes manual UPI unless Admin has
enabled UPI and supplied a VPA. In Test Mode, only configured methods are
simulated, so an unconfigured UPI selection cannot mark an item paid or move
the service to `service_started`. Stale clients receive an explicit actionable
error instead.

Customer booking tracking now marks Payment confirmed only when the item
payment record is actually paid. Partner completion requires a paid item, and
Partner Mobile invalidates earnings after completion so the completed paid
service appears without a manual reload. Actual bank/UPI withdrawal remains the
existing partner payout-request flow.

Validation completed: server build, Customer Web build, Customer Mobile and
Partner Mobile TypeScript checks, `git diff --check`, live
`/api/payments/config` verification (`methods: ["cash"]`, `upiVpa: null`),
affected workflow restarts, fresh logs, and browser preview.

## Customer-facing cancellation policy placement — 2026-08-12

Cancellation messaging now follows the intended customer journey:

- Product listings remain free of prominent cancellation-fee labels.
- Customer Web and Customer Mobile service details expose a compact expandable policy.
- Both checkout summaries show the live percentage, minimum, and maximum fee rules before confirmation.
- Both booking confirmation screens show a compact reminder.
- Customer Web now uses an in-app cancellation modal with the exact estimated fee immediately before cancellation; Customer Mobile already had the equivalent modal.
- Accepted and checked-in itemized booking cards continue to show the exact bounded estimate.

Validation completed: Customer Web production build, Customer Mobile TypeScript
check, `git diff --check`, main application and Customer Expo workflow restarts,
fresh workflow logs, and a browser preview with no console errors.

## Configured percentage-bounded cancellation warning — 2026-08-12

Customer Mobile now shows the cancellation warning inline on each eligible itemized service-order card, matching Customer Web. The warning is driven by public Booking Settings rather than hardcoded client text:

- `cancellationFeeAfterAcceptancePercent` — default 20%, bounded by ₹50 minimum and ₹500 maximum
- `cancellationFeeAfterCheckinPercent` — default 20%, bounded by ₹50 minimum and ₹500 maximum

Admin Booking Settings exposes the percentage rate plus minimum and maximum rupee bounds for both stages. The itemized cancellation endpoint calculates the percentage of the service amount, applies `MAX(minimum, MIN(calculated, maximum))`, and caps the result at the service price before storing the fee. Customer Web and Customer Mobile use the same calculation, so displayed warnings and stored fees stay aligned.

Validation completed: server build, Customer Web build, Admin Web build, Customer Mobile TypeScript check, `git diff --check`, live `/api/booking-config` response, affected workflow restarts, and preview/browser-log checks.

## Partner Web vs Partner Mobile job investigation — 2026-08-12

The reported discrepancy was caused by testing two different partner identities, not by a missing Mobile endpoint or rendering defect. Both clients call `/api/partner/order-item-jobs`; the server log shows two populated `621`-byte responses immediately after checkout. Later responses were the expected empty `81`-byte payload after the request expired.

The specific Full Home Deep Cleaning request was assigned to the available Home Cleaning partner `riyazuddins107@gmail.com` (`Partner1`). The documented Mobile test login `partner@servenow.in` (`Test Partner`) is busy and belongs to the AC category, so it is correctly excluded by availability and category/sub-category matching. The request's configured search window was one minute, its deadline elapsed, and it transitioned to `waiting_operation`.

No application code was changed. To reproduce the Web request in Mobile, sign in to Mobile with the same Partner1 account, ensure that account is Available and eligible, and create a new order within the configured search window. Dispatch rules must not be broadened to make unrelated partner accounts see the request.

## Latest Partner Expo tunnel verification — 2026-08-12

The Partner Expo workflow was restarted from the current workspace code.
Metro rebuilt successfully, the tunnel connected, and the QR scanner cache was
refreshed with the live Partner URL:
`exp://mqrmf3k-anonymous-8099.exp.direct`.

## Timed-out partner search reconciliation — 2026-08-12

Admin was showing itemized service-order rows as `Searching Partner` after the
configured search window had elapsed because expiry was only performed when a
customer loaded `/api/orders`. Admin, operations, and Partner feeds could read
the stale status indefinitely.

Expiry is now centralized around the persisted `dispatchDeadline` with a
10-minute fallback for older rows without a deadline. Admin service orders,
legacy operations dispatch, Partner job feeds, and customer order reads now
reconcile expired rows before returning them. Pending requests are expired and
the item/booking moves to `waiting_operation`, preserving the existing
Continue Searching and Admin restart controls.

Validation completed: server TypeScript build, API health check, fresh workflow
startup, no application errors in the new server log, and `git diff --check`.

## Partner Expo tunnel and QR refresh — 2026-08-12

The uploaded phone screenshot is Expo Go's generic “Something went wrong”
project-loading screen. The Partner Expo workflow was restarted successfully:
Metro is running, the HTTPS tunnel connected, and the static QR assets were
regenerated from the live tunnel URL.

The QR Codes page was also restarted and verified. Partners must scan the
current Partner QR from that page inside Expo Go; an older screenshot or saved
QR can still point to a dead tunnel and produce the same generic error.

## Mobile document eligibility banner cache fix — 2026-08-12

The Partner Mobile dashboard could show “Documents Required” after the
Documents screen or Admin had already approved the partner's documents. The
dashboard had introduced separate React Query keys from the Documents screen,
so it could retain an older empty-document result.

The dashboard and Documents screen now share the same `doc-types` and `docs`
cache keys. Both document queries refetch on mount, and Dashboard pull-to-refresh
also refreshes the document types and current documents. This keeps approval
changes visible without requiring a logout or app reinstall.

Validation completed: Partner Mobile TypeScript check, `git diff --check`,
Partner Expo workflow restart, Metro bundle startup, live tunnel connection,
and current Partner QR regeneration.

## Partner dashboard eligibility status messaging — 2026-08-12

Partner Mobile and Partner Web dashboards now show a meaningful eligibility banner
based on the partner's required document state and availability state. Both clients
load the active required document types and the partner's current documents, then
apply the same priority:

1. Missing, rejected, re-upload-required, or expired required documents
2. Documents pending or under review
3. Offline
4. Busy
5. Available and eligible

Document states include an action that opens the document management screen/page.
The dashboard wording makes clear when a partner will not receive new requests.

Validation completed: Partner Web production build, Partner Mobile TypeScript check,
`git diff --check`, Partner Web workflow restart, Partner Expo workflow restart,
Partner Web preview screenshot, and clean document API responses from the running
API.

## Stale Partner Expo QR repair — 2026-08-12

The uploaded scanner image showed the old Partner URL
`exp://arose-unframed-eclipse.ngrok-free.dev`, which caused Expo Go's
`java.io.IOException: Failed to download remote update` after the ngrok tunnel
was replaced by the current Replit-native `exp.direct` tunnel.

The tunnel script now regenerates the standalone `tmp-qr/scanner.html` page and
both QR PNGs from the current tunnel cache, including the sibling app's live
URL. This prevents the static QR Codes workflow from retaining a previous
ngrok URL when the API `/qr` page is already current.

Validation completed: Partner Expo workflow restart, current QR cache
verification, exact Partner PNG payload hash comparison, QR Codes page check
for absence of the stale Partner URL, `bash -n scripts/expo-tunnel.sh`, and
`git diff --check`.

## Partner OTP email delivery — 2026-08-12

The Partner signup and forgot-password API requests completed successfully.
The app's actual Supabase `email_config` contains Gmail SMTP credentials, and
an SMTP verification plus controlled delivery test succeeded:

- Gmail transport verification: passed
- Recipient accepted by Gmail: yes
- SMTP response: `250 2.0.0 OK`
- Admin email test endpoint: HTTP 200

SMTP acceptance does not guarantee Gmail inbox placement; the user should
search Spam, Promotions, and All Mail for the ServeNow sender/subject. The
development Partner mobile reset screen now displays the API's `devCode`
fallback, matching the signup verification screen. Production responses still
strip `devCode`.

## Partner Expo Go generic error screen — 2026-08-12

The uploaded image is Expo Go's generic pre-app “Something went wrong”
screen, not the Partner app's custom ErrorBoundary. The current Partner Expo
workflow is healthy and uses a fresh Replit-native tunnel:

- Current QR/cache URL: `exp://erj2hrq-anonymous-8099.exp.direct`
- Android manifest through the tunnel: HTTP 200
- Exact Android `launchAsset` bundle: HTTP 200, approximately 11.5 MB
- Metro workflow: no resolution or transform failure

The device-side “View error log” was requested but the user declined to share
it, so no safe source-code diagnosis can be made yet. Recovery guidance is to
use the current QR from the QR Codes page inside an updated/reopened Expo Go
app; if it persists, the Expo Go error-log text is required before changing
native dependencies or app startup code.

## Category and sub-category partner eligibility — 2026-08-12

All partner job paths now use category and sub-category eligibility consistently:

- Legacy automatic booking dispatch joins the selected services and only sends
  requests to partners in the service category and matching sub-category.
- The Booking Operations Centre eligible-partner endpoint applies the same
  service/category/sub-category qualification, and manual assignment rejects
  ineligible partners server-side.
- Partner Web and Partner Mobile legacy job feeds filter pending requests,
  details, and acceptance visibility by the partner's category/sub-category.
- Returning-online redispatch uses the same category/sub-category rule.
- Itemized order dispatch and eligible-partner paths retain the existing rule.
- Profiles without a saved sub-category remain category-wide for backward
  compatibility.

Validation completed: server build, Partner Web build, Partner Mobile
TypeScript check, `git diff --check`, API readiness smoke test, and restarts of
the API, Admin Panel, Partner Web, and Partner Expo workflows.

## Partner Expo QR loading investigation — 2026-08-12

The Partner Expo workflow was restarted and generated a fresh QR for the current
ngrok tunnel. The QR resolves to a healthy Expo manifest, Metro reports
`packager-status:running`, and the Android bundle returns HTTP 200. The Partner
web route also renders normally, and no native client-side scan error was present
in the available logs.

If a phone still shows the teal/blue screen, it is the Expo Go splash/loading
state rather than a confirmed application exception. Use the current QR from the
QR Codes page inside Expo Go, not an old screenshot or the phone's regular camera
scanner. A persistent screen after that needs a device screenshot and the Expo Go
console output to distinguish tunnel loading from a native runtime issue.

## Partner Expo Go runtime screen repair — 2026-08-12

The uploaded phone screenshot was Expo Go's generic blue runtime/project error
screen. Partner's root auth redirect now waits for Expo Router's navigator key
and first route segment before navigating, preventing a startup navigation race
that can fail only in native Expo Go while Web still renders.

The Partner workflow now uses Replit's native HTTPS Expo tunnel. The tunnel
needed one automatic retry after a transient "remote gone away" error, then
connected successfully. The `/qr` page reads the active tunnel cache and now
shows the current `exp.direct` Partner QR. The current SDK 54 Android manifest
and bundle both return successfully.

Validation completed: Partner Mobile TypeScript check, `git diff --check`,
workflow restart, active `/qr` URL verification, and manifest/bundle smoke
tests.

## Customer QR missing — 2026-08-12

The Customer Expo workflow was healthy on port 8081, but the API QR page was
looking for the Customer tunnel cache on port 8080. The QR page therefore
displayed "Tunnel starting" only for Customer while Partner remained visible.
The API mapping now uses the actual Customer workflow port, and the server
build plus `/qr` smoke test confirm both Customer and Partner QR cards render.

## Partner signup sub-category matching — 2026-08-12

Partner Web and Partner Mobile signup now load active sub-categories after a
category is selected and require one before account creation. The server
validates that the sub-category belongs to the selected active category,
persists it on the professional profile, and links the new partner to active
catalog services in that sub-category.

Modern order-item dispatch, legacy dispatch eligibility, partner pending-job
lists, job detail, and acceptance now respect the saved sub-category. Legacy
profiles without a sub-category retain broad category matching for compatibility.
Validation completed: server build, Partner Web build, Partner Mobile TypeScript,
`git diff --check`, workflow restarts, and live category/sub-category API checks.

## Configurable partner search timer — 2026-08-12

Admin Booking Settings now includes a customer-facing partner search duration,
defaulting to 10 minutes. The public booking-config response includes the value,
and both modern service-order checkout and legacy booking checkout persist a
dispatch deadline.

Customer Web and Customer Mobile calculate a live countdown from the server
deadline. Continue Searching is hidden while the search is active, appears only
after expiry, and starts a fresh configured window. Expired requests are paused
server-side, and partner acceptance is rejected after the deadline. Legacy
records without a deadline use a safe 10-minute fallback from their last update
or creation time.

Validation completed: server build, Customer Web build, Customer Mobile
TypeScript check, `git diff --check`, direct `/api/booking-config` smoke test,
affected workflow restarts, and Customer Web preview verification.

## Resume customer signup after closing OTP screen — 2026-08-12

Customer registration now distinguishes an active unverified account from a
fully registered account. If the customer closed the OTP screen and tries to
sign up again with the same email, the server resumes the pending signup,
resends the signup OTP using the normal 60-second cooldown, and updates the
entered name, phone, and password. Verified accounts still receive the normal
duplicate-email error.

Validation completed: server build, `git diff --check`, and API workflow
restart.

## QR Codes Website refresh — 2026-08-12

The canonical QR assets were regenerated from the active Expo tunnel URLs:
Customer `exp://prison-deacon-science.ngrok-free.dev` and Partner
`exp://arose-unframed-eclipse.ngrok-free.dev`. The QR Codes Website workflow
was restarted and its rendered scanner page was verified with both cards and
fresh PNG assets.

## OTP resend cooldown, expiry, and delivery feedback — 2026-08-12

OTP resend is now limited to once every 60 seconds per email and purpose on the
server, in addition to the client countdown. Issuing a new code consumes older
active codes for the same flow. Verification rejects codes after the configured
expiry, currently 10 minutes by default, and screens show the expiry duration.

SMTP is now configured and real delivery has been verified successfully to the
configured Gmail recipient. The working Gmail setup uses an App Password with
port 587/STARTTLS. Non-production responses still expose the generated
development code and timing metadata when the test provider is used.

Validation completed: server build, Customer/Partner Web builds, Customer/
Partner Mobile TypeScript checks, `git diff --check`, affected workflow
restarts, and a clean Customer Web preview/browser log.

## Approved-partner dispatch and live refresh — 2026-08-12

Partner eligibility is now enforced by one server-side document gate shared by
legacy and itemized automatic dispatch, Admin eligible-partner lists, Admin
manual assignment, and partner acceptance. All active mandatory document types
must have approved current documents. When no document type is marked required,
the partner must still have at least one current upload and every current upload
must be approved. A partner with no documents is never eligible.

Customer Web and Partner Web refresh visible booking/job data every 10 seconds
and immediately on focus/visibility return. Customer Mobile and Partner Mobile
refresh active feeds every 10 seconds and refetch when the app returns to the
foreground. Existing local mutation updates remain in place.

Validation completed: server and all web builds, both mobile TypeScript checks,
`git diff --check`, live eligible-partner query returning zero for a current
partner with no approved documents, startup migration, and affected workflow
restarts.

## Account Identity Settings — 2026-08-12

Account identity settings are implemented across Customer Web, Partner Web,
Admin Web, Customer Mobile, and Partner Mobile. Each user has an immutable
globally unique username, displayed read-only. Email and phone remain editable,
but changed values require an authenticated OTP request and verification before
the database update. OTP records are target-aware and use separate
`change_email` / `change_phone` purposes.

Legacy direct contact updates are blocked across generic profile, partner
account, Admin self-profile, and Admin management paths. Admin-managed customer
and admin/staff forms preserve contact editing through the verified endpoints.
Successful verification refreshes the relevant local/auth state.

Validation completed: Server and all web builds; both mobile TypeScript checks;
`git diff --check`; startup migration; disposable live identity API
registration/login/email-change/phone-change/delete smoke test; Expo workflow
restarts; and web preview checks with no new browser application errors.

## Documentation synchronization — 2026-08-12

- Applied the uploaded documentation master prompt against the repository's
  actual `/docs` layout. The project uses `docs/ai/` for living status/history
  rather than the prompt's example numbered filenames; duplicate parallel files
  were not created.
- Corrected stale documentation that said E2E commands were unverified. The
  individual CRUD, payment, Admin browser, itemized, dispatch, build, and
  mobile type-check commands are verified; only a unified root test/lint/CI
  runner is not configured.
- Corrected the Operations description: the unified queue includes item-level
  assignment, stop-searching, restart-dispatch, and unpaid cancellation controls;
  provider-backed refunds remain on the dedicated Service Orders refund path.
- Updated `docs/00-PROJECT-OVERVIEW.md`, `docs/02-TECH-STACK.md`,
  `docs/08-TESTING.md`, `docs/FULL_PROJECT_DOCUMENTATION.md`,
  `docs/modules/admin-web.md`, `docs/modules/backend.md`,
  `docs/ai/CURRENT-STATE.md`, `docs/ai/KNOWN-ISSUES.md`,
  `docs/ai/CHANGELOG.md`, and `docs/ai/TASK-HISTORY.md`.

## Fresh database UAT — 2026-08-12

- Reset all 37 public application tables in the development database while
  preserving the schema and migration ledger. Reseeded the catalog, baseline
  accounts, one qualified partner, and payment test mode.
- Fresh UAT passed legacy booking payment (21/21), custom itemized Admin and
  partner lifecycle (32/32), itemized contract smoke (17/17), Admin browser
  checks (17/17), CRUD (71/71), GPS dispatch (66/66), and full-flow regression
  (45 passed, 0 failed, 3 expected skips).
- UAT found and fixed a real itemized manual-assignment mismatch: Admin
  assignment now produces the actionable `partner_accepted` state required for
  partner visibility, QR generation, and check-in.
- UAT also replaced stale hardcoded GPS fixture UUIDs with name-based catalog
  lookup and recorded the result in `qa/uat-record-2026-08-12.md`.

## E2E partner fixture cleanup — 2026-08-12

- The uploaded Admin screenshot showed repeated `E2E NearPro` and `E2E FarPro`
  rows. They were persisted E2E professional records, not UI mock data.
- With explicit confirmation, removed six orphaned E2E professional profiles,
  any assigned bookings, and matching test partner accounts. Real partners and
  E2E customer accounts were left untouched.
- Fixed the dispatch E2E fixture to include the now-required partner `city`, and
  fixed teardown to delete test professionals before users because
  `professionals.user_id` uses `ON DELETE SET NULL`.
- Dispatch E2E passed **66/66**. Post-test checks found zero matching profiles,
  zero matching partner accounts, zero Admin E2E search results, and API health
  remained `ok`.

## Final QA report — 2026-08-12

- The final automated verification totals are **236 passed, 0 failed, and 5
  skipped** across CRUD, legacy lifecycle, payment, Admin browser, itemized
  service-order, GPS dispatch, production build, Expo type-check, and diff
  validation runs.
- Admin browser verification now passes **17/17**. The final fixes were the
  native rows-per-page selector and sticky table headers for Reviews and Booking
  History.
- Customer Web, Admin Web, Partner Web, and Server production builds passed.
  Customer Mobile and Partner Mobile TypeScript checks passed. The Admin preview
  rendered the login screen cleanly after workflow restart.
- The detailed workbook is `qa/servenow-qa-report-2026-08-12.xlsx`. It contains
  the executive summary, exact test commands, Customer/Partner/Admin coverage,
  E2E scenarios, fixes/findings, and remaining provider/test gaps.
- Remaining gaps are limited to provider-backed Razorpay/Stripe/RazorpayX
  settlement/refunds/transfers, a real Bathroom Cleaning partner configuration,
  and a few intentionally non-mutating upload/review/Admin-management tests.

## Service-order operations controls — 2026-08-12

- Added item-level Admin operations for the newer Service Orders model:
  **Eligible Partners**, manual partner assignment, **Stop searching**, **Restart
  Dispatch**, and **Cancel service** for unpaid items.
- The same actions are available from both the dedicated Service Orders hierarchy
  and the unified Operations queue's source-labeled Service order rows.
- Manual assignment only accepts active, service-qualified partners. Stop searching
  expires pending item requests and moves the item to `waiting_operation` without
  cancelling the service. Paid items remain on the existing Refund Service path;
  the new cancel route rejects paid items.
- The idempotent `waiting_operation` enum migration applied successfully. Admin Web
  and Server builds passed, `git diff --check` passed, API health returned 200,
  and an authenticated eligible-partner lookup returned 6 candidates without
  mutating live Amit requests.

## Final QA and preview/API fixes — 2026-08-12

- Completed the fresh full-project QA pass against the settled application
  workflows. `pnpm build` passed for Customer Web, Admin Web, Partner Web, and
  Server; `git diff --check` passed.
- The current itemized order smoke test passed **16/16**. Its payment assertion
  was correctly skipped because payment test mode is disabled.
- The broad CRUD regression passed **71/71** with no failures.
- Live cross-surface verification passed: Customer order/wishlist and role
  guards, Admin order/service-order/Operations data, Amit Verma's authenticated
  partner login, two pending AC Service requests, and the first itemized job
  detail all returned the expected responses. No live request was accepted,
  rejected, cancelled, or otherwise mutated during this verification.
- Confirmed and fixed the Admin/Partner login autocomplete warning. Confirmed
  the Replit preview API routing problem: root `/api` is not the ServeNow API,
  while public port 8000 is. Customer and Partner Web now select the public API
  origin only on Replit preview hosts; the API allows the intentional
  cross-port resource response. Local Vite proxy and single-port production
  behavior remain unchanged.
- After workflows settled, Customer Web loaded live categories, offers,
  featured services, and reels with HTTP 200 responses; Admin and Partner login
  previews rendered with no browser-console application errors.
- Remaining limitation: live Razorpay/Stripe/RazorpayX transactions and refunds
  still require provider credentials. A direct public `/api/*` request on the
  web preview host remains an environment routing limitation; the web clients
  use the working API public port instead.

## Last Session Summary (2026-08-12)

- Fixed the Admin Booking Operations Centre menu and operational pages.
- Sidebar navigation now keeps the URL hash in sync, supports browser back/forward,
  and accepts the Settings page as a valid deep link.
- Dispatch now loads when its page is opened, refreshes on demand, polls every 30
  seconds while open, and refreshes only its own queue after assignment or cancellation.
- Corrected dispatch date filters to use scheduled time and normalized stale
  cancelled/completed booking rows so their displayed status and actions are safe.
- Added a visible Booking History heading and refresh action and clarified that
  assignment candidates are service-linked partners.
- Admin Web build and `git diff --check` passed. The Admin workflow restarted cleanly;
  live dispatch, history, booking-detail, and eligible-partner endpoints returned
  HTTP 200. The earlier password autocomplete suggestion was fixed in the final
  QA pass below.
- Investigated why Amit's two Partner Mobile AC Service requests were absent from
  the Operations Centre. They are itemized `order_items` with `searching_partner`
  status, while the legacy operations endpoint only returns `bookings`.
- The Operations Centre now combines legacy booking rows with itemized service-order
  jobs, labels their source, normalizes item statuses, applies the same search/date/
  status filters and export, refreshes both sources together, and opens the correct
  booking or service-order detail modal. The separate Service Orders surface remains
  available for item-level restart/refund controls.
- Verified the live order IDs `8d0d4a2f…` and `9b90973b…` are returned by the Admin
  orders API as AC Service items in `searching_partner`; no database data changed.

- Investigated the Partner Mobile screenshot showing Amit Verma online with no active jobs.
- Confirmed the live dispatcher had created pending requests for Amit, but the Partner
  job-list/detail/accept queries applied a stricter profile sub-category filter than
  dispatch. This made valid linked requests invisible and unaccept-able.
- Removed that inconsistent hard filter while preserving exact `partner_services`
  capability, matching category, active status, and availability requirements.
- Fixed the admin document summary so partners with uploaded documents all approved
  are marked Fully Approved even when zero document types are mandatory.
- Added the order-item payment fields already returned by the API to the Partner
  Mobile client type.
- Server build, Partner Web build, Partner Mobile type-check, and `git diff --check`
  passed. After restarting the application workflow, Amit’s authenticated
  `/api/partner/order-item-jobs` response returned two pending AC Service requests.

## Runtime Investigation — 2026-08-11

- Customer Expo's initial “failed to download” report was reproduced from the workflow log: the mockup preview already owned port 8081, Expo asked whether to use 8082, and non-interactive Expo skipped the dev server with exit code 1.
- After stopping only the conflicting mockup workflow and restarting Customer Expo, both Customer and Partner Expo manifests returned HTTP 200 and both Android launch bundles returned HTTP 200.
- Verified public routes on the current development domain: Customer Web `/`, Admin Panel `/admin-panel/`, Partner Web `/partner/`, and QR scanner `/qr/`.
- The direct public web-preview `/api/*` route remains non-canonical because the
  standalone starter API artifact receives it; ServeNow's local and public API
  port 8000 return 200. Customer and Partner Web now bypass that route on
  Replit preview hosts, and the API's resource policy permits those cross-port
  browser responses.

## Documentation workflow verification — 2026-08-09

The documentation-first workflow passed its fresh-session verification:
required documentation files are discoverable, targeted-reading and automatic
update rules are present, no application directories were changed, and
`git diff --check` passed.

## Runtime Verification and Documentation Repair — 2026-08-09

- The uploaded screenshot showed Replit's "couldn't reach this app" page because the configured workflows were stopped and no process was listening on the preview port.
- After starting the existing workflows, the API health endpoint returned HTTP 200, and Customer Web, Admin Panel, Partner Web, and the QR scanner returned their expected pages.
- The Customer and Partner Expo tunnels returned HTTP 200 manifests and HTTP 200 Android launch bundles. The earlier Expo Go message was not reproduced with the fresh QR codes; QR URLs must be regenerated after tunnel restarts because tunnel hostnames change.
- No application source code, database schema, migrations, package configuration, or deployment configuration was changed for this investigation.
- The verified development routes are Customer Web `/`, Admin Panel `/admin-panel/`, Partner Web `/partner/`, and the QR scanner on the routed QR service port.

## Overall Completion: ~99%

The service-level order implementation is complete for customer web/mobile, partner mobile, provider-backed payment/refund handling, payment gating, admin controls, and admin-configurable booking hours. The main customer web/API/admin workflows are running in preview. The current-contract order-item flow passes 16/16 checks in the latest run; test-mode payment was skipped because test mode is disabled, and live gateway transactions still require Razorpay/Stripe provider configuration.

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
- [x] Job list with All, Upcoming, In progress, Pending, Completed, and Cancelled filters
- [x] New service request, active service job, and completed service job sections
- [x] Job acceptance / check-in (QR scan) / completion
- [x] Completed job details show the actual completion date/time when available
- [x] Document upload
- [x] Notifications

### Partner Mobile Jobs parity (2026-08-05)
- The Jobs tab now matches the Partner Web My Jobs structure from the uploaded reference.
- Filters include All, Upcoming, In progress, Pending, Completed, and Cancelled, each with a live count.
- Pending order-item requests appear under New service requests; assigned order-item jobs appear under In progress services; completed order-item jobs appear under Completed services.
- Legacy booking jobs continue to use the same filters and job detail routes.
- Partner Mobile type-check passed, a fresh Android export completed, `git diff --check` passed, and the Partner Expo workflow restarted successfully.

### Partner Mobile Earnings payout filters (2026-08-05)
- Payout History is now filtered by date and status directly in the Partner Mobile Earnings tab.
- The default date filter is Today. Partners can open one calendar, select a start date and an end date in the same calendar, navigate months, or start over with Today.
- The status dropdown includes All statuses, Pending, Processing, Paid, and Rejected.
- Date and status filters combine; for example, a partner can view only Paid payouts for a selected date.
- The All time option was removed at the user's request.
- Partner Mobile type-check passed, a fresh Android export completed, `git diff --check` passed, and the live local Metro bundle contained the range-picker labels and no All time label.

### English-only product state (2026-08-04)
- [x] Removed the multilingual locale catalog, translation helpers, language selectors, locale persistence, and RTL behavior from all clients.
- [x] Removed the Admin Languages screen, language platform-setting key, and public language configuration endpoint.
- [x] Customer Web, Partner Web, Admin Panel, Customer Mobile, and Partner Mobile now use English-only UI.
- [x] Dynamic category, subcategory, service, offer, and policy content is displayed exactly as stored; no automatic translation is performed.
- [x] Customer Web, Admin Web, Partner Web, and Server production builds pass; `git diff --check` passes.
- [x] Settled Customer Web preview renders Home, Services, Bookings, and Profile labels normally with no browser errors.

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

### Partner dispatch eligibility correction (2026-08-05)
- [x] Partner service dispatch now requires the service category to match the professional profile category.
- [x] When a professional has a sub-category, the service sub-category must match exactly.
- [x] Partner request list, detail, and accept endpoints apply the same eligibility rule.
- [x] Reconciled the seeded Rajan Verma account to `AC Repair → AC Service & Repair`, matching the `AC Service` catalog item.
- [x] Removed broad legacy service links and expired stale out-of-category requests; live queue now shows AC Service only.
- [x] Customer Mobile checkout confirmation no longer offers Pay Now while the booking is still pending partner matching; payment remains available after partner arrival/check-in.

### Full web/mobile verification (2026-08-05)
- [x] Customer Web, Admin Web, Partner Web, and Server production builds passed.
- [x] Partner Mobile TypeScript passed; Customer and Partner Expo Android/iOS bundles completed successfully.
- [x] Current order-item smoke test passed 16/16: registration, OTP, login, catalog, multi-service cart, checkout, order listing, item cancellation, continue-searching, and auth protection.
- [x] Full live lifecycle passed with a disposable AC Service order: customer checkout → partner request → accept → customer QR → pre-check-in payment rejection → QR check-in → cash payment → service completion → completed order.
- [x] Customer, Partner, and Admin authenticated menu-backed API surfaces returned HTTP 200; unauthorized role access returned HTTP 403.
- [x] Partner Web is healthy on its configured local port 4000; the older handoff port list was stale.
- [x] Updated the current smoke fixture to schedule tomorrow at 10:00 so it remains inside configured booking hours.
- [x] Customer Mobile strict `tsc --noEmit` now passes. The checkout cart query is declared before dependent memo calculations, slot callbacks are explicitly typed, and the mobile tsconfig resolves `@servenow/shared`.
- [x] Fresh Customer Expo verification after the fix completed both Android and iOS Metro bundles successfully with no build errors.
- [x] Repeated the verification from the current workspace state: Customer Mobile TypeScript, Android bundle, and iOS bundle all passed again.
- [!] Real Razorpay/Stripe payment and refund provider flows remain unverified because live gateway credentials are not configured.

### Final verification refresh (2026-08-05)
- [x] Re-ran the current order-item contract flow: 16/16 passed; the test-mode payment branch correctly skipped because payment test mode is disabled.
- [x] Admin, partner, and customer seeded logins returned access tokens and `/profile/me` returned HTTP 200 for each role; unauthenticated `/orders` returned HTTP 401.
- [x] `/booking-config` returned a 30-minute interval; shared slot generation returned 21 expected slots for an 08:00–20:00 window with a 120-minute maximum service duration.
- [x] Controlled payout pause verification blocked both payout-run execution and direct transfer creation, then restored the original setting.
- [x] Fresh Customer and Partner Expo Android/iOS exports completed successfully.
- [x] Customer Web, Admin Panel, and Partner Web previews rendered; Partner Web is healthy on its configured port 4000.
- [x] `git diff --check` passed and local `main` matched `origin/main` at `9ecec1d88`.
- [!] Real Razorpay/Stripe/RazorpayX provider transactions and refunds remain unverified until provider credentials are configured.

### Published image loading fix (2026-08-05)
- [x] Published `/api/services?featured=true`, `/api/categories`, and `/api/reels` all return populated data.
- [x] The stored Unsplash image URLs return HTTP 200 with image content when requested directly.
- [x] Root cause of broken images in the published browser was Helmet's default CSP: `img-src 'self' data:` blocked all HTTPS-hosted catalog/category/reel media.
- [x] Updated `server/src/app.ts` to allow HTTPS images and media, rebuilt the server, restarted the API workflow, and verified the local CSP header.
- [ ] Republish is required for the live deployment to receive this server-header fix.

### Emergency partner payout pause (2026-08-05)
- [x] Admin Partner Payouts now has a persisted emergency pause/unpause control.
- [x] When paused, manual RazorpayX sends and the Admin “Run approved payouts now” action are disabled in the UI.
- [x] The server blocks RazorpayX transfer creation before provider access and skips both scheduled and manual payout runs.
- [x] Existing payout requests remain unchanged while paused; customer payments are not affected by this control.
- [x] Live controlled verification passed for the payout-run skip and direct transfer guard; the original setting was restored afterward.

### GitHub branch state (2026-08-05)
- `origin/main` is the current GitHub default branch and already contains `origin/agent/30-minute-booking-slots`.
- `origin/servenow-updates` is a separate 16-commit workspace snapshot with no common history with either existing GitHub branch.
- The latest branch must not be treated as the complete combined project until a content-level reconciliation is performed.

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
- [x] Restarted Expo Partner App; Metro is running and the current partner QR is `exp://arose-unframed-eclipse.ngrok-free.dev`.

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
- Reverted the multilingual feature at the user’s request and returned the full ServeNow product to English-only behavior.
- Deleted the shared translation catalog and all web/mobile language provider and picker modules.
- Removed language controls from all clients, Arabic/Urdu RTL handling, Admin language configuration, and the public language settings endpoint.
- Replaced remaining structured translation-key shell labels with their actual English labels, then rebuilt and restarted the affected workflows.
- Final Customer Web screenshot showed normal English labels including Home, Services, Bookings, and Profile; browser logs contained no application errors.
- Customer Web, Admin Web, Partner Web, and Server production builds passed; `git diff --check` passed.
- Main workflow migrations completed successfully and the API served the Customer Web category, reel, offer, and featured-service requests with HTTP 200.
- No deployment or GitHub push was performed for this rollback.

### Partner job operations parity (2026-08-05)
- Partner Web job details now show stored before/after evidence and allow PNG/JPEG/WebP uploads through Supabase-backed partner evidence APIs.
- Partner Web job details now let partners report customer-unavailable/no-show, wrong address, unsafe location, extra work, payment refusal, or other issues with structured priority and details.
- The API was temporarily blocked by stale PostgreSQL relation locks from an older application query; only those stale sessions were terminated, after which the full idempotent migration completed and the API returned HTTP 200.
- Partner Web strict TypeScript check and production build passed. The restarted Partner Web workflow served on port 4000, and the final preview rendered the login screen without application browser errors.
- The live evidence bucket was created/updated during startup. Real provider transactions/refunds remain unverified until Razorpay, Stripe, and RazorpayX credentials are configured.

### Partner Expo QR scanner refresh (2026-08-05)
- Updated `scripts/expo-tunnel.sh` and the canonical `tmp-qr/scanner.html` to match the uploaded QR reference: light gray background, larger white rounded cards, larger QR panels, updated spacing, and current-file messaging.
- Partner QR cards continue to use `partner-qr.png`, so the displayed code is regenerated whenever the Partner Expo tunnel restarts.
- Restarted the Partner Expo workflow; the current Partner tunnel is `exp://arose-unframed-eclipse.ngrok-free.dev` and its public manifest returned HTTP 200.
- Final QR scanner preview was captured at `screenshots/qr-scanner-partner-updated.jpg`; scanner HTML and Partner PNG both returned HTTP 200.

### Admin Customers and Professionals histories (2026-08-05)
- Admin navigation now labels the customer-account area `Customers`; partner accounts are no longer mixed into that list.
- Customer search is server-backed across full name, email, and phone.
- Customer Details combines the customer profile, legacy bookings, newer service-order history, assigned partner names, payment status/method/amount/timestamps, gateway references, summary counts, and total paid amount.
- Professional Details combines the professional and linked login profile, legacy bookings, assigned service jobs, customer details, customer price versus partner payout, payment history, reviews, payout requests, payout timestamps, and summary totals.
- Both detail panels include local search across service, customer, status, email, order ID, and record ID.
- Admin Web and Server production builds passed. The Admin Panel workflow serves on port 5001 and the API health endpoint returned HTTP 200 after restart.
- Startup initially waited on a stale `users` relation lock held by an older customer-list query; PostgreSQL activity/lock inspection confirmed the blocker, it was terminated, and the single migration run completed successfully.

### Admin Panel navigation improvements (2026-08-05)
- The previously added clickable sitemap page, sidebar entry, and header links were reverted at the user's request.
 - Removed the Admin Panel breadcrumb row at the user's request; pages now start directly with the page title.
- Removed the remaining page-specific breadcrumb rows from Categories and Sub-category views; the Sub-category back button remains available.
 - No sitemap references remain in Admin Web.
- Added a dedicated scroll container to Create Professional so the complete form remains reachable inside the fixed-height Admin Panel shell.
- Admin Web production build passed after the sitemap revert.

### Partner Mobile Schedule fix (2026-08-05)
- The Schedule tab is the partner’s day planner: it combines assigned legacy bookings and service-order jobs for the next seven days and lets the partner select a day.
- Each scheduled job can show its appointment time, duration, service, customer, address/map link, and expected partner payout. The top metrics come from the partner performance endpoint.
- The “Could not load schedule” error came from PostgreSQL date comparisons receiving raw JavaScript `Date` values in the Schedule controller.
- Both date filters now use ISO timestamps explicitly cast to `timestamptz`.
- Server build and Partner Mobile type-check passed. After restarting the API and Partner Expo workflows, `/api/partner/schedule?from=2026-08-05&to=2026-08-11` returned HTTP 200 and Metro served the Partner app.

### Admin Partner Payout fix (2026-08-04)
- Fixed the payout Control Centre handler so the UI can correctly approve a request for scheduled payout, send it through RazorpayX, or reject it.
- Fixed stale Admin Web `tx(...)` calls left behind by the English-only rollback; these were causing a blank Admin login screen after restart.
- Admin Web production build passed, `git diff --check` passed, and the refreshed Admin preview renders the login screen normally.
- The browser only reports a non-blocking password autocomplete recommendation. Real money transfer still requires valid RazorpayX configuration, a partner UPI ID, and Test/Sandbox Mode disabled.

### Partner account/professional visibility fix (2026-08-05)
- `partner@servenow.in` is a valid partner login linked to the active `Rajan Verma` professional profile.
- The database also contains a separate older, unlinked professional row with the same display name; it was not deleted.
- Admin Professionals now supports server-side search by partner login email/name/title and displays the linked login email or “No partner login linked.”
- Live verification returned `Rajan Verma` with `partner@servenow.in`; Admin Web and Server builds passed.
- Admin Professionals now defaults to “Linked Partners”; unlinked records are available under “Unlinked Profiles.”
- Professionals supports multi-select Category and Sub-category filters in both views.
- Search now remains focused while typing and applies after a short debounce instead of remounting the page after every character.
- GitHub `main` is synchronized with the Repl at commit `e5c927233`.
- The pushed history preserves GitHub's newer marketplace/mobile commits and adds the Admin Panel/backend work plus the remaining Customer Web, Customer Mobile, and Expo routing refinements.
- Partner Web and Partner Mobile had no remaining source differences and were already present on GitHub.
- Customer Web, Admin Web, and Partner Web production builds passed; Partner Mobile type checking passed.
- Customer Mobile type checking still reports pre-existing errors in `app/checkout.tsx` and cannot resolve `@servenow/shared`; these errors are unrelated to the icon fallback changes.
- The local tree is clean. A lockfile-only metadata difference remains on the preserved local comparison branch and was intentionally not pushed.
- Expo Go failure investigation found the ngrok QR generator wrote `exps://` links; the live HTTPS manifests and Android bundles were healthy. The generator now writes `exp://` links, and fresh Customer/Partner QR codes were validated.
- Partner Mobile Earnings now fetches and displays the same payout history as Partner Web, including amount, optional note, requested date, Pending/Processing/Paid/Rejected status, pull-to-refresh, and immediate insertion after a successful request. Mobile payout API calls returned HTTP 200; Partner Mobile type check and Partner Web production build passed.
- Admin Management's Create Admin Account card now uses a calmer slate surface with sky-blue borders, icon, focus states, and action button instead of the heavy purple treatment. Admin Web production build passed.
- The uploaded neutral charcoal reference is scoped only to the Admin Management Create Admin Account form. The wider Admin Panel shell, login page, navigation, shared controls, and other sections retain the original purple theme. Admin Web production build passed, the workflow restarted cleanly, and the restored purple login preview was visually verified.
- The Create Admin Account form now uses explicit solid colors: navy card `#1b2638`, graphite controls `#24252a`, defined gray borders, sky-blue focus accents, and a neutral gray action button. These values are local to Admin Management; the global Admin Panel theme remains unchanged. Admin Web build and workflow restart passed.
- The latest Create Admin Account references were sampled directly: card `#1B2638`, controls `#24252A`, borders `#3B3D44`, and button `#3A3C42`. These are now dedicated Admin Management-only style constants; the global purple Admin Panel theme remains unchanged. Admin Web build and workflow restart passed.
- The newest Create Admin Account reference supersedes the neutral button/icon treatment: the form now uses charcoal card `#181A20`, controls `#24262B`, borders `#3B3D42`, a purple icon badge `#232041`/`#8B5CF6`, purple focus states, and a `#6446F6` to `#7252F7` button gradient. The change remains scoped to Admin Management; Admin Web build and workflow restart passed.
- The live Expo manifests and Android bundles both returned HTTP 200. Fresh QR PNGs decode to `exp://prison-deacon-science.ngrok-free.dev` (Customer) and `exp://arose-unframed-eclipse.ngrok-free.dev` (Partner); the public scanner is verified at the QR service external port `:3001`.
- Verified public development routes are Customer Web `:5000/customer/`, Partner Web `:3000/partner/`, Admin Panel `/admin-panel/`, and QR scanner `:3001/`. QR PNGs, scanner HTML, screenshots, and uploaded reference assets remain uncommitted runtime/user artifacts.


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
