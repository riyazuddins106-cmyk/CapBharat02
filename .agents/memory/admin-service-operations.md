---
name: Admin service operations
description: Rules for admin booking/order details and dispatch controls.
---

Admin operations must distinguish pausing partner search from cancelling the customer booking. The legacy Stop Searching action expires pending partner requests, keeps the booking active, sets dispatch to `waiting_operation`, and records a search-stopped history event. Cancellation expires requests, releases any assigned partner, and marks dispatch cancelled.

**Why:** Operations staff may need to pause dispatch while preserving a customer booking; conflating the two creates incorrect customer state and can leave partners marked busy.

**How to apply:** Keep these transitions enforced in the backend, not only hidden or shown in the Admin Panel. Detail responses should expose complete IDs and the related customer, address, services, dispatch, payments, earnings, and cancellation data needed for operational decisions.