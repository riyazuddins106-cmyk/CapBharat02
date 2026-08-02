# ServeNow — Architecture

## Overview

ServeNow is a monorepo managed with **pnpm workspaces**. It contains five frontend applications and one shared backend API.

```
servenow/
├── apps/
│   ├── admin-web/        # Admin dashboard (React + Vite, port 5001)
│   ├── customer-web/     # Customer web portal (React + Vite, port 5000)
│   ├── partner-web/      # Partner web portal (React + Vite)
│   ├── mobile/           # Customer Expo app (SDK 54, port 8081)
│   └── mobile-partner/   # Partner Expo app (SDK 54, port 8082)
├── packages/
│   └── shared/           # Shared TypeScript types and constants
├── server/               # Express API (port 8000)
└── scripts/              # expo-tunnel.sh — Replit-native Expo tunneling
```

---

## Frontend Applications

### Admin Web (`apps/admin-web/`)
- **Framework:** React 18 + Vite + Tailwind CSS + Lucide + Recharts
- **Auth:** JWT stored in localStorage, sent as Bearer token
- **Key screens:** Dashboard, Bookings, Partners, Services, Categories, Document Verification, Settings
- **API base:** `http://localhost:8000/api`

### Customer Web (`apps/customer-web/`)
- **Framework:** React 18 + Vite + Tailwind CSS + MUI + Radix UI
- **Auth:** JWT + OTP email verification
- **Key screens:** Home (services grid), Service detail, Checkout, Bookings, Profile
- **API base:** `http://localhost:8000/api`

### Partner Web (`apps/partner-web/`)
- **Framework:** React 18 + Vite + Tailwind CSS
- **Auth:** JWT
- **Key screens:** Dashboard, Job requests, Earnings, Profile, Document upload
- **API base:** `http://localhost:8000/api`

### Customer Mobile (`apps/mobile/`)
- **Framework:** React Native + Expo SDK 54 + Expo Router (file-based routing)
- **State:** TanStack Query (React Query) for server state
- **Route structure:**
  ```
  app/
  ├── (tabs)/          # Tab navigator (Home, Services, Bookings, Profile)
  ├── auth.tsx         # Login/signup screen
  ├── checkout.tsx     # Booking checkout
  ├── service/         # Service detail screens
  ├── subcategories/   # Sub-category listing
  └── professional/    # Partner profile view
  ```

### Partner Mobile (`apps/mobile-partner/`)
- **Framework:** React Native + Expo SDK 54 + Expo Router
- **Route structure:**
  ```
  app/
  ├── (tabs)/          # Tab navigator (Home, Jobs, Earnings, Profile)
  ├── auth.tsx         # Partner login/signup
  ├── documents.tsx    # Document upload for verification
  └── job/             # Job detail and acceptance screens
  ```

---

## Backend Architecture

### Server (`server/`)
- **Runtime:** Node.js + TypeScript (ESM modules)
- **Framework:** Express.js
- **ORM:** Drizzle ORM with `postgres` driver
- **Database:** PostgreSQL via Supabase

### Directory Structure
```
server/src/
├── app.ts              # Express app setup, middleware, route mounting
├── index.ts            # Entry point: runs migrations, starts server
├── config/             # env vars, DB connection, Supabase storage config
├── controllers/        # HTTP request handlers (one file per domain)
├── services/           # Business logic layer
├── repositories/       # Database access layer (Drizzle queries)
├── routes/             # Express route definitions
│   └── index.ts        # Mounts all sub-routers
├── middleware/         # Auth (JWT verify), error handler, rate limiter, validation
├── database/
│   ├── schema/         # Drizzle table definitions
│   ├── migrations/     # SQL migration files
│   ├── migrate.ts      # Idempotent migration runner (runs on startup)
│   └── seed-*.ts       # Seed scripts (catalog, accounts, partner-services, test-mode)
├── validators/         # Zod/Joi input validation schemas
└── utils/              # JWT helpers, AppError class, logger
```

### Request Lifecycle
```
HTTP Request
  ↓
Rate Limiter (middleware)
  ↓
Auth Middleware (JWT verify → attaches req.user)
  ↓
Validation Middleware (Zod schema)
  ↓
Controller (parses req, calls service)
  ↓
Service (business logic, calls repositories)
  ↓
Repository (Drizzle ORM → PostgreSQL)
  ↓
Response (JSON)
```

### API Route Domains
`/api/auth`, `/api/bookings`, `/api/services`, `/api/categories`, `/api/dispatch`, `/api/payments`, `/api/partners`, `/api/admin`, `/api/profile`, `/api/addresses`, `/api/notifications`, `/api/points`, `/api/reviews`, `/api/reels`, `/api/offers`, `/api/support-tickets`, `/api/cart`, `/api/favorites`, `/api/wishlist`, `/api/professional`

---

## Database Architecture

- **Engine:** PostgreSQL (hosted on Supabase)
- **ORM:** Drizzle ORM — schema-first, type-safe
- **Connection:** `DATABASE_URL` env var (Postgres connection string)
- **Migrations:** Run idempotently on server startup via `server/src/database/migrate.ts`
- **File storage:** Supabase Storage (profile images, documents, reels)

### Core Tables
| Table | Purpose |
|---|---|
| `users` | All users (customer, partner, admin) with role field |
| `professionals` | Partner-specific profile data linked to `users` |
| `services` | Service catalog (admin-managed) |
| `service_categories` | Top-level categories (Cleaning, Plumbing, etc.) |
| `sub_categories` | Sub-categories under each category |
| `bookings` | Customer booking records |
| `booking_items` | Line items in a booking |
| `payments` | Payment records per booking |
| `notifications` | Push notification log |
| `points_ledger` | Loyalty points transaction log |
| `reviews` | Customer reviews on completed bookings |
| `reels` | Short video content linked to services |
| `support_tickets` | Customer support requests |
| `offers` | Promo/discount codes |
| `refresh_tokens` | JWT refresh token hashes |

---

## Communication Flow

```
Mobile/Web App
      ↕  REST JSON (Bearer JWT)
Express API (port 8000)
      ↕  Drizzle ORM
PostgreSQL (Supabase)
      ↕  Supabase Storage SDK
File Storage (images, docs, videos)
```

Push notifications flow:
```
Server → Expo Push API → Expo Go / Native app
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (primary) |
| `SESSION_SECRET` | JWT signing secret |
| `SUPABASE_URL` | Supabase REST project URL (https://xxx.supabase.co) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key for storage ops |

---

## Monorepo Tooling

- **Package manager:** pnpm with workspaces (`pnpm-workspace.yaml`)
- **Build:** Vite (web apps), tsc (server)
- **Dev runner:** `concurrently` for running server + web simultaneously
- **Mobile tunnel:** `scripts/expo-tunnel.sh` (Replit-native tunnel via `REPLIT_EXPO_DEV_DOMAIN`)
