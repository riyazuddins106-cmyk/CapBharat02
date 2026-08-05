---
name: Admin history data model
description: Durable guidance for Admin customer and professional detail histories.
---

ServeNow has two supported job models: legacy bookings and newer service-order/order-item jobs. Admin customer and professional history views must represent both rather than treating either model as the complete history.

**Why:** The marketplace evolved from single-service bookings to service-level orders, while existing records and operational flows remain active.

**How to apply:** Join payment data through the appropriate model-specific tables, preserve each record's own identifiers/statuses, and keep customer price separate from partner payout when displaying professional earnings.