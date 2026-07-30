# ServeNow

A service-marketplace monorepo (Urban Clap-style) with admin dashboard, customer web portal, and iOS/Android mobile apps for both customers and service partners.

## Stack
- **Backend:** Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL (Supabase)
- **Web frontends:** React 18 + Vite + Tailwind CSS + Radix UI
- **Mobile:** React Native + Expo SDK 54 + Expo Router
- **Auth:** JWT (access + refresh tokens) + OTP email verification

## Project structure
```
apps/
  admin-web/       # Admin dashboard (port 5001)
  customer-web/    # Customer web portal (port 5000)
  mobile/          # Customer Expo app (port 8081)
  mobile-partner/  # Partner Expo app (port 8082)
server/            # Express API (port 8000)
packages/shared/   # Shared types & utilities
scripts/           # expo-tunnel.sh — Replit-native Expo tunneling
```

## Running the project

| Workflow | Command | URL |
|---|---|---|
| Start application | `pnpm dev` | Port 5000 (customer web) + 8000 (API) |
| Admin Panel | `pnpm --filter @servenow/admin-web dev` | Port 5001 |
| Expo Customer App | `expo-tunnel.sh 8081 ...` | Expo Go QR in console |
| Expo Partner App | `expo-tunnel.sh 8082 ...` | Expo Go QR in console |

## Database setup
```bash
# 1. Run migrations (idempotent — also backfills availability + clears mandatory doc gates)
pnpm --filter @servenow/server exec tsx src/database/migrate.ts

# 2. Seed the service catalog (categories + services)
pnpm --filter @servenow/server exec tsx src/database/seed-catalog.ts

# 3. Seed test accounts (admin, customer, partner — partner starts 'available')
pnpm --filter @servenow/server exec tsx src/database/seed-test-accounts.ts

# 4. Link test partner to all active services (so dispatch finds them for any booking)
pnpm --filter @servenow/server exec tsx src/database/seed-partner-services.ts
```

For Replit development, set the Postgres connection string as `DATABASE_URL`.
The server accepts it and maps it to the legacy `SUPABASE_DATABASE_URL`
configuration internally. This project is configured for development preview
only; no Replit Cloud deployment is required.

## Test credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@servenow.in | Admin@1234 |
| Partner | partner@servenow.in | Partner@1234 |
| Customer | customer@servenow.in | Customer@1234 |

## API routes (base: `/api`)
- `POST /auth/register` → register (triggers OTP)
- `POST /auth/verify-otp` → verify email
- `POST /auth/login` → login → `{ accessToken, refreshToken, user }`
- `POST /auth/refresh` → refresh access token
- `POST /auth/logout` → revoke refresh token
- `GET/PATCH /profile/me` → read / update profile (**note: `/me` suffix required**)
- `GET/POST /addresses` · `PATCH/DELETE /addresses/:id`
- `GET /categories` · `GET /categories/:id`
- `GET /professionals` · `GET /professionals/:id` · `GET /professionals/:id/reviews`
- `GET/POST /bookings` · `GET /bookings/:id` · `PATCH /bookings/:id/cancel`
- `GET /admin/stats` · `GET /admin/users` · `GET /admin/bookings` · `GET /admin/professionals`

## Admin Panel URL
`https://f486bc9d-d0a6-4cda-b3bf-1a3b132e8568-00-l3myhzsuh2vr.sisko.replit.dev/admin-panel/`

## Push notifications
Both apps register Expo push tokens via `PATCH /api/profile/me/push-token`. No EAS `projectId` is set — tokens are obtained through the Expo Go anonymous identity. For production standalone builds, run `eas init` in each app directory to get a `projectId` and add it to `app.json` under `extra.eas.projectId`.

## Expo tunneling (Replit-native)
`expo-tunnel.sh` detects `REPLIT_EXPO_DEV_DOMAIN` and skips ngrok entirely, using Replit's built-in Expo proxy. No ngrok tokens needed when running on Replit. ngrok is only used as a fallback outside of Replit.

## Required secrets
All secrets below are configured in this Replit environment.

| Secret | Purpose |
|---|---|
| SUPABASE_URL | Supabase REST project URL (`https://xxx.supabase.co`) |
| SUPABASE_ANON_KEY | Supabase anonymous key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key |
| SUPABASE_DATABASE_URL | Supabase Postgres connection string (used directly by the server) |
| JWT_SECRET | Access token signing secret |
| JWT_REFRESH_SECRET | Refresh token signing secret |
| NGROK_AUTHTOKEN | Customer App ngrok (fallback outside Replit) |
| NGROK_AUTHTOKEN_2 | Partner App ngrok (fallback outside Replit) |

## Email delivery (OTP codes)
Signup and password-reset codes are sent via a generic SMTP mailer (`server/src/services/email.service.ts`, using `nodemailer`) so any provider works — Resend, SendGrid, Gmail, Mailgun, etc. Set these secrets to activate it:

| Secret | Purpose |
|---|---|
| SMTP_HOST | SMTP server host (e.g. `smtp.resend.com`) |
| SMTP_PORT | SMTP port (defaults to 587) |
| SMTP_SECURE | `"true"` for port 465, otherwise `"false"` |
| SMTP_USER | SMTP username |
| SMTP_PASS | SMTP password / API key |
| EMAIL_FROM | From address, e.g. `ServeNow <no-reply@servenow.in>` |

Until these are set, OTP codes are just logged to the server console (`[otp] Verification code for ...`) so the flow stays testable.

## QA testing
Full CRUD regression test log for customer/partner/admin flows is in `QA_TEST_REPORT.md` (auth, addresses, professionals, favorites, bookings incl. reschedule/cancel/QR, points, notifications, offers, policies, partner jobs/checkin/complete/earnings/payouts, admin stats/bookings/professionals/users/categories/offers/reviews/audit-logs/payouts, support tickets). All passed against live Supabase DB. No backend bugs found — the earlier "booking broken" report was caused by missing Supabase secrets in this environment, now resolved.

## User preferences
- Use existing project structure and stack — no migration or restructure
- Expo SDK 54 (latest: 54.0.35)
- No Replit cloud deployment needed
