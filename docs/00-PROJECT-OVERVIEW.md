# Project Overview

## Purpose

ServeNow is an Urban Company-style home-services marketplace. Customers browse
the service catalog and book home services. The backend dispatches work to
available partners, tracks the job, collects payment, and records reviews and
partner earnings.

## Users and roles

The database role enum defines:

- `customer` — books and pays for services, manages profile/address data,
  receives notifications, and submits reviews/support tickets.
- `partner` — manages availability, skills, documents, jobs, evidence, earnings,
  and payout requests.
- `admin` — manages users, partners, catalog, bookings/orders, payments,
  policies, offers, settings, support, and audit records.
- `operations_manager` — receives operations access where a route permits it.

Role enforcement is implemented by
`server/src/middleware/authenticate.ts` and
`server/src/middleware/requireRole.ts`.

## Applications

| Application | Source | Purpose |
|---|---|---|
| Customer Web | `apps/customer-web` | Customer browsing, booking, account, and support experience |
| Admin Web | `apps/admin-web` | Administrative operations and catalog/account management |
| Partner Web | `apps/partner-web` | Partner jobs and availability experience |
| Customer Mobile | `apps/mobile` | Expo Router customer application |
| Partner Mobile | `apps/mobile-partner` | Expo Router partner application |
| API server | `server` | Express API, static production hosting, migrations, and scheduler |

## Major capabilities verified in source

- JWT access/refresh authentication with registration, OTP verification,
  password reset, logout, and role-aware routes.
- Catalog categories, subcategories, services, service details, offers, and
  reels.
- Legacy booking flow plus the newer master `orders` and per-service
  `order_items` flow.
- Automatic and administrative partner dispatch, acceptance, rejection,
  check-in, completion, and job evidence.
- Razorpay and Stripe payment paths, cash/UPI/manual payment paths, and
  partner payout requests.
- Addresses, cart, favorites/service wishlist, points ledger, reviews,
  notifications, support tickets, platform policies, and audit logs.
- Supabase Storage and Replit Object Storage upload paths.

## Important constraints

- PostgreSQL is accessed through Drizzle ORM and Supabase-provided
  connection/storage services.
- The backend reads `DATABASE_URL` as an alias for
  `SUPABASE_DATABASE_URL` when the latter is absent.
- Customers do not choose a professional in the booking model; dispatch selects
  partners. `professionalId` remains optional on legacy bookings.
- The repository contains both legacy booking tables/routes and the newer order
  model. Do not assume they are interchangeable.
- The server runs migrations during startup before listening.
- No configured test runner command or lint command was verified.

## Current status

The repository contains a functioning multi-application codebase with both
legacy and newer service-order paths. The newer order model is present in
schema, routes, controllers, dispatch, and partner job handling. Exact
production data state, deployed URL, and external webhook registration are
`UNKNOWN — REQUIRES VERIFICATION`.

## Source entry points

- API startup: `server/src/index.ts`
- Express construction: `server/src/app.ts`
- API registration: `server/src/routes/index.ts`
- Customer Web: `apps/customer-web/src/main.tsx`
- Admin Web: `apps/admin-web/src/main.tsx`
- Partner Web: `apps/partner-web/src/main.tsx`
- Customer Mobile: `apps/mobile/app/_layout.tsx`
- Partner Mobile: `apps/mobile-partner/app/_layout.tsx`
