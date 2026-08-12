---
name: Expo project linkage
description: Expo dashboard updates require project metadata in each app, not only an access token.
---

An EAS access token authenticates a caller but does not identify the Expo
project or update runtime. Each app must carry its own Expo project ID, update
URL, and compatible runtime policy in its static app configuration.

Replit Expo Launch also requires the app to use static `app.json`
configuration. A dynamic app-level `app.config.js` wrapper can allow Metro
development bundles to run while preventing a mobile publish session.

**Why:** The mobile apps served fresh Replit QR bundles but did not appear
updated in Expo.dev because they were not linked to the dashboard projects.

**How to apply:** Keep Customer and Partner project IDs separate, use the
matching `https://u.expo.dev/<projectId>` URL for each, and create a production
publish after changing the metadata. Keep the publish-facing settings in
`app.json` rather than an app-level dynamic config file.