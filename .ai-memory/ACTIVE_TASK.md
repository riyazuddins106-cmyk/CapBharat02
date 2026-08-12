# Active Task Tracker — ServeNow

> ⚠️ AI INSTRUCTION — MANDATORY, NO EXCEPTIONS:
> You MUST update this file after every completed step during a task.
> Do not finish a step and move on without updating the checklist below first.

---

## ▶ Current Task
**Task:** Align Customer Mobile bottom navigation with Partner Mobile
**Started:** 2026-08-12
**Status:** COMPLETE — safe-area-aware tab bar and native icon sizing applied

## 🔄 Active Task — Customer Mobile bottom navigation — 2026-08-12

- [x] Read the uploaded Customer and Partner references and compare both tab layouts.
- [x] Remove the Customer tab bar's fixed Android height and bottom padding that overlapped the system navigation controls.
- [x] Match Partner Mobile's safe-area-aware tab bar behavior, label spacing, and native icon sizing.
- [x] Type-check Customer Mobile, run `git diff --check`, restart Customer Expo, inspect fresh Metro output, and update continuity documentation.

## ✅ Completed Task — Customer Mobile bottom navigation — 2026-08-12

- [x] Customer Mobile now lets Expo Router calculate the native tab-bar height including Android safe-area insets.
- [x] The Android system back/home/recents bar is no longer forced into the app tab-bar area by a fixed height override.
- [x] Customer navigation now follows the same layout behavior as the working Partner App.

## 🔄 Active Task — Customer Mobile booking confirmation details — 2026-08-12

- [x] Read the uploaded booking-confirmation reference and trace the Customer Mobile checkout state.
- [x] Replace the raw minutes-since-midnight value with the created order's persisted schedule.
- [x] Show the booked service, formatted date/time window, duration, full address, and pending status.
- [x] Build/type-check Customer Mobile, run `git diff --check`, restart Expo Customer, inspect fresh Metro logs, and update continuity documentation.

## ✅ Completed Task — Customer Mobile booking confirmation details — 2026-08-12

- [x] The confirmation card no longer displays malformed values such as `Tomorrow · 570`.
- [x] The card now formats the saved order timestamp and derives the service window from the persisted order duration.
- [x] Customer Mobile validation passed and the refreshed Expo workflow started without new runtime errors.

## 🔄 Active Task — Schedule job counts and partner handoff — 2026-08-12

- [x] Show the number of scheduled jobs on each Partner Web and Partner Mobile date selector.
- [x] Add a reason-based “Pass to another partner” action for future accepted service-order jobs.
- [x] Offer passed jobs only to eligible, approved, available partners while retaining the original assignment.
- [x] Transfer the assignment atomically when another partner accepts; otherwise keep the original partner responsible.
- [x] Persist the pass reason, apply the migration, build/type-check both clients and server, restart workflows, preview Partner Web, and inspect logs.

## ✅ Completed Task — Schedule job counts and partner handoff — 2026-08-12

- [x] Schedule dates now show `No jobs` or the exact job count, such as `1 job` or `6 jobs`.
- [x] Partners can pass future accepted service-order work with a required reason.
- [x] The original partner remains assigned until another eligible partner accepts; the original assignment and service/payment state are preserved if nobody accepts.
- [x] Server, Partner Web, Partner Mobile validation passed; the handoff migration and workflows completed cleanly.

## 🔄 Active Task — Partner Expo blue error screen — 2026-08-12

- [x] Inspect the uploaded screenshot and distinguish Expo Go’s generic error screen from the Partner App theme.
- [x] Inspect Partner Expo logs and identify the first ngrok attempt failure rather than a Partner App JavaScript exception.
- [x] Restart the configured Partner Expo workflow, confirm tunnel connection, and refresh the scanner/QR URL.
- [x] Confirm current logs have no JavaScript runtime error and update continuity documentation.

## ✅ Completed Task — Partner Expo blue error screen — 2026-08-12

- [x] The blue screen was Expo Go’s fallback after the tunnel failed to load the project bundle.
- [x] Partner Expo recovered on retry with a fresh `exp://...exp.direct` URL; users must scan the refreshed QR instead of a stale QR.

## 🔄 Active Task — Future partner bookings and Schedule — 2026-08-12

- [x] Keep accepted future service-order items out of the active/in-progress partner feed until check-in or payment/service work begins.
- [x] Make Schedule include assigned future legacy and service-order jobs while excluding cancelled/completed work.
- [x] Extend Partner Web and Partner Mobile Schedule from 7 days to 30 days so bookings 15 days away remain visible.
- [x] Build/type-check affected apps, restart API/Partner Web/Partner Expo workflows, inspect fresh logs, and update continuity documentation.

## ✅ Completed Task — Future partner bookings and Schedule — 2026-08-12

- [x] The Scheduled page is now the planning surface for accepted future work; active jobs represent work that is operationally underway.
- [x] Schedule cards show the scheduled status and support the next 30 calendar days.
- [x] Server, Partner Web, and Partner Mobile validation passed and workflows restarted cleanly.

## 🔄 Active Task — Payment method configuration and partner earnings — 2026-08-12

- [x] Prevent unconfigured UPI from appearing as a payable method, and return an explicit configuration error for stale selections.
- [x] Stop itemized test payments from marking unconfigured UPI as paid and moving the service to `service_started`.
- [x] Make booking tracking derive “Payment confirmed” from the paid payment record, not only the service status.
- [x] Block partner completion while item payment is unresolved and refresh Partner Mobile earnings after completion.
- [x] Build/type-check affected apps, verify the public payment config, restart workflows, inspect logs, preview the app, and update continuity documentation.

## ✅ Completed Task — Payment method configuration and partner earnings — 2026-08-12

- [x] Current payment config now exposes only `cash`; unconfigured UPI is clearly explained in customer payment sheets.
- [x] Test-mode and live item-payment endpoints reject unconfigured UPI with an actionable Admin message.
- [x] Payment tracking and partner earnings refresh now reflect persisted payment/completion state.
- [x] Server, Customer Web, Customer Mobile, and Partner Mobile validation passed.

## 🔄 Active Task — Customer cancellation-policy placement — 2026-08-12

- [x] Kept product listings free of prominent cancellation-fee labels.
- [x] Added a short cancellation-policy disclosure to Customer Web and Customer Mobile service detail.
- [x] Added the full policy before Customer Web and Customer Mobile checkout confirmation plus compact booking-confirmation reminders.
- [x] Kept exact contextual fees after partner acceptance/check-in and show the exact fee in both cancellation confirmation modals.
- [x] Built/type-checked, previewed, restarted affected workflows, and updated documentation.

## ✅ Completed Task — Customer cancellation-policy placement — 2026-08-12

- [x] Customer Web and Customer Mobile detail pages use compact expandable policy disclosures.
- [x] Both checkout and confirmation flows disclose the live percentage/minimum/maximum policy at the appropriate level.
- [x] Customer Web cancellation now uses an in-app modal with the exact estimated fee; listings remain uncluttered.
- [x] Builds, type-checks, workflow restarts, fresh logs, preview, and continuity documentation passed.

## 🔄 Active Task — Use bounded percentage cancellation penalties — 2026-08-12

- [x] Replaced fixed-rupee partner-accepted and partner-check-in fields with percentage rate plus minimum and maximum rupee bounds across the API contract and client types.
- [x] Applied `MAX(minimum, MIN(rate calculation, maximum))` on the server, capped at the service price.
- [x] Updated Admin controls, Customer Web, and Customer Mobile to use the shared calculation.
- [x] Built/type-checked the affected packages, restarted affected workflows, verified the public booking config, and updated project documentation and continuity notes.

## ✅ Completed Task — Use bounded percentage cancellation penalties — 2026-08-12

- [x] Admin now configures a percentage rate plus minimum and maximum rupee fees for cancellation after acceptance and after check-in.
- [x] Server, Customer Web, and Customer Mobile calculate `MAX(minimum, MIN(rate calculation, maximum))`, round to rupees, and cap the fee at the service price.
- [x] Defaults are 20%, ₹50 minimum, and ₹500 maximum for both stages.
- [x] Server/Web/Admin builds, Customer Mobile TypeScript check, live config verification, workflow restarts, preview checks, and `git diff --check` passed.

## ✅ Completed Task — Investigate Partner Web vs Partner Mobile job discrepancy — 2026-08-12

- [x] Compared the Web and Mobile clients: both call `/api/partner/order-item-jobs` and both render `pendingRequests`.
- [x] Correlated server response sizes: the two `621`-byte responses were populated immediately after checkout; later `81`-byte responses were empty after expiry.
- [x] Queried Supabase: the Full Home Deep Cleaning request was assigned to `Partner1` (`riyazuddins107@gmail.com`), expired after the configured one-minute window, and moved to `waiting_operation`.
- [x] Verified the documented Mobile test login is `Test Partner` (`partner@servenow.in`), currently busy and assigned to the AC category, so it is not eligible for that Home Cleaning request.
- [x] Kept server dispatch/category/sub-category/availability enforcement unchanged; no UI or backend patch was justified.

## ✅ Completed Task — Refresh Partner Expo tunnel with latest workspace code — 2026-08-12

- [x] Restarted the Partner Expo workflow from the current workspace.
- [x] Confirmed Metro rebuilt the Partner app and the tunnel connected successfully.
- [x] Confirmed the live tunnel URL is `exp://mqrmf3k-anonymous-8099.exp.direct`.
- [x] Restarted the QR Codes workflow and confirmed the scanner cache refreshed.

## ✅ Completed Task — Reconcile timed-out partner searches in Admin and Partner feeds — 2026-08-12

- [x] Traced the stuck `Searching Partner` service-order row to expiry running only from the customer orders feed.
- [x] Centralized itemized-order expiry using the persisted dispatch deadline, with a bounded fallback for older rows.
- [x] Applied expiry reconciliation to Admin orders, Admin legacy dispatch, Partner jobs, and customer order reads.
- [x] Expired pending partner requests and moved timed-out items/bookings to `waiting_operation`.
- [x] Passed the server TypeScript build, API health check, and `git diff --check`.
- [x] Restarted the main application workflow and confirmed no application errors in fresh logs.

## ✅ Completed Task — Partner dashboard eligibility status messaging — 2026-08-12

- [x] Added document and availability status evaluation to Partner Mobile dashboard.
- [x] Added the same eligibility-priority banner to Partner Web dashboard.
- [x] Applied the agreed order: missing/attention-needed documents, pending review, offline, busy, then available.
- [x] Added document navigation actions for missing, rejected, expired, and pending document states.
- [x] Passed Partner Web production build, Partner Mobile TypeScript check, and `git diff --check`.
- [x] Restarted Partner Web and Partner Expo workflows; both are running cleanly.

## ✅ Completed Task — Fix stale Mobile document eligibility banner — 2026-08-12

- [x] Compared the uploaded Web and Mobile screenshots and traced the discrepancy to separate Mobile document query caches.
- [x] Aligned the Mobile dashboard with the Documents screen's `doc-types` and `docs` query keys.
- [x] Forced fresh document reads when the dashboard/documents screen mounts.
- [x] Added document-type and document refetches to Mobile dashboard pull-to-refresh.
- [x] Passed Partner Mobile TypeScript check and `git diff --check`.
- [x] Restarted Partner Expo and confirmed Metro, tunnel, and QR regeneration are healthy.

## ✅ Completed Task — Refresh Partner Expo tunnel after Expo Go error screen — 2026-08-12

- [x] Read the uploaded Expo Go error screenshot and identified the generic project-loading failure state.
- [x] Restarted the Partner Expo workflow and confirmed Metro and the HTTPS tunnel connected.
- [x] Regenerated the Partner QR PNG and scanner page from the live tunnel.
- [x] Restarted the QR Codes workflow and verified the page displays the current Partner tunnel URL.
- [x] Confirmed `bash -n scripts/expo-tunnel.sh` and `git diff --check` pass.

## ⏸️ Blocked Diagnostic — Partner Expo Go generic error screen — 2026-08-12

- [x] Read the uploaded device screenshot from `attached_assets`.
- [x] Confirmed the Partner Expo workflow is running with a fresh native `exp.direct` URL.
- [x] Confirmed the Android manifest and exact Android launch bundle return HTTP 200.
- [x] Confirmed no Metro resolution or transform error is present in the Partner workflow log.
- [ ] Obtain the device-side Expo Go “View error log” text; the user declined to provide it.

## ✅ Completed Task — Repair stale Partner Expo QR scanner — 2026-08-12

- [x] Read both uploaded device/scanner images from the workspace.
- [x] Confirmed the device error was `java.io.IOException: Failed to download remote update`.
- [x] Traced the QR payload to the stale `arose-unframed-eclipse.ngrok-free.dev` Partner tunnel.
- [x] Updated the tunnel QR generator to rebuild the standalone scanner and PNGs from live tunnel caches.
- [x] Restarted Partner Expo and verified the current `exp.direct` QR PNG payload and QR Codes page.
- [x] Confirmed `git diff --check` and `bash -n scripts/expo-tunnel.sh` pass.

## ✅ Completed Task — Partner OTP delivery diagnosis and reset fallback — 2026-08-12

- [x] Confirmed signup and password-reset requests reached the API.
- [x] Confirmed the actual Supabase `email_config` uses Gmail SMTP with credentials present.
- [x] Verified Gmail SMTP negotiation and delivery acceptance (`250 2.0.0 OK`, recipient accepted).
- [x] Added the development OTP display to the Partner mobile password-reset screen; signup already had it.
- [x] Passed Partner mobile TypeScript validation and `git diff --check`.
- [x] Restarted Partner Expo and confirmed the tunnel/QR regeneration is healthy.

## ✅ Completed Task — Category and sub-category partner eligibility — 2026-08-12

- [x] Applied category and sub-category matching to legacy automatic booking dispatch.
- [x] Updated Booking Operations Centre eligible-partner results and manual assignment validation.
- [x] Rechecked legacy partner job visibility, acceptance, and redispatch when returning online.
- [x] Kept legacy partners without a saved sub-category broadly matched within their category.
- [x] Passed server build, Partner Web build, Partner Mobile TypeScript check, `git diff --check`, API readiness smoke test, and affected workflow restarts.

## ✅ Completed Task — Resume customer signup after closing OTP screen — 2026-08-12

- [x] Identified that the user row is created before signup OTP verification, so closing the screen leaves an active unverified account.
- [x] Updated customer registration to resume active unverified accounts, resend the OTP with the normal cooldown, and update the newly entered password/details.
- [x] Kept verified accounts protected by the existing duplicate-email conflict.
- [x] Passed the server build, `git diff --check`, and API workflow restart.

## ✅ Completed Task — Configurable partner search timer — 2026-08-12

- [x] Added the Admin Booking Settings search-duration control with a 10-minute default and public config response.
- [x] Persisted search deadlines for modern order items and legacy bookings, including migration-safe startup columns.
- [x] Reset deadlines on Continue Searching and blocked partner acceptance after expiry.
- [x] Added live countdowns, paused states, and expiry-only Continue Searching actions to Customer Web and Customer Mobile.
- [x] Preserved old records with a 10-minute fallback based on their last update/creation time.
- [x] Passed server build, Customer Web build, Customer Mobile TypeScript check, `git diff --check`, API config smoke test, workflow restarts, and Customer Web preview verification.

## ✅ Completed Task — Refresh QR Codes Website assets — 2026-08-12

- [x] Regenerated the canonical Customer and Partner QR PNGs from the active Expo tunnel URLs.
- [x] Updated the canonical scanner page URL labels and restarted the QR Codes Website workflow.
- [x] Verified the rendered page shows both QR cards and the correct active URLs.

## ✅ Completed Task — Investigate Partner Expo blue screen after QR scan — 2026-08-12

- [x] Restarted the Partner Expo workflow and confirmed the current Partner QR was regenerated for the active tunnel.
- [x] Verified the Partner Expo manifest, Metro status endpoint, and Android bundle all return successfully through the current tunnel.
- [x] Confirmed the Partner web route renders normally; no native client crash or scan-time error was emitted by the available workflow logs.
- [x] Identified the visible blue/teal screen as most consistent with Expo Go splash/loading state; current QR must be scanned from Expo Go rather than an old QR image or the phone camera.

## ✅ Completed Task — Repair Partner Expo Go runtime screen — 2026-08-12

- [x] Diagnosed the uploaded screenshot as Expo Go's generic project/runtime error screen rather than the Partner App error boundary.
- [x] Guarded the Partner auth redirect until Expo Router's root navigator is mounted and the first route segment is available.
- [x] Switched the Partner workflow to Replit's native HTTPS Expo tunnel and synchronized `/qr` with the active `exp.direct` URL.
- [x] Passed Partner Mobile TypeScript validation and `git diff --check`; verified the new manifest and Android bundle resolve successfully.

## ✅ Completed Task — OTP resend cooldown, expiry, and delivery feedback — 2026-08-12

- [x] Enforced a 60-second resend cooldown server-side per email and OTP purpose, with countdowns on Customer Web, Partner Web, Customer Mobile, and Partner Mobile.
- [x] Invalidated older active codes when a new code is issued and retained server-side expiry validation with expiry messaging on the OTP screens.
- [x] Returned development-only OTP codes/timing metadata to the clients so Ethereal fallback delivery is not mistaken for Gmail delivery.
- [x] Passed server build, both web builds, both mobile TypeScript checks, `git diff --check`, workflow restarts, and a clean customer preview screenshot.

## ✅ Completed Task — Approved-partner dispatch and live refresh — 2026-08-12

- [x] Centralized document approval eligibility across automatic dispatch, Admin eligible-partner lists, manual assignment, and partner acceptance for legacy and itemized jobs.
- [x] Blocked partners with no documents, incomplete required documents, pending documents, rejected documents, or non-approved current uploads from receiving jobs.
- [x] Added Customer Web and Partner Web visible polling/focus refresh plus Customer Mobile and Partner Mobile foreground/refetch polling.
- [x] Passed server/web builds, both mobile TypeScript checks, `git diff --check`, live eligible-partner assertion, startup migration, and affected workflow restarts.

## ✅ Completed Task — Account identity settings — 2026-08-12

- [x] Added immutable, globally unique usernames with startup backfill and generation for customer, partner, admin, and operations accounts.
- [x] Added target-aware OTP purposes and authenticated request/verify endpoints for email and phone changes.
- [x] Blocked direct contact-field updates from profile, partner-account, Admin self-profile, and Admin management paths.
- [x] Added read-only username and verified email/phone editing to Customer Web, Partner Web, Admin Web, Customer Mobile, and Partner Mobile.
- [x] Updated local/auth state after successful verification and preserved Admin-managed customer/staff contact editing through OTP prompts.
- [x] Passed server and all web builds, both mobile TypeScript checks, `git diff --check`, startup migration, live identity API smoke test, Expo workflow restart, and web preview checks.

### Documentation synchronization — 2026-08-12
- [x] Read the uploaded AI documentation synchronization master prompt.
- [x] Compared its required status/test claims with the current source and existing `/docs` layout.
- [x] Updated the verified test commands, final QA totals, Operations control description, known issues, and documentation history.
- [x] Confirmed this synchronization changed documentation only; no application source was modified.

### Fresh database UAT — 2026-08-12
- [x] Reset disposable development records while preserving schema and migration history.
- [x] Seeded a clean catalog, baseline accounts, qualified partner, and payment test mode.
- [x] Performed fresh legacy and itemized UAT with retained completed, paid, and refunded records.
- [x] Fixed and retested the itemized manual-assignment state transition and stale GPS fixture IDs.
- [x] Wrote `qa/uat-record-2026-08-12.md`.

### Final QA closure — 2026-08-12
- [x] Fixed Admin Reviews and Booking History sticky table headers.
- [x] Replaced the custom Admin rows-per-page menu with an accessible native select, including All.
- [x] Admin browser suite passed 17/17 after the UI fixes.
- [x] Itemized service-order flow passed 16/16; GPS dispatch passed 66/66.
- [x] Payment lifecycle passed 21/21; legacy full lifecycle passed 45 with 0 failures and 3 intentional skips.
- [x] CRUD regression passed 71/71; Customer Web, Admin Web, Partner Web, and Server builds passed.
- [x] Customer Mobile and Partner Mobile TypeScript checks passed; `git diff --check` passed.
- [x] Confirmed the development database has no persisted E2E NearPro/FarPro partner records.
- [x] Created and validated `qa/servenow-qa-report-2026-08-12.xlsx`.

- [x] Audited the Admin menu, deep links, dispatch queue, booking history, detail, assignment, cancellation, and refresh flows.
- [x] Made sidebar navigation update URL hashes and support browser back/forward; restored the missing Settings deep link.
- [x] Added dispatch-page loading, refresh, and 30-second freshness behavior without reloading unrelated Admin datasets.
- [x] Corrected dispatch date filtering and status display for cancelled/completed bookings with stale dispatch metadata.
- [x] Added Booking History page heading and refresh action; clarified service-linked partner eligibility copy.
- [x] Admin Web build, diff check, workflow restart, live dispatch/history/detail/eligible-partner API checks, and preview verification passed.
- [x] Confirmed Amit's two Partner Mobile requests are itemized order requests, not legacy bookings.
- [x] Added active itemized service-order jobs to the Operations Centre queue while preserving the legacy booking source and controls.
- [x] Added source labeling, itemized status normalization, service-order detail routing, combined filtering/counts/export, and unified refresh polling.
- [x] Admin Web rebuild, workflow restart, live order verification, and preview/log checks passed.
- [x] Read the current project handoff, testing notes, workflows, package scripts, and known gotchas.
- [x] Create fresh full-project documentation from the current repository.
- [x] Run server/API health, role-auth, CRUD, and current order-item lifecycle tests.
  - [x] Initial order-item run reached API health, then timed out before registration; stale API/database sessions were cleared by restarting the application.
  - [x] Rerun of current order-item lifecycle: 16 passed, 0 failed; payment test-mode branch skipped because disabled.
  - [x] CRUD regression: 56 passed, 9 failed; failures require classification (stale test routes/OTP parser vs product behavior).
  - [x] Classified CRUD failures as stale route/fixture assumptions or provider-dependent paid payout; updated the regression harness to current contracts.
  - [x] Rerun of updated CRUD regression: 71 passed, 0 failed.
- [x] Run server/API health, role-auth, CRUD, and current order-item lifecycle tests.
- [x] Run Customer Web, Admin Web, Partner Web, and Server production builds; Admin emitted only its existing large-chunk warning.
- [x] Run Customer Mobile and Partner Mobile type-check/export/bundle verification; both type checks and Expo web exports passed.
- [x] Exercise live customer → partner → admin cross-surface contracts.
  - [x] Customer order list/wishlist, role guards, Admin Service Orders, unified Operations queue, and order detail passed.
  - [x] Seeded partner account returned zero pending itemized requests; the pending-request ownership was traced before judging partner visibility.
  - [x] Traced pending records to Amit Verma; Amit login, 2 pending AC Service requests, and first request detail all passed.
- [x] Exercised the live cross-surface records and recorded the confirmed preview/accessibility failures.
- [x] Fixed confirmed failures: Admin/Partner login autocomplete metadata, Customer/Partner Replit preview API origin handling, and API cross-port resource policy.
- [x] Re-ran affected builds and API tests, restarted workflows, inspected logs, and captured settled previews.
- [x] Updated the full QA report and project continuity documentation with final results.
- [x] Added Service Orders and unified Operations controls for Eligible Partners, manual assignment, Stop searching, Restart Dispatch, and unpaid-item cancellation.
- [x] Added active-partner/service-qualified validation, request expiry, `waiting_operation` migration, and paid-item refund protection for the new service-order operations actions.
- [x] Admin Web and Server builds, `git diff --check`, workflow restarts, API health, authenticated eligible-partner lookup, migration, and preview checks passed without mutating live Amit requests.
- [x] Removed six orphaned `E2E NearPro` / `E2E FarPro` profiles and any matching test partner accounts from the development database after explicit confirmation.
- [x] Fixed the GPS dispatch E2E fixture to provide the required partner city and fixed teardown to delete professionals before users; the suite passed 66/66 and left zero E2E partner profiles/accounts.

## ✅ Completed Task — Partner job visibility and verification status
**Completed:** 2026-08-12

- [x] Confirmed dispatch created pending requests for Amit, but Partner Mobile hid them.
- [x] Removed the inconsistent profile sub-category hard filter from order-item listing, detail, and acceptance.
- [x] Kept exact `partner_services`, category, active, and availability checks intact.
- [x] Fixed fully approved optional documents showing as Pending Verification when no document type is mandatory.
- [x] Added payment fields to the Partner Mobile order-item response type.
- [x] Server build, Partner Web build, Partner Mobile type-check, and `git diff --check` passed.
- [x] Restarted the application workflow and verified Amit’s authenticated API returned two pending AC Service requests.

### Runtime investigation — 2026-08-11
- [x] Confirmed Customer Expo's first failure: port 8081 was occupied by the mockup preview, so Metro exited before serving a bundle.
- [x] Released the conflicting mockup workflow and restarted Customer Expo; Customer and Partner manifests and Android bundles returned HTTP 200.
- [x] Confirmed the public web routes: Customer `/`, Admin `/admin-panel/`, Partner `/partner/`, QR scanner `/qr/`.
- [x] Confirmed the separate public API routing issue: `/api/*` reaches the starter API artifact, while ServeNow's server on local/public API port 8000 returns 200 for the same endpoints.
- [x] Mitigated the public API routing issue for web clients by selecting API port 8000 on Replit preview hosts; the root `/api/*` route remains an environment limitation.

### Documentation source-of-truth correction — 2026-08-09
- [x] Identified that `.ai-memory/` and `docs/ai/` are authoritative; `.agents/memory/` is not the project task log.
- [x] Remove duplicate `.agents/memory/` notes created during the previous response.
- [ ] Record the process failure and prevention rule in authoritative documentation.
- [ ] Verify the authoritative files and finish the task.

### Files changed so far
- Web/API source, authoritative `.ai-memory` records, `docs/ai` records, and
  `docs/FULL_PROJECT_DOCUMENTATION.md` were updated during the completed QA pass.

### Notes for next session
The previous response followed the session snapshot’s `.agents/memory/` reminder instead of the repository’s `replit.md` and `.ai-memory/START_HERE.md` rules. The authoritative documentation already contained the Expo incident. Do not create parallel task records.

### Runtime verification and documentation repair — 2026-08-09
- [x] Confirmed the screenshot error was caused by stopped workflows and no listener on the Replit preview port.
- [x] Started the existing workflows without changing application code.
- [x] Confirmed API health and Customer Web, Admin Panel, Partner Web, QR server, Customer Expo, and Partner Expo availability.
- [x] Confirmed both current Expo manifests and Android launch bundles return HTTP 200.
- [x] Recorded the verified root causes, URLs, tunnel checks, and no-code-change scope in `.ai-memory` and `docs/ai`.
- [x] Removed the mistaken duplicate documentation edits from `.agents/memory`.

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
