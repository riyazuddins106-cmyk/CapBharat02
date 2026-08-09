# Registration and Login Workflow

## Trigger

A user submits registration, login, OTP, refresh, logout, or password recovery
from a web or mobile client.

## Preconditions

The request passes the route validator and auth rate limiter. Registration
requires unique account data.

## Step-by-step flow

1. Auth route validates the request.
2. Auth service creates/loads the user and handles password/OTP logic.
3. Signup OTP is verified through `/verify-otp`.
4. Login issues access and refresh tokens.
5. Refresh validates the persisted refresh token and issues a new access path.
6. Logout revokes the supplied refresh token; logout-all revokes sessions for
   the authenticated user.

## API Calls

`/api/auth/register`, `/register-partner`, `/verify-otp`, `/resend-otp`,
`/login`, `/refresh`, `/logout`, `/logout-all`, `/forgot-password`,
`/reset-password`.

## Database Changes

`users`, `otp_codes`, and `refresh_tokens` as applicable.

## Notifications

OTP/recovery delivery uses configured email/SMS services.

## Business Rules

Bearer access tokens are required for protected routes; role middleware is
checked after authentication.

## Final State

The user has an authenticated access token or a completed/revoked auth flow.

## Error Scenarios

Invalid input, duplicate account, invalid/expired OTP, invalid credentials,
invalid/expired refresh token, and rate limiting.

## Related Source Files

`server/src/routes/auth.routes.ts`,
`server/src/controllers/auth.controller.ts`,
`server/src/services/auth.service.ts`.
