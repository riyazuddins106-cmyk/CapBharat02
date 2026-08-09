# Backend Module

## Purpose

Own the HTTP API, authentication, business services, persistence, integrations,
startup migrations, and production static serving.

## Responsibilities

- Route requests and validate input
- Authenticate and authorize users
- Coordinate catalog, booking/order, dispatch, payment, payout, account,
  notification, support, and admin operations
- Persist data with Drizzle/PostgreSQL
- Receive payment webhooks and serve uploaded/static content

## User Roles

All roles; access is route-specific.

## Screens / Pages

No UI. It serves API responses and production web assets.

## Components

Routes, controllers, validators, middleware, services, repositories, schema,
config, and utilities.

## Services

See `server/src/services/`. Important services include auth, booking, dispatch,
order dispatch, partner, points, notifications, storage, payments/payouts,
support, reviews, audit logs, email, and SMS.

## APIs

All `/api` groups in [`../06-API.md`](../06-API.md).

## Database Tables

All models in [`../04-DATABASE.md`](../04-DATABASE.md).

## Business Rules

Dispatch-based partner matching, role protection, payment status, loyalty,
and order/item status rules.

## Dependencies

Express, Drizzle, PostgreSQL, Supabase, JWT, Zod, payment SDKs, and upload/
notification providers.

## Important Source Files

- `server/src/index.ts`
- `server/src/app.ts`
- `server/src/routes/index.ts`
- `server/src/controllers/`
- `server/src/services/`
- `server/src/database/schema/`

## Data Flow

HTTP → middleware → controller/service → Drizzle/external provider → response.

## Current Behavior

Startup runs migrations and starts the payout scheduler before normal operation.

## Known Issues

Exact test-runner and deployment observability are `UNKNOWN — REQUIRES VERIFICATION`.

## Important Constraints

Do not bypass validators, auth middleware, role middleware, or centralized error
handling.

## Related Modules

All application modules consume this backend.

## Related Workflows

Registration, booking/order, dispatch, payment, and payout workflows.

## Related Documentation

[`01-ARCHITECTURE.md`](../01-ARCHITECTURE.md), [`06-API.md`](../06-API.md)
