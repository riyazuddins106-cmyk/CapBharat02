# Authentication Module

## Purpose

Manage registration, OTP verification, login, JWT issuance/refresh, logout,
password reset, and role identity.

## Responsibilities

Validate auth requests, hash/compare passwords, issue tokens, persist refresh
tokens, create/verify OTP records, and send recovery/verification messages.

## User Roles

Customer, partner, admin, operations manager.

## APIs

`/api/auth/*`, protected profile password routes, and auth middleware.

## Database Tables

`users`, `refresh_tokens`, `otp_codes`.

## Business Rules

Access requests require a Bearer access token; roles come from the verified JWT.
Password and token secrets are environment-provided and never stored in docs.

## Important Source Files

- `server/src/routes/auth.routes.ts`
- `server/src/controllers/auth.controller.ts`
- `server/src/services/auth.service.ts`
- `server/src/services/otp.service.ts`
- `server/src/middleware/authenticate.ts`
- `server/src/middleware/requireRole.ts`
- `server/src/utils/jwt.ts`

## Related Workflows

[`../workflows/registration-login.md`](../workflows/registration-login.md)
