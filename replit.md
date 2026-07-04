# ServeNow (Urban Clap Clone)

A monorepo clone of the Urban Clap app for urban home services.

## Stack

- **Frontend** (`apps/customer-web`): React 18, Vite, TypeScript, Tailwind CSS v4, Radix UI / Shadcn UI, Framer Motion, React Router
- **Backend** (`server`): Node.js, Express, TypeScript, Drizzle ORM (PostgreSQL), Zod
- **Shared** (`packages/shared`): Common TypeScript types and utilities
- **Database / Auth / Storage**: Supabase (PostgreSQL, Auth, File Storage)
- **Package manager**: pnpm workspaces

## Running locally

1. Install dependencies: `pnpm install`
2. Set required environment variables (see below)
3. Push DB schema: `pnpm db:push`
4. Start dev servers: `pnpm dev` (runs frontend on :5173 and backend on :8000 concurrently)

## Required environment variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_DATABASE_URL` | Direct PostgreSQL connection string for Drizzle |
| `JWT_SECRET` | Secret for signing access tokens (min 16 chars) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 16 chars) |
| `PORT` | (Optional) Backend port — defaults to 8000 |

## User preferences

_None recorded yet._
