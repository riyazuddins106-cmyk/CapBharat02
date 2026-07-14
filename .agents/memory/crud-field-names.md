---
name: ServeNow CRUD test field names
description: Exact request field names for each API endpoint, verified from Zod validators and controllers.
---

# ServeNow API — Correct Field Names

**Why:** Field names differ from obvious guesses and caused test failures until verified from source.

## Auth
- `POST /auth/register`: `fullName` (not `name`), no `role` field
- `POST /auth/verify-otp`: `code` (not `otp`), `purpose` enum required (`"signup" | "login" | "password_reset"`)
- `POST /auth/resend-otp`: `email` + `purpose`

## Addresses
- `POST/PATCH /addresses`: `postalCode` (not `pincode`)

## Support tickets
- `POST /support-tickets`: `name`, `email`, `subject`, `message` all required

## Admin
- Offers update: `PATCH /admin/offers/:id` (not PUT)
- Payouts approve: status must be `"paid"` or `"rejected"` (not `"approved"`)
- Categories/policies: UUIDs, not integers — use `"id":"[^"]*"` grep pattern
- Platform policies: slug auto-generated from title — use timestamps in test titles to avoid unique constraint conflicts

## Rate limiter
- Auth limiter: 20 req/15min in production, 500 in dev (NODE_ENV !== 'production')
- Restarting the server resets in-memory rate limit counters

## OTP in dev
- Written to `/tmp/otp-dev.log` (format: `<email> <purpose> <code>`) when SMTP not configured
- Log format from logger: `[otp] Verification code for <email> (<purpose>): <code>`

## How to apply
When writing tests or API clients, always verify field names from `server/src/validators/` and `server/src/controllers/`.
