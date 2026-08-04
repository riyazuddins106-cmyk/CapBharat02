---
name: Admin-managed localization
description: ServeNow language availability is centrally configured by Admin while English remains mandatory and the default.
---

The Admin Panel controls which supported locales appear in the Customer Web, Partner Web, Customer Mobile, and Partner Mobile selectors. English (`en`) must always remain enabled, must remain the default, and must be the fallback when a translation or settings request is unavailable. The launch locale set is English, Hindi, Marathi, Arabic, and Urdu; Arabic and Urdu require RTL handling.

**Why:** The user wants worldwide launch readiness without maintaining separate language lists in five clients, and explicitly confirmed English as the default.

**How to apply:** Add new supported locales to the shared translation catalog first, then expose them through the Admin-managed language setting and public client configuration endpoint. Do not let a client infer a different default from browser/device language.