---
name: ServeNow architecture separation
description: How the three frontend apps are structured after the refactor and key gotchas.
---

# ServeNow App Separation

**Result:**
- `apps/customer-web`: App.tsx now just renders `<CustomerAppLive />` — CustomerApp.tsx untouched
- `apps/admin-web`: New Vite app (port 5001). AdminPanel extracted from original App.tsx lines 733–1147.
- `apps/mobile` / `apps/mobile-partner`: Required zero changes — already isolated.
- `server/`: Untouched shared backend.

**Gotcha — missing imports in admin-web:** lucide-react import list needs `Search`, `Clock`, `MessageSquare` in addition to the obvious admin icons. TypeScript catches this but Vite build does not (no type-check by default).

**Gotcha — Python extraction:** Use `git show HEAD:path | python3 -c "import sys; lines=sys.stdin.readlines()..."` to extract code from a file BEFORE overwriting it. Heredoc triple-quote strings break with TSX content.
