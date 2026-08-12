---
name: Partner future-job handoff
description: Rules for passing an accepted future service-order item to another partner without losing the original assignment.
---

Passing is an offer, not an immediate unassignment. The assigned partner stays
on a future `partner_accepted` item while eligible replacement partners see a
pending request. Only a replacement acceptance transfers the item; if nobody
accepts, the original partner remains responsible.

**Why:** The customer must retain a guaranteed assigned partner when a
replacement search produces no acceptance.

**How to apply:** Match the original dispatch gates (service, category,
sub-category, approved mandatory documents, active status, and availability).
Transfer the assignment only in the accepting operation, releasing the old
partner afterward. Preserve customer price, payment state, and payout.