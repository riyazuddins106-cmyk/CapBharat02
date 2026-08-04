---
name: Partner App icon font loading
description: Native Partner App Ionicons can appear blank when the root font timeout is too short.
---

The Customer and Partner Apps must allow every registered icon font to load before forcing their root layouts to render. A very short fallback timeout can render the full UI while every icon glyph is blank.

**Why:** Expo Go over the tunnel can take longer than a few hundred milliseconds to load the font asset; the symptom looks like missing icons in the dashboard and bottom tabs, not a component failure.

**How to apply:** Use `expo-font`'s `useFonts` in both mobile roots, register each icon family used by that app, keep a roughly 3-second native font grace period and a shorter web fallback, then restart both Metro workflows and reload Expo Go. For high-visibility surfaces, keep a font-independent fallback because `fontsLoaded: true` does not guarantee glyphs are visibly rendered in Expo Go.