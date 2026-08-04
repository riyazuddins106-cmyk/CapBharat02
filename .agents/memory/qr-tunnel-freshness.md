---
name: QR tunnel freshness
description: Prevents stale Expo QR pages from showing dead tunnel URLs after Metro/ngrok restarts.
---

The QR display must have one canonical, no-cache scanner page. Legacy QR display routes should redirect to that page instead of embedding their own Expo URL.

**Why:** Expo/ngrok creates a new public URL when a tunnel restarts. A stale HTML page can display an old URL even when the current PNGs and scanner page are correct, causing Expo Go to report that the bundle failed to download.

**How to apply:** When refreshing Expo tunnels, regenerate both QR PNGs and the canonical scanner page, and keep any older QR route as a redirect to the scanner page.