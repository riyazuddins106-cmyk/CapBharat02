# Technology Stack

Versions below are taken from repository manifests. A version is omitted when
the manifest uses a range or when the package was not directly inspected.

## Languages and runtime

- TypeScript and JavaScript
- Node.js runtime configured by Replit with `nodejs-20`
- React 18 for the Vite web applications
- React Native with Expo SDK 54 for mobile applications
- SQL through Drizzle PostgreSQL definitions

## Backend

- Express `4.21.1`
- Drizzle ORM `0.36.4`
- Drizzle Kit `0.31.10`
- PostgreSQL driver `postgres 3.4.5`
- Zod `3.23.8`
- JWT: `jsonwebtoken 9.0.2`
- Password hashing: `bcryptjs 2.4.3`
- Helmet `8.0.0`, CORS `2.8.5`, Morgan `1.10.0`
- Multer `1.4.5-lts.1`
- Nodemailer `^9.0.3`

## Web

- Vite `6.3.5`
- React `18.3.1` in Admin Web and Partner Web; Customer Web uses the
  repository's declared React dependencies.
- Tailwind CSS `4.1.12` in Admin Web and Partner Web
- Radix UI and Material UI dependencies in Customer Web
- Recharts in Admin Web
- Axios and Lucide in the administrative/partner surfaces

## Mobile

- Expo SDK `54` and Expo Router
- React Native version is declared by each mobile manifest
- Expo notifications, device, image picker, document picker, QR scanner, and
  related modules are used where declared
- Metro/Babel configuration exists per mobile app

## Payments and services

- Razorpay `^2.9.6`
- Stripe `^22.3.1`
- Supabase JS `2.45.4`
- Expo Server SDK `^6.1.0`
- QRCode `^1.5.4`

## Tooling

- pnpm workspaces
- TypeScript `5.6.3` in server/apps; root tooling may declare a different
  version
- `tsx` for development scripts and seed/migration utilities
- `concurrently` for the default server/customer-web workflow
- Replit `.replit` workflows and autoscale deployment configuration

## Testing

E2E source files exist under `server/src/e2e/`, and the individual E2E, CRUD,
payment, Admin browser, build, and mobile type-check commands are verified. No
unified root test runner or ESLint configuration/lint script is configured.
See [`08-TESTING.md`](08-TESTING.md) for the exact commands and latest results.
