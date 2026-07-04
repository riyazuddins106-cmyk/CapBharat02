---
name: Drizzle-kit ESM compat
description: drizzle-kit cannot resolve .js extensions in TypeScript source files
---

**Rule:** `server/src/database/schema/index.ts` must use extensionless re-exports (`export * from './users'`), NOT `.js` extensions (`export * from './users.js'`).

**Why:** drizzle-kit 0.28.1 bundles TypeScript via its own CJS-based bundler (`bin.cjs`). When it encounters `./users.js`, it tries to resolve the literal file `users.js` which doesn't exist (the file is `users.ts`). The `tsx watch` dev server resolves extensionless imports correctly, so the dev server works either way, but drizzle-kit (used for `db:push`, `db:generate`, `db:studio`) fails on `.js` extensions.

**How to apply:** When adding new schema files, add them to `schema/index.ts` with no extension.
