# Admin Web Module

## Purpose

Provide administrative and operations tooling for managing the marketplace.

## Responsibilities

Stats/analytics, user and partner management, catalog management, booking/order
operations, dispatch, payments/refunds, offers, documents, support, policies,
settings, and audit visibility.

## User Roles

Admin and permitted operations-manager views; backend role checks are
authoritative.

## Screens / Pages

The main surface is in `apps/admin-web/src/app/App.tsx`; document verification
has a dedicated `DocumentVerification.tsx` component.

## Components

React application components, Recharts analytics, Lucide icons, XLSX export/
processing dependencies, and local styles.

## Services

`apps/admin-web/src/lib/api.ts`.

## APIs

Primarily `/api/admin`, `/api/operations/dispatch`, plus catalog/payment/support
routes.

## Database Tables

Indirectly accesses users, professionals, bookings/orders, catalog, payments,
payouts, audit logs, support tickets, policies, and settings.

## Business Rules

Catalog products are centrally managed. Administrative mutations should be
audited where the backend creates audit records.

## Dependencies

React, Vite, Axios, Recharts, XLSX, and the backend.

## Important Source Files

- `apps/admin-web/src/main.tsx`
- `apps/admin-web/src/app/App.tsx`
- `apps/admin-web/src/app/DocumentVerification.tsx`
- `apps/admin-web/src/lib/api.ts`

## Data Flow

Admin action → API route/role check → service/database → refreshed admin state.

## Current Behavior

The UI contains dashboard, management, dispatch, booking history, and
operational surfaces. Sidebar navigation is hash-addressable and supports
browser back/forward. The Booking Operations Centre loads and refreshes its
unified dispatch queue independently, polling while open. It combines legacy
booking rows with itemized service-order jobs and labels their source. It
supports matching booking/order detail views, eligible partner lookup,
assignment, stop-searching, restart-dispatch, and source-appropriate
cancellation controls for both models, plus shared filtering, sorting, column
visibility, and export. Booking History provides server-side search,
date/status filtering, detail, payment controls, pagination, export, and
refresh.

Account Settings displays immutable username and routes email/phone changes
through OTP verification. Admin-managed customer and staff forms preserve
contact editing through the role-protected identity request/verify endpoints.

Booking Settings configures cancellation policy separately for partner
acceptance and check-in. Each stage has a percentage rate plus minimum and
maximum rupee fees. The API and customer clients apply the same bounded formula
and cap the result at the service amount.

## Known Issues

The unified Operations Centre provides item-level assignment, stop-searching,
restart-dispatch, and unpaid cancellation for service-order rows. Provider-backed
refund remains on the Service Orders refund path. The Operations Centre is a
unified operational queue, not a destructive database merge; both legacy and
itemized models must remain distinguishable.

## Important Constraints

Never rely on UI-only role hiding; backend authorization must remain intact.

## Related Modules

Backend, catalog, dispatch, payments, payouts, and support.

## Related Workflows

Partner dispatch, refund/payment operations, catalog management, and payout.

## Related Documentation

[`../06-API.md`](../06-API.md), [`../business-rules/dispatch-partner.md`](../business-rules/dispatch-partner.md)
