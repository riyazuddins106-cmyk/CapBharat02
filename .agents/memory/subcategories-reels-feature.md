---
name: Sub-categories & Reels feature
description: DB schema, server API, admin UI, and mobile home screen additions for category images, sub-categories, and reels.
---

## What was added

- **DB migration**: `ALTER TABLE service_categories ADD COLUMN image_url varchar(512)`, new tables `sub_service_categories` and `reels` — run via tsx script and removed after.
- **Storage buckets**: `categories` (images) and `reels` (videos + thumbs). Both created in `ensureAvatarBucket()` in `server/src/config/supabase.ts`. Do NOT set `fileSizeLimit` on the `reels` bucket as a large string — Supabase plan caps cause "exceeded max size" error; omit the param to use plan default.
- **Server**: new files `controllers/subCategory.controller.ts`, `controllers/reel.controller.ts`, `routes/reel.routes.ts`. Storage methods `uploadCategoryImage` and `uploadReelVideo` added to `storage.service.ts`. Admin routes updated for category image upload, subcategory CRUD, and reel CRUD.
- **Public route**: `GET /api/reels` → lists active reels.
- **Admin panel** (`apps/admin-web/src/app/App.tsx`): Sidebar entry "Reels" (Film icon), `ReelRow`/`SubCategory` types imported from `api.ts`, `SubCategoriesView` and `ReelsView` components added, `CategoriesView` updated with image upload and "Sub-cats" drill-down button, `ImageUploadButton` helper component added.
- **Mobile customer app**: `reelsApi.listActive` added to `lib/api.ts`, reels horizontal scroll section added to home screen above trust badges.

## Why
Category images and sub-categories allow richer service browsing. Reels are short admin-uploaded videos shown on the customer home screen.

## Key constraint
- Supabase `fileSizeLimit` for bucket creation: use `'5MB'` string format or omit; large byte strings like `'104857600'` cause plan-limit errors.
- `storageService.uploadCategoryImage` handles both category and subcategory image uploads (key prefix differentiates them).
