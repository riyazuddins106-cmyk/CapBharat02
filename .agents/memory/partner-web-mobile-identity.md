---
name: Partner Web/Mobile identity debugging
description: How to diagnose a partner job appearing on Web but not Mobile.
---

Compare the authenticated partner identity and eligibility before treating a Web/Mobile job-feed difference as a client bug. The same endpoint can correctly return different results when the apps use different partner accounts, categories, sub-categories, or availability states. Also compare request timestamps with the persisted dispatch deadline because a loaded Web card can remain visible after the server has expired the request.

**Why:** A populated itemized request was observed on one client while the other later received an empty payload; both endpoint implementations were correct. The clients were using different partner profiles, and the request's short configured search window had elapsed.

**How to apply:** Inspect `/api/partner/profile`, `/api/partner/order-item-jobs`, the `order_item_requests` owner, professional eligibility fields, and `order_items.dispatch_deadline` in the same timeline. Never broaden server-side dispatch filtering or expose another partner's requests to make two accounts agree.