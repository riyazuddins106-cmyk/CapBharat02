# ServeNow — Gotchas & Hard-Won Lessons
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
