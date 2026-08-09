# Environment Configuration

Only variable names and purposes are documented here. Secret values are never
stored in this directory.

## Backend variables

| Variable | Required | Purpose |
|---|---:|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase client/public key used by configured integrations |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase administrative operations |
| `SUPABASE_DATABASE_URL` | Yes | PostgreSQL connection string |
| `DATABASE_URL` | Alias | Copied to `SUPABASE_DATABASE_URL` when the latter is absent |
| `JWT_SECRET` | Yes | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh-token signing secret |
| `NODE_ENV` | Defaulted | `development`, `production`, or `test` |
| `PORT` | Defaulted | Express listening port; default is `8000` in server config |
| `UPLOADS_DIR` | Defaulted | Local upload directory defaulting to `./uploads` |

## Optional integrations

| Variable | Purpose |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Email/OTP delivery |
| `FAST2SMS_API_KEY` | Optional SMS delivery |
| `NGROK_AUTHTOKEN`, `NGROK_AUTHTOKEN_2` | Expo tunnel fallback credentials |
| `EXPO_PUBLIC_API_URL` | Mobile client API base configuration |
| `REPLIT_DEV_DOMAIN`, `REPLIT_EXPO_DEV_DOMAIN` | Replit/tunnel runtime configuration |
| `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `REPLIT_SIDECAR_ENDPOINT` | Replit Object Storage integration |

## Usage notes

`server/src/config/env.ts` validates the required backend variables at import
time and exits on invalid configuration. The `.replit` file also declares
workflow/deployment environment values. The complete distinction between
development and production values is `UNKNOWN — REQUIRES VERIFICATION`; inspect
the deployment environment rather than copying values into files.
