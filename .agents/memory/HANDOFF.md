---
name: Project Handoff — ServeNow
description: Complete handoff document for any agent continuing this project. Covers what has been analyzed, what is done, what is partial, what is missing, and the exact recommended build order. Read this first in every new session.
---

# ServeNow — Project Handoff Document

> **First thing any new agent must do:** Read this file top-to-bottom before writing a single line of code.
> Last updated: 2026-08-03

---

## 1. What This Project Is

ServeNow is an Urban Company-style home-services marketplace. Customers book services (cleaning, laundry, AC repair, etc.); a dispatch engine assigns available partners; partners accept, travel to customer, check in, complete, and get paid.

**Tech stack**
| Layer | Tech |
|---|---|
| API | Node.js + Express + TypeScript + Drizzle ORM |
| DB | PostgreSQL via Supabase |
| Web frontends | React 18 + Vite + Tailwind + Radix UI |
| Mobile | React Native + Expo SDK 54 (Expo Router) |
| Auth | JWT (access + refresh) + OTP email |
| Monorepo | pnpm workspaces |

**Apps**
| App | Port | Path |
|---|---|---|
| Customer Web | 5000 | `apps/customer-web` |
| Admin Panel | 5001 | `apps/admin-web` |
| Partner Web | 5002 | `apps/partner-web` |
| API Server | 8000 | `server/` |
| Customer Mobile | 8081 | `apps/mobile` |
| Partner Mobile | 8082 | `apps/mobile-partner` |

---

## 2. Secrets Required (must be set in Replit before starting)

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string (preferred alias) |
| `SUPABASE_DATABASE_URL` | Legacy alias — server accepts both |
| `SUPABASE_URL` | REST project URL: `https://xxx.supabase.co` (NOT a postgres string) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `NGROK_AUTHTOKEN` | Customer App ngrok (fallback only) |
| `NGROK_AUTHTOKEN_2` | Partner App ngrok (fallback only) |
| `SESSION_SECRET` | Session secret |

SMTP secrets are optional — OTP codes log to console when not set.

---

## 3. First-Run Setup Commands

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Run DB migrations (idempotent — safe to re-run)
pnpm --filter @servenow/server exec tsx src/database/migrate.ts

# 3. Seed service catalog (categories + services)
pnpm --filter @servenow/server exec tsx src/database/seed-catalog.ts

# 4. Seed test accounts (admin / customer / partner)
pnpm --filter @servenow/server exec tsx src/database/seed-test-accounts.ts

# 5. Link test partner to all active services
pnpm --filter @servenow/server exec tsx src/database/seed-partner-services.ts

# 6. Enable test-mode payments (skips real gateways)
pnpm --filter @servenow/server exec tsx src/database/seed-test-mode.ts
```

**Test credentials**
| Role | Email | Password |
|---|---|---|
| Admin | admin@servenow.in | Admin@1234 |
| Partner | partner@servenow.in | Partner@1234 |
| Customer | customer@servenow.in | Customer@1234 |

---

## 4. What Has Been Analyzed

A full audit was done against the master product prompt (Urban Company-style marketplace spec). The audit covered 49 requirements across 9 areas:

- Architecture (Orders / Items)
- Status flows
- Time slot system
- Partner search & dispatch
- Payment workflow
- Customer Mobile app
- Customer Web app
- Partner App
- Admin Panel

**Result: 14 done ✅ | 11 partial ⚠️ | 24 not built ❌**

The full detailed audit table is in `.agents/memory/master-prompt-status.md`.

---

## 5. What Is Fully Done ✅

### Backend
- JWT auth + OTP email verification
- User roles: admin / customer / partner
- Service catalog: categories, sub-categories, services, service details
- Bookings: create, view, cancel, reschedule, QR check-in
- Dispatch engine: auto-matches available partners by skills + proximity (30 km Haversine)
- Partner management: availability, skills, jobs, earnings, payouts
- Payments: test mode + real gateway hooks (Razorpay + Stripe)
- Points & Rewards: earn 1pt/₹10, redeem 1pt=₹1, minimum 100pts
- Reviews: customers rate completed bookings
- Offers & Coupons: admin creates, customers apply at checkout
- Favorites & Wishlists
- Addresses: CRUD with default address
- Notifications: in-app + Expo push
- Support tickets
- Platform policies (terms, privacy)
- Platform settings (admin-controlled)
- Reels: short video content
- Audit logs
- Admin stats dashboard
- Commission split (platform % vs partner payout) stored per service in catalog
- Partner wallet / earnings / payout records
- Retry / re-dispatch when partner goes online
- 30 km Haversine radius filter with fallback to all partners

### Customer Web
- Browse categories & services, book a service, My Bookings, profile & addresses, points balance

### Admin Panel
- Stats dashboard, user/booking/professional management, category/service management, offers management, payout management, audit logs, platform settings, dispatch operations center (manual partner assignment)

### Partner Web
- View jobs, manage availability

### Customer Mobile
- Auth, home with categories + reels, sub-categories drill-down, service listing & detail, booking & checkout (with points redemption), My Bookings with QR code, addresses, wishlist, points & rewards, notifications, help & support, privacy & security
- Draggable floating cart (PanResponder, edge-snap)

### Partner Mobile
- Auth, job list (new / accepted / completed), job accept / check-in (QR scan) / completion, document upload, notifications

---

## 6. What Is Partially Built ⚠️ (needs completion)

| Area | What exists | What's missing |
|---|---|---|
| Booking items | `booking_items` table exists | Items share one booking — no separate booking per service |
| Time slot picker | Fixed slots `[9, 11, 14, 16, 18]` | Free 30-min increment picker |
| Service window | Duration summed | Should be max(durations), not sum |
| Dispatch timeout | `dispatchDeadline` stored (10 min) | Not enforced by a cron/scheduler |
| Payment timing | Payment created after job completion | Spec says: trigger on partner check-in |
| "Awaiting Payment" | Tab exists in customer web | Not gated on partner arrival event |
| Transaction log | `payments` table exists per booking | Should be per service |
| Partner job request | Partner sees all items in booking | Should be per-service assignment |
| Per-service time display | Shows `scheduledAt` | No individual service time window |
| Admin dispatch status | Shows per-booking | Should show per-service |
| Admin payment log | Per-booking payment | Should be per-service |
| Refunds | Status field in `payments` table | No admin UI to initiate refunds |

---

## 7. What Is NOT Built ❌ (24 items — the big gaps)

### Architecture
- **`orders` table** (master order parent record) — currently bookings are a flat table
- **Per-service `order_items`** with individual status columns
- **Per-service partner assignment** — currently one partner for the whole booking

### Status Flows
- **Master order statuses**: `created → searching_partners → partially_confirmed → fully_confirmed → in_progress → partially_completed → completed`
- **Per-service statuses**: `searching_partner → assigned → partner_accepted → partner_arrived → payment_pending → payment_completed → service_started → service_completed`
- **Partial acceptance**: some services assigned, others still searching

### Time Slots
- **Service window = max(durations)** not sum — booking controller sums all durations
- **Display window**: "10:00 AM – 1:00 PM, Approx 3 hrs" per service
- **Partner calendar blocking** per their assigned service duration only

### Dispatch
- **Per-service partner search** — dispatch currently broadcasts for the whole booking
- **Configurable search timeout** in admin UI (currently hardcoded 10 min)

### Payments
- **Per-service payment trigger on partner check-in** (not job completion)
- **Per-service separate payment records**

### Customer Mobile
- **Booking detail per-service rows** (service name, partner, time window, payment status)
- **"Continue Searching" button** per unassigned service
- **"Cancel Service" button** per individual service (only per-booking cancel exists)
- **Free 30-min start-time picker** (currently fixed `[9, 11, 14, 16, 18]`)
- **Per-service payment screen** on partner arrival

### Customer Web
- **Per-service booking detail** same as mobile
- **Per-service cancel / continue searching**
- **Free start-time picker**
- **Per-service payment flow**

### Admin Panel
- **Master Order → Service Booking hierarchy view** (flat list currently)
- **Configurable dispatch search timeout** UI
- **Per-service payment & earnings log**

---

## 8. Recommended Build Order (dependency-ordered)

These MUST be done in this sequence — each step unlocks the next:

### Step 1 — DB Schema (foundation for everything)
- Add `orders` table (master order)
- Add `order_items` table: `(id, order_id, service_id, partner_id, status, scheduled_at, duration_minutes, customer_price, partner_payout)`
- `status` enum: `searching_partner | assigned | partner_accepted | partner_arrived | payment_pending | payment_completed | service_started | service_completed | cancelled`
- Migrate existing `bookings` to point to `orders` (add `order_id` FK, keep backward compat)

### Step 2 — Backend Checkout + Dispatch
- Checkout creates one `orders` record + N `order_items` (one per cart item)
- Dispatch searches partners per `order_item` separately (not per booking)
- Status transitions move on `order_items`, aggregated to `orders`

### Step 3 — Time Slots
- Replace fixed-hour array `[9, 11, 14, 16, 18]` with dynamic 30-min increment generator
- Fix service-window calculation: `windowEnd = scheduledAt + max(item.duration_minutes)`
- Expose window display string: "10:00 AM – 1:00 PM, Approx 3 hrs"

### Step 4 — Payments
- Trigger per-service payment when partner status → `partner_arrived` (check-in)
- Create one `payments` record per `order_item`
- Remove old booking-level payment gate

### Step 5 — Customer Mobile (UI)
- Booking detail screen: show per-service rows
- "Continue Searching" button per unassigned item
- "Cancel Service" button per item
- Replace fixed slot picker with free 30-min picker
- Per-service payment sheet on partner arrival push notification

### Step 6 — Customer Web (UI)
- Mirror Step 5 for web

### Step 7 — Partner Mobile (UI)
- Show only the one `order_item` assigned to this partner
- Show that item's time window display string

### Step 8 — Admin Panel (UI)
- Order hierarchy view: order → expand → service items
- Configurable dispatch timeout setting
- Per-service payment & earnings log
- Refund initiation UI

---

## 9. Known Gotchas (don't re-learn these)

| Gotcha | Rule |
|---|---|
| Drizzle-kit ESM | `schema/index.ts` must use extensionless imports — CJS require can't resolve `.js` |
| SUPABASE_URL | Must be `https://xxx.supabase.co` REST URL, NOT a postgres string |
| DATABASE_URL | Preferred secret name; server aliases to legacy `SUPABASE_DATABASE_URL` |
| Expo pnpm exec | Use `pnpm exec expo start` NOT `pnpm expo start` in all script branches |
| React Native worklets | Pin `react-native-worklets@0.5.1` + `reanimated@4.1.1` exactly for SDK 54 |
| Expo SDK 57 | Do NOT upgrade — pnpm release-age policy blocks it and partial upgrade corrupts state |
| Metro duplicate React | Force via `resolveRequest` in metro.config, not `extraNodeModules` |
| Bash exit code after `\|\| true` | Always captures 0 — use `set +e`/`set -e` to capture real exit codes |
| expo-notifications import | Conditionally `require()` on Android Expo Go — the import itself triggers errors |
| expo-keep-awake | Must stub via metro.config `resolveRequest` FORCED_MODULES even after removing from package.json |
| Startup migrations | Always run idempotently via `migrate.ts` before API starts serving |
| Auth token issuance | Returned JWT and stored hash must reference the same token ID — use `updateHash` |
| Partner availability field | Controller accepts `availabilityStatus` (mobile) OR `status` (legacy) |
| No-professional booking | Platform is dispatch-based — customers never pick a partner; `professionalId` is optional |
| Admin catalog ownership | Customers book admin-managed products; partners don't create or price products |

Full detail on each gotcha: see `.ai-memory/GOTCHAS.md`

---

## 10. Module Index (where to find specific code)

Full module index: `.ai-memory/MASTER_INDEX.md`

Key modules:
| Module | Path | Index |
|---|---|---|
| Auth | `server/src/controllers/auth*` | `.ai-memory/modules/auth/INDEX.md` |
| Booking | `server/src/controllers/booking*` | `.ai-memory/modules/booking/INDEX.md` |
| Dispatch | `server/src/services/dispatch.service.ts` | `.ai-memory/modules/dispatch/INDEX.md` |
| Payment | `server/src/controllers/payment*` | `.ai-memory/modules/payment/INDEX.md` |
| Admin | `apps/admin-web/src/app/App.tsx` | `.ai-memory/modules/admin/INDEX.md` |
| Customer Mobile | `apps/mobile/app/` | `.ai-memory/modules/mobile-customer/INDEX.md` |
| Partner Mobile | `apps/mobile-partner/app/` | `.ai-memory/modules/mobile-partner/INDEX.md` |
| Catalog | `server/src/controllers/catalog*` | `.ai-memory/modules/catalog/INDEX.md` |
| Points | `server/src/services/points.service.ts` | `.ai-memory/modules/points/INDEX.md` |
| Notifications | `server/src/services/notification.service.ts` | `.ai-memory/modules/notifications/INDEX.md` |

---

## 11. Current Task State (as of 2026-08-03)

**Task #1: Set up the imported project** — ✅ COMPLETE (2026-08-03)

**Task #2: Enable booking multiple different services in one order** — BACKEND COMPLETE, pending DB migration

### Task #2 — What was built:
All backend code is written and TypeScript-clean. New files:
- `server/src/database/schema/orders.ts` — orders table + orderStatusEnum (7 statuses)
- `server/src/database/schema/orderItems.ts` — order_items table + orderItemStatusEnum (9 statuses)
- `server/src/database/schema/orderItemRequests.ts` — per-item partner requests
- `server/src/database/schema/orderItemPayments.ts` — per-item payments (reuses paymentStatusEnum/paymentMethodEnum)
- `server/src/services/orderDispatch.service.ts` — per-item broadcast, accept, reject, checkIn, complete, recomputeOrderStatus
- `server/src/controllers/orders.controller.ts` — checkout (max duration not sum), list, getById, cancelItem, continueSearching, getItemPayment, payItem, testPayItem
- `server/src/routes/orders.routes.ts` — all routes mounted at /api/orders

Modified files:
- `server/src/database/schema/index.ts` — exports 4 new schemas
- `server/src/database/migrate.ts` — idempotent migration for all 4 new tables
- `server/src/routes/index.ts` — /api/orders mounted
- `server/src/controllers/partner.controller.ts` — 5 new order-item job methods
- `server/src/routes/partner.routes.ts` — /api/partner/order-item-jobs/* routes

### Task #2 — What still needs to happen:
1. **Set secrets** (Supabase + JWT — see Section 2 above) — server won't start without them
2. **Run migration**: `pnpm --filter @servenow/server exec tsx src/database/migrate.ts`
3. **Task #3** (Let customers pick any time): replace fixed slots with 30-min picker, fix time window display in Customer Mobile + Web
4. **Task #4** (Customer booking detail per-service): per-service rows, cancel-per-item, continue-searching UI

### New API endpoints added:
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders/checkout` | Create order + items from cart |
| GET | `/api/orders` | List customer orders |
| GET | `/api/orders/:id` | Order detail + items |
| PATCH | `/api/orders/:id/items/:itemId/cancel` | Cancel one service |
| PATCH | `/api/orders/:id/items/:itemId/continue-searching` | Re-broadcast dispatch |
| GET | `/api/orders/:id/items/:itemId/payment` | Item payment status |
| POST | `/api/orders/:id/items/:itemId/pay` | Cash/UPI payment for item |
| POST | `/api/orders/:id/items/:itemId/test-pay` | Test-mode instant pay |
| GET | `/api/partner/order-item-jobs` | Partner's item job list |
| PATCH | `/api/partner/order-item-jobs/:requestId/accept` | Accept item job |
| PATCH | `/api/partner/order-item-jobs/:requestId/reject` | Reject item job |
| PATCH | `/api/partner/order-item-jobs/:itemId/checkin` | Partner arrives |
| PATCH | `/api/partner/order-item-jobs/:itemId/complete` | Service done |

**Next recommended task:** Task #3 — dynamic 30-min time slot picker + fix service window = max(durations) in Customer Mobile + Web.
