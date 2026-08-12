---
name: Service-order operations controls
description: Durable rules for Admin operations on itemized service-order dispatch.
---

Itemized service orders must expose the same core dispatch controls as legacy
bookings, but stopping partner search is not cancellation: expire pending item
requests and move the item to `waiting_operation` so operations can restart
dispatch later.

**Why:** The platform keeps legacy bookings and newer order items as separate
models, while operators need one consistent queue. Treating Stop searching as a
cancel would destroy a valid service order, and cancelling a paid item without a
refund would create an accounting inconsistency.

**How to apply:** Manual assignment must validate active partner status, explicit
service qualification, and category compatibility. Keep paid item cancellation
on the refund path; only allow the direct admin cancel action for unpaid items.