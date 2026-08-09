# Authentication and Authorization

## Registration and OTP

`POST /api/auth/register` creates a customer registration flow.
`POST /api/auth/register-partner` creates the partner registration flow.
OTP verification and resend are handled by `/verify-otp` and `/resend-otp`.
The auth service persists OTP records and uses the configured email/SMS path
when available. Development responses may include a development code; the
controller strips `devCode` in production.

Exact OTP expiry and attempt limits are defined in
`server/src/services/otp.service.ts` and are not duplicated here.

## Login, access tokens, and refresh tokens

`POST /api/auth/login` returns the auth service's token response. Protected
requests must send `Authorization: Bearer <access-token>`.
`server/src/middleware/authenticate.ts` verifies the access token and attaches
`userId`, `email`, and `role` to `req.user`.

Refresh and revocation routes:

- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`

Refresh-token persistence is represented by `refresh_tokens`. JWT signing
configuration uses `JWT_SECRET` and `JWT_REFRESH_SECRET`; actual values are
never documented.

## Password handling

Passwords are stored as hashes in `users.password_hash` using the auth service's
bcrypt implementation. Password recovery uses:

- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Authenticated users can change their password through
`PATCH /api/profile/me/change-password`.

## Roles

`requireRole(...roles)` must run after `authenticate`. It checks the role
embedded in the access token and returns forbidden when it is not allowed.

| Surface | Verified access |
|---|---|
| Customer cart, profile, addresses, points, and personal data | Authenticated customer-oriented routes |
| Partner jobs, availability, documents, earnings, and payouts | `partner` or `admin` where configured |
| Admin operations and management | `admin`; selected operational routes also allow `operations_manager` |
| Public catalog, reels, policies, payment config, health | Public or optional-auth routes as declared |

The exact route-level matrix is in [`06-API.md`](06-API.md) and source route
files. Token/session storage behavior differs between web and mobile client
helpers and is `UNKNOWN — REQUIRES VERIFICATION` where not needed for backend
behavior.

## Security layers

- Zod request validation
- Auth and role middleware
- Auth/OTP/refresh rate limiters
- Helmet and CORS
- No-store headers under `/api`
- Centralized errors that avoid exposing secret values
- Raw request body retention only for payment signature verification

## Important source files

- `server/src/routes/auth.routes.ts`
- `server/src/controllers/auth.controller.ts`
- `server/src/services/auth.service.ts`
- `server/src/services/otp.service.ts`
- `server/src/middleware/authenticate.ts`
- `server/src/middleware/requireRole.ts`
- `server/src/utils/jwt.ts`
- `server/src/database/schema/users.ts`
- `server/src/database/schema/refreshTokens.ts`
