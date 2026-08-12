---
name: Partner document eligibility and live refresh
description: ServeNow dispatch document gate and client freshness behavior.
---

Partner document approval is a server-side eligibility rule, not a UI-only
filter. Required active document types must be approved. If no type is marked
required, a partner still needs at least one current upload and every current
upload must be approved; no-document partners are excluded.

**Why:** Admin eligible-partner and manual assignment paths previously checked
only active status/service qualification, while automatic dispatch used a
different document check. Separate client sessions also showed stale booking
and job state after another actor changed it.

**How to apply:** Reuse the centralized document helper before automatic
dispatch, Admin eligibility/assignment, and both partner acceptance paths. Keep
Customer/Partner Web visible polling plus focus recovery and mobile active-feed
polling plus foreground refetch unless a future event transport replaces it.