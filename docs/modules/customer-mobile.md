# Customer Mobile Module

## Purpose

Provide the Expo Router customer application for mobile browsing, booking,
payments, account, notifications, and support.

## Responsibilities

Mobile navigation, auth context, API/query state, local storage, push-token
registration, catalog drill-down, cart/checkout, bookings, rewards, wishlist,
and support screens.

## User Roles

Customer.

## Screens / Pages

Verified route areas include auth, tabs for home/services/bookings/profile,
addresses, checkout, notifications, points, privacy/security, help/support,
wishlist, service detail, and subcategories.

## Components and services

Components are under `apps/mobile/components/`; auth and shared state are under
`context/`, `hooks/`, and `lib/`. Query and storage helpers are present.

## APIs

Customer auth, catalog, cart, order/booking, payment, profile, notification,
points, address, wishlist, and support APIs.

## Database Tables

Indirect through the API.

## Important Source Files

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(tabs)/`
- `apps/mobile/app/checkout.tsx`
- `apps/mobile/app/service/[id].tsx`
- `apps/mobile/context/AuthContext.tsx`
- `apps/mobile/lib/api.ts`
- `apps/mobile/lib/queryClient.ts`
- `apps/mobile/lib/pushNotifications.ts`

## Current Behavior

The mobile app contains customer auth, catalog, booking/checkout, account,
notification, rewards, and support surfaces.

## Known Issues

Exact device payment and per-service order-detail behavior is
`UNKNOWN — REQUIRES VERIFICATION`.

## Important Constraints

Keep Expo/Metro compatibility and use the shared API contract rather than
direct database access.

## Related Modules

Customer Web, catalog, orders, payments, notifications, auth.

## Related Workflows

Registration, booking/order, payment, notifications.
