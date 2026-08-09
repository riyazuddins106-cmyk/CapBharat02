# CURRENT PROJECT STATE

## Last Updated

2026-08-09

## Project Status

Existing multi-application ServeNow marketplace imported from GitHub. The
repository contains Customer Web, Admin Web, Partner Web, Customer Mobile,
Partner Mobile, and a shared Express API.

## Completed Features

Verified source areas include authentication, catalog, bookings, itemized
orders, dispatch, partner jobs, payments, payouts, profiles, addresses,
notifications, points, reviews, offers, reels, support, policies, settings,
audit logs, and uploads.

## Features In Progress

No active implementation task was verified in source. Legacy booking and newer
order/item flows coexist; parity and exact production migration state require
future verification.

## Known Issues

- No configured test-runner command was verified.
- No lint command/configuration was verified.
- Exact production webhook registration and external provider setup are unknown.
- Exact UI parity between legacy booking and itemized order paths is unknown.

## Recently Changed

Initial documentation generated from the current repository. No application
code was changed by this documentation task.

## Important Architecture Decisions

- One Express backend serves all clients.
- PostgreSQL access uses Drizzle and Supabase.
- JWT access/refresh authentication is shared across clients.
- Legacy bookings coexist with itemized orders.
- Partner assignment is dispatch-driven rather than customer-selected.

## Important Business Rules

See [`../business-rules/`](../business-rules/), especially booking, dispatch,
payment, and auth access rules.

## Current Database State

Schema definitions and migrations exist under `server/src/database/`. Whether
the connected production database exactly matches the repository schema is
`UNKNOWN — REQUIRES VERIFICATION`.

## Current API State

API route groups are mounted below `/api`; see [`../06-API.md`](../06-API.md).

## Current Deployment State

Replit workflows and autoscale build/run configuration exist in `.replit`.
Whether a production deployment is currently active is
`UNKNOWN — REQUIRES VERIFICATION`.

## Technical Debt

The coexistence of legacy bookings and itemized orders requires careful choice
of source paths during future work. Test/lint automation is not verified.

## Pending Work

No task was added by this documentation-only operation. Product changes must be
requested separately.

## Documentation Status

Core architecture, stack, structure, database, auth, API groups, environment
names, deployment, integrations, modules, workflows, business rules, and AI
maintenance files are documented. Exact endpoint field schemas, complete UI
route inventories, production provider configuration, and test execution
commands remain areas for targeted verification.
