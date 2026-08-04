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
