---
name: Admin initial-load concurrency
description: Startup loading behavior for the ServeNow Admin Web panel and its API request pool.
---

The Admin Web shell must not block on a large concurrent batch of independent API requests. Keep the initial blocking set small, let page-specific data load from its own effects, and hydrate secondary datasets serially or with independently bounded loading.

**Why:** The API can successfully serve each Admin endpoint alone, but a burst of duplicate and expensive Supabase requests can exhaust or queue the server connection pool. The browser then leaves some proxied requests pending, and a shared `Promise.all` keeps every Admin menu behind one spinner.

**How to apply:** When adding an Admin startup dataset, first decide whether it is required for the initial shell. Avoid duplicate requests already owned by a page-specific effect, and never make unrelated sections depend on one global startup promise.