---
name: Expo public environment refresh
description: Expo public environment variables are bundle-time values and require a fresh bundle to change.
---

`EXPO_PUBLIC_*` values are embedded into the Expo JavaScript bundle when
Metro starts or a production build is created.

**Why:** Updating a Replit environment value cannot change an already-loaded
Expo Go bundle or an installed production app.

**How to apply:** Restart the Expo workflow and use the newly generated QR for
Expo Go. For an installed app, create a new production build unless an
explicit OTA updates setup is configured.