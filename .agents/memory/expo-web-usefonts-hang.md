---
    name: Expo web useFonts hang over public tunnel
    description: useFonts() from expo-font can hang forever (never resolve or reject) specifically when the app is loaded via the public Replit HTTPS domain, even though the exact same font requests succeed instantly via curl and via the internal 127.0.0.1 preview.
    ---

    On the ServeNow project (Expo Customer App, port 8080), the root layout gated all rendering behind `useFonts()` resolving. This worked perfectly via internal appPreview but rendered a **permanent blank white page** when loaded through the public https://*.replit.dev tunnel — reproduced consistently across dozens of attempts, cache clears, and restarts.

    Ruled out (verified byte-identical/working in both contexts): HTML, JS bundle, CORS, font asset responses (content-type, length, headers), API connectivity, bundle fetch timing, and the Replit dev pill script (it still rendered even when the app was blank, proving JS execution wasn't fully blocked — the hang was scoped to the font promise specifically).

    Confirmed the hang was real (not a screenshot-tool timing artifact) by rendering a debug marker with a random per-mount ID: it stayed on the "waiting for fonts" branch indefinitely on a single mount, and forcing the font gate open (`if (false && ...)`) rendered the app instantly and correctly externally.

    **Why:** Root cause not fully isolated (likely something in how `expo-font`'s web FontFace/document.fonts integration behaves differently over the tunnel's connection characteristics vs. direct localhost), but the practical fix doesn't require knowing the exact mechanism.

    **How to apply:** Whenever gating initial render on `useFonts()` (or similar async readiness checks) in an Expo web app that will be accessed through a public/tunneled domain, always pair it with a short `setTimeout` fallback (e.g. 300-800ms) that forces the gate open even if the promise never settles. Don't assume a hung promise means the fetch is slow — same-origin requests can be individually fast via curl while the browser's font-loading API still never resolves.
    