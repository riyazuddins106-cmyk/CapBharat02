---
name: Payment method availability
description: Rules for exposing and validating customer payment methods in Test Mode and live mode.
---

Payment methods must be derived from enabled Admin settings and their required
configuration. Test Mode can simulate configured methods, but it must not
expose or accept an unconfigured method as a successful payment. Manual UPI
requires both the UPI enable flag and a non-empty VPA.

**Why:** Exposing every method in Test Mode allowed an unconfigured manual UPI
selection to mark an order item paid and advance the service without a real
payment.

**How to apply:** Filter the public payment-method response, repeat the guard
in every payment endpoint, and make tracking depend on the persisted paid
payment record rather than the service status alone.