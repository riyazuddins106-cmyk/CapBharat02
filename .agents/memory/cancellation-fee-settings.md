---
name: Cancellation fee settings
description: Shared Booking Settings contract for itemized cancellation warnings and charges.
---

Itemized cancellation fees are configured in `booking_config` with a percentage rate plus minimum and maximum rupee bounds for after partner acceptance and after partner check-in. Customer Web and Customer Mobile must read the public booking-config response for the warning, and the server must calculate the rate against the service amount, clamp it with `MAX(minimum, MIN(calculated, maximum))`, and cap it at the service price when persisting the cancellation fee.

**Why:** Customer Web had hardcoded rates and Customer Mobile lacked the inline warning, creating inconsistent customer experiences. Percentage calculation with explicit rupee bounds is flexible for admins while preventing both trivial and unexpectedly large charges.

**How to apply:** When changing cancellation policy, update the Booking Settings defaults, Admin controls, public config contract, both customer clients, and the itemized cancellation controller together. Clamp the rate to 0–100, keep minimum and maximum non-negative with minimum ≤ maximum, round the calculated rupee amount, and cap at the service price.