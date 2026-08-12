---
name: Expo ngrok workflows
description: External Expo Go tunnel configuration when the user supplies separate ngrok credentials
---

When the user explicitly requests ngrok instead of Replit's Expo relay, run customer and partner Expo workflows through separate ngrok v3 agents. Use distinct inspector ports, parse the tunnel URL with Node, launch Expo with `--host lan`, and expose the resulting `exp://` URLs for QR generation.

**Why:** Expo's built-in exp.direct relay can fail with "remote gone away", while two concurrent ngrok agents also conflict if they share the same local inspector port.

**How to apply:** Keep customer and partner on their own ngrok auth-token variables and inspector ports. Do not print or store token values in source files; workflow commands should reference environment variable names only.

For this Replit setup, the browser-facing URLs for non-default web workflows use the
configured external ports: customer web is the default domain, admin is `:3000`, partner
web is `:3001`, and the QR page is `:3002`.

**Why:** Replit's main Preview button targets the default port only, so opening every
workflow from that button can make distinct apps appear to point at the same frontend.

**How to apply:** Report the explicit external-port URLs for Admin, Partner, and QR
testing instead of telling users to append local ports 5001, 4000, or 3000.