---
name: Booking confirmation details
description: Customer-facing booking confirmation must use persisted schedule data and formatted values.
---

Customer-facing confirmations must not display internal slot representations
such as minutes since midnight. Use the created order's persisted scheduled
timestamp as the authoritative date/time and derive the service window from
the returned order-item duration.

**Why:** Rendering the internal slot number created misleading confirmation
text for customers even though the booking itself was stored correctly.

**How to apply:** Keep the success state tied to the checkout response, format
the timestamp in the device locale, and show the service, date/time window,
duration, address, and current booking status.