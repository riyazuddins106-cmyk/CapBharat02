# API

## Base behavior

The API is mounted at `/api` by `server/src/app.ts`. JSON responses use the
project response helpers, and errors pass through the centralized error
handler. Protected endpoints require a Bearer access token unless noted as
public. Request validation is applied selectively with Zod validators.

## Public endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health response with status and timestamp |
| GET | `/api/booking-config` | Booking configuration with platform-setting/default fallback |
| GET | `/api/categories` | List categories |
| GET | `/api/categories/:id` | Get category |
| GET | `/api/categories/:id/subcategories` | List category subcategories |
| GET | `/api/services` | List catalog services |
| GET | `/api/services/:id` | Get service detail |
| GET | `/api/reels` | List active reels |
| GET | `/api/platform-policies` | List policies |
| GET | `/api/platform-policies/:slug` | Get a policy |
| GET | `/api/payments/config` | Public payment configuration |

## Authentication: `/api/auth`

| Method | Path | Purpose |
|---|---|---|
| POST | `/register` | Customer registration |
| POST | `/register-partner` | Partner registration |
| POST | `/verify-otp` | Verify signup OTP |
| POST | `/resend-otp` | Resend OTP |
| POST | `/login` | Authenticate |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Revoke/logout refresh token |
| POST | `/logout-all` | Revoke all sessions for authenticated user |
| POST | `/forgot-password` | Start password recovery |
| POST | `/reset-password` | Complete password recovery |

## Customer account and engagement

| Group | Important paths |
|---|---|
| Profile | `/profile/me`, `/profile/me/avatar`, `/profile/me/change-password`, `/profile/me/push-token`, `DELETE /profile/me` |
| Addresses | `GET/POST /addresses`, `PATCH/DELETE /addresses/:id` |
| Cart | `/cart` routes in `server/src/routes/cart.routes.ts` |
| Favorites | `/favorites` routes in `favorite.routes.ts` |
| Service wishlist | `/service-wishlist`, `/service-wishlist/ids`, `/service-wishlist/:serviceId` |
| Points | `GET /points`, `POST /points/redeem` |
| Reviews | `POST/PATCH/DELETE /reviews` and `/:id` |
| Notifications | `/notifications` routes in `notification.routes.ts` |
| Support | `POST /support-tickets`, `GET /support-tickets/mine` |

## Legacy bookings: `/api/bookings`

| Method | Path | Purpose |
|---|---|---|
| GET | `/config` | Booking configuration |
| GET | `/` | Customer booking list |
| POST | `/` | Create a booking |
| POST | `/checkout` | Booking checkout path |
| GET | `/:id` | Booking detail |
| PATCH | `/:id/cancel` | Cancel booking |
| PATCH | `/:id/reschedule` | Reschedule booking |
| GET/POST | `/:id/payment` | Get/create booking payment |
| POST | `/:id/razorpay/create-order` | Create Razorpay order |
| POST | `/:id/razorpay/verify` | Verify Razorpay payment |
| POST | `/:id/stripe/create-session` | Create Stripe session |
| POST | `/:id/test-pay` | Test-mode payment |
| GET | `/:id/qr` | Authenticated QR/check-in token |

## New orders: `/api/orders`

The order controller provides master-order checkout/list/detail and per-item
operations:

- `POST /orders/checkout`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/items/:itemId/cancel`
- `PATCH /orders/:id/items/:itemId/continue-searching`
- `GET /orders/:id/items/:itemId/payment`
- `POST /orders/:id/items/:itemId/pay`
- `POST /orders/:id/items/:itemId/test-pay`

Exact request/response schemas are defined by
`server/src/validators/` and `server/src/controllers/orders.controller.ts`.

## Partner: `/api/partner`

Partner routes cover profile/account/avatar, availability/location, schedule,
performance, evidence, issues, legacy jobs, order-item jobs, earnings,
payouts, and documents. Key paths include:

- `/profile`, `/account`, `/availability`, `/location`
- `/schedule`, `/performance`, `/jobs`, `/jobs/:id`
- `/jobs/:id/accept`, `/jobs/:id/reject`, `/jobs/:id/checkin`,
  `/jobs/:id/complete`
- `/order-item-jobs`, `/order-item-jobs/:itemId`
- `/order-item-jobs/:requestId/accept`, `/reject`
- `/order-item-jobs/:itemId/checkin`, `/confirm-cash`, `/complete`
- `/earnings`, `/payouts`
- `/documents/types`, `/documents`, `/documents/:docType/history`

These routes are guarded for partner/admin access in
`server/src/routes/partner.routes.ts`.

## Admin: `/api/admin`

Admin routes cover stats/analytics, bookings/orders, order-item dispatch and
refund operations, payments, professional management, user management,
categories/subcategories/services, offers, settings, support, audits, and
document verification. The complete declaration is in
`server/src/routes/admin.routes.ts`; do not infer authorization from the path
alone because some reads allow operations managers while mutations are
admin-only.

## Payments and dispatch

Payment routes:

- `GET /payments/razorpay/checkout`
- `POST /payments/razorpay/callback`
- `POST /payments/razorpay/webhook`
- `GET /payments/stripe/success`
- `GET /payments/stripe/item-success`
- `POST /payments/stripe/webhook`

Operational dispatch is mounted under `/api/operations/dispatch` and is
declared in `server/src/routes/dispatch.routes.ts`.

## Source map and verification

Route declarations: `server/src/routes/*.routes.ts`
Controllers: `server/src/controllers/`
Validators: `server/src/validators/`
Shared middleware: `server/src/middleware/`

Exact field-level request and response documentation for every endpoint is
`UNKNOWN — REQUIRES VERIFICATION`; use the route's validator and controller as
the source of truth before implementing a client.
