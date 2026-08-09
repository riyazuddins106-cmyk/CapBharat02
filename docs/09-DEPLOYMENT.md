# Deployment

## Replit configuration

`.replit` configures Node/Bash/Web modules, workflows, ports, Object Storage
integration metadata, and an autoscale deployment.

Development workflows include:

- Start application: server plus Customer Web
- Admin Panel
- Partner Web
- Expo Customer App
- Expo Partner App
- QR Codes

The exact workflow commands and port mappings are maintained in `.replit`.

## Production build and run

The verified autoscale deployment configuration is:

```text
Build: pnpm build
Run:   node server/dist/index.js
```

The build includes Customer Web, Admin Web, Partner Web, and server. In
production the Express server serves:

- Customer Web at `/`
- Admin Web at `/admin-panel`
- Partner Web at `/partner`

## Startup requirements

The API startup sequence runs migrations before listening. Required environment
variables are documented in [`07-ENVIRONMENT-CONFIGURATION.md`](07-ENVIRONMENT-CONFIGURATION.md).
Supabase connectivity and any payment/email/storage configuration must be
available to the deployment.

## Mobile builds

Both mobile applications use Expo configuration under their respective
`app.json`/`app.config.js`, package manifests, and Metro/Babel configuration.
The repository contains development Expo tunnel workflows. EAS project/build
configuration and release process are `UNKNOWN — REQUIRES VERIFICATION`.

## Database deployment

Migration code is in `server/src/database/migrate.ts` and generated migration
files are under `server/src/database/migrations/`. Startup migration behavior
is part of the server boot path. Production migration policy, backups, and
rollback procedure are `UNKNOWN — REQUIRES VERIFICATION`.

## Deployment constraints

- Never put secret values in source or deployment configuration.
- Build output must exist at the paths expected by `server/src/app.ts`.
- Webhook URLs/signature secrets must be configured outside source.
- Do not assume Replit development ports are production URLs.
