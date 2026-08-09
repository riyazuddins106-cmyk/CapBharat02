# Architecture Decisions

## Decision: One shared Express backend

Date: Existing implementation

Problem: Multiple web and mobile clients need a common source of business and
authorization behavior.

Decision: Serve clients through one TypeScript/Express API.

Reason: Routes, services, validation, auth, database access, and integrations
are centralized under `server/src`.

Alternatives: Separate API per client — not present in the repository.

Impact: Backend changes can affect all five client applications.

Affected Modules: Backend, all web/mobile apps.

Source Files: `server/src/index.ts`, `server/src/app.ts`, `server/src/routes/index.ts`.

## Decision: Dispatch chooses partners

Date: Existing implementation

Problem: Customer booking should not require selecting an individual provider.

Decision: Customers request services; the platform dispatches eligible partners,
with administrative assignment paths.

Reason: Booking/order and dispatch services model partner requests and
availability rather than customer-selected provider workflows.

Alternatives: Customer-selected provider — not the current model.

Impact: Client booking flows must not add a required professional selector.

Affected Modules: Booking, orders, partner, dispatch.

Source Files: `server/src/services/dispatch.service.ts`,
`server/src/services/orderDispatch.service.ts`.

## Decision: Legacy and itemized order models coexist

Date: Existing implementation

Problem: Existing booking behavior and newer multi-service order behavior both
need to remain available.

Decision: Keep `bookings`/`booking_items` while adding `orders`/`order_items`.

Reason: Both schema and route/controller implementations are present.

Alternatives: Immediate replacement of bookings — not verified.

Impact: Future changes must identify which model a workflow uses.

Affected Modules: Booking, orders, payments, partner jobs, admin history.

Source Files: `server/src/database/schema/bookings.ts`,
`server/src/database/schema/orders.ts`.
