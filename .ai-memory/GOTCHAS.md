# ServeNow — Gotchas & Hard-Won Lessons

---

## ⚠️ AGENT BEHAVIOUR — NON-NEGOTIABLE

### Memory update is NOT optional — do it before ending every task
**Problem:** Agent completed task, updated ACTIVE_TASK.md, but skipped CURRENT_STATUS.md. User had to manually ask for it to be updated.
**Rule:** After EVERY completed task, without exception:
1. Mark step done in `ACTIVE_TASK.md`
2. Update "Last Session Summary" in `CURRENT_STATUS.md`
3. Add entry to `GOTCHAS.md` if anything took >1 attempt
**Why this matters:** The entire point of the AI memory system is continuity. A half-updated memory is as bad as no memory — the next session starts with wrong context and makes bad decisions.
**Do NOT end a task response without completing all three steps above.**
> Read this before touching any of the modules listed below.
> Every entry here cost real debugging time. Don't repeat it.
> Add a new entry any time a fix took more than one attempt.

### Cancellation warnings — use bounded percentages from Booking Settings
**Problem:** Customer Web displayed hardcoded itemized cancellation warnings, while Customer Mobile had no inline warning and only repeated hardcoded text inside its confirmation modal.
**Fix:** Store the percentage rate plus minimum and maximum rupee bounds for partner-accepted and partner-arrived cancellation in `booking_config`, return them from the public booking-config endpoint, read them in both customer apps, and calculate the server cancellation fee from the same formula.
**Warning:** Do not change only the Mobile label. A client-only calculation can disagree with the persisted server fee; calculate the percentage of the applicable service amount, clamp it with `MAX(minimum, MIN(calculated, maximum))`, and cap it at the service price.

### Booking confirmations — never display raw slot minutes
**Rule:** A booking confirmation must format the persisted order timestamp and service duration; never render the internal slot number directly.
**Why:** Customer Mobile stores a selected slot as minutes since midnight, so rendering it directly produced incorrect text such as `Tomorrow · 570`.
**How to apply:** Use the created order's `scheduledAt` as the authoritative value, convert it to the local date/time window, and derive duration from the returned order items.

### Native tab bars — do not override the Android safe-area height
**Rule:** For Expo Router tabs, avoid a fixed native tab-bar height and hand-tuned Android bottom padding when the system navigation inset is managed by the navigator.
**Why:** A fixed Customer tab-bar height made the Android back/home/recents controls appear inside the app's bottom bar, unlike the working Partner App.
**How to apply:** Keep the tab-bar styling limited to colors/borders/label spacing and let Expo Router calculate the native height and bottom inset.

### Managed API artifacts — avoid stale `/api` services in the main publish
**Rule:** A generic managed API artifact must not declare a production `/api` service when the main product already owns `/api`.
**Why:** Replit starts registered artifact services during monorepo publishing; an incomplete artifact can fail its own health check and prevent the main autoscale deployment from promoting.
**How to apply:** Inspect recent build/runtime logs for artifact process failures before changing the main app build. Use the managed artifact TOML replacement flow to remove an obsolete service rather than appending an unrelated artifact build to the root command.

### Expo public environment values — refresh the bundle
**Rule:** `EXPO_PUBLIC_*` values are embedded when Metro or a production build creates the JavaScript bundle; changing Replit environment variables does not update an already-loaded Expo client.
**Why:** Expo Go can keep serving the previous QR bundle, and installed production apps cannot receive environment changes without a new build or configured OTA update.
**How to apply:** Restart the relevant Expo workflow and rescan the fresh QR for development. For installed apps, create a new Expo Launch production build.

### Expo dashboard linkage — project IDs are required
**Rule:** Expo account authentication alone does not associate a mobile app with an Expo dashboard project or EAS Update channel.
**Why:** The project ID, update URL, and compatible runtime policy are bundle metadata; without them, Metro can work while Expo.dev shows no update for the app.
**How to apply:** Add the project-specific `extra.eas.projectId`, `updates.url`, and runtime policy to each app's static `app.json`, then create a production publish.

### Replit web Publish vs Expo Launch
**Rule:** A normal Replit project Publish does not necessarily start an Expo mobile build or create an Expo OTA Update group.
**Why:** The regular publish targets the registered web/API deployment, while Expo Update groups come from a separate mobile Expo Launch or OTA update operation.
**How to apply:** Verify an Expo Launch session exists before diagnosing Expo project metadata; if no session exists, use the mobile Expo publish surface rather than the main web Publish action.

### Expo Launch requires static app configuration
**Rule:** Keep Expo project metadata in `app.json`; dynamic `app.config.js` wrappers can prevent Replit Expo Launch from resolving and publishing the mobile app.
**Why:** Replit's Expo publishing flow reads static configuration and may serve development bundles successfully while producing no mobile publish session from a dynamic config.
**How to apply:** Migrate required settings into `app.json`, remove app-level dynamic config wrappers, restart Metro, and then start Expo Launch.

### Cancellation policy placement — disclose at decision points
**Rule:** Keep product listings free of prominent cancellation-fee labels; use a compact expandable policy on service detail, the full live policy before checkout confirmation, a compact confirmation reminder, and the exact estimate in post-acceptance/check-in cards and the final cancellation modal.
**Why:** Customers need clear information when making or confirming a booking without turning browsing cards into warnings; the final estimate must match the server calculation and the current Booking Settings.
**How to apply:** Reuse the public Booking Settings values and the bounded percentage calculation on every customer surface. Say “cancellation fee” in customer copy; reserve “penalty rate” for Admin settings.

### Payment method availability — test mode must still respect configuration
**Rule:** Public payment methods must be derived from enabled Admin settings and required credentials; Test Mode may simulate configured methods, but must never expose or mark an unconfigured method as paid.
**Why:** Previously Test Mode exposed every gateway, so selecting an unconfigured manual UPI method moved an item to `service_started` and made tracking claim payment confirmation without a real payment.
**How to apply:** Require both the UPI enable flag and a non-empty VPA, guard the server endpoint as well as the client list, and derive tracking from `order_item_payments.status = paid`.

### Partner Schedule vs active service work
**Rule:** An accepted service-order item scheduled in the future is planned work, not an in-progress service. Keep it on Schedule until partner arrival/check-in or later operational states.
**Why:** The active-items query previously included `partner_accepted`, so work booked for a later date appeared as “In progress” and made the separate Schedule surface seem redundant.
**How to apply:** Exclude `partner_accepted` from active service feeds, include it in the date-bounded Schedule feed, exclude cancelled/completed work, and keep the planning range long enough for normal advance bookings.

### Expo Go blue error screen — refresh the tunnel QR
**Rule:** A blue Expo Go “Something went wrong” screen indicates the project bundle/tunnel failed to load; it is not evidence that the Partner App theme is blue.
**Why:** A failed ngrok attempt can leave a stale QR/link pointing at an unavailable bundle while the configured retry later creates a healthy tunnel.
**How to apply:** Inspect the Expo workflow log, restart or wait for its retry, and scan the refreshed QR/current `exp://...exp.direct` URL instead of reusing the failed URL.

### Partner future-job handoff
**Rule:** Passing a future accepted service-order job is an offer, not an immediate unassignment. Keep the original partner on the item until another eligible partner accepts.
**Why:** Removing the original assignment immediately would leave the customer without a guaranteed partner when no replacement accepts.
**How to apply:** Broadcast only to matching, document-approved, active, available partners; transfer the item only inside the accepting transaction; otherwise leave the original assignment, payout, and payment state unchanged.

### Partner Web/Mobile job comparisons — verify partner identity before changing dispatch
**Problem:** A Web partner showed a new itemized request while Mobile appeared empty, suggesting a client/API defect.
**Fix:** Compare the authenticated partner profile, category/sub-category, availability, response timing, and persisted dispatch deadline. In this case both clients received a populated response before expiry, while Mobile's documented test login was a different busy AC partner and the request belonged to an available Home Cleaning partner.
**Warning:** Do not broaden dispatch eligibility, remove category matching, or return another partner's requests to make cross-account test screens agree. A one-minute configured search window can also make a previously loaded Web card look newer than a later Mobile empty response.

### Documentation — use the authoritative memory directory
**Problem:** A runtime investigation was recorded in `.agents/memory/`, while this project’s required continuity files are `.ai-memory/ACTIVE_TASK.md`, `.ai-memory/CURRENT_STATUS.md`, and `.ai-memory/GOTCHAS.md`.
**Fix:** Update all three `.ai-memory` files after every completed task, then update the affected `docs/ai` records.
**Warning:** Do not treat similarly named `.agents/memory` files as a substitute; verify the required `.ai-memory` files before reporting completion.

---

## Format for new entries
```

### Partner search deadlines — persist the deadline, not client-only elapsed time
**Problem:** A client-only countdown resets after reload/backgrounding and can
leave partner requests accepting work after the customer-visible search window.
**Fix:** Store the deadline on both order items and legacy bookings, expire
pending requests during customer polling, and enforce the deadline again in
partner acceptance. Client screens render from the returned timestamp.
**Warning:** Keep an expiry-only Continue Searching action; while the deadline
is active, show the countdown instead of offering a restart. Older rows without
a deadline need a bounded fallback so they do not search indefinitely.
Every feed that can expose or act on dispatch state must reconcile expired rows
before reading them; customer polling alone leaves Admin and Partner views stale.

### QR Codes Website — refresh both binary assets and scanner labels
**Problem:** Restarted Expo tunnels can leave the QR PNGs or the visible URL
labels stale, even when the QR Codes Website itself is still serving.
**Fix:** Regenerate both canonical QR PNGs from the current tunnel URL files,
update the canonical scanner page, restart the QR Codes workflow, and verify
the rendered page.
**Warning:** Keep the Customer and Partner URL replacements independent; a
bulk replacement can accidentally write one app's URL into both labels.
After confirming Metro has rebuilt and the tunnel is ready, verify the scanner
refresh log before asking a device to scan.

### Partner Expo QR — distinguish splash loading from an app crash
**Problem:** A Partner QR scan can appear as a teal/blue screen while Expo Go is
still loading the tunnel bundle, with no native client error in Replit workflow
logs.
**Fix:** Restart the Partner Expo workflow, verify the current QR's manifest and
bundle return successfully, and scan the freshly generated code from inside Expo
Go.
**Warning:** Do not diagnose a native crash from the blue splash alone; a device
screenshot plus Expo Go logs are required if the current QR remains stuck.
After every Partner tunnel restart, regenerate and scan the current QR Codes
page asset; an older QR can produce Expo Go's generic project-loading error.

### QR page must match Expo workflow ports
**Problem:** The Customer QR card can show "Tunnel starting" even when Metro
and ngrok are healthy if the QR page reads a different cache port than the
workflow uses.
**Fix:** Keep the QR route's Customer and Partner port arguments aligned with
the configured Expo workflow ports; verify both `/tmp/expo-tunnel-<port>.url`
and the rendered `/qr` response after restarts.
**Warning:** Do not infer tunnel health from the QR card alone; inspect the
workflow's open port and URL cache.

### Partner Expo Router auth redirect — wait for navigator mount
**Problem:** A root-layout auth redirect can run before Expo Router has mounted
its native navigator, causing Expo Go's generic blue runtime/project error while
the same route works in Web.
**Fix:** Gate redirects on `useRootNavigationState().key` and the first route
segment, and render the Stack before the auth gate.
**Warning:** Do not call `router.replace` during the initial root-layout render;
wait until navigation state is ready.

### Signup recovery — account rows exist before OTP verification
**Problem:** Registration creates the user row before sending the signup OTP.
If a customer closes the verification screen, a second registration attempt
looks like a duplicate email even though the account was never verified.
**Fix:** An active user with no `emailVerifiedAt` can resume customer signup.
The server resends the signup OTP through the normal cooldown and updates the
newly entered password/details; verified accounts remain conflicts.
**Warning:** Do not treat every existing email as resumable. Disabled or
verified accounts must not be overwritten by registration.

### Account identity — contact changes require target-aware OTP
**Problem:** Email is the login identity and phone changes previously went
through several direct profile/account update paths across five clients. A
generic OTP lookup by current email would not safely identify a pending new
contact value.
**Fix:** Usernames are generated once and protected by a database unique
constraint. Email/phone changes use separate target-aware OTP records and
authenticated request/verify endpoints; legacy direct contact updates are
rejected or strict-validated away. All clients refresh local/auth state after
verification.
**Files:** `server/src/database/schema/users.ts`,
`server/src/database/schema/otpCodes.ts`, `server/src/database/migrate.ts`,
`server/src/services/otp.service.ts`, profile/Admin/partner clients.
**Warning:** Never add email or phone back to a generic profile PATCH; the
identity request must bind the OTP to the proposed target before updating.

---

### OTP delivery — Ethereal is not a real inbox provider
**Problem:** Development had no SMTP/SendGrid configuration, so Nodemailer
fell back to Ethereal. It accepted messages and produced preview URLs, but the
OTP never arrived in the user's Gmail inbox; the UI also made Resend available
immediately.
**Fix:** Enforce a target-aware 60-second resend cooldown on the server and
display a matching client countdown. In non-production, show the development
code/timing metadata. Older active codes are consumed when a new code is
issued, and verification checks the configured expiry.
**Files:** `server/src/services/otp.service.ts`,
`server/src/repositories/otp.repository.ts`, auth controller/service, and all
customer/partner OTP screens.
**Warning:** Do not claim that Ethereal delivered to a real inbox. Configure
SMTP or SendGrid in Admin → Email Configuration before testing Gmail delivery.
Gmail SMTP requires 2-Step Verification and a Google App Password; a normal
Gmail password returns `534-5.7.9 Application-specific password required`.
After the port/TLS settings are corrected, invalid or incorrectly pasted App
Passwords return `535-5.7.8 Username and Password not accepted`.

---

### Dispatch eligibility — never trust Admin lists or availability alone
**Problem:** Automatic dispatch filtered incomplete partner documents, but Admin
eligible-partner lists and manual assignment only checked active status and
service qualification. With all document types optional, partners with no
uploads also passed the old bypass.
**Fix:** Reuse one server-side document gate for automatic dispatch, Admin
eligibility, manual assignment, and partner acceptance. Required types must be
approved; with no required types, at least one current upload is required and
all current uploads must be approved. REST polling keeps all four client
surfaces fresh across sessions.
**Files:** `server/src/services/document.service.ts`,
`server/src/services/dispatch.service.ts`,
`server/src/services/orderDispatch.service.ts`, and the four client job/
booking surfaces.
**Warning:** Do not rely on `isActive`, `availabilityStatus`, notifications,
or the UI list as proof of document approval. Recheck documents at assignment
and acceptance time.

### Dispatch category and sub-category — apply the rule to every surface
**Problem:** Itemized dispatch already matched a partner's selected
sub-category, but the legacy booking dispatch and Booking Operations Centre
eligible-partner path could still list or manually assign a partner based only
on service qualification.
**Fix:** Join legacy booking services during automatic dispatch and eligibility
queries, enforce category/sub-category again during manual assignment and
partner acceptance, and filter legacy Partner Web/Mobile job visibility plus
returning-online redispatch with the same rule.
**Warning:** Do not treat the Admin eligible-partner list as enforcement;
manual assignment and partner acceptance must revalidate the category and
sub-category server-side. Profiles without a saved sub-category remain
category-wide only for backward compatibility.

### Expo Go generic blue screen — verify the device error before changing code
**Problem:** A Partner device showed Expo Go's generic “Something went wrong”
screen even though the native tunnel, SDK 54 Android manifest, and exact
Android bundle were healthy.
**Fix:** Verify the current QR/cache URL, request the manifest with Expo Go
headers, download the exact `launchAsset`, and inspect Metro logs. If those
checks pass, request Expo Go's “View error log” text before changing native
versions or startup code.
**Warning:** The blue screen is not the Partner app's ErrorBoundary and does
not by itself prove a Reanimated, notification, QR, or tunnel defect.

### Partner QR scanner — cache URL and PNG together
**Problem:** The Partner QR Codes scanner continued displaying an old ngrok
URL after the live Partner tunnel had moved to a new `exp.direct` URL. Expo Go
then failed with `java.io.IOException: Failed to download remote update`.
**Fix:** Regenerate the QR PNG and rewrite the full standalone scanner page from
the live `/tmp/expo-tunnel-<port>.url` files whenever a tunnel is detected.
Verify the PNG payload, not only the visible HTML label.
**Warning:** The API `/qr` page and the static QR Codes workflow are separate
surfaces; a current API QR page does not prove the static scanner asset is
current.

---
### [Module] — short title
**Problem:** what went wrong / what was confusing
**Fix:** exactly what solved it
**Files:** which files are involved
**Warning:** what NOT to do (the wrong approach that looks right)
```

### Replit preview — API public port and startup race
**Problem:** The web preview host's root `/api/*` route can be handled by the
standalone starter artifact instead of ServeNow. Direct browser requests to the
ServeNow API public port also require cross-origin response headers, and requests
made while startup migrations are still running can report 503/connection errors.
**Fix:** On Replit preview hosts, Customer and Partner Web use the same host's
public API port 8000; the API sets `Cross-Origin-Resource-Policy: cross-origin`
alongside its existing CORS policy. Local Vite proxy and single-port production
remain relative.
**Files:** `apps/customer-web/src/lib/api.ts`,
`apps/partner-web/src/lib/api.ts`, `server/src/app.ts`.
**Warning:** Wait for `/api/health` and migration completion before classifying
preview failures; a startup-race 503 is not the same as a persistent API defect.

---

### Admin service orders — dispatch controls are item-scoped
**Problem:** The newer `orders` / `order_items` workflow was visible in Admin but
did not expose the legacy dispatch operations. A first compile pass also missed
one schema import in the new cancellation handler.
**Fix:** Keep itemized controls available in both Service Orders and the unified
Operations queue, validate assignment against active service-qualified partners,
and run the idempotent `waiting_operation` enum migration before serving queries.
Use Refund Service for paid items and direct Cancel service only for unpaid items.
**Files:** `apps/admin-web/src/app/App.tsx`, `apps/admin-web/src/lib/api.ts`,
`server/src/controllers/admin.controller.ts`, `server/src/routes/admin.routes.ts`,
`server/src/services/orderDispatch.service.ts`, `server/src/database/migrate.ts`.
**Warning:** Do not use legacy booking IDs with itemized routes, and do not cancel
a paid item without going through the refund path.

---

### E2E dispatch fixtures — delete professionals before users
**Problem:** The dispatch test deleted its temporary users, but
`professionals.user_id` is `ON DELETE SET NULL`, leaving orphaned test
professionals visible in Admin eligible-partner results after interrupted runs.
The fixture also drifted from the partner-registration validator when `city`
became required.
**Fix:** Include a valid city in partner fixture registration and explicitly
delete test professionals (and any assigned bookings) before deleting users.
**Files:** `server/src/e2e/dispatch.e2e.ts`.
**Warning:** Never assume deleting a linked user cascades to a professional
profile; inspect the foreign-key action first.

---

### QA workbook generation — table filters
**Problem:** XlsxWriter rejects a worksheet when an explicit `autofilter()` overlaps
the filter that `add_table()` already creates.
**Fix:** Use the table's built-in filter and do not add a second autofilter range.
**Files:** `qa/servenow-qa-report-2026-08-12.xlsx` generation
**Warning:** Keep report tables as the single source of filtering and validate the
final `.xlsx` with `unzip -t` before presenting it.

---

### Documentation — map imported prompt filenames to existing sources
**Problem:** An imported documentation prompt may prescribe numbered filenames
that do not exist in this repository, while the repository already has an
authoritative `docs/ai/` structure.
**Fix:** Use `docs/README.md` and `docs/ai/AI-INSTRUCTIONS.md` to map the
requested topic to the existing authoritative file; update that file instead
of creating duplicate parallel sources.
**Files:** `docs/README.md`, `docs/ai/AI-INSTRUCTIONS.md`
**Warning:** Do not create `22-FIXED-ISSUES.md`-style duplicates when the current
project records the same topic in `docs/ai/KNOWN-ISSUES.md`, `CHANGELOG.md`, and
`TASK-HISTORY.md`.

---

### UAT — reset-generated UUIDs
**Problem:** A full development-data reset regenerates catalog UUIDs, so E2E
fixtures that embed old category or service IDs fail before reaching the flow.
**Fix:** Resolve fixture catalog records by stable names at runtime, then use the
returned IDs for partner registration, service links, and checkout.
**Warning:** Never copy catalog UUIDs from a prior database snapshot into a
fresh-database UAT fixture.

---

## Auth

### Auth — JWT token ID mismatch
**Problem:** After refresh, the new access token was invalid on the very next request.
**Fix:** `issueTokenPair` must sign the JWT and store the hash using the **same** token ID. They were using different IDs.
**Files:** `server/src/repositories/refreshToken.repository.ts` — `updateHash` method
**Warning:** Do not refactor `issueTokenPair` without verifying the token ID is shared between the JWT payload and the stored hash.

---

## Database / Drizzle

### Drizzle-kit — cannot resolve `.js` extensions
**Problem:** `drizzle-kit push` fails with module not found errors.
**Fix:** `server/src/database/schema/index.ts` must use extensionless imports. Drizzle-kit uses CJS `require()` internally and cannot resolve `.js` extensions on `.ts` files.
**Files:** `server/src/database/schema/index.ts`
**Warning:** Do not add `.js` extensions to imports inside the schema folder.

### Schema — missing columns on existing DB
**Problem:** `featured` and `image_url` columns missing from `service_categories` after running migrations on a pre-existing database.
**Fix:** Run `server/src/database/run-column-migration.ts` which uses `ALTER TABLE IF NOT EXISTS`.
**Files:** `server/src/database/run-column-migration.ts`
**Warning:** `migrate.ts` alone does not backfill these on old databases.

---

## Supabase

### SUPABASE_URL must be REST URL, not Postgres string
**Problem:** App crashes on startup with a malformed URL error.
**Fix:** `SUPABASE_URL` must be `https://xxx.supabase.co` — the REST project URL. Not the Postgres connection string.
**Files:** `server/src/config/`
**Warning:** `DATABASE_URL` is the Postgres string. `SUPABASE_URL` is the REST URL. They are different secrets.

### Reels bucket — do not set fileSizeLimit
**Problem:** Video uploads fail silently.
**Fix:** Omit `fileSizeLimit` when creating the Supabase storage bucket for reels. The free plan has its own cap and setting the field causes conflicts.
**Files:** Supabase dashboard bucket settings
**Warning:** The error is silent — uploads appear to succeed but the file is never stored.

---

## Expo / Mobile

### Expo SDK — do NOT upgrade to SDK 57
**Problem:** pnpm's `minimumReleaseAge: 10080` policy blocks SDK 57 packages. A partial upgrade corrupts the lockfile and breaks the entire mobile workspace.
**Fix:** Stay on Expo SDK 54.0.35. If an upgrade is needed, do it only after the release-age window passes and use `expo install --check`/`--fix` after adding any native module.
**Warning:** Never hand-pin native module versions (e.g. `expo-device@^57.x`). Always use `expo install` to get the correct versions.

### Expo — `pnpm expo start` fails
**Problem:** Metro bundler doesn't start; command not found or wrong binary.
**Fix:** Use `pnpm exec expo start` in ALL script branches, not `pnpm expo start`.
**Files:** `scripts/expo-tunnel.sh`

### Expo — Partner App ngrok tunnel fails when both apps start together
**Problem:** Both tunnel processes compete for ngrok and one fails.
**Fix:** Partner App workflow uses `--start-delay 25` so it starts 25 seconds after the Customer App. The retry loop in `expo-tunnel.sh` handles the rest.
**Files:** `scripts/expo-tunnel.sh`

### Metro + pnpm — duplicate React version
**Problem:** Metro picks up the wrong React version from pnpm's shared hoist folder, causing "invalid hook call" errors.
**Fix:** Force React resolution via `resolveRequest` in `metro.config.js`, not via `extraNodeModules`. The hoist folder is checked before `extraNodeModules`.
**Files:** `apps/mobile/metro.config.js`, `apps/mobile-partner/metro.config.js`

### expo-notifications — import side-effect on Android Expo Go
**Problem:** `console.error` fires even when notification calls are guarded, because the import itself triggers a side effect.
**Fix:** Conditionally `require('expo-notifications')` on Android Expo Go — do not just guard the calls, guard the import too.
**Files:** Notification-related screens in both mobile apps.

---

## Bash / Scripts

### Bash — `|| true` defeats exit code capture
**Problem:** `cmd || true; EXIT_CODE=$?` always gives 0, breaking retry loops.
**Fix:** Use `set +e` before the command and `set -e` after to safely capture the real exit code.
**Files:** `scripts/expo-tunnel.sh`
**Warning:** This is a common bash mistake. Any retry loop that relies on exit codes must use `set +e`/`set -e`.

---

## Partner App

### Partner — availability field name mismatch
**Problem:** Partner app sends `availabilityStatus` but the server sometimes expects `status`.
**Fix:** The controller must accept both `availabilityStatus` (mobile) and `status` (legacy web). Do not change mobile to send `status` — it breaks the mobile app.
**Files:** `server/src/controllers/partner.controller.ts`

### Partner Mobile — payout history filter semantics
**Problem:** Payout History needed both a date search and a status search without hiding older records.
**Fix:** Default the local date range to Today–Today, provide one calendar that collects start and end dates, and combine it with an All statuses/Pending/Processing/Paid/Rejected dropdown.
**Warning:** Keep status normalization aligned with backend values: `approved` and `processing` display/filter as Processing, while unknown values remain Pending.

### Partner dispatch — broadcast and visibility eligibility must stay aligned
**Problem:** The order dispatcher created a request for a partner with an explicit service link, but the Partner API hid it when the partner profile sub-category did not exactly equal the service sub-category.
**Fix:** Treat the explicit `partner_services` link plus matching category as the capability decision; do not add a second profile sub-category hard filter in list, detail, or accept queries.
**Warning:** Do not broadcast to every professional profile. Partners without an explicit service link are intentionally not eligible, even if they are active and online.

### Admin operations — legacy and itemized dispatch coexist
**Problem:** Partner Mobile can show an order-item request while the Admin Booking Operations Centre appears empty because `/api/operations/dispatch` lists only legacy `bookings`.
**Fix:** Keep both database models intact, but present legacy bookings and itemized service-order jobs in one clearly source-labeled Operations queue. Route detail clicks to the matching booking or order endpoint.
**Warning:** Do not infer that a missing legacy dispatch row means an order-item request was not created. Check `orders`, `order_items`, and `order_item_requests` before changing dispatch data.

---

## Expo Tunnel (Replit)

### Expo — "failed to download" in Expo Go on Replit
**Problem:** Scanning the QR code opens Expo Go but it shows "failed to download" and never loads the app.
**Fix:** Prefix both Expo workflow commands with `unset REPLIT_EXPO_DEV_DOMAIN &&`. When that variable is set, `expo-tunnel.sh` uses `expo start --tunnel` (exp.direct) which fails on Replit. Unsetting it forces the ngrok branch which works.
**Files:** Expo Customer App workflow, Expo Partner App workflow (configured in Replit)
**Correct commands:**
- Customer: `unset REPLIT_EXPO_DEV_DOMAIN && cd apps/mobile && ../../scripts/expo-tunnel.sh 8080 2>&1 | tee /tmp/metro-live.log`
- Partner: `unset REPLIT_EXPO_DEV_DOMAIN && cd apps/mobile-partner && ../../scripts/expo-tunnel.sh 8099 --authtoken-var NGROK_AUTHTOKEN_2 --start-delay 25`
**Warning:** Do not check if this is sisko or pike — unset it on ALL Replit hosts.

### Expo — Metro HTTP 500 can look like a QR/tunnel failure
**Problem:** Expo Go showed the generic “failed to download” message even though both ngrok manifest URLs were reachable.
**Fix:** Inspect the `launchAsset` bundle URL directly. Here the real cause was Babel 8 transform plugins in Expo SDK 54’s Babel 7 graph, plus three undeclared Babel modules imported by `react-native-worklets@0.5.1`. Pin the mobile transform plugins to 7.29.7 and add a pnpm package extension for Babel generator, traverse, and types at 7.29.7.
**Files:** `apps/mobile/package.json`, `apps/mobile-partner/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`
**Warning:** A manifest HTTP 200 does not prove Expo Go can load the app; the Android and iOS bundle URLs must also return HTTP 200.

### Expo — Metro resolves from workspace root instead of app folder
**Problem:** `Unable to resolve module ./index from /home/runner/workspace/.` — note the trailing dot. All module paths resolve from the wrong directory.
**Fix:** Delete any `app.json` at the monorepo workspace root that contains an `expo` key. Expo walks up the directory tree and stops at the first `app.json` with `"expo"` — if one exists at root, Metro treats root as the project.
**Files:** `/home/runner/workspace/app.json` — delete it if it exists
**Warning:** Symptom is misleading — looks like a Metro config problem but it's a project root detection issue.

### Expo — native module version mismatch after `pnpm install`
**Problem:** Expo CLI warns about incompatible native module versions; Expo Go shows unexpected behavior or crashes.
**Fix:** Never hand-pin native module versions. Always run `pnpm exec expo install --check` and `pnpm exec expo install --fix` after adding any native module. Let Expo pick the compatible version from its `bundledNativeModules.json`.
**Warning:** `expo-device`, `expo-notifications` etc. are versioned independently — their package version does NOT match the SDK number.

### Expo — worklets crash: "installTurboModule called with 1 arguments"
**Problem:** App crashes immediately in Expo Go on SDK 54.
**Fix:** Pin exactly: `"react-native-reanimated": "4.1.1"` and `"react-native-worklets": "0.5.1"` in both mobile app package.json files. Use exact pins — `~4.1.1` resolves to `4.1.7` which pulls worklets `0.8.3` which breaks the Expo Go binary.
**Files:** `apps/mobile/package.json`, `apps/mobile-partner/package.json`

### Expo — useFonts hangs forever over public HTTPS tunnel
**Problem:** App shows a blank screen forever — `useFonts()` never resolves over the ngrok/exp.direct public URL even though fonts load fine locally.
**Fix:** Add a `setTimeout` fallback (e.g. 3000ms) to force `fontsLoaded = true` even if the promise never resolves.
**Warning:** The hang is tunnel-specific and does not reproduce in local dev or on device via LAN.

---

## API Field Names

### API — field names differ from obvious guesses
**Problem:** API calls fail with validation errors because field names don't match what seems obvious.
**Verified correct names:**
- `POST /auth/register`: `fullName` (not `name`), no `role` field
- `POST /auth/verify-otp`: `code` (not `otp`), `purpose` required (`"signup" | "login" | "password_reset"`)
- `POST/PATCH /addresses`: `postalCode` (not `pincode`)
- `POST /support-tickets`: `name`, `email`, `subject`, `message` all required
- Payout approve: status must be `"paid"` or `"rejected"` (not `"approved"`)
- OTP in dev: logged to server console as `[otp] Verification code for <email> (<purpose>): <code>`
**Files:** `server/src/validators/` — always verify field names from Zod schemas, not from guessing.

---

## Categories

### Category serviceCount — stored column is stale, use live JOIN
**Problem:** `serviceCount` stored in `service_categories` table drifts from reality. Categories show wrong counts; filtering by `serviceCount > 0` gives wrong results.
**Fix:** `category.repository.ts` `findAll()` does a live `LEFT JOIN` to services and computes `COUNT(CASE WHEN is_active = true THEN 1 END)`. The stored column is irrelevant for display.
**Files:** `server/src/repositories/category.repository.ts`
**Warning:** Do not seed or update the stored `service_count` column — the live JOIN overrides it anyway.

---

## Service Orders / Validation

### E2E — legacy booking tests can mask service-order regressions
**Problem:** The older full-flow scripts call `POST /cart` and `/bookings/checkout`, while the current multi-service contract uses `POST /cart/items` and `/orders/checkout`; those scripts fail before exercising service-order behavior.
**Fix:** Use `server/src/e2e/order-item-flow.e2e.ts` as the service-order smoke test, and update legacy scripts before treating them as full release gates.
**Warning:** Do not interpret failures from the retired booking/cart paths as failures in the current order-item implementation.

### Booking hours — 24-hour mode must be explicit
**Problem:** Representing a full-day schedule as `openingHour: 0` and `closingHour: 0` conflicts with normal-window validation because the old code requires opening time to be earlier than closing time.
**Fix:** Store an explicit `is24Hours` booking setting. Customer slot generation and both checkout controllers bypass closing-window checks only when that flag is true.
**Warning:** A 24-hour customer booking window does not make partners automatically available; dispatch still requires an eligible partner with `availabilityStatus = available`.

### Service-order check-in must use an item-scoped QR
**Problem:** Legacy booking QR check-in and newer service-order dispatch use different identifiers; accepting a legacy token or an unscoped token could let a partner check in the wrong service.
**Fix:** Sign short-lived tokens with both `orderId` and `orderItemId`, and verify both the token type and item ID in the service-order check-in path.
**Warning:** Keep the customer QR endpoint available only after partner acceptance; before acceptance there is no assigned partner to check in.

### Service-order cancellation fees are status-based
**Problem:** A cancellation reason is optional, but cancellation timing still needs an auditable fee rule.
**Fix:** Empty/whitespace reasons are stored as null; cancellation is free before partner acceptance, 25% after acceptance, and 50% after partner check-in/payment-pending. Service-started and completed items cannot be cancelled.
**Warning:** The fee is recorded on the order item; it is not silently added to the original order total.

### Payment must be gated by partner arrival
**Problem:** The legacy payment endpoints previously accepted any non-cancelled booking, so the Customer app could show Pay Now immediately after confirmation.
**Fix:** Hide the legacy action for `upcoming`, show it after partner check-in (`in_progress`), and enforce the same state gate in legacy and service-order payment controllers.
**Warning:** Keep unpaid `completed` legacy bookings payable so a partner completing before customer payment does not strand the payment.

### Partner dispatch — profile/category mismatch
**Problem:** The seeded partner service-link script previously linked the test partner to every active catalog service, so Rajan's Partner App showed Plumbing requests even though his profile was AC Repair. The profile also used a different AC sub-category than the AC Service catalog item.
**Fix:** Dispatch and Partner order-item endpoints now require category equality and exact sub-category equality when the professional has a sub-category. The reconciliation script aligns the seeded account to the AC Service catalog sub-category, removes unrelated links, and expires stale requests.
**Warning:** Do not use a broad “link partner to all services” seed for this marketplace. The service catalog and professional category/sub-category are the dispatch eligibility source of truth.

### E2E fixtures — booking-hour boundary
**Problem:** A smoke test that schedules exactly 24 hours from the current time can land outside the configured booking window and fail checkout for the correct reason.
**Fix:** Use a deterministic future time inside the configured window, such as tomorrow at 10:00, while retaining server-side booking-hour validation.
**Warning:** Do not weaken checkout validation to accommodate a time-dependent test fixture.

### Partner Dashboard has two job systems
**Problem:** The Partner Dashboard’s legacy `/partner/jobs` query does not contain the newer per-service order-item requests. Rendering only that list makes Home look empty while the Jobs tab has pending requests.
**Fix:** Fetch `/api/partner/order-item-jobs` on Dashboard as well, show pending requests separately from active work, and treat `payment_pending` / `payment_completed` as active until service completion.
**Warning:** The Jobs Active empty state must consider both legacy jobs and service-level pending/active arrays.

### Web portals need parity with mobile order flows
**Problem:** Customer Web and Partner Web had their own legacy API/UI paths, so mobile-only QR, dispatch, cancellation-fee, and payment-timing changes were not automatically visible on web.
**Fix:** Keep both web clients on the same service-order endpoints and state gates: Partner Web uses order-item dispatch/check-in/complete APIs; Customer Web uses order-item QR/cancel/payment state rules.
**Warning:** Shared backend changes do not update sibling web clients automatically; audit each client’s API wrapper and action visibility after mobile flow changes.

### QR display can outlive the tunnel that generated it
**Problem:** A legacy QR HTML page can keep old Expo URLs even after the current PNGs and scanner page are refreshed, causing Expo Go to connect to a dead tunnel.
**Fix:** Treat `/scanner.html` as the canonical QR page and make legacy QR routes redirect to it with no-cache headers.
**Warning:** Expo/ngrok tunnel URLs change between sessions; never hardcode them in a secondary QR page.

### Replit multi-port QR scanner mapping
**Problem:** The QR service's local port and public external port are different, and the public port can be shared with another workflow's local port. Opening the wrong public port shows Partner Web instead of the scanner.
**Fix:** With the current mapping, use the QR scanner on external `:3001` (local 3000), Partner Web on external `:3000` (local 4000), Customer Web on external `:5000`, and Admin Panel on the default path.
**Warning:** Do not infer a public URL from a local port; check `.replit` port mappings and verify each route returns the expected HTML before sharing it.

### Replit — public API path can reach the starter API artifact
**Problem:** ServeNow's server returns 200 on local port 8000, but public `/api/*` requests can be routed to the separate starter API artifact, which returns 404 for ServeNow endpoints.
**Fix:** Verify the public proxy target and remove or correct the competing `/api` artifact route before treating web-client 404s as application-controller failures.
**Files:** `.replit`, artifact route configuration, `server/`
**Warning:** A healthy local server does not prove the public API path is wired to that server.

---

## Admin Operations

### Admin — stopping partner search is not cancellation
**Problem:** Operations staff may need to pause partner search without falsely marking the customer booking as cancelled.
**Fix:** Stop Searching expires pending partner requests, preserves the booking, sets dispatch to `waiting_operation`, and records `SEARCH_STOPPED`. Cancellation separately expires requests, releases an assigned partner, and sets dispatch to `cancelled`.
**Files:** `server/src/services/dispatch.service.ts`, `server/src/controllers/admin.controller.ts`
**Warning:** Enforce these state transitions in the backend; do not rely only on Admin Panel button visibility.

---

## Partner Payouts

### Partner — earnings must use partner payout, not customer price
**Problem:** The new service-order system stores customer price and partner payout separately, while the old earnings query only summed completed legacy booking prices.
**Fix:** Aggregate completed legacy bookings from booking-item partner payouts when present, and aggregate completed service-order items only when their item payment is paid. Expose pending, paid, and available balances before allowing withdrawal.
**Files:** `server/src/repositories/partner.repository.ts`, `server/src/services/partner.service.ts`
**Warning:** Do not count service-order `customerPrice` as partner earnings or count an item before both service completion and paid payment.

### Partner — Razorpay checkout is not RazorpayX payouts
**Problem:** The Admin Payment Config already had Razorpay Key ID and Secret for customer checkout, but outbound partner payouts require RazorpayX Payouts access and a RazorpayX payout account number.
**Fix:** Reuse the configured Razorpay credentials for RazorpayX contacts, VPA fund accounts, and UPI payouts. Store provider IDs/statuses and mark a request paid only after a provider payout ID is returned.
**Files:** `server/src/services/razorpayPayout.service.ts`, `server/src/controllers/admin.controller.ts`, `apps/admin-web/src/app/App.tsx`
**Warning:** Do not treat customer Razorpay checkout configuration or Admin database approval as proof that money was transferred. Enable RazorpayX Payouts, configure the payout account number, disable Test Mode, and require a partner UPI ID first.

### Partner payouts — aggregate before joining payout history
**Problem:** Joining completed earnings rows directly to payout-request rows multiplies totals when a partner has multiple jobs and multiple payout requests.
**Fix:** Aggregate earnings and payout requests independently by partner, then join the two one-row-per-partner summaries. Paginate the partner worklist and fetch detailed payout history only after a partner is selected.
**Files:** `server/src/controllers/admin.controller.ts`, `apps/admin-web/src/app/App.tsx`
**Warning:** Never load all partner earnings or payout history into the browser for a large marketplace, and never sum two many-side joins in the same grouped query.

### Scheduled payouts — approval must be separate from pending
**Problem:** A pending partner payout request is an Admin review queue item; automatically sweeping every pending request could send money before approval.
**Fix:** Automatic runs select only the separate `approved` payout state. Admin can approve for schedule or send immediately. Processing is locked, capped, recorded in payout runs, and recovered after an interrupted run.
**Files:** `server/src/services/payoutScheduler.service.ts`, `server/src/controllers/admin.controller.ts`, `apps/admin-web/src/app/App.tsx`
**Warning:** Keep automatic payouts disabled until RazorpayX credentials, payout account number, Test Mode, partner UPI destinations, and the schedule have been explicitly verified.

### Partner Mobile — payout history must use the payout endpoint
**Problem:** Partner Mobile showed earnings balances and allowed withdrawal requests, but did not show requests already visible in Partner Web because it never loaded the payout list.
**Fix:** Fetch `/api/partner/payouts` alongside earnings and render the server fields `amount`, `note`, `status`, and `requestedAt`; update the local list immediately after a successful request.
**Warning:** Do not infer payout history from earnings totals. Pending and paid balances are aggregates, while status and request metadata live in the payout records.

### Admin Management — keep the account form distinct from primary purple navigation
**Problem:** The Create Admin Account card used a saturated violet surface and button, making the protected management section feel visually heavy against the dark admin shell.
**Fix:** Use a slate card surface with sky-blue border/icon/focus accents and a blue gradient action button, while leaving the broader Admin Panel theme unchanged.
**Warning:** Do not recolor the whole Admin Panel for a local section-level contrast issue; keep navigation and global actions consistent.

### Admin Panel — scope visual references to the requested component
**Problem:** A neutral charcoal screenshot intended for the Create Admin Account form was initially applied to the entire Admin Panel.
**Fix:** Restore the original global purple theme and keep the neutral slate/graphite treatment local to the account-creation card, its fields, role select, and button.
**Warning:** When a screenshot shows a single form or card, do not change shared theme tokens or global utility colors unless the user explicitly asks for a full-panel redesign. If shared inline tokens make the local treatment too subtle, use explicit styles inside that component rather than broad overrides.

### Admin account form — sample reference colors before styling
**Problem:** Repeated visual feedback indicated the form color change was not obvious enough when it inherited shared card/input tokens.
**Fix:** Sample the supplied reference images and lock the card, control, border, and button colors into dedicated local constants used only by the form.
**Warning:** Keep the local constants separate from `CARD` and `INPUT_STYLE`; changing shared tokens will unintentionally recolor the rest of the Admin Panel.

### Admin account form — later references can supersede earlier accents
**Problem:** A later reference changed the requested local accents from neutral gray/sky-blue to purple while retaining the charcoal surfaces.
**Fix:** Treat the newest supplied image as authoritative for the requested component and update only its local icon, button, border, and focus accents.
**Warning:** Do not preserve older screenshot colors when a newer reference explicitly changes the same component.

### Partner App Ionicons need a native font grace period
**Problem:** The Partner App dashboard and tab labels rendered, but Ionicons were blank because the root layout forced rendering after a 300ms `useFonts` timeout.
**Fix:** Keep the native font gate open for 3 seconds and only use a shorter 1-second fallback on web. The Customer App already used a longer native grace period.
**How to verify:** Restart the Expo Partner workflow after changing the root layout, wait for Metro to bundle, then reload Expo Go; the dashboard stat icons, notification icon, empty-state icon, and bottom-tab icons should all appear.

### Customer and Partner icon fonts must be loaded explicitly
**Problem:** Loading app fonts through different hooks can make one Expo app render while its icon font is not ready, leaving blank glyphs.
**Fix:** Use `expo-font`'s `useFonts` in both mobile roots and register every icon family used by that app before rendering. Keep a 3-second native grace period; use a shorter web fallback only when needed.
**How to verify:** Restart both Expo workflows, wait for fresh Android/iOS bundles, reload Expo Go, and check dashboard, tab, notification, empty-state, and service icons in both apps.

### Loaded icon fonts can still render blank glyphs
**Problem:** The Customer screenshot showed blank category and bottom-tab icons even though the root log reported `fontsLoaded: true`; bundle completion and font state are not sufficient visual verification.
**Fix:** Primary navigation and high-visibility category/dashboard surfaces use a font-independent `NativeIcon` fallback built from native shapes and system emoji. Customer category images no longer mask the fallback when an image URL is stale or broken.
**How to verify:** Capture the rendered Customer screen after data loads, not only Metro logs. Check the four bottom tabs and the Services category row on both native apps after a full Expo Go reload.

### Git integration — unrelated local and remote histories
**Problem:** The Repl's local history and GitHub `main` were unrelated, so pushing the whole local branch would have overwritten newer marketplace/mobile commits.
**Fix:** Start from the current GitHub `main`, apply the Admin/backend and remaining Customer/Expo changes as targeted patches, build the affected apps, and push normal fast-forward commits.
**Warning:** Do not force-push the preserved local branch or merge its entire unrelated tree into GitHub `main`; review targeted file differences first.

### Expo QR scheme — use `exp://`, not `exps://`
**Problem:** Expo Go reported “Something went wrong / failed to download” even though ngrok, Metro, the Expo manifest, and the Android bundle all returned successfully.
**Fix:** Keep the ngrok transport and `EXPO_PACKAGER_PROXY_URL` on HTTPS, but encode the QR/deep link as `exp://<ngrok-host>`.
**Warning:** Do not put `exps://` in Expo Go QR codes; validate the manifest and bundle separately before changing tunnel infrastructure.

### Product language — English-only rollback
**Problem:** Removing a language provider while leaving structured translation-key calls can render internal keys such as `common.home`, and stale HMR state can preserve deleted provider errors.
**Fix:** Replace structured shell keys with explicit English labels, remove all language modules and server language routes, rebuild, restart the Vite workflows, and verify a fresh preview.
**Files:** Customer Web, Partner Web, Admin Web, both mobile apps, shared package, platform settings controller, and API routes.
**Warning:** When returning to English-only mode, remove the translation infrastructure rather than merely hiding selectors; new admin-created content is shown exactly as stored.

### Admin payouts — action status and stale helper cleanup
**Problem:** The payout detail UI had a schedule-approval action while its handler only accepted paid/rejected statuses. Separately, leftover Admin `tx(...)` calls caused the login page to crash after the language provider was removed.
**Fix:** Align the handler with the server’s approved/paid/rejected contract, use explicit English messages, remove all remaining Admin translation-helper calls, rebuild, and capture a fresh preview.
**Files:** `apps/admin-web/src/app/App.tsx`, `apps/admin-web/src/lib/api.ts`
**Warning:** A clean payout API list does not prove actions work; verify each mutation branch and the post-restart Admin login screen separately. Sending money also remains dependent on RazorpayX configuration and partner UPI data.

### Partner users versus professional profiles
**Problem:** Partner authentication uses the `users` table, while Admin Professionals and payout records use `professionals`; duplicate display names can make a valid linked partner appear missing.
**Fix:** Join Admin professional listings to `users`, search by linked email/name/title server-side, and display whether a partner login is linked.
**Warning:** Do not delete same-name unlinked professional rows automatically; they may have historical bookings or payout references. Resolve duplicates by ID and relationship.

### Admin Professionals default filter
**Problem:** Showing every professional row in the main Admin list made legacy/catalog profiles look like active partners.
**Fix:** Default the list to profiles with a linked user account and provide a separate unlinked-profile view.
**Warning:** The filter is a view distinction only; it does not delete or deactivate unlinked records.

### Admin Professionals filter/search behavior
**Problem:** Binding every search keystroke to the page-level loading state remounted the Professionals view, causing the input to lose focus after one character.
**Fix:** Keep the draft search local, debounce the committed query, and refresh only the Professionals data effect. Category and sub-category filters are sent as multi-value query parameters alongside link status.
**Warning:** A null professional sub-category is intentionally excluded from a non-empty sub-category filter; “All Sub-categories” includes those records when no selection is active.

### Customer Mobile shared-package type resolution
**Problem:** The Customer Mobile Expo bundle could resolve the monorepo shared package through Metro while strict TypeScript could not resolve `@servenow/shared`, and checkout's cart query was declared after its dependent memo.
**Fix:** Add the workspace source path to the app's TypeScript paths, declare the typed cart query before dependent calculations, and type slot callback parameters.
**Warning:** Verify both `tsc --noEmit` and fresh Android/iOS Metro bundles; either check alone can miss a monorepo resolution problem.
**Verification:** Repeated checks from the current workspace state passed for TypeScript, Android bundling, and iOS bundling.

### Emergency partner payout pause
**Problem:** Disabling only the payout scheduler still allowed an Admin to manually send an individual payout through RazorpayX.
**Fix:** Store `payoutsPaused` in the existing payout configuration and enforce it in both the payout-run service and the low-level RazorpayX transfer service; mirror the state in Admin controls.
**Warning:** The pause blocks future transfers and runs, but does not alter existing payout records or reverse a payout already accepted by the provider. Customer payment collection is independent.

### GitHub branch history reconciliation
**Problem:** A branch pushed from the Replit workspace can look like a newer branch while still omitting files and commits from an existing GitHub project when the repository roots are unrelated.
**Finding:** `origin/main` already includes `origin/agent/30-minute-booking-slots`; `origin/servenow-updates` shares no merge base with either and contains only the workspace snapshot.
**Safe approach:** Use the existing GitHub `main` as the content base, overlay/reconcile the intended workspace changes, verify the result, and only then change the default branch. Do not merge unrelated histories blindly or force-push the snapshot.

### Verification — Partner Web port and payment test mode
**Problem:** The handoff listed an old Partner Web preview port, and the current order smoke test has fewer assertions when payment test mode is disabled.
**Fix:** Read the workflow's actual Vite output before screenshotting; Partner Web currently serves on port 4000. Treat the 16/16 current smoke result as complete for the enabled branches and record provider/payment gaps separately.
**Warning:** Do not treat a refused screenshot on the stale port or a skipped disabled test-mode payment branch as an application failure. Real Razorpay/Stripe/RazorpayX transactions still need configured provider credentials.

### Published media — CSP blocks external catalog images
**Problem:** The production API returned valid service/category/reel image URLs and the image hosts returned HTTP 200, but the published browser showed broken-image icons and alt text.
**Fix:** Configure Helmet's Content Security Policy with `img-src 'self' data: https:` and `media-src 'self' data: https:` so approved HTTPS CDN/Supabase media can render.
**Warning:** A local fix does not change an already-published build; republish after changing server security headers.

### Partner Mobile completed-job timestamps
**Problem:** Completed history previously displayed only the scheduled time; the completion moment was not persisted or returned by either Partner job API.
**Fix:** Persist `completed_at` separately for legacy bookings and service-order items, set it on completion, and render it only on completed detail screens.
**Warning:** Historical records created before this field was added may have no completion timestamp and should keep the scheduled time without inventing one.

### Startup migrations — stale relation locks
**Problem:** The API appeared stuck in `Service starting` while an idempotent migration waited on `professionals` or `users`; an older application query held the relation lock open, and later migration attempts queued behind it.
**Fix:** Inspect `pg_stat_activity` and lock waiters, terminate only the stale migration/application backend sessions, then allow one clean migration run to finish.
**Files:** `server/src/database/migrate.ts`, workflow/database runtime
**Warning:** Do not start overlapping migration processes or terminate unrelated database sessions. The API binds only after migrations complete, so the proxy will correctly return 503/connection-refused during the wait.

### Admin history views combine two booking models
**Problem:** ServeNow retains both legacy bookings and newer service-order jobs, so a customer or professional history cannot be sourced from one table.
**Fix:** Customer and Professional Details fetch and present both models, with payment records joined through their respective booking/payment tables and service-order item payment tables.
**Warning:** Keep the two record identifiers and payment semantics distinct when extending these detail APIs; customer price and partner payout are not interchangeable.

### Partner Schedule date filters
**Problem:** The Partner Mobile Schedule endpoint could fail when PostgreSQL received JavaScript `Date` objects inside raw Drizzle SQL comparison fragments.
**Fix:** Convert the calculated day bounds to ISO strings and explicitly cast them to `timestamptz` for both legacy bookings and service-order items.
**Warning:** Keep the endpoint’s UTC day-boundary behavior consistent with the mobile client’s `YYYY-MM-DD` range; do not compare date-only strings directly to timestamp columns.

### OTP email — SMTP accepted is not inbox placement
**Problem:** Partner OTP requests logged as sent, but the user did not see
them in Gmail.
**Diagnosis:** The actual stored Gmail SMTP configuration verified and Gmail
returned `250 2.0.0 OK` with the recipient accepted. The remaining failure
surface is Gmail filtering or delivery delay, not the API request or SMTP
transport.
**Fix:** Check accepted/rejected transport results, search Spam/Promotions/All
Mail, and show the non-production `devCode` on every OTP screen. Strip it in
production.

### Partner dashboard eligibility messaging — document status takes precedence
**Rule:** Dashboard messaging must evaluate required document states before
availability. Missing or rejected/expired documents override pending review,
offline, busy, and available states; pending review overrides availability.
**Why:** A partner can be marked available while still ineligible for dispatch,
so availability alone would give misleading guidance.
**Warning:** Keep the priority and wording aligned between Partner Mobile and
Partner Web whenever document eligibility rules change.

### Partner Mobile document status — share the React Query cache
**Problem:** The dashboard can keep an empty or older document result if it
uses different query keys from the Documents screen, even though the document
is uploaded and approved.
**Fix:** Use the same user-scoped `doc-types` and `docs` keys across both
screens, refetch on mount, and include documents in dashboard pull-to-refresh.
**Warning:** Do not add a second document query key for dashboard eligibility.
