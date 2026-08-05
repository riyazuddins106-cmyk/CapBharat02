---
name: English-only product language
description: Durable product decision that ServeNow does not translate UI or admin-created catalog content.
---

ServeNow is intentionally English-only. Do not reintroduce locale selectors, translation catalogs, Admin language settings, automatic translation, or Arabic/Urdu RTL behavior unless the user explicitly requests multilingual support again.

**Why:** The user requested removal of the multilingual feature and wants Admin-created English category/service text displayed exactly as entered, without additional language fields or automatic translation.

**How to apply:** Keep new category, subcategory, service, offer, policy, and other dynamic content as a single stored English value. Treat any future localization request as a deliberate product change rather than restoring the previous implementation piecemeal.