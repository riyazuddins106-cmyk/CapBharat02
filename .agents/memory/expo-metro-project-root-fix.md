---
name: Expo Metro project root fix
description: Stray workspace-root app.json causes Metro to use wrong project root for both Expo apps; deleting it fixes bundle resolution.
---

**Rule:** Never leave an `app.json` with an `expo` key at the monorepo workspace root (e.g. `{"expo": {}}`).

**Why:** Expo CLI walks up the directory tree from the CWD looking for the nearest `app.json` containing an `expo` key. If one exists at the workspace root, Expo treats the workspace root as the project root rather than `apps/mobile`. Metro then resolves all module paths from the wrong base, causing `UnableToResolveError: ./node_modules/expo-router/entry` with `originModulePath: /home/runner/workspace/.`.

**How to apply:** If Expo starts correctly (`Starting project at …/apps/mobile` in logs) but bundles fail with module resolution errors pointing to the workspace root, check for a stray `app.json` at the monorepo root and delete it.

**Symptom:** `Unable to resolve module ./index from /home/runner/workspace/.` — note the trailing dot on the origin path.
