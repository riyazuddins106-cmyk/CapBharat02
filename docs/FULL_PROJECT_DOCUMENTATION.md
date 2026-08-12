# ServeNow — Full Project Documentation

**Document status:** Fresh repository audit  
**Generated:** 2026-08-12  
**Repository:** ServeNow service marketplace monorepo  
**Verification status:** Runtime testing has been executed; the latest results
and remaining limitations are recorded in the QA section below.

### Latest operations update — 2026-08-12

The itemized `orders` / `order_items` workflow now has the same core dispatch
operations as legacy bookings. Admin can inspect eligible partners, manually
assign an active service-qualified partner, stop partner searching without
cancelling the item, restart dispatch, and cancel an unpaid service item. Paid
items remain on the existing Refund Service path. These controls are available
in both the dedicated Service Orders hierarchy and the unified source-labeled
Operations queue.

## 1. Product overview

ServeNow is a home-services marketplace. Customers browse centrally managed
services, create bookings or multi-service orders, and track payment and
completion. Partners are matched by dispatch rules, accept work, check in with
QR verification, complete the service, and track earnings. Admin and operations
users manage the catalog, customers, partners, bookings, orders, dispatch, and
payments.

The repository contains five client surfaces and one shared API:

| Surface | Location | Local port | Role |
|---|---|---:|---|
| Customer Web | `apps/customer-web` | 5000 | Customer browser portal |
| Admin Panel | `apps/admin-web` | 5001 | Admin and operations tooling |
| Partner Web | `apps/partner-web` | 4000 | Partner browser portal |
| Customer Mobile | `apps/mobile` | 8081 workflow / Expo | Customer Expo app |
| Partner Mobile | `apps/mobile-partner` | 8099 workflow / Expo | Partner Expo app |
| Shared API | `server` | 8000 | Express, Drizzle, PostgreSQL |

## 2. Repository structure

```text
apps/
  customer-web/       Customer React/Vite portal
  admin-web/          Admin React/Vite panel
  partner-web/        Partner React/Vite portal
  mobile/             Customer Expo Router app
  mobile-partner/     Partner Expo Router app
server/
  src/
    config/            Environment, database, Supabase/storage setup
    controllers/       HTTP request handlers
    database/          Drizzle schema, migrations, seeds
    e2e/               Current order-item and legacy dispatch scripts
    middleware/        Authentication, roles, validation, errors
    repositories/      Database access helpers
    routes/            Express route groups
    services/          Business and dispatch logic
    validators/        Zod request validation
packages/shared/       Shared TypeScript utilities/types
scripts/               Expo tunnels and regression scripts
docs/                  Module, business-rule, workflow, and QA documentation
```

The workspace is managed by pnpm. Packages are selected from `apps/*`,
`server`, `packages/*`, and `apps/mobile-partner`.

## 3. Runtime and workflow configuration

The configured Replit workflows are:

- **Start application:** installs dependencies, starts the Express API and
  Customer Web.
- **Admin Panel:** starts the Admin Vite server.
- **Expo Customer App:** starts the Customer Metro/tunnel workflow on 8081.
- **Expo Partner App:** starts the Partner Metro/tunnel workflow on 8099 with a
  delayed start to avoid ngrok contention.
- **Partner Web:** starts the Partner Vite server on the configured port 4000.
- **QR Codes:** serves the current QR scanner and QR image files from `tmp-qr`.
- **Project:** starts the application workflows in parallel.

The deployment build is `pnpm build`; the deployment runtime is
`node server/dist/index.js`. Server startup runs idempotent migrations before
opening the API listener.

## 4. Technology and environment

- Node.js 20 on NixOS/Replit
- React 18 and Vite for web clients
- Tailwind CSS and Radix UI for web UI
- React Native and Expo SDK 54 for mobile clients
- Expo Router for mobile navigation
- Express and TypeScript for the API
- Drizzle ORM with PostgreSQL hosted by Supabase
- JWT access and refresh tokens
- Supabase Storage for user and partner media
- Optional SMTP for OTP delivery; development can expose OTP codes in the
  server response/log path
- Optional Razorpay, Stripe, and RazorpayX integrations for payments/refunds

Required development secrets are supplied through the environment and must not
be committed or printed. `DATABASE_URL` is the preferred database secret;
`SUPABASE_URL` is the REST project URL, not the PostgreSQL connection string.

Development accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@servenow.in` | `Admin@1234` |
| Partner | `partner@servenow.in` | `Partner@1234` |
| Customer | `customer@servenow.in` | `Customer@1234` |

## 5. API architecture

The API is created in `server/src/app.ts`, mounted under `/api`, and started
from `server/src/index.ts`.

Top-level route groups in `server/src/routes/index.ts`:

| Group | Responsibility |
|---|---|
| `/health` | Liveness response |
| `/booking-config` | Public booking hours and slot rules |
| `/auth` | Register, OTP, login, refresh, logout, password reset |
| `/profile` | Authenticated profile, avatar, password, push token, delete |
| `/addresses` | Customer address CRUD |
| `/categories` | Public category and sub-category catalog |
| `/services` | Public service catalog and service details |
| `/bookings` | Legacy customer bookings, QR, reschedule, cancellation |
| `/orders` | Itemized multi-service orders and item lifecycle |
| `/cart` | Customer service cart |
| `/partner` | Partner profile, availability, jobs, evidence, payouts, documents |
| `/admin` | Admin dashboard, management, orders, refunds, catalog, support |
| `/operations/dispatch` | Legacy booking operations queue and assignment |
| `/payments` | Legacy and item-level payment operations |
| `/notifications` | In-app notification listing and read state |
| `/points` | Loyalty balance, earn, redeem, history |
| `/service-wishlist` | Customer saved services |
| `/reviews` | Customer reviews |
| `/offers` | Public and admin offer management |
| `/platform-policies` | Public policy content |
| `/support-tickets` | Customer ticket creation and admin handling |
| `/reels` | Service/category short-video content |

Authentication and role middleware are applied at route-group level. Backend
authorization is authoritative; hiding a menu item in a client is not a
security boundary.

## 6. Booking and order models

Two dispatch models intentionally coexist:

### Legacy booking model

Legacy customer bookings use:

- `bookings`
- `booking_items`
- `booking_partner_requests`
- `booking_assignment_logs`
- `payments`

The legacy operations API is `/api/operations/dispatch`. It supports the
operations queue, request history, eligible partners, assignment, stopping
partner search, and cancellation.

### Itemized service-order model

The current multi-service checkout uses:

- `orders`
- `order_items`
- `order_item_requests`
- `order_item_payments`

Each item has its own service, price, partner payout, status, schedule, partner,
and payment state. Partner Mobile receives pending requests through
`/api/partner/order-item-jobs`.

The Admin Service Orders surface reads `/api/admin/orders` and supports service
detail, dispatch continuation, and item refund. The Admin Booking Operations
Centre now monitors both legacy bookings and itemized jobs in one source-labeled
queue without merging the database models.

## 7. Dispatch and partner rules

Dispatch is platform-controlled; customers do not choose a professional.

An itemized dispatch candidate must satisfy the current backend rules:

1. The partner has an explicit `partner_services` link for the exact service.
2. The partner category matches the service category.
3. The partner is active and not deleted.
4. The partner is available.
5. Mandatory document requirements, when configured, are approved.
6. Location proximity is considered when coordinates exist.

The explicit service link is the capability decision. A profile sub-category
label must not hide a valid linked request.

Partner Mobile supports pending requests, accept/reject, QR check-in,
cash/payment confirmation where applicable, completion, evidence, issues,
earnings, payouts, documents, notifications, and availability.

## 8. Payment and completion flow

The supported itemized lifecycle is:

```text
Customer catalog/cart
  → itemized checkout
  → order item searching_partner
  → partner request
  → partner acceptance
  → customer QR
  → partner QR check-in
  → payment becomes available
  → service_started
  → partner completion
  → service_completed
```

Payment is intentionally blocked before the partner reaches the permitted
check-in state. Provider-backed Razorpay/Stripe flows and test/cash handling are
implemented separately for item-level and legacy paths. Live provider
transactions require provider credentials and are not equivalent to a local
contract smoke test.

## 9. Client responsibilities

### Customer Web

Customer Web provides catalog browsing, service detail, cart/checkout, booking
and order history, profile, addresses, service wishlist, points, offers,
notifications, support, policies, and payment actions.

### Customer Mobile

Customer Mobile mirrors the customer journey using Expo Router: authentication,
home/catalog, categories/sub-categories, service details, cart/checkout,
orders/bookings, addresses, points, favorites, notifications, support, and
privacy/security.

### Admin Panel

Admin Panel provides dashboard statistics, users, professionals, categories,
sub-categories, services, offers, reels, reviews, documents, bookings,
itemized Service Orders, unified Booking Operations, booking history, payments,
payouts, support, policies, settings, and audit logs.

### Partner Web

Partner Web provides partner authentication, dashboard, profile, availability,
jobs, job detail, schedule, earnings/payouts, documents, support, notifications,
and partner-side operational actions.

### Partner Mobile

Partner Mobile provides the mobile partner job workflow, including pending
service requests, active jobs, completed jobs, QR scanning, payment
confirmation, earnings/payouts, documents, support, notifications, and
availability.

## 10. Data model inventory

The Drizzle schema currently includes:

`users`, `professionals`, `service_categories`, `sub_service_categories`,
`services`, `partner_services`, `addresses`, `bookings`, `booking_items`,
`booking_partner_requests`, `booking_assignment_logs`, `orders`, `order_items`,
`order_item_requests`, `order_item_payments`, `carts`, `cart_items`,
`payments`, `payout_requests`, `payout_runs`, `refresh_tokens`, `otp_codes`,
`notifications`, `reviews`, `favorites`, `service_wishlists`, `points_ledger`,
`offers`, `reels`, `support_tickets`, `platform_policies`,
`platform_settings`, `audit_logs`, and `partner_job_evidence`.

Migrations are intended to be idempotent and run at server startup. Do not run
schema push or migration commands during QA unless a database change is
explicitly required.

## 11. Test assets and verification commands

Available verification assets:

- `server/src/e2e/order-item-flow.e2e.ts` — current itemized checkout contract
- `server/src/e2e/dispatch.e2e.ts` — GPS dispatch and legacy operations flow
- `server/src/e2e/full-flow.e2e.ts` — older legacy lifecycle contract
- `scripts/crud-test.sh` — broad API CRUD regression
- `scripts/e2e-payment-test.mjs` — older payment/legacy booking flow
- `pnpm build` — Customer Web, Admin Web, Partner Web, Server
- Expo Metro/bundle commands in the configured mobile workflows

Tests that use real accounts or a live database should be run serially, with
their generated records identified and cleaned where the test supports cleanup.
The current scripts have been updated to the active route contracts. If a future
run fails, record the exact endpoint and response before treating it as a
product regression.

## 12. Known constraints and risks

- There is no unified root test-runner, lint command, or CI workflow inventory;
  the individual QA commands in Section 11 are verified.
- Legacy and itemized booking models coexist and are not interchangeable.
- Live Razorpay/Stripe/RazorpayX transactions require configured provider
  credentials.
- The web preview host's root `/api/*` route can reach a standalone starter API
  artifact instead of ServeNow. On Replit preview hosts, Customer and Partner
  Web use the ServeNow API's public port 8000; the API explicitly allows the
  intentional cross-port browser response. Local Vite proxies and single-port
  production remain unchanged.
- Legacy `/professionals` and `/favorites` customer endpoints are not mounted;
  current customer flows use service catalog and `/service-wishlist`. Partner
  and admin professional routes remain available under their role-scoped groups.
- Expo SDK 54 and the pinned React Native/worklets versions must be preserved.
- Expo tunnels and QR hostnames can change after workflow restarts.
- A successful page build does not prove authenticated API behavior; every
  surface needs a route and contract check.

## 13. Current QA results

### 2026-08-12 — Final full-project verification

- `pnpm build`: **passed** — Customer Web, Admin Web, Partner Web, and Server.
- `git diff --check`: **passed**.
- `pnpm --filter @servenow/server exec tsx src/e2e/order-item-flow.e2e.ts`:
  **16 passed, 0 failed, 1 skipped**. The payment assertion was skipped because
  payment test mode is disabled.
- `pnpm --filter @servenow/server exec tsx src/e2e/dispatch.e2e.ts`:
  **66 passed, 0 failed**.
- `pnpm --filter @servenow/server exec tsx src/e2e/full-flow.e2e.ts`:
  **45 passed, 0 failed, 3 skipped**.
- `bash scripts/crud-test.sh`: **71 passed, 0 failed**.
- `node scripts/e2e-payment-test.mjs`: **21 passed, 0 failed**.
- `node scripts/test-admin-features.js`: **17 passed, 0 failed**.
- Customer Mobile and Partner Mobile TypeScript checks: **passed**.
- Overall automated result: **236 passed, 0 failed, 5 skipped**.
- Live cross-surface checks: **passed** — customer order/wishlist and role
  guards, Admin order/service-order/Operations records, Amit Verma partner
  login, two pending AC Service requests, and first itemized job detail.
- Preview checks: **passed after workflow startup settled** — Customer loaded
  categories, offers, featured services, and reels; the Admin login preview
  rendered without application errors.

Confirmed issues and repairs:

1. Admin and Partner login password inputs emitted an autocomplete warning.
   Added `email` and `current-password` metadata to the shared login inputs.
2. Customer and Partner Web used relative `/api` URLs on Replit preview hosts,
   where the root route can reach the wrong starter artifact. They now derive
   the API public-port origin only for Replit preview hosts.
3. The API's Helmet default `same-origin` resource policy blocked intentional
   cross-port preview API responses. It now uses `cross-origin` with existing
   CORS authorization.
4. Early screenshots during startup showed 503/connection errors. The API was
   still running idempotent migrations; after `/api/health` returned 200, the
   same previews were clean.

Remaining limitations: live Razorpay/Stripe/RazorpayX transactions, refunds,
and payout transfers remain blocked without provider credentials; selected
disposable upload/review/Admin-management write flows are `NOT TESTED`; and the
direct root `/api/*` preview route remains an environment routing limitation,
so web clients use the working public API port on Replit previews.
