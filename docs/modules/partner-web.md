# Partner Web Module

## Purpose

Provide browser tools for partners to view work and manage availability.

## Responsibilities

Display partner jobs, job state actions, availability, and supporting QR
workflow where implemented.

## User Roles

Partner; admin access is controlled by backend routes.

## Screens / Pages

The main surface is `apps/partner-web/src/app/App.tsx`.

## Components

`apps/partner-web/src/components/QRScannerModal.tsx` plus local React/CSS
components.

## Services

`apps/partner-web/src/lib/api.ts`.

## APIs

Partner profile, availability, jobs, order-item jobs, and payment confirmation
routes.

## Database Tables

Indirectly uses professionals, partner_services, bookings/orders, requests,
evidence, payouts, and notifications.

## Business Rules

Partners accept dispatched work; they do not create catalog pricing.

## Dependencies

React, Vite, Lucide, jsQR, and backend APIs.

## Important Source Files

- `apps/partner-web/src/main.tsx`
- `apps/partner-web/src/app/App.tsx`
- `apps/partner-web/src/components/QRScannerModal.tsx`
- `apps/partner-web/src/lib/api.ts`

## Data Flow

Partner UI → API → job/availability state → UI refresh.

## Current Behavior

Supports partner job and availability operations.

## Known Issues

Exact web route/state inventory is `UNKNOWN — REQUIRES VERIFICATION`.

## Important Constraints

Use partner API routes and preserve server-side role checks.

## Related Modules

Partner mobile, dispatch, orders, payouts, documents.

## Related Workflows

Partner dispatch and service completion.

## Related Documentation

[`../workflows/partner-dispatch-service.md`](../workflows/partner-dispatch-service.md)
