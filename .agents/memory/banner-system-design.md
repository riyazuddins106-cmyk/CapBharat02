---
name: Banner/Offers system design
description: New fields added to offers table, image upload bucket, mobile OfferBanner upgrade, admin OffersView redesign
---

## Rule
All new banner fields live in the `offers` table. No separate `banners` table was created.

**Why:** The existing table already had index, routes, and admin UI wired up. Extending it in-place was safer and preserved existing banners.

## New columns added (migration: server/src/scripts/add-banner-fields.ts)
- `image_url` VARCHAR(1000) — Supabase public URL; null = color-only banner
- `description` VARCHAR(500)
- `alt_text` VARCHAR(255)
- `text_position` VARCHAR(20) DEFAULT 'bottom-left' — 9 values (top/center/bottom × left/center/right)
- `overlay_color` VARCHAR(16) DEFAULT '#000000'
- `overlay_opacity` REAL DEFAULT 0.3
- `animation` VARCHAR(16) DEFAULT 'slide'
- `priority` INTEGER DEFAULT 0 — higher = appears first (desc sort)
- `status` VARCHAR(16) DEFAULT 'active' — active/draft/inactive (replaces isActive for display)
- `start_date` TIMESTAMPTZ — null = always visible from start
- `end_date` TIMESTAMPTZ — null = never expires

`isActive` and `expiresAt` kept for backward compat.

## How to apply
Run `pnpm --filter @servenow/server exec tsx src/scripts/add-banner-fields.ts` on any env that needs the new columns.

## Image upload
- Bucket: `banners` (created in `ensureAvatarBucket()` call in supabase.ts)
- Route: `POST /admin/offers/image` (multer → storageService.uploadBannerImage)
- Client: `adminApi.uploadBannerImage(file, token)` → returns URL string

## Active filter logic (offer.repository.ts getActive)
status='active' AND isActive=true AND (startDate IS NULL OR startDate<=now) AND (endDate IS NULL OR endDate>=now) AND (expiresAt IS NULL OR expiresAt>=now)
Ordered by priority DESC, sortOrder ASC, createdAt ASC.

## Mobile OfferBanner
- Image banner: View + absoluteFill Image + absoluteFill overlay View + POS_MAP-positioned content View
- Color banner: original flex-row layout (bgColor, bannerContent + bannerDecor)
- POS_MAP maps 9 position strings to {jc, ai} flexbox values
