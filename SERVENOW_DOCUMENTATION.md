# ServeNow — Complete Technical Documentation

> **Platform:** Home & Local Services Booking  
> **Architecture:** pnpm Monorepo  
> **Last Updated:** July 2026

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Backend — API Server](#4-backend--api-server)
5. [Admin Panel](#5-admin-panel)
6. [Customer Web App](#6-customer-web-app)
7. [Partner Web App](#7-partner-web-app)
8. [Customer Mobile App (Expo)](#8-customer-mobile-app-expo)
9. [Partner Mobile App (Expo)](#9-partner-mobile-app-expo)
10. [Database Schema](#10-database-schema)
11. [Authentication & Security](#11-authentication--security)
12. [Payment Integrations](#12-payment-integrations)
13. [File Storage](#13-file-storage)
14. [Push Notifications](#14-push-notifications)
15. [Running the Project](#15-running-the-project)
16. [Test Accounts](#16-test-accounts)

---

## 1. Platform Overview

ServeNow is a multi-platform home services booking system connecting customers with service professionals (partners). It supports three user roles — **Customer**, **Partner**, and **Admin** — each with a dedicated interface.

| App | Platform | Audience |
|-----|----------|----------|
| Customer Web | React/Vite (SPA) | End customers |
| Partner Web | React/Vite (SPA) | Service partners |
| Admin Panel | React/Vite (SPA) | Super admins |
| Customer Mobile | React Native (Expo) | End customers |
| Partner Mobile | React Native (Expo) | Service partners |
| API Server | Node.js / Express | All apps |

---

## 2. Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM) |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL (via Supabase) |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod |
| File uploads | Multer + Supabase Storage |
| Email | Nodemailer |
| Payments | Stripe, Razorpay |
| Push | Expo Notifications SDK |
| Rate limiting | express-rate-limit |

### Frontend (Web)
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| HTTP | Axios / native fetch |
| Charts | Recharts (admin) |

### Mobile
| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 / React Native 0.81 |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Data fetching | TanStack React Query |
| Auth state | React Context API |
| Secure storage | expo-secure-store |
| Camera | expo-camera |
| Notifications | expo-notifications |
| Haptics | expo-haptics |
| Icons | @expo/vector-icons (Ionicons) |

---

## 3. Monorepo Structure

```
servenow/
├── server/                    # Express API server
├── apps/
│   ├── admin-web/             # Admin dashboard (port 5001)
│   ├── customer-web/          # Customer web portal (port 5000)
│   ├── partner-web/           # Partner web portal (port 5002)
│   ├── mobile/                # Customer Expo app (port 8080)
│   └── mobile-partner/        # Partner Expo app (port 8099)
├── packages/
│   └── shared/                # Shared TypeScript types & utilities
├── scripts/                   # Expo tunnel & helper scripts
└── pnpm-workspace.yaml
```

---

## 4. Backend — API Server

**Entry point:** `server/src/index.ts`  
**Base path:** `/api`  
**Default port:** `8000`

### 4.1 Auth Routes — `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Customer self-registration |
| POST | `/register-partner` | Partner/professional registration |
| POST | `/login` | Login → returns access + refresh tokens |
| POST | `/verify-otp` | Verify OTP for email/phone |
| POST | `/resend-otp` | Resend verification OTP |
| POST | `/refresh` | Exchange refresh token for new access token |
| POST | `/logout` | Blacklist refresh token |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Set new password with reset token |

### 4.2 Profile Routes — `/api/profile`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update profile (name, phone, address, etc.) |
| POST | `/me/avatar` | Upload profile avatar to Supabase |
| PATCH | `/me/push-token` | Register Expo push notification token |

### 4.3 Category Routes — `/api/categories`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all service categories (public) |
| GET | `/:id` | Get category detail with sub-categories |
| GET | `/:id/subcategories` | List sub-categories for a category |

### 4.4 Professional Routes — `/api/professionals`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List professionals (filterable by category, location) |
| GET | `/:id` | Get professional profile + reviews |
| GET | `/:id/availability` | Get professional's available slots |

### 4.5 Booking Routes — `/api/bookings`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new booking |
| GET | `/` | List customer's own bookings |
| GET | `/:id` | Get booking details |
| PATCH | `/:id/cancel` | Cancel a booking |
| GET | `/:id/payment` | Get payment record for a booking |
| POST | `/:id/payment` | Submit cash or UPI payment |
| POST | `/:id/razorpay/create-order` | Create Razorpay order |
| POST | `/:id/stripe/create-session` | Create Stripe checkout session |

### 4.6 Partner Routes — `/api/partner` *(partner role)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jobs` | List jobs assigned to partner |
| GET | `/jobs/:id` | Job detail |
| PATCH | `/jobs/:id/accept` | Accept a pending job |
| PATCH | `/jobs/:id/reject` | Reject a pending job |
| PATCH | `/jobs/:id/checkin` | Check in (start job) |
| PATCH | `/jobs/:id/complete` | Mark job as complete |
| GET | `/earnings` | Revenue stats (daily, weekly, monthly, total) |
| POST | `/payouts` | Request earnings withdrawal |
| GET | `/profile` | Get partner's own professional profile |
| PATCH | `/profile` | Update bio, price, etc. |

### 4.7 Payment Routes — `/api/payments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config` | Public: get enabled methods + public keys |
| GET | `/razorpay/checkout` | Serve Razorpay checkout HTML (WebView) |
| POST | `/razorpay/callback` | HMAC-verified payment callback |
| POST | `/razorpay/webhook` | Razorpay async webhook (payment.captured) |
| GET | `/stripe/success` | Stripe post-payment redirect + verify |
| POST | `/stripe/webhook` | Stripe webhook (checkout.session.completed) |

### 4.8 Reviews Routes — `/api/reviews`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Submit a review for a completed booking |
| GET | `/professional/:id` | Get reviews for a professional |

### 4.9 Favorites Routes — `/api/favorites`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List customer's favourite professionals |
| POST | `/:professionalId` | Add to favourites |
| DELETE | `/:professionalId` | Remove from favourites |

### 4.10 Offers Routes — `/api/offers`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List active promotional offers |

### 4.11 Reels Routes — `/api/reels`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List short video reels (TikTok-style) |

### 4.12 Notifications Routes — `/api/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user's in-app notifications |
| PATCH | `/:id/read` | Mark notification as read |
| PATCH | `/read-all` | Mark all notifications as read |

### 4.13 Points & Rewards Routes — `/api/points`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/balance` | Get current points balance |
| GET | `/history` | Points earn/redeem history |
| POST | `/redeem` | Redeem points against a booking |

**Earn rate:** 1 point per ₹10 spent  
**Redeem rate:** 1 point = ₹1 (minimum 100 points)

### 4.14 Admin Routes — `/api/admin` *(admin role)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Dashboard KPIs |
| GET/PATCH/DELETE | `/bookings` | Manage all bookings |
| GET/PATCH/DELETE | `/bookings/:id/cancel` | Cancel any booking |
| POST/GET/PATCH/DELETE | `/professionals` | CRUD professionals |
| PATCH | `/professionals/:id/suspend` | Suspend a professional |
| PATCH | `/professionals/:id/activate` | Reactivate a professional |
| POST | `/professionals/:id/avatar` | Upload professional avatar |
| GET/PATCH/DELETE | `/users` | Manage user accounts |
| PATCH | `/users/:id/suspend` | Suspend a user |
| PATCH | `/users/:id/activate` | Activate a user |
| GET/POST/PATCH/DELETE | `/categories` | Service category CRUD |
| POST | `/categories/:id/image` | Upload category image |
| GET/POST/PATCH/DELETE | `/subcategories` | Sub-category CRUD |
| GET/POST/PATCH/DELETE | `/offers` | Promotional offers CRUD |
| GET/POST/PATCH/DELETE | `/reels` | Video reels CRUD |
| GET | `/reviews` | List all reviews |
| DELETE | `/reviews/:id` | Delete a review |
| GET/PUT | `/settings/:key` | Read/write platform settings (payment_config, email_config, sms_config) |
| POST | `/settings/email/test` | Send a test email |

### 4.15 Middleware Stack

| Middleware | Purpose |
|-----------|---------|
| `helmet` | Secure HTTP headers |
| `cors` | Allow all origins with credentials |
| `morgan` | Request logging |
| `express.json` + `verify` | Body parsing + rawBody capture for webhooks |
| `apiRateLimiter` | 120 req/min global |
| `authRateLimiter` | 20 req/15min on auth endpoints |
| `otpRateLimiter` | 3 req/min on OTP endpoints |
| `authenticate` | JWT Bearer token verification |
| `requireRole(role)` | RBAC enforcement |
| `validate(schema)` | Zod request validation |
| `errorHandler` | Standardised JSON error responses |

---

## 5. Admin Panel

**Port:** 5001  
**Base path:** `/admin-panel/`  
**Framework:** React + Vite + Tailwind CSS + shadcn/ui  
**Login:** `admin@servenow.in` / `Admin@1234`

### 5.1 Pages & Features

| Section | Features |
|---------|----------|
| **Dashboard** | KPI cards (total users, professionals, bookings, revenue), booking status breakdown, recent activity |
| **Users** | List all customers, search/filter, view profile, suspend/activate/delete |
| **Professionals** | List all partners, create/edit profiles, set category + pricing, upload avatar, suspend/activate/delete |
| **Bookings** | Full booking list with filters, status updates, cancellation, delete |
| **Categories** | Add/edit/delete service categories, upload category images |
| **Sub-categories** | Manage sub-categories nested under parent categories |
| **Offers** | Create/edit/delete promotional banners and discount codes |
| **Reels** | Upload/manage short video reels shown in the customer app |
| **Reviews** | View and moderate all customer reviews |
| **Payment Config** | Enable/disable Stripe, Razorpay, Cash, UPI; enter API keys (stored in DB, no restart needed) |
| **Email Config** | Configure SMTP or SendGrid; send test emails |
| **SMS Config** | Configure Fast2SMS provider and API key |

### 5.2 Tech Details
- Custom state-based navigation (no router dependency)
- `@tanstack/react-query` for server state
- Recharts for dashboard graphs
- Axios with Bearer token headers
- All API calls to `VITE_API_URL` (defaults to `http://localhost:8000`)

---

## 6. Customer Web App

**Port:** 5000  
**Framework:** React + Vite + Tailwind CSS  
**Login:** `customer@servenow.in` / `Customer@1234`

### 6.1 Pages & Features

| Page | Features |
|------|----------|
| **Home** | Hero banner, service categories grid, featured professionals, promotional offers, reels feed |
| **Services / Browse** | Search and filter professionals by category, location, price, rating |
| **Professional Profile** | Full profile view, reviews, availability slots, Book Now CTA |
| **Booking Flow** | Date/time slot selection → address input → booking summary → payment |
| **My Bookings** | List of all bookings with status tracking (pending → upcoming → in_progress → completed) |
| **Booking Detail** | Status, professional info, price, payment status, cancel option |
| **Payment** | Cash, UPI, Razorpay, Stripe checkout |
| **Profile** | View/edit personal details, avatar upload |
| **Notifications** | In-app notification list |
| **Points & Rewards** | Balance display, earn history, redeem flow |
| **Favourites** | Saved professionals list |
| **Auth** | Register, login, OTP verification, forgot/reset password |

### 6.2 Tech Details
- SPA with internal state navigation (no URL router)
- Axios HTTP client with JWT Bearer headers
- Auth tokens stored in `localStorage` (`sn_token`, `sn_refresh_token`)
- Fully responsive, mobile-first design

---

## 7. Partner Web App

**Port:** 5002  
**Framework:** React + Vite + Tailwind CSS  
**Login:** `partner@servenow.in` / `Partner@1234`

### 7.1 Pages & Features

| Page | Features |
|------|----------|
| **Login / Register** | Partner authentication, registration with service category selection |
| **Dashboard** | Job overview, today's jobs, quick status summary |
| **Jobs** | Incoming jobs list, accept/reject actions, job status pipeline |
| **Job Detail** | Full booking info, customer details, accept/reject/checkin/complete workflow |
| **Earnings** | Revenue breakdown (daily/weekly/monthly), total earnings |
| **Profile** | Update bio, service area, pricing, avatar |
| **Notifications** | Job alerts and platform messages |

### 7.2 Tech Details
- SPA with `tab` state-based navigation
- Native fetch with Bearer token auth
- Separate API abstraction layer (`lib/api.ts`)

---

## 8. Customer Mobile App (Expo)

**Platform:** iOS + Android  
**Expo URL:** `exp://vc3dwdc-anonymous-8080.exp.direct`  
**SDK:** Expo 54 / React Native 0.81

### 8.1 Screen Structure

```
app/
├── _layout.tsx              Root layout (AuthProvider, QueryClient, SplashScreen)
├── (tabs)/
│   ├── _layout.tsx          Tab navigator
│   ├── index.tsx            Home (categories, offers, reels)
│   ├── services.tsx         Browse & search services
│   ├── bookings.tsx         My bookings list
│   └── profile.tsx          Profile & settings
├── auth.tsx                 Login / Register / OTP
├── booking/
│   ├── [id].tsx             Booking detail + status tracking
│   └── new.tsx              New booking flow
├── professional/
│   └── [id].tsx             Professional profile
├── payment/
│   └── [bookingId].tsx      Payment selection & checkout
├── notifications.tsx        Notification centre
├── points.tsx               Points & rewards
└── favourites.tsx           Saved professionals
```

### 8.2 Features

| Feature | Description |
|---------|-------------|
| **Home Feed** | Category tiles, promotional offers carousel, reels feed (full-screen vertical scroll) |
| **Service Search** | Filter by category, sub-category, location, price range, rating |
| **Booking Flow** | Select professional → pick date/time → enter address → confirm → pay |
| **Booking Tracking** | Real-time status (pending → upcoming → in_progress → completed) |
| **Payments** | Cash, UPI (manual), Razorpay (native WebView checkout), Stripe |
| **Push Notifications** | Booking confirmations, status updates, promotional alerts |
| **Points & Rewards** | Earn points on bookings, view balance, redeem against future bookings |
| **Favourites** | Save and manage favourite professionals |
| **Profile** | Edit personal info, avatar (camera/gallery), view booking history |
| **OTP Auth** | Email/SMS OTP verification on registration |
| **Reels** | TikTok-style short video feed from service professionals |

### 8.3 Native Capabilities

| Capability | Package |
|-----------|---------|
| Push notifications | `expo-notifications` |
| Secure token storage | `expo-secure-store` |
| Image picker | `expo-image-picker` |
| Camera (QR scan) | `expo-camera` |
| Haptic feedback | `expo-haptics` |
| Location | `expo-location` |
| Fonts | `expo-font` |
| Status bar | `expo-status-bar` |

---

## 9. Partner Mobile App (Expo)

**Platform:** iOS + Android  
**Expo URL:** `exp://66pst_a-anonymous-8099.exp.direct`  
**SDK:** Expo 54 / React Native 0.81

### 9.1 Screen Structure

```
app/
├── _layout.tsx              Root layout (AuthProvider, QueryClient, AuthGate)
├── (tabs)/
│   ├── _layout.tsx          Tab navigator
│   ├── index.tsx            Dashboard (status overview, quick actions)
│   ├── jobs.tsx             Jobs list (pending, upcoming, past)
│   ├── earnings.tsx         Earnings overview + charts
│   └── profile.tsx          Account & professional settings
├── auth.tsx                 Login / Partner registration
├── job/
│   └── [id].tsx             Job detail + workflow actions
└── notifications.tsx        Notification centre
```

### 9.2 Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Quick summary of today's jobs, pending actions, status counts |
| **Job Management** | View assigned jobs, accept/reject incoming requests |
| **Job Lifecycle** | Accept → Check-in (QR scan) → Complete workflow |
| **QR Code Check-in** | Scan customer's booking QR code to verify and start job |
| **Earnings Tracking** | Daily, weekly, monthly revenue charts + total earnings |
| **Payout Requests** | Request withdrawal of earned balance |
| **Professional Profile** | Edit bio, service category, base price, avatar |
| **Push Notifications** | Real-time job assignment alerts |
| **Auth** | Secure login with JWT + automatic token refresh |

### 9.3 Native Capabilities

| Capability | Package |
|-----------|---------|
| Camera (QR scan) | `expo-camera` |
| Haptic feedback | `expo-haptics` |
| Secure token storage | `expo-secure-store` |
| Push notifications | `expo-notifications` |
| Image picker (avatar) | `expo-image-picker` |

---

## 10. Database Schema

All tables managed by **Drizzle ORM** with PostgreSQL (Supabase).

### Core Tables

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `users` | `id`, `email`, `password_hash`, `full_name`, `phone`, `role` (customer/partner/admin), `push_token`, `is_active`, `email_verified` | All user accounts |
| `professionals` | `id`, `user_id`, `category_id`, `bio`, `base_price`, `rating`, `total_reviews`, `avatar_url`, `is_active` | Partner profiles |
| `service_categories` | `id`, `name`, `description`, `image_url`, `featured`, `sort_order` | Service taxonomy (top level) |
| `sub_service_categories` | `id`, `category_id`, `name`, `description`, `image_url` | Service sub-categories |
| `bookings` | `id`, `customer_id`, `professional_id`, `category_id`, `service_name`, `status`, `price`, `scheduled_at`, `address` | Booking records |
| `payments` | `id`, `booking_id`, `customer_id`, `amount`, `currency`, `status` (created/paid/failed), `method` (cash/upi_manual/razorpay/stripe), `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `stripe_session_id`, `stripe_payment_intent_id` | Payment records |
| `reviews` | `id`, `booking_id`, `customer_id`, `professional_id`, `rating`, `comment` | Customer reviews |
| `favorites` | `id`, `customer_id`, `professional_id` | Saved professionals |
| `notifications` | `id`, `user_id`, `title`, `body`, `type`, `read`, `data` | In-app notifications |
| `offers` | `id`, `title`, `description`, `discount_percent`, `code`, `image_url`, `valid_until` | Promotional offers |
| `reels` | `id`, `title`, `description`, `video_url`, `thumbnail_url`, `professional_id` | Short video reels |
| `points_ledger` | `id`, `user_id`, `amount`, `type` (earn/redeem), `booking_id`, `description` | Loyalty points history |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at` | Auth refresh token store |
| `otp_codes` | `id`, `user_id`, `code_hash`, `type`, `expires_at`, `used_at` | OTP verification |
| `platform_settings` | `key` (payment_config/email_config/sms_config), `value` (JSON) | Global platform config |

---

## 11. Authentication & Security

### Flow
1. User registers → OTP sent to email/phone
2. User verifies OTP → account activated
3. Login → receives `accessToken` (15 min) + `refreshToken` (7 days, stored in DB)
4. All protected requests use `Authorization: Bearer <accessToken>`
5. On 401, clients automatically call `/api/auth/refresh` with the refresh token
6. Logout revokes the refresh token (stored hash blacklisted in DB)

### Security Measures
- Passwords hashed with **bcrypt**
- JWT signed with `JWT_SECRET` and `JWT_REFRESH_SECRET` (separate secrets)
- Refresh tokens stored as **SHA-256 hashes** (never raw in DB)
- Rate limiting on all auth, OTP, and general API routes
- Zod schema validation on all request bodies
- Helmet.js for secure HTTP headers
- RBAC — `requireRole('admin'|'partner'|'customer')` middleware
- Raw body captured for Stripe + Razorpay webhook HMAC verification

---

## 12. Payment Integrations

Payment gateway configuration is stored in the **database** (`platform_settings` key: `payment_config`), not in environment variables. Keys can be updated live from the Admin Panel → Payment Config without restarting the server.

### Supported Methods

| Method | Type | Notes |
|--------|------|-------|
| **Cash** | Offline | Partner collects at door |
| **UPI** | Manual | Customer pays to configured VPA |
| **Razorpay** | Online gateway | Native WebView checkout |
| **Stripe** | Online gateway | Hosted checkout session |

### Razorpay Flow
1. `POST /api/bookings/:id/razorpay/create-order` → creates Razorpay order
2. Mobile WebView loads `GET /api/payments/razorpay/checkout` (HTML page with checkout.js)
3. Customer pays → Razorpay posts to `POST /api/payments/razorpay/callback`
4. Server verifies HMAC-SHA256 signature → marks payment `paid`
5. Redirect to `servenow://payment-success` deep link
6. Async: `POST /api/payments/razorpay/webhook` handles `payment.captured` event

### Stripe Flow
1. `POST /api/bookings/:id/stripe/create-session` → creates hosted checkout session
2. User redirected to Stripe's hosted checkout page
3. On success, Stripe redirects to `GET /api/payments/stripe/success` → verified and saved
4. Redirect to `servenow://payment-success` deep link
5. Async: `POST /api/payments/stripe/webhook` handles `checkout.session.completed`

---

## 13. File Storage

All media stored in **Supabase Storage** buckets.

| Bucket | Contents | Used By |
|--------|----------|---------|
| `avatars` | User and professional profile photos | All apps |
| `categories` | Service category images | Admin + Customer |
| `reels` | Short-form video files | Admin + Customer mobile |
| `banners` | Promotional offer images | Admin + Customer |

- **Upload:** Multer handles multipart/form-data on the server
- **Security:** Magic-byte file type detection (SVG, PNG, WebP, JPEG, MP4)
- **Auto-bucket creation:** `ensureAvatarBucket()` runs on server startup

---

## 14. Push Notifications

- **Provider:** Expo Notifications Service
- **Registration:** Device push token saved via `PATCH /api/profile/me/push-token`
- **Triggers:** Booking confirmation, status changes (accepted/checked-in/completed), new job assignments (partners), promotional alerts

---

## 15. Running the Project

### Prerequisites
- Node.js 20+
- pnpm 10+
- Supabase project (PostgreSQL database)

### Required Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Supabase project REST URL (`https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (min 16 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (min 16 chars) |
| `NGROK_AUTHTOKEN` | ngrok auth token (Customer Expo tunnel) |
| `NGROK_AUTHTOKEN_2` | ngrok auth token (Partner Expo tunnel) |

### Payment keys (set via Admin Panel, not env vars)
- Stripe: publishable key + secret key + webhook secret
- Razorpay: key ID + key secret + webhook secret

### Commands

```bash
# Install all dependencies
pnpm install

# Push database schema
pnpm db:push

# Start server + customer web (main workflow)
pnpm dev

# Start admin panel
pnpm --filter @servenow/admin-web dev          # port 5001

# Start partner web
pnpm --filter @servenow/partner-web dev        # port 5002

# Start customer Expo app
cd apps/mobile && pnpm exec expo start         # port 8080

# Start partner Expo app
cd apps/mobile-partner && pnpm exec expo start # port 8099

# QR code page (both Expo apps)
# Visit /qr on the running server
```

---

## 16. Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@servenow.in` | `Admin@1234` |
| Customer | `customer@servenow.in` | `Customer@1234` |
| Partner | `partner@servenow.in` | `Partner@1234` |

> Seed script: `server/src/database/seed-test-accounts.ts`

---

*Generated July 2026 — ServeNow Monorepo*
