# External Integrations

## Supabase

Supabase provides the PostgreSQL database connection and Supabase Storage
client. Configuration is in `server/src/config/supabase.ts` and
`server/src/services/storage.service.ts`. The server ensures the avatar bucket
in the background during startup. Bucket policies and production bucket names
are `UNKNOWN — REQUIRES VERIFICATION`.

## Payments

Razorpay integration is implemented through the Razorpay SDK and payment
controller. It supports checkout/callback and webhook handling.
Stripe integration supports checkout/session success redirects and webhooks.
Payment signatures are checked using the raw request body captured in
`server/src/app.ts`.

Source files:

- `server/src/controllers/payment.controller.ts`
- `server/src/routes/payment.routes.ts`
- `server/src/services/razorpayPayout.service.ts`
- `server/src/database/schema/payments.ts`

Provider account setup, webhook registration, and production credentials are
`UNKNOWN — REQUIRES VERIFICATION`.

## Email and SMS

Nodemailer is used for email flows such as OTP/password recovery when SMTP
configuration is available. `FAST2SMS_API_KEY` supports an optional SMS path.
When optional delivery is not configured, the exact fallback behavior is
defined in `email.service.ts` and `sms.service.ts`; production delivery
configuration is not documented with values.

## Push notifications

Users can register push tokens through the profile API. The server has
notification database/service code and Expo push support. Mobile registration
and notification handling live in each app's `lib/pushNotifications.ts`.

## Storage and uploads

- Supabase Storage: avatars and application media via
  `server/src/services/storage.service.ts`.
- Replit Object Storage: integration helpers under
  `server/replit_integrations/object_storage/`.
- Multer handles multipart uploads for avatars, partner evidence, documents,
  and catalog media.

## Expo and ngrok

The mobile development workflows use `scripts/expo-tunnel.sh` and separate
tokens for customer/partner fallback tunnels. The backend `/qr` page generates
Expo Go QR codes from the current tunnel/settings data.

## Webhooks and background work

Payment webhooks are part of the API. Payout processing uses an in-process
scheduler in `payoutScheduler.service.ts`; no external job queue was found.
Webhook registration, retries, and observability policy are
`UNKNOWN — REQUIRES VERIFICATION`.
