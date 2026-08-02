# Module: Auth
**Status:** ✅ Complete

## Key Files
| File | Purpose |
|------|---------|
| `server/src/controllers/auth.controller.ts` | register, verifyOtp, login, refresh, logout |
| `server/src/services/auth.service.ts` | business logic, OTP generation, token issuance |
| `server/src/repositories/refreshToken.repository.ts` | stores hashed refresh tokens in DB |
| `server/src/middleware/auth.middleware.ts` | JWT verify, attaches `req.user` |
| `server/src/routes/auth.routes.ts` | route bindings |
| `server/src/services/email.service.ts` | SMTP OTP delivery (logs to console if SMTP not set) |

## How It Works
- **Register** → creates user → sends OTP email → user must verify before login
- **Login** → validates password → issues access token (short-lived) + refresh token (long-lived, stored hashed in DB)
- **Refresh** → validates refresh token hash → issues new pair
- **OTP** → 6-digit code, 10min expiry, logged to console if no SMTP config

## API Routes
```
POST /api/auth/register       { fullName, email, password }
POST /api/auth/verify-otp     { email, code, purpose }   ← "code" not "otp"
POST /api/auth/resend-otp     { email, purpose }
POST /api/auth/login          { email, password }
POST /api/auth/refresh        { refreshToken }
POST /api/auth/logout         { refreshToken }
```

## Known Gotcha
**Token ID mismatch** — `issueTokenPair` must sign the JWT and store the hash using the **same** token ID. See GOTCHAS.md → Auth section.

## Roles
`admin` | `customer` | `partner` — set at registration, stored in users table.
