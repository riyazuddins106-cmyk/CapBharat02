# Testing and Verification

## Existing test assets

The repository contains E2E-oriented TypeScript files:

- `server/src/e2e/dispatch.e2e.ts`
- `server/src/e2e/full-flow.e2e.ts`
- `server/src/e2e/order-item-flow.e2e.ts`

No test-runner command was verified in the root or server package manifests.
How these files are executed is `UNKNOWN — REQUIRES VERIFICATION`.

## Available commands

| Command | Purpose |
|---|---|
| `pnpm build` | Builds Customer Web, Admin Web, Partner Web, and server |
| `pnpm --filter @servenow/server build` | TypeScript server build |
| `pnpm --filter @servenow/server dev` | Watch-mode server |
| `pnpm --filter @servenow/customer-web build` | Customer Vite build |
| `pnpm --filter @servenow/admin-web build` | Admin Vite build |
| `pnpm --filter @servenow/partner-web build` | Partner Vite build |
| `pnpm --filter @workspace/scripts typecheck` | Utility script typecheck |
| `pnpm --filter @servenow/server db:generate` | Generate Drizzle migration |
| `pnpm --filter @servenow/server db:push` | Push schema through Drizzle Kit |
| `pnpm --filter @servenow/server db:studio` | Open Drizzle Studio |

Do not run migration/push commands without an explicit task requiring a
database change.

## Not verified

- No ESLint configuration or lint command
- No root `test` script
- No configured web test runner
- No configured mobile test runner
- No CI workflow inventory

All of the above are `UNKNOWN — REQUIRES VERIFICATION`, not claims that tests
do not exist outside the inspected manifests.
