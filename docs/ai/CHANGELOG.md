# Documentation Changelog

## 2026-08-12 — Fix failed ServeNow publishing build

Removed the stale managed API artifact service that was failing the `/api`
health check and blocking autoscale promotion. Verified the main production
build after the managed TOML replacement.

## 2026-08-12 — Align Customer Mobile bottom navigation

Documented the Customer Mobile tab-bar correction: remove the fixed native
height override and use Expo Router's safe-area-aware layout like Partner
Mobile.

## 2026-08-12 — Fix Customer Mobile booking confirmation details

Documented the correction that replaces the raw slot-minute value on the
booking confirmation with the persisted order schedule and a complete,
readable booking summary.

## 2026-08-12 — Add Schedule counts and future partner handoff

Added visible job counts to Partner Web/Mobile date selectors and documented
the controlled future-job handoff flow: partners provide a reason, eligible
partners receive the request, and the original partner stays assigned unless
a replacement accepts.

## 2026-08-12 — Recover Partner Expo blue error screen

Recorded that the uploaded blue screen was Expo Go’s tunnel/bundle fallback,
not Partner App branding. The Partner Expo workflow was restarted, its retry
recovered the tunnel, and the scanner QR was refreshed.

## 2026-08-12 — Separate future partner work from active services

Documented the Schedule workflow correction: accepted future service orders no
longer appear as in-progress work, Schedule covers a 30-day planning window,
and cancelled/completed jobs are excluded from the schedule.

## 2026-08-12 — Repair unconfigured UPI and partner earnings state

Documented the payment-state fix: unconfigured UPI is no longer exposed or
accepted, Test Mode respects configured methods, tracking uses the persisted
paid state, unpaid items cannot be completed, and Partner Mobile refreshes
earnings after completion.

## 2026-08-12 — Customer cancellation-policy placement

Documented the customer-facing placement rule: no prominent label on product
listings; compact expandable disclosure on service detail; full policy before
checkout confirmation; compact confirmation reminder; and exact bounded
estimates after acceptance/check-in and immediately before cancellation.

## 2026-08-12 — Bounded percentage cancellation policy

Documented the replacement of fixed-rupee cancellation amounts with a
percentage rate constrained by minimum and maximum rupee fees. Customer Web,
Customer Mobile, Admin Booking Settings, and the itemized cancellation API use
the same calculation and service-price cap.

## 2026-08-12 — Resumable customer signup

Documented the signup recovery behavior for accounts created before OTP
verification. Repeating customer signup with an active unverified email now
resumes the flow, resends the OTP with cooldown protection, and updates the
entered password/details; verified accounts still return a duplicate conflict.

## 2026-08-12 — QR Codes Website assets refreshed

Regenerated the canonical Customer and Partner Expo QR PNGs from the active
tunnel URLs, refreshed the scanner page labels, restarted the QR Codes
workflow, and verified the rendered page.

## 2026-08-12 — OTP resend cooldown, expiry, and delivery feedback

### Changes
Added a server-enforced 60-second resend cooldown per email and OTP purpose,
matching countdowns across Customer Web, Partner Web, Customer Mobile, and
Partner Mobile. Older active codes are invalidated when a new code is issued,
and OTP screens show the configured expiry period.

Documented the development mail behavior: without SMTP or SendGrid settings,
Nodemailer uses Ethereal, which does not deliver to the user's real inbox.
Development-only code/timing metadata is now surfaced so this state is explicit.

### Verification
Server build, both web builds, both mobile TypeScript checks, `git diff --check`,
affected workflow restarts, and Customer Web preview/browser checks passed.

## 2026-08-12 — Approved-partner dispatch and live refresh

### Changes
Centralized partner document eligibility across legacy and itemized automatic
dispatch, Admin eligible-partner lists, manual assignment, and partner
acceptance. Partners without approved required documents, with incomplete
uploads, or with no current approved documents are excluded from receiving
jobs. Removed the migration behavior that repeatedly disabled required
document configuration.

Added visible 10-second refresh and focus recovery to Customer Web and Partner
Web, plus 10-second active-feed polling and foreground refetch to Customer
Mobile and Partner Mobile.

### Verification
Server and all web builds, both mobile TypeScript checks, `git diff --check`,
live eligibility assertion, startup migration, and affected workflow restarts
passed.

## 2026-08-12 — Account identity settings

### Changes
Added immutable globally unique usernames with idempotent startup backfill and
generation for all user roles. Added target-aware `change_email` and
`change_phone` OTP records plus authenticated request/verify endpoints. Direct
contact-field updates were removed from generic profile, partner-account,
Admin self-profile, and Admin management update paths.

Updated Customer Web, Partner Web, Admin Web, Customer Mobile, and Partner
Mobile account forms to display username read-only and verify changed email or
phone values before saving. Admin-managed customer/staff forms retain contact
editing through OTP prompts.

### Verification
Server and all web production builds passed; both mobile TypeScript checks,
`git diff --check`, startup migration, disposable live registration/login/
email-change/phone-change/delete API smoke test, Expo workflow restarts, and
web preview checks passed.

## 2026-08-12 — Documentation synchronization from master prompt

### Changes
Compared the uploaded documentation requirements with the current source,
verified test scripts and Admin item-level controls, and corrected stale
testing, current-state, known-issue, and full-project QA statements. No
application source code was changed.

### Verification
The individual regression commands, production builds, mobile TypeScript checks,
and final QA workbook referenced by the documentation were already executed and
validated. The documentation now distinguishes verified commands from the
missing unified test/lint automation and provider-blocked checks.

### Documentation Updated
`docs/00-PROJECT-OVERVIEW.md`, `docs/02-TECH-STACK.md`,
`docs/08-TESTING.md`, `docs/FULL_PROJECT_DOCUMENTATION.md`,
`docs/modules/admin-web.md`, `docs/modules/backend.md`,
`docs/ai/CURRENT-STATE.md`, `docs/ai/KNOWN-ISSUES.md`,
`docs/ai/CHANGELOG.md`, and `docs/ai/TASK-HISTORY.md`.

## 2026-08-12 — Final QA closure and Excel report

### Changes
Fixed the three remaining Admin browser issues: Reviews and Booking History now
have sticky table headers, and the shared rows-per-page control is an accessible
native selector with an All option. Corrected the final E2E cleanup variable so
the Server TypeScript build succeeds.

### Verification
Admin browser checks passed 17/17; itemized service orders 16/16; GPS dispatch
66/66; payment lifecycle 21/21; CRUD 71/71; legacy lifecycle 45 passed, 0
failed, 3 skipped; all four web/server production builds, both Expo type checks,
and `git diff --check` passed. Created
`qa/servenow-qa-report-2026-08-12.xlsx`.

## 2026-08-12 — Remove persisted E2E partner fixtures

### Finding
The Admin Assign Partner modal was showing repeated `E2E NearPro` and `E2E
FarPro` records because interrupted dispatch E2E runs left professional rows
behind after their users were deleted.

### Changes
Removed six orphaned E2E professional profiles and matching test partner
accounts after explicit confirmation. Updated the dispatch E2E fixture with the
required partner city and corrected teardown ordering so professionals are
deleted before users.

### Verification
The dispatch E2E suite passed 66/66. Post-cleanup checks found zero E2E
profiles/accounts, zero Admin search results, and API health remained healthy.

## 2026-08-12 — Service-order operations parity

### Request
Add the legacy dispatch controls to the newer itemized Service Orders workflow,
including eligible-partner lookup, manual assignment, and Stop searching.

### Changes
Admin Service Orders and the unified Operations queue now expose Eligible
Partners, manual assignment, Stop searching, Restart Dispatch, and Cancel service
for unpaid items. The backend validates active service-qualified partners,
expires pending requests when search is stopped, preserves the item as
`waiting_operation`, and prevents cancellation of paid items without using the
refund path. The status enum migration is idempotent.

### Verification
Admin Web and Server builds passed, `git diff --check` passed, API health returned
HTTP 200, the migration completed, and an authenticated eligible-partner lookup
returned 6 candidates. Live Amit requests were not mutated.

## 2026-08-12 — Full-project QA and Replit preview API repair

### Request
Complete the fresh end-to-end verification pass, investigate confirmed runtime
issues, fix them without changing unrelated behavior, and update the project
documentation.

### Findings and changes
The current itemized order flow and broad CRUD suite were healthy. Live
cross-surface checks confirmed Amit Verma's two pending AC Service requests and
their itemized detail. Preview inspection found missing login autocomplete
metadata and a Replit-specific API routing problem: relative `/api` requests
could reach the standalone starter artifact, while direct public API-port
responses were blocked by Helmet's same-origin resource policy.

Admin and Partner login fields now declare autocomplete values. Customer and
Partner Web select the public API port only on Replit preview hosts, and the
ServeNow API allows the intentional cross-port response while retaining CORS.

### Verification
`pnpm build` passed, `git diff --check` passed, the current order-item smoke
test passed 16/16, and the CRUD regression passed 71/71. Settled Customer,
Admin, and Partner previews rendered cleanly. No live request was mutated during
the cross-surface verification.

### Remaining limitation
Live Razorpay/Stripe/RazorpayX transactions and refunds require provider
credentials. The root public `/api/*` route remains non-canonical in this
multi-workflow Replit preview environment; web clients use public API port 8000.

## 2026-08-12 — Unified Booking Operations Queue

### Request
Investigate why Amit's two Partner Mobile AC Service requests did not appear in
the Admin Booking Operations Centre.

### Finding
The requests belong to the newer `orders` / `order_items` /
`order_item_requests` model. The legacy `/api/operations/dispatch` endpoint
correctly returned only legacy `bookings`, so the Admin queue omitted valid
itemized jobs.

### Changes
The Admin Operations Centre now combines the existing legacy dispatch rows with
itemized service-order jobs loaded from the Admin orders API. Rows are
source-labeled, item statuses are normalized for shared filters, date/search/
status counts and export include both sources, and detail actions open the
appropriate booking or service-order modal. Legacy-only stop-searching,
cancellation, and eligible-partner assignment controls remain unchanged.

### Verification
Admin Web production build, `git diff --check`, Admin workflow restart, live
Admin orders verification, and preview/log checks passed. The two live AC Service
items were confirmed as `searching_partner`. No database data changed.

## 2026-08-12 — Booking Operations Centre Menu and Functionality

### Request
Fix the Admin Booking Operations Centre menu, pages, and operational behavior.

### Changes
Kept sidebar navigation and URL hashes synchronized, added browser
back/forward handling, and restored Settings as a valid deep link. Dispatch now
loads on page entry, refreshes locally after operations, and polls while open.
Scheduled-date filtering and effective status display were corrected, including
safe action visibility for stale cancelled/completed rows. Booking History gained
a visible header and refresh action, and assignment copy now describes
service-linked eligibility accurately.

### Verification
Admin Web production build, `git diff --check`, Admin workflow restart, and
live dispatch/history/detail/eligible-partner API checks passed. Preview showed
the Admin login without application errors.

## 2026-08-12 — Partner Job Visibility and Verification Status

### Request
Investigate why Partner Mobile showed Amit Verma online with no job and fix the
same issue for affected partners.

### Reason
The live database contained pending requests for Amit, but the Partner API
applied a stricter sub-category condition than the dispatcher and hid valid
requests.

### Changes
Removed the redundant profile sub-category hard filter from order-item partner
job listing, detail, and acceptance. Kept the explicit service-link, category,
active, and availability checks. Corrected the document overview status for
the zero-mandatory-document configuration and aligned the Partner Mobile
order-item type with the API response.

### Files Changed
`server/src/controllers/partner.controller.ts`,
`server/src/services/document.service.ts`,
`apps/mobile-partner/lib/api.ts`, and affected dispatch/partner documentation.

### Database Changes
None. Existing pending requests were preserved.

### API Changes
Valid requests created by dispatch are now visible and acceptable through the
Partner order-item job endpoints when the partner has the explicit service
link and matching category.

### UI Changes
Partner Mobile can render the pending request returned by the corrected API.

### Business Rule Changes
The explicit `partner_services` link is the authoritative capability match;
profile sub-category labels do not override a valid linked service.

### Tests
Server build, Partner Web production build, Partner Mobile TypeScript check,
`git diff --check`, API health, and an authenticated Amit job-list request
passed. The live response returned two pending AC Service requests.

### Result
The hidden-request bug is fixed. Partners without an explicit service link
remain intentionally ineligible for that service.

### Documentation Updated
`.ai-memory/ACTIVE_TASK.md`, `.ai-memory/CURRENT_STATUS.md`,
`.ai-memory/GOTCHAS.md`, `docs/ai/CURRENT-STATE.md`,
`docs/ai/CHANGELOG.md`, `docs/ai/TASK-HISTORY.md`,
`docs/business-rules/dispatch-partner.md`,
`docs/workflows/partner-dispatch-service.md`, and
`docs/modules/partner-mobile.md`.

## Initial Documentation

Initial project documentation generated.

No application functionality was changed.

## 2026-08-09 — Automatic Documentation Workflow

### Request
Make the documentation workflow automatic for future functionality changes so
new sessions do not require the user to repeat the instruction.

### Reason
The repository is imported into fresh sessions and must carry its own
maintenance rules while avoiding unnecessary full-project reads.

### Changes
Added an explicit root-level rule requiring targeted documentation-first
implementation and automatic documentation updates after each functionality
change.

### Files Changed
`replit.md`

### Database Changes
None.

### API Changes
None.

### UI Changes
None.

### Business Rule Changes
None.

### Tests
Not applicable; documentation and project guidance only.

### Result
Future sessions are instructed to read the relevant documentation and source
files only, then update the affected documentation and AI state automatically.

### Documentation Updated
`docs/ai/CURRENT-STATE.md`, `docs/ai/CHANGELOG.md`, and
`docs/ai/TASK-HISTORY.md`.

## 2026-08-09 — Documentation Workflow Verification

### Request
Verify that a fresh session can discover the documentation workflow, avoid a
full-project scan by default, and update documentation automatically.

### Reason
Confirm the setup supports targeted future work and avoids unnecessary credit
usage.

### Changes
Ran a structural and instruction-content verification against the root
guidance, AI instructions, required documentation files, and documentation
directories.

### Files Changed
None in application code.

### Database Changes
None.

### API Changes
None.

### UI Changes
None.

### Business Rule Changes
None.

### Tests
Documentation workflow test passed. `git diff --check` passed, and no
application directories were changed.

### Result
The workflow is discoverable and instructs future sessions to read targeted
documentation, inspect only relevant source files, and update the AI records
without requiring repeated user instructions.

### Documentation Updated
`docs/ai/CURRENT-STATE.md`, `docs/ai/CHANGELOG.md`, and
`docs/ai/TASK-HISTORY.md`.

Future entries should use:

```text
## YYYY-MM-DD — Change Title
### Request
### Reason
### Changes
### Files Changed
### Database Changes
### API Changes
### UI Changes
### Business Rule Changes
### Tests
### Result
### Documentation Updated
```

## 2026-08-09 — Runtime Verification and Documentation Repair

### Request
Investigate the Replit preview and Expo Go download report, verify the actual
running services and testing URLs, and document the result without releasing
the project.

### Reason
The uploaded screenshot showed the Replit no-port preview page, and the
documentation workflow requires verified findings to be recorded for future
sessions.

### Changes
Inspected workflow states and logs, started the existing workflows, checked API
health and web routes, validated the QR service, and requested the current Expo
manifests and Android launch bundles directly through both tunnels.

### Files Changed
Documentation records only. No application source files were changed.

### Database Changes
No schema or data change was made. Starting the existing application workflow
ran its normal idempotent startup migration checks; no manual migration was
initiated by this documentation repair.

### API Changes
None.

### UI Changes
None.

### Business Rule Changes
None.

### Tests
API health returned HTTP 200. Customer Web, Admin Panel, Partner Web, and QR
scanner routes returned successfully. Both Expo manifests and both Android
launch bundles returned HTTP 200.

### Result
The screenshot’s immediate cause was stopped workflows and no listener on the
preview port. The current Expo tunnels and bundles were healthy; the generic
Expo Go error was not reproduced with fresh QR codes.

### Documentation Updated
`.ai-memory/ACTIVE_TASK.md`, `.ai-memory/CURRENT_STATUS.md`,
`.ai-memory/GOTCHAS.md`, `docs/ai/CURRENT-STATE.md`,
`docs/ai/CHANGELOG.md`, and `docs/ai/TASK-HISTORY.md`.
