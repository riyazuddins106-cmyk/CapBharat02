---
name: No-professional booking model
description: ServeNow is a dispatch-based platform — customers book services, not specific professionals. Covers what was removed, what stays, and terminology.
---

## Rule
Customers pick a **service** (from the catalog); the platform auto-dispatches an available partner. There is no browse-professionals, pick-a-professional, or favorites flow.

**Why:** Product decision — the platform is a service marketplace, not a gig-worker directory. Removing professional selection simplifies the booking funnel and avoids customers bypassing dispatch.

## What was removed
- `GET /professionals` and `GET /professionals/:id` public routes (entire professional controller/service/route files deleted).
- `GET /favorites`, `POST /favorites`, `DELETE /favorites` routes (`/favorites` removed from `server/src/routes/index.ts`).
- `professionalsApi` and `favoritesApi` from both `apps/customer-web/src/lib/api.ts` and `apps/mobile/lib/api.ts`.
- ProCard component, professionals browse UI, and BookingModal from `CustomerApp.tsx`.
- Mobile professional detail screen (`apps/mobile/app/professional/[id].tsx`) and `ProCard.tsx` component.

## What stays
- `professional.repository.ts` — still required internally by partner auth, booking, review, and dispatch services.
- `favorite.routes.ts` file still exists on disk (not deleted) but is no longer registered on the router.

## Booking validator
- `professionalId` in `createBookingSchema` is now **optional** (was required).
- The correct booking path is `POST /api/bookings/checkout` (cart-based, no professionalId).
- Legacy `POST /api/bookings` (direct create) still accepts an optional professionalId for backwards compat but returns a 400 guiding to cart checkout when professionalId is absent.

## UI terminology
- Customer-facing text uses **"service provider"** instead of "professional" everywhere.
  - "Finding your professional" → "Finding your service provider"
  - "Pay the professional in cash" → "Pay on delivery in cash"
  - "Searching for professional…" → "Matching a service provider…"
  - "Bookings waiting for a professional" → "Bookings being matched to a provider"
- If the user wants a different term (partner, expert, technician), do a project-wide find-and-replace on "service provider" in customer-facing files only.
