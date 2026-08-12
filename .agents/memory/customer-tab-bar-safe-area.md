---
name: Customer tab bar safe area
description: Native Customer Mobile tab-bar layout must preserve the Android system navigation inset.
---

The Customer Mobile tab bar should not set a fixed native height or manually
guess Android bottom padding. Let Expo Router calculate the tab-bar height and
safe-area inset, as used by the working Partner Mobile app.

**Why:** A fixed height override caused the Android back/home/recents controls
to appear visually inside the Customer app's bottom navigation.

**How to apply:** Style colors, borders, label spacing, and icon appearance
only unless there is a device-specific measured requirement. Keep native icon
size driven by the tab navigator.