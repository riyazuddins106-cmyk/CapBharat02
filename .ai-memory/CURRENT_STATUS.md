# ServeNow — Current Status

*Last updated: 2026-08-02*

## Completed Modules

| Module | Status | Notes |
|---|---|---|
| Authentication | ✅ Complete | JWT + OTP email, refresh tokens, all user roles |
| Services & Categories | ✅ Complete | Admin catalog, sub-categories, category images |
| Booking (core) | ✅ Complete | Create, view, cancel, complete lifecycle |
| Dispatch | ✅ Complete | Auto-assign available skill-matched partner |
| Payment | ✅ Complete | Razorpay integration + test-mode bypass |
| Admin Panel | ✅ Complete | Dashboard, bookings, partners, doc verification |
| Customer Web | ✅ Complete | Browse, book, pay, track bookings |
| Partner Web | ✅ Complete | Jobs, earnings, profile, document upload |
| Customer Mobile | ✅ Complete | Full Expo app with Expo Router |
| Partner Mobile | ✅ Complete | Full Expo app with Expo Router |
| Notifications | ✅ Complete | Expo push notifications (server-side) |
| Points & Rewards | ✅ Complete | Earn on spend, redeem at checkout |
| Reviews | ✅ Complete | Post-booking customer reviews |
| Reels | ✅ Complete | Short video content linked to services |
| Support Tickets | ✅ Complete | Create/resolve customer support tickets |
| Offers | ✅ Complete | Promo codes at checkout |
| Cart | ✅ Complete | Pre-booking service cart |
| Favorites / Wishlist | ✅ Complete | Save favorite services and partners |
| Profile & Addresses | ✅ Complete | User profiles, multiple saved addresses |
| Document Verification | ✅ Complete | Partner doc upload + admin approval flow |

## Known Issues / Quirks

- **Expo native modules:** Always run `expo install --check` / `--fix` after adding native modules — do not hand-pin versions. (See `.agents/memory/expo-native-module-drift.md`)
- **pnpm + Metro React duplication:** React resolution forced via `resolveRequest` in metro.config, not `extraNodeModules`. Do not change this.
- **expo-keep-awake:** Stubbed in metro.config `resolveRequest` FORCED_MODULES — removing from package.json alone is not sufficient.
- **Reels file upload:** Supabase bucket `fileSizeLimit` must be omitted for the reels bucket (plan cap constraint).
- **Partner availability field:** API accepts both `availabilityStatus` (mobile) and `status` (legacy web).
- **DATABASE_URL alias:** Server maps `DATABASE_URL` → `SUPABASE_DATABASE_URL` internally; always use `DATABASE_URL` as the secret name.

## Development State

The platform is feature-complete for an MVP marketplace. All core flows (browse → book → pay → dispatch → complete → review) are end-to-end functional and tested.

The project runs as a Replit development preview. No production deployment is required for development.

## To Run Locally on Replit

1. Set `DATABASE_URL` secret (Supabase Postgres connection string)
2. Set `SESSION_SECRET` secret (any long random string)
3. Run migrations: `pnpm --filter @servenow/server exec tsx src/database/migrate.ts`
4. Seed catalog: `pnpm --filter @servenow/server exec tsx src/database/seed-catalog.ts`
5. Seed test accounts: `pnpm --filter @servenow/server exec tsx src/database/seed-test-accounts.ts`
6. Start "Start application" workflow (server + customer-web on ports 8000 + 5000)
