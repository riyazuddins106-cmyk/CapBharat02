# ServeNow

Service marketplace monorepo (Urban Company clone) — Node.js backend + React web + Expo mobile apps.

## Architecture

| App | Port | URL |
|-----|------|-----|
| Customer Web | 5000 | `https://<replit-domain>/` |
| Admin Panel | 5001 | `https://<replit-domain>/admin-panel/` |
| Server API | 8000 | `https://<replit-domain>/api/` |
| Customer Mobile | 8081 | QR in Expo Customer App workflow |
| Partner Mobile | 8082 | QR in Expo Partner App workflow |

## Stack

- **Backend**: Node.js + Express + TypeScript + Drizzle ORM + Supabase (Postgres)
- **Customer Web**: React + Vite + Tailwind CSS + shadcn/ui (port 5000)
- **Admin Panel**: React + Vite + Tailwind CSS, real auth with `admin_` prefixed tokens (port 5001)
- **Mobile**: React Native + Expo Router (Customer: port 8081, Partner: port 8082)

## Running

### All at once
```bash
pnpm dev          # server + customer web (Start application workflow)
pnpm dev:admin    # admin panel         (Admin Panel workflow)
# Expo Customer App workflow → QR for customer mobile
# Expo Partner App workflow  → QR for partner mobile
```

### Database
```bash
pnpm db:push      # push schema to Supabase
pnpm db:generate  # generate migrations
```

## Required Secrets

Set in Replit Secrets:
- `SUPABASE_URL` — Supabase project REST URL (https://xxx.supabase.co)
- `SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key
- `SUPABASE_DATABASE_URL` — postgres connection string
- `JWT_SECRET` — ≥16 char string
- `JWT_REFRESH_SECRET` — ≥16 char string
- `NGROK_AUTHTOKEN` — ngrok token for Customer App tunnel
- `NGROK_AUTHTOKEN_2` — ngrok token for Partner App tunnel

## Auth / Login Separation

| App | Storage keys | Notes |
|-----|-------------|-------|
| Customer Web | `sn_access_token`, `sn_refresh_token` | localStorage |
| Admin Panel | `admin_access_token`, `admin_refresh_token` | localStorage — never clashes with customer-web |
| Customer Mobile | `sn_access_token`, `sn_refresh_token` | Expo SecureStore (isolated) |
| Partner Mobile | `partner_access_token`, `partner_refresh_token` | Expo SecureStore (isolated) |

All four can be logged in simultaneously with no token conflicts.

## Known Issues / Notes

- `drizzle-kit push` hangs on Supabase if schema already exists with check constraints — patched drizzle-kit's bin.cjs with a null guard
- Expo `--tunnel` uses `@expo/ngrok-bin` (ngrok v2) NOT `./bin/ngrok` (v3); expo-tunnel.sh configures both
- `EXPO_PUBLIC_API_URL` env var controls the API base for mobile apps (already set to Replit dev domain)

## User Preferences

- Keep existing project structure (monorepo with pnpm workspaces)
- Admin panel uses real auth with `admin_` prefixed storage keys to avoid conflicts
