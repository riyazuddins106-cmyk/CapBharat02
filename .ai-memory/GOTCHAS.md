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

---

## Format for new entries
```
### [Module] — short title
**Problem:** what went wrong / what was confusing
**Fix:** exactly what solved it
**Files:** which files are involved
**Warning:** what NOT to do (the wrong approach that looks right)
```

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
