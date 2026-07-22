---
name: Admin catalog ownership
description: The customer marketplace displays admin-seeded services with fixed customer prices and partner payouts.
---

The service catalog is the source of truth for customer booking. Products, customer prices, partner payouts, durations, required skills, and images are managed centrally; partners are matched to products through their skills rather than creating or pricing products.

**Why:** The marketplace model requires customers to choose a defined service product before dispatch can match an eligible partner.

**How to apply:** New customer booking UI should read `/api/services` and use the service ID for cart and checkout. Keep partner-facing screens focused on availability, incoming jobs, assigned work, earnings, and reviews.