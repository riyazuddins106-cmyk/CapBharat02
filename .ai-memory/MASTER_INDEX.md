# ServeNow — Master Index
> Read this first in every new session. It tells you what exists, where it lives, and what state it's in.

## What is ServeNow?
An Urban Clap-style service marketplace. Customers book home services (cleaning, laundry, etc.). Admin manages the catalog. Dispatch matches bookings to partners. Partners accept jobs, check in, and complete them.

---

## Apps & Ports

| App | Package | Port | Description |
|-----|---------|------|-------------|
| Customer Web | `@servenow/customer-web` | 5000 | React + Vite customer portal |
| Admin Panel | `@servenow/admin-web` | 5001 | React + Vite admin dashboard |
| Partner Web | `@servenow/partner-web` | 5002 | React + Vite partner portal |
| API Server | `@servenow/server` | 8000 | Express + TypeScript + Drizzle |
| Customer Mobile | `apps/mobile` | 8080/8081 | Expo SDK 54 (React Native) |
| Partner Mobile | `apps/mobile-partner` | 8082/8099 | Expo SDK 54 (React Native) |

---

## Project Layout

```
servenow/
├── apps/
│   ├── admin-web/          # Admin dashboard
│   ├── customer-web/       # Customer web portal
│   ├── partner-web/        # Partner web portal
│   ├── mobile/             # Customer Expo app (Expo Router)
│   └── mobile-partner/     # Partner Expo app (Expo Router)
├── server/
│   └── src/
│       ├── controllers/    # Route handlers (one per domain)
│       ├── routes/         # Express routers
│       ├── services/       # Business logic
│       ├── repositories/   # DB queries (Drizzle ORM)
│       ├── validators/     # Zod schemas
│       ├── middleware/      # Auth, error handling
│       ├── database/       # Schema, migrations, seeds
│       └── types/          # Shared TS types
├── packages/
│   └── shared/             # Shared types used across apps
├── scripts/
│   └── expo-tunnel.sh      # Replit-native Expo tunneling
└── .ai-memory/             # ← YOU ARE HERE
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL via Supabase |
| Frontend | React 18 + Vite + Tailwind CSS + Radix UI |
| Mobile | React Native + Expo SDK 54 + Expo Router |
| Auth | JWT (access + refresh tokens) + OTP email |
| Package manager | pnpm workspaces |

---

## Required Secrets (environment variables)

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Supabase Postgres connection string (primary) |
| `SUPABASE_DATABASE_URL` | Legacy alias — server maps `DATABASE_URL` to this |
| `SUPABASE_URL` | REST project URL (`https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `SESSION_SECRET` | Session secret |
| `SMTP_HOST/PORT/SECURE/USER/PASS` | Email (OTP delivery). Optional — logs to console if missing |
| `EMAIL_FROM` | From address for emails |
| `NGROK_AUTHTOKEN` | Customer App ngrok (fallback outside Replit only) |
| `NGROK_AUTHTOKEN_2` | Partner App ngrok (fallback outside Replit only) |

---

## Test Credentials

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@servenow.in | Admin@1234 |
| Partner | partner@servenow.in | Partner@1234 |
| Customer | customer@servenow.in | Customer@1234 |

---

## Database Setup (run in order)

```bash
pnpm --filter @servenow/server exec tsx src/database/migrate.ts
pnpm --filter @servenow/server exec tsx src/database/seed-catalog.ts
pnpm --filter @servenow/server exec tsx src/database/seed-test-accounts.ts
pnpm --filter @servenow/server exec tsx src/database/seed-partner-services.ts
pnpm --filter @servenow/server exec tsx src/database/seed-test-mode.ts
```

---

## .ai-memory Files

| File | Purpose |
|------|---------|
| `START_HERE.md` | ⭐ **Read first** — copy-paste resume prompt + mandatory AI rules |
| `MASTER_INDEX.md` | Full project map — structure, secrets, DB setup |
| `CURRENT_STATUS.md` | What's done, what's pending |
| `ACTIVE_TASK.md` | **Live task tracker** — updated after every step; resume point if credits run out |
| `GOTCHAS.md` | **Hard-won lessons** — bugs that took >1 attempt; read before touching any module |
| `MODULES.md` | Every domain module with exact file paths |
| `modules/<name>/INDEX.md` | Created the first time a module is touched |

---

## Module Index (detail files)

| Module | File | Status |
|--------|------|--------|
| Auth | [modules/auth/INDEX.md](modules/auth/INDEX.md) | ✅ Complete |
| Booking | [modules/booking/INDEX.md](modules/booking/INDEX.md) | ✅ Complete |
| Dispatch | [modules/dispatch/INDEX.md](modules/dispatch/INDEX.md) | ✅ Complete |
| Payments | [modules/payment/INDEX.md](modules/payment/INDEX.md) | ✅ Complete |
| Admin | [modules/admin/INDEX.md](modules/admin/INDEX.md) | ✅ Complete |
| Customer Mobile | [modules/mobile-customer/INDEX.md](modules/mobile-customer/INDEX.md) | ✅ Complete |
| Partner Mobile | [modules/mobile-partner/INDEX.md](modules/mobile-partner/INDEX.md) | ✅ Complete |
| Categories & Services | [modules/catalog/INDEX.md](modules/catalog/INDEX.md) | ✅ Complete |
| Points & Rewards | [modules/points/INDEX.md](modules/points/INDEX.md) | ✅ Complete |
| Notifications | [modules/notifications/INDEX.md](modules/notifications/INDEX.md) | ✅ Complete |

---

## Key Architectural Decisions

1. **Partners do not create products** — Admin owns the entire service catalog. Partners are matched by skills.
2. **Dispatch is automatic** — When a booking is placed, `dispatch.service.ts` finds available partners with matching skills and sends push notifications.
3. **JWT dual-token** — Short-lived access tokens + longer-lived refresh tokens stored hashed in DB.
4. **OTP is console-logged** if no SMTP config — safe for dev/testing.
5. **Expo tunneling** — `expo-tunnel.sh` uses Replit's native proxy (`REPLIT_EXPO_DEV_DOMAIN`) when on Replit; falls back to ngrok outside.
6. **Migrations are idempotent** — Always safe to re-run `migrate.ts` on startup.
