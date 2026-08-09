# Catalog Module

## Purpose

Manage the centrally controlled service catalog consumed by customers and
matched to partner skills.

## Responsibilities

Categories, subcategories, services, service metadata/details, offers, reels,
partner-service capabilities, and admin catalog uploads.

## User Roles

Public/customer readers; admin mutations; partner capability linkage.

## APIs

Categories, subcategories, services, offers, reels, wishlist, and admin catalog
routes.

## Database Tables

`service_categories`, `sub_service_categories`, `services`, `partner_services`,
`offers`, `reels`, `service_wishlists`.

## Business Rules

Customers book admin-managed products. Partners are matched by skills and do
not create or price products.

## Important Source Files

- `server/src/controllers/category.controller.ts`
- `server/src/controllers/subCategory.controller.ts`
- `server/src/controllers/service.controller.ts`
- `server/src/services/category.service.ts`
- `server/src/routes/category.routes.ts`
- `server/src/routes/service.routes.ts`
- `server/src/database/schema/services.ts`
- `server/src/database/schema/serviceCategories.ts`

## Related Workflows

Booking/order checkout and partner dispatch.
