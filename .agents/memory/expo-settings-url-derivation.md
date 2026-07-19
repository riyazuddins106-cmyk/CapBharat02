---
name: Expo tunnel URL from settings.json
description: How to reliably get the exp.direct tunnel URL without capturing Metro stdout
---

# Expo tunnel URL derivation from settings.json

## The rule
The exp.direct tunnel URL is fully deterministic from `.expo/settings.json`:

```
exp://{urlRandomness.toLowerCase()}-anonymous-{port}.exp.direct
```

Read it with:
```python
import json; print(json.load(open('.expo/settings.json'))['urlRandomness'].lower())
```

## Why
When expo start output is piped (no TTY), Metro switches to a minimal non-interactive format and does NOT print the `exp://` URL — only `Waiting on http://localhost:{port}`. Capturing the URL from stdout is unreliable.

## How to apply
- Server `/qr` endpoint: read `apps/mobile/.expo/settings.json` and `apps/mobile-partner/.expo/settings.json` directly.
- `settings.json` is rewritten on each `expo start` run, so it's always current.
- `urlRandomness` is mixed-case in the file; lowercase it for the URL.

## Expo interactive login prompt fix
`CI=1` suppresses the login prompt but also disables Metro watch mode and hides the QR URL.
The correct fix is to pipe deferred keystrokes: `{ sleep 3; printf '\033[B\r'; sleep 999999; }` piped to expo start. This selects "Proceed anonymously" 3 seconds after start and keeps stdin open.
