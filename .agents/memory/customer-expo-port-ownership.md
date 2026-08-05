---
name: Customer Expo port ownership
description: The customer Expo workflow must not reuse a port owned by an unrelated starter service.
---

Customer Expo must use the port declared by its mobile package and workflow. If another service occupies that port, Expo's non-interactive startup asks to switch ports, exits, and produces a QR that cannot download the app.

**Why:** The initial workspace still had a starter API service on the customer workflow's port, causing the exact Expo Go failure "failed to download" after scanning.

**How to apply:** Before presenting a Customer Expo QR, verify the workflow log shows Metro listening on its configured port and verify the public Expo manifest returns HTTP 200. Keep Customer and Partner Expo ports distinct.