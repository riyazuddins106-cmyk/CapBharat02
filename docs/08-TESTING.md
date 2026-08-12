# Testing and Verification

## Existing test assets

The repository contains E2E-oriented TypeScript files:

- `server/src/e2e/dispatch.e2e.ts`
- `server/src/e2e/full-flow.e2e.ts`
- `server/src/e2e/order-item-flow.e2e.ts`

There is no single root `test` script or configured test-runner package in the
root/server manifests. However, the individual regression and E2E commands
below are verified and are the current test entry points.

## Available commands

| Command | Purpose |
|---|---|
| `pnpm build` | Builds Customer Web, Admin Web, Partner Web, and server |
| `pnpm --filter @servenow/server build` | TypeScript server build |
| `pnpm --filter @servenow/server dev` | Watch-mode server |
| `pnpm --filter @servenow/customer-web build` | Customer Vite build |
| `pnpm --filter @servenow/admin-web build` | Admin Vite build |
| `pnpm --filter @servenow/partner-web build` | Partner Vite build |
| `pnpm --filter @servenow/mobile exec tsc --noEmit` | Customer Mobile TypeScript check |
| `pnpm --filter @servenow/mobile-partner exec tsc --noEmit` | Partner Mobile TypeScript check |
| `bash scripts/crud-test.sh` | Broad Customer/Partner/Admin API regression |
| `node scripts/e2e-payment-test.mjs` | Payment and legacy booking lifecycle |
| `node scripts/test-admin-features.js` | Admin browser feature checks using system Chromium |
| `pnpm --filter @servenow/server exec tsx src/e2e/order-item-flow.e2e.ts` | Itemized service-order lifecycle |
| `pnpm --filter @servenow/server exec tsx src/e2e/dispatch.e2e.ts` | GPS dispatch and legacy operations |
| `pnpm --filter @servenow/server exec tsx src/e2e/full-flow.e2e.ts` | Legacy full lifecycle |
| `pnpm --filter @servenow/server db:generate` | Generate Drizzle migration |
| `pnpm --filter @servenow/server db:push` | Push schema through Drizzle Kit |
| `pnpm --filter @servenow/server db:studio` | Open Drizzle Studio |

Do not run migration/push commands without an explicit task requiring a
database change.

## Verified QA results — 2026-08-12

- CRUD regression: **71 passed, 0 failed**
- Legacy full lifecycle: **45 passed, 0 failed, 3 skipped**
- Payment lifecycle: **21 passed, 0 failed**
- Admin browser suite: **17 passed, 0 failed**
- Itemized service-order flow: **16 passed, 0 failed, 1 skipped**
- GPS dispatch flow: **66 passed, 0 failed**
- Production build: Customer Web, Admin Web, Partner Web, Server all passed
- Mobile TypeScript checks: Customer Mobile and Partner Mobile both passed
- `git diff --check`: passed
- Detailed report: `qa/servenow-qa-report-2026-08-12.xlsx`

## Remaining verification limitations

- No unified root test runner, lint command, or CI workflow inventory is
  configured/verified.
- Live Razorpay, Stripe, and RazorpayX transactions, refunds, and transfers
  require provider credentials and safe provider test data.
- File upload, review-write/moderation, and Admin-account mutation flows remain
  `NOT TESTED` in the final disposable-data pass.
- Test commands use real development data and should be run serially. Fixtures
  must clean their own records, and E2E dispatch must delete professionals
  before users to avoid orphaned profiles.
