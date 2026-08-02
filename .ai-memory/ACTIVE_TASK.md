# Active Task Tracker — ServeNow

> ⚠️ AI INSTRUCTION — MANDATORY, NO EXCEPTIONS:
> You MUST update this file after every completed step during a task.
> Do not finish a step and move on without updating the checklist below first.

---

## ▶ Current Task
**Status:** IDLE — no task in progress.

### Files to change
- `server/src/controllers/service.controller.ts` — expose minAdvanceMinutes
- `server/src/controllers/booking.controller.ts` — enforce all booking_config fields
- `server/src/routes/booking.routes.ts` or `service.routes.ts` — add public config endpoint
- `apps/admin-web/src/app/App.tsx` — service edit + booking settings UI
- `apps/admin-web/src/lib/api.ts` — API calls for new fields
- `apps/mobile/app/checkout.tsx` — slot disabling logic
- `apps/customer-web/src/app/CustomerApp.tsx` — slot disabling logic

### Notes for next session
- services table already has minAdvanceMinutes column — no DB migration needed
- booking_config already stored in platform_settings as JSON blob
- booking controller already loads booking_config and checks minAdvanceMinutes per-service
- Admin UI is monolithic App.tsx — no separate page files
- Mobile checkout uses buildScheduledAt() + SLOT_HOURS constants from @servenow/shared
- Customer web duplicates constants locally in CustomerApp.tsx

---

## 📋 Task History

| # | Task | Given By | Status | Date |
|---|------|----------|--------|------|
| 1 | Set up .ai-memory project continuity system | user | ✅ Done | 2026-08-02 |
| 2 | Enhance booking time logic with configurable minimum advance time | user | ✅ Done | 2026-08-02 |
