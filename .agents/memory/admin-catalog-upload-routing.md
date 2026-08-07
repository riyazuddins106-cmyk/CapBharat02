---
name: Admin catalog upload and count routing
description: Admin catalog multipart uploads must use the same API base as JSON requests, and category partner counts must include service-linked partners.
---

## Rule

Use the shared API URL builder for every admin multipart upload instead of hardcoding a relative `/api` URL. Category partner totals should count distinct professionals linked directly to the category or indirectly through active services in that category.

**Why:** The admin panel can be served from a public preview host while the API runs on another port; a hardcoded relative upload URL can hit the frontend HTML shell and produce `Unexpected token '<'`. Partners are often assigned through `partner_services`, so counting only `professionals.category_id` hides real catalog relationships.

**How to apply:** Route all future admin uploads through the API client base URL and parse non-JSON responses defensively. Keep category aggregates aligned with both direct professional category links and active service assignments.