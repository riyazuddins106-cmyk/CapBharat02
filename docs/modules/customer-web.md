# Customer Web Module

## Purpose

Provide the browser customer experience for catalog browsing, checkout,
bookings, account management, engagement, and support.

## Responsibilities

Render customer routes, call the API, manage client auth/session state, and
present catalog, order/booking, payment, notification, and profile data.

## User Roles

Customer-facing; backend authorization remains authoritative.

## Screens / Pages

The application surface is composed in `apps/customer-web/src/app/App.tsx` and
`CustomerApp.tsx`. Exact route inventory is `UNKNOWN — REQUIRES VERIFICATION`.

## Components

Local app components plus declared Radix UI, Material UI, and shared styling
dependencies.

## Services

`apps/customer-web/src/lib/api.ts` is the client API helper.

## APIs

Catalog, auth, bookings/orders, cart, addresses, profile, points, reviews,
notifications, wishlist, offers, reels, and support.

## Database Tables

Consumed indirectly through the API.

## Business Rules

Customers select centrally managed services; partner selection is handled by
dispatch.

## Dependencies

React, Vite, Customer Web styles, `@servenow/shared`, and the backend API.

## Important Source Files

- `apps/customer-web/src/main.tsx`
- `apps/customer-web/src/app/App.tsx`
- `apps/customer-web/src/app/CustomerApp.tsx`
- `apps/customer-web/src/lib/api.ts`
- `apps/customer-web/src/styles/`

## Data Flow

Browser state → `lib/api.ts` → Express API → rendered customer state.

## Current Behavior

Profile and account forms display the immutable username. Full name remains
directly editable; email and phone changes require a target-specific OTP
request and verification before saving.

Customer Web supports catalog browsing and customer account/booking surfaces.
Visible booking and order state refreshes every 10 seconds and on browser
focus/visibility return.

## Known Issues

Per-service order-detail and dynamic time-slot completeness require verification
against the current UI implementation.

## Important Constraints

Do not add direct database access to the web app; use the API contract.

## Related Modules

Catalog, booking/orders, payments, notifications, and authentication.

## Related Workflows

Registration, booking/order, payment, and review.

## Related Documentation

[`../workflows/booking-order-lifecycle.md`](../workflows/booking-order-lifecycle.md)
