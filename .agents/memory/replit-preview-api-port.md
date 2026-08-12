---
name: Replit preview API port
description: Why ServeNow browser clients need the API public port on multi-workflow Replit previews
---

On Replit preview hosts, the web app's root `/api/*` route can be handled by a
different starter API artifact instead of ServeNow. Customer and Partner Web
must use the same preview hostname's public API port 8000 only when running on
the Replit preview host; local Vite development should continue using its
relative `/api` proxy and single-port production should remain same-origin.

**Why:** The root preview route returned the wrong API response, while the
public API port returned ServeNow's JSON. Browser requests across the public
ports also require both CORS authorization and a Helmet
`Cross-Origin-Resource-Policy: cross-origin` response.

**How to apply:** When preview API calls fail, first wait for migrations and
check `/api/health`; then distinguish the root preview route from public port
8000 before changing application endpoints. Treat early 503/connection errors
as a possible startup race.