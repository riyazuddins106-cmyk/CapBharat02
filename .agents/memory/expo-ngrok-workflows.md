---
name: Expo ngrok workflows
description: External Expo Go tunnel configuration when the user supplies separate ngrok credentials
---

When the user explicitly requests ngrok instead of Replit's Expo relay, run customer and partner Expo workflows through separate ngrok v3 agents. Use distinct inspector ports, parse the tunnel URL with Node, launch Expo with `--host lan`, and expose the resulting `exp://` URLs for QR generation.

**Why:** Expo's built-in exp.direct relay can fail with "remote gone away", while two concurrent ngrok agents also conflict if they share the same local inspector port.

**How to apply:** Keep customer and partner on their own ngrok auth-token variables and inspector ports. Do not print or store token values in source files; workflow commands should reference environment variable names only.