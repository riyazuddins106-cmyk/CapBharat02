# ServeNow — Module Reference

## Authentication
- **Purpose:** JWT-based login/signup + OTP email verification for customers, partners, and admins
- **Location:** `server/src/controllers/auth.controller.ts`, `server/src/routes/auth.ts`
- **Key files:** `server/src/middleware/auth.middleware.ts`, `server/src/utils/jwt.ts`, `server/src/database/schema/refreshTokens.ts`
- **Related:** Profile, Notifications (push token registration on login)

## Customer App (Mobile)
- **Purpose:** End-to-end customer experience — browse services, book, pay, track, review
- **Location:** `apps/mobile/`
- **Key files:** `apps/mobile/app/(tabs)/index.tsx` (Home), `apps/mobile/app/checkout.tsx`, `apps/mobile/app/auth.tsx`
- **Related:** Booking, Payment, Services, Reviews, Points

## Partner App (Mobile)
- **Purpose:** Partner experience — receive job requests, accept/reject, mark complete, upload docs
- **Location:** `apps/mobile-partner/`
- **Key files:** `apps/mobile-partner/app/(tabs)/index.tsx` (Dashboard), `apps/mobile-partner/app/job/`, `apps/mobile-partner/app/documents.tsx`
- **Related:** Booking, Dispatch, Documents, Earnings

## Admin Panel
- **Purpose:** Platform management — services catalog, partner verification, bookings, settings
- **Location:** `apps/admin-web/`
- **Key files:** `apps/admin-web/src/app/App.tsx`, `apps/admin-web/src/app/DocumentVerification.tsx`, `apps/admin-web/src/lib/api.ts`
- **Related:** Services, Categories, Partners, Bookings, Offers

## Customer Web
- **Purpose:** Web portal for customers to browse and book services
- **Location:** `apps/customer-web/`
- **Key files:** `apps/customer-web/src/app/App.tsx`, `apps/customer-web/src/app/CustomerApp.tsx`
- **Related:** Booking, Services, Payment, Profile

## Partner Web
- **Purpose:** Web portal for partners to manage their profile and jobs
- **Location:** `apps/partner-web/`
- **Key files:** `apps/partner-web/src/app/App.tsx`, `apps/partner-web/src/lib/`
- **Related:** Booking, Documents, Profile

## Services & Categories
- **Purpose:** Admin-managed catalog of services and categories (with sub-categories and images)
- **Location:** `server/src/controllers/service.controller.ts`, `server/src/controllers/category.controller.ts`, `server/src/controllers/subCategory.controller.ts`
- **Key files:** `server/src/database/schema/services.ts`, `server/src/database/schema/serviceCategories.ts`
- **Related:** Booking, Admin Panel, Reels

## Booking
- **Purpose:** Full booking lifecycle: create → dispatch → in-progress → complete → review
- **Location:** `server/src/controllers/booking.controller.ts`, `server/src/services/booking.service.ts`, `server/src/repositories/booking.repository.ts`
- **Key files:** `server/src/database/schema/bookings.ts`, `server/src/database/schema/bookingItems.ts`
- **Related:** Dispatch, Payment, Reviews, Notifications, Points

## Dispatch
- **Purpose:** Automatically assign an available, skill-matched partner to a new booking
- **Location:** `server/src/controllers/dispatch.controller.ts`, `server/src/services/dispatch.service.ts`
- **Key files:** `server/src/routes/dispatch.ts`
- **Related:** Booking, Partner (availability status), Notifications

## Payment
- **Purpose:** Payment processing (Razorpay integration + test-mode bypass), wallet/points redemption
- **Location:** `server/src/controllers/payment.controller.ts`, `server/src/routes/payment.ts`
- **Key files:** `server/src/database/schema/payments.ts`
- **Related:** Booking, Points, Cart

## Notifications
- **Purpose:** Push notifications to mobile apps via Expo Server SDK
- **Location:** `server/src/controllers/notification.controller.ts`, `server/src/services/notification.service.ts`
- **Key files:** `server/src/database/schema/notifications.ts`
- **Related:** Booking, Dispatch

## Points & Rewards
- **Purpose:** Loyalty points — earn on spend (1pt per ₹10), redeem at checkout (1pt = ₹1), min 100pts to redeem
- **Location:** `server/src/controllers/points.controller.ts`, `server/src/routes/points.ts`
- **Key files:** `server/src/database/schema/pointsLedger.ts`
- **Related:** Payment, Booking

## Profile & Users
- **Purpose:** User profiles, saved addresses, document uploads (partners)
- **Location:** `server/src/controllers/profile.controller.ts`, `server/src/controllers/address.controller.ts`, `server/src/controllers/document.controller.ts`
- **Key files:** `server/src/database/schema/users.ts`, `server/src/database/schema/professionals.ts`
- **Related:** Auth, Booking, Partner verification

## Reviews
- **Purpose:** Customers leave reviews on completed bookings; ratings aggregate on partner profiles
- **Location:** `server/src/controllers/review.controller.ts`, `server/src/routes/review.ts`
- **Key files:** `server/src/database/schema/reviews.ts`
- **Related:** Booking, Partner

## Reels
- **Purpose:** Short video content linked to services (like Instagram Reels for service discovery)
- **Location:** `server/src/controllers/reel.controller.ts`, `server/src/routes/reel.ts`
- **Key files:** `server/src/database/schema/reels.ts`
- **Related:** Services, Supabase Storage

## Support Tickets
- **Purpose:** Customers open support tickets; admins resolve them
- **Location:** `server/src/controllers/supportTicket.controller.ts`, `server/src/routes/supportTicket.ts`
- **Key files:** `server/src/database/schema/supportTickets.ts`
- **Related:** Admin Panel, Profile

## Offers
- **Purpose:** Promo codes and discount offers applied at checkout
- **Location:** `server/src/controllers/offer.controller.ts`, `server/src/routes/offer.ts`
- **Key files:** `server/src/database/schema/offers.ts`
- **Related:** Payment, Booking, Cart

## Cart
- **Purpose:** Temporary service cart before booking checkout
- **Location:** `server/src/controllers/cart.controller.ts`, `server/src/routes/cart.ts`
- **Related:** Booking, Services, Payment

## Favorites / Wishlist
- **Purpose:** Customers save favorite services and partners
- **Location:** `server/src/controllers/favorite.controller.ts`, `server/src/controllers/wishlist.controller.ts`
- **Related:** Services, Professional (partner profiles)

## Shared Package
- **Purpose:** Shared TypeScript types and constants used across all apps
- **Location:** `packages/shared/src/`
- **Key files:** `packages/shared/src/types/user.ts`, `packages/shared/src/constants/timeSlots.ts`
