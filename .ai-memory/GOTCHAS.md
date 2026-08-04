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
