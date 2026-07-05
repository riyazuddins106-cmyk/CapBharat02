# ServeNow (Urban Clap Clone)

A full-stack monorepo home-services marketplace with three independent applications sharing one backend.

## Architecture

| App | Path | Platform | Port | Workflow |
|---|---|---|---|---|
| Customer Web | `apps/customer-web` | Web (React + Vite) | 5000 | Start application |
| Admin Panel | `apps/admin-web` | Web (React + Vite) | 5001 | Admin Panel |
| Customer Mobile | `apps/mobile` | iOS + Android (Expo) | — | Expo Mobile |
| Partner Mobile | `apps/mobile-partner` | iOS + Android (Expo) | — | Expo Partner |
| Shared Backend | `server` | Node.js + Express | 8000 | (started by Start application) |

All four apps share one Express server and one Supabase PostgreSQL database. No backend code is duplicated.

## Stack

- **Customer Web** (`apps/customer-web`): React 18, Vite, TypeScript, Tailwind CSS v4, Radix UI / Shadcn UI, Lucide React — live Supabase connection
- **Admin Panel** (`apps/admin-web`): React 18, Vite, TypeScript, Tailwind CSS v4, Lucide React — proxies `/api` to shared backend
- **Customer Mobile** (`apps/mobile`): Expo SDK 52, React Native, Expo Router
- **Partner Mobile** (`apps/mobile-partner`): Expo SDK 52, React Native, Expo Router
- **Backend** (`server`): Node.js 20, Express 4, TypeScript, Drizzle ORM, Zod, JWT auth, bcrypt
- **Shared** (`packages/shared`): Common TypeScript types
- **Database / Storage**: Supabase (PostgreSQL via Drizzle ORM, Supabase Storage for avatars)
- **Package manager**: pnpm workspaces

## Running on Replit

**Start application** (`pnpm dev`) — starts customer-web (port 5000) + backend (port 8000) together.

**Admin Panel** (`pnpm --filter @servenow/admin-web dev`) — starts admin-web on port 5001. Launch from the Replit workflow panel.

### Expo Mobile (Expo Go)

**Expo Mobile** and **Expo Partner** workflows are available for the React Native apps. Start manually from the Replit workflow panel.

Before starting, add `EXPO_PUBLIC_API_URL` as a Replit Secret set to your Replit dev domain, e.g.:
```
EXPO_PUBLIC_API_URL=https://<your-repl>.<username>.repl.co
```
Once running, scan the QR code shown in the console with the **Expo Go** app on your phone.

## Running locally

```bash
pnpm install          # install all workspace dependencies
pnpm db:push          # push Drizzle schema to Supabase (first time)
pnpm dev              # start frontend + backend concurrently
```

## Required environment variables (Replit Secrets)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL — e.g. `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin) |
| `SUPABASE_DATABASE_URL` | Direct PostgreSQL connection string for Drizzle ORM (Settings → Database → URI) |
| `JWT_SECRET` | Secret for signing access tokens (min 16 chars) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 16 chars) |
| `PORT` | (Optional) Backend port — defaults to `8000` |

> ⚠️ `SUPABASE_URL` must be the project REST URL (`https://xxxx.supabase.co`), **not** the postgres connection string. The postgres connection string goes in `SUPABASE_DATABASE_URL`.
>
> ⚠️ OTPs are printed to server logs (workflow console). In production, wire up an SMTP or transactional email provider in `server/src/services/otp.service.ts`.

## API routes

All routes are prefixed with `/api`:

| Route | Description |
|---|---|
| `POST /auth/register` | Register with email + password |
| `POST /auth/verify-otp` | Verify signup OTP |
| `POST /auth/login` | Login |
| `POST /auth/logout` | Logout (revokes refresh token) |
| `POST /auth/refresh` | Refresh access token |
| `POST /auth/forgot-password` | Request password reset OTP |
| `POST /auth/reset-password` | Reset password with OTP |
| `GET/PATCH /profile/me` | Get / update user profile |
| `POST /profile/me/avatar` | Upload profile photo |
| `GET/POST /addresses` | List / create addresses |
| `PATCH/DELETE /addresses/:id` | Update / delete address |
| `GET /categories` | List service categories |
| `GET /professionals` | List professionals (filter, search, sort) |
| `GET /professionals/:id` | Get professional + their reviews |
| `GET/POST /bookings` | List / create bookings |
| `PATCH /bookings/:id/cancel` | Cancel a booking |
| `PATCH /bookings/:id/reschedule` | Reschedule a booking |
| `POST /reviews` | Submit a review for a completed booking |
| `GET /favorites` | List favourite professionals |
| `POST /favorites/:professionalId` | Toggle favourite |

## Architecture

```
React Frontend
    ↓ (Axios, /api proxy)
Express REST API  (routes → controllers → services → repositories)
    ↓ (Drizzle ORM)
Supabase PostgreSQL
```

## Database schema

Tables: `users`, `refresh_tokens`, `otp_codes`, `addresses`, `service_categories`, `professionals`, `bookings`, `reviews`, `favorites`

Generate migrations: `pnpm db:generate`
Push schema: `pnpm db:push`
Open Drizzle Studio: `pnpm db:studio`

## User preferences

_None recorded yet._
