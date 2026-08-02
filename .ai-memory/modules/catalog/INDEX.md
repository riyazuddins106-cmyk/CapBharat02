# Module: Categories & Services (Catalog)
**Status:** ✅ Complete

## Key Files
| File | Purpose |
|------|---------|
| `server/src/controllers/category.controller.ts` | list, getById (with sub-categories) |
| `server/src/controllers/service.controller.ts` | CRUD, list by category |
| `server/src/repositories/category.repository.ts` | findAll with live serviceCount JOIN |
| `server/src/database/schema/serviceCategories.ts` | categories table |
| `server/src/database/schema/services.ts` | services table |
| `server/src/database/seed-catalog.ts` | seeds all categories + services |

## Architecture
- Admin owns the entire catalog — partners do NOT create or price services
- Partners are matched to services via `services.required_skill` ↔ `professionals.skills`
- Sub-categories: each category has sub-categories; services belong to a sub-category

## Service Fields (key ones)
| Field | Purpose |
|-------|---------|
| `customerPrice` | price shown to customer |
| `partnerPayout` | what partner earns |
| `requiredSkill` | used by dispatch to match partners |
| `minAdvanceMinutes` | per-service advance booking override (null = use global) |
| `isActive` | whether bookable |
| `images` | JSON array of image URLs |

## ⚠️ serviceCount Gotcha
The stored `service_count` column in `service_categories` is stale. The live count is computed via JOIN in `category.repository.ts` `findAll()`. Do NOT use the stored column. See GOTCHAS.md → Categories section.

## API Routes
```
GET /api/categories                    → all categories (with live serviceCount)
GET /api/categories/:id                → category + sub-categories
GET /api/services?categoryId=&subCategoryId=   → filtered services
GET /api/services/:id                  → service detail
```
