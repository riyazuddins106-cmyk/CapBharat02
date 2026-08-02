# ServeNow — Master AI Memory Index

> **For AI sessions:** Read this file first. Use it as the project index. Do NOT scan the entire repository. Update `.ai-memory/` after completing changes.

## Project Overview

ServeNow is an Urban Clap-style on-demand service marketplace. Customers book home services (cleaning, plumbing, laundry, etc.); trained partners (professionals) are dispatched to fulfill them. An admin panel manages the catalog, partners, and platform settings.

**Stack:** Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL (Supabase) | React 18 + Vite + Tailwind | React Native + Expo SDK 54

---

## Module Index

| Module | Purpose | Documentation |
|---|---|---|
| Authentication | JWT + OTP login/signup for all user types | [→ modules/auth/](modules/auth/) |
| Booking | Customer booking lifecycle (create → assign → complete) | [→ modules/booking/](modules/booking/) |
| Dispatch | Auto-assign available partner to a booking | [→ modules/dispatch/](modules/dispatch/) |
| Payment | Razorpay/test-mode payment + wallet | [→ modules/payment/](modules/payment/) |
| Services & Categories | Admin-managed service catalog with sub-categories | [→ modules/services/](modules/services/) |
| Customer App (mobile) | Expo Router app for customers | [→ modules/customer-mobile/](modules/customer-mobile/) |
| Partner App (mobile) | Expo Router app for service partners | [→ modules/partner-mobile/](modules/partner-mobile/) |
| Admin Panel | Web dashboard for platform management | [→ modules/admin/](modules/admin/) |
| Customer Web | Web portal for customers | [→ modules/customer-web/](modules/customer-web/) |
| Partner Web | Web portal for partners | [→ modules/partner-web/](modules/partner-web/) |
| Notifications | Push notifications via Expo Server SDK | [→ modules/notifications/](modules/notifications/) |
| Points & Rewards | Loyalty points earn/redeem (1pt/₹10 earn, 1pt=₹1 redeem) | [→ modules/points/](modules/points/) |
| Profile & Users | User profiles, addresses, documents | [→ modules/profile/](modules/profile/) |
| Reviews | Customer reviews on completed bookings | [→ modules/reviews/](modules/reviews/) |
| Reels | Short video content linked to services | [→ modules/reels/](modules/reels/) |
| Support Tickets | Customer support ticket flow | [→ modules/support/](modules/support/) |
| Offers | Promo codes and discount offers | [→ modules/offers/](modules/offers/) |

---

## Key Entry Points

| What | Path |
|---|---|
| API server entry | `server/src/index.ts` |
| Express app config | `server/src/app.ts` |
| All API routes | `server/src/routes/index.ts` |
| Database schema | `server/src/database/schema/` |
| Customer web entry | `apps/customer-web/src/app/App.tsx` |
| Admin web entry | `apps/admin-web/src/app/App.tsx` |
| Partner web entry | `apps/partner-web/src/app/App.tsx` |
| Customer mobile entry | `apps/mobile/app/` (Expo Router) |
| Partner mobile entry | `apps/mobile-partner/app/` (Expo Router) |

---

## Ports

| Service | Port |
|---|---|
| API Server | 8000 |
| Customer Web | 5000 |
| Admin Web | 5001 |
| Partner Web | 5002 (approx) |
| Customer Mobile (Metro) | 8081 |
| Partner Mobile (Metro) | 8082 |

---

## Architecture Reference

→ [ARCHITECTURE.md](ARCHITECTURE.md)

## All Modules Reference

→ [MODULES.md](MODULES.md)

## Current Project Status

→ [CURRENT_STATUS.md](CURRENT_STATUS.md)

## Change Log

→ [CHANGE_LOG.md](CHANGE_LOG.md)
