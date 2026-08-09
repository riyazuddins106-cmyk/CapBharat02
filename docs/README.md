# ServeNow Documentation

This directory is the implementation guide for the ServeNow monorepo. It
describes the current source tree, database models, API surface, applications,
workflows, and verified business rules. It is intended for both human
maintainers and future AI agents.

## AI reading order

Before changing code, read:

1. [`ai/AI-INSTRUCTIONS.md`](ai/AI-INSTRUCTIONS.md)
2. [`ai/CURRENT-STATE.md`](ai/CURRENT-STATE.md)
3. [`00-PROJECT-OVERVIEW.md`](00-PROJECT-OVERVIEW.md)
4. The relevant document in [`modules/`](modules/)
5. The relevant document in [`workflows/`](workflows/)
6. The relevant document in [`business-rules/`](business-rules/)
7. Only then inspect the necessary source files.

If documentation conflicts with source code, the source code is the
implementation truth and the affected documentation must be updated.

## Guide

| Topic | Document |
|---|---|
| Project purpose and capabilities | [`00-PROJECT-OVERVIEW.md`](00-PROJECT-OVERVIEW.md) |
| Runtime and application relationships | [`01-ARCHITECTURE.md`](01-ARCHITECTURE.md) |
| Versions and technologies | [`02-TECH-STACK.md`](02-TECH-STACK.md) |
| Repository map | [`03-REPOSITORY-STRUCTURE.md`](03-REPOSITORY-STRUCTURE.md) |
| PostgreSQL/Drizzle schema | [`04-DATABASE.md`](04-DATABASE.md) |
| JWT, OTP, and roles | [`05-AUTHENTICATION-AUTHORIZATION.md`](05-AUTHENTICATION-AUTHORIZATION.md) |
| HTTP API route groups | [`06-API.md`](06-API.md) |
| Environment variable names | [`07-ENVIRONMENT-CONFIGURATION.md`](07-ENVIRONMENT-CONFIGURATION.md) |
| Tests and verification commands | [`08-TESTING.md`](08-TESTING.md) |
| Replit and production setup | [`09-DEPLOYMENT.md`](09-DEPLOYMENT.md) |
| External services and webhooks | [`10-INTEGRATIONS.md`](10-INTEGRATIONS.md) |
| Feature/module guides | [`modules/`](modules/) |
| End-to-end behavior | [`workflows/`](workflows/) |
| Verified business rules | [`business-rules/`](business-rules/) |
| Living AI state and change records | [`ai/`](ai/) |

## Scope and safety

These documents intentionally contain names, paths, schemas, route shapes, and
behavioral summaries, but never secret values, passwords, tokens, private keys,
or database credentials. Areas that were not verifiable from the repository
are labeled `UNKNOWN — REQUIRES VERIFICATION`.
