# Repository Structure

| Path | Purpose |
|---|---|
| `server/` | Express API, database schema/migrations/seeds, services, controllers, routes, repositories, integrations |
| `server/src/config/` | Environment, database, and Supabase setup |
| `server/src/controllers/` | HTTP request handlers |
| `server/src/routes/` | API route modules and middleware wiring |
| `server/src/services/` | Domain and integration services |
| `server/src/repositories/` | Persistence access helpers |
| `server/src/database/schema/` | Drizzle PostgreSQL tables and enums |
| `server/src/database/migrations/` | Generated migration files and metadata |
| `server/src/validators/` | Zod request validators |
| `server/src/middleware/` | Authentication, roles, validation, rate limits, and errors |
| `apps/customer-web/` | Customer Vite application |
| `apps/admin-web/` | Admin Vite application |
| `apps/partner-web/` | Partner Vite application |
| `apps/mobile/` | Customer Expo Router application |
| `apps/mobile-partner/` | Partner Expo Router application |
| `packages/shared/` | Shared TypeScript types and time-slot constants |
| `scripts/` | Workspace utility scripts |
| `.replit` | Replit modules, workflows, ports, and deployment commands |
| `replit.nix` | Nix environment configuration |
| `tmp-qr/` | QR/tunnel display assets used by the local workflows |
| `.ai-memory/` | Existing project-specific AI notes and module indexes |

## Important source files

- `server/src/index.ts` — startup order and listening
- `server/src/app.ts` — middleware, API mounting, production static apps, QR page
- `server/src/routes/index.ts` — API route group registration
- `server/src/config/env.ts` — environment validation and database alias
- `server/src/config/database.ts` — Drizzle database client
- `server/src/database/schema/index.ts` — schema barrel
- `server/src/database/migrate.ts` — startup migration logic
- `apps/customer-web/src/app/App.tsx` — customer web application surface
- `apps/admin-web/src/app/App.tsx` — admin application surface
- `apps/partner-web/src/app/App.tsx` — partner web application surface
- `apps/mobile/app/_layout.tsx` — customer mobile navigation root
- `apps/mobile-partner/app/_layout.tsx` — partner mobile navigation root

## Configuration and commands

Root scripts are in `package.json`. Package-specific scripts are in each
application/server manifest. API route behavior belongs under
`server/src/routes/`, not in the web applications.
