/**
 * Links the test partner (partner@servenow.in) to active services that match
 * the partner profile's category and optional sub-category.
 *
 * Run with:
 *   pnpm --filter @servenow/server exec tsx src/database/seed-partner-services.ts
 *
 * Safe to re-run — inserts use ON CONFLICT DO NOTHING.
 */
import 'dotenv/config';
import { and, eq, inArray, isNull, notInArray } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  orderItemRequests,
  orderItems,
  partnerServices,
  professionals,
  services,
  users,
} from './schema/index.js';

async function main() {
  console.log('[seed-partner-services] Starting…');

  // Resolve partner professional record dynamically — no hardcoded UUIDs.
  const [pro] = await db
    .select({
      id: professionals.id,
      categoryId: professionals.categoryId,
      subCategoryId: professionals.subCategoryId,
      fullName: users.fullName,
    })
    .from(professionals)
    .innerJoin(users, eq(professionals.userId, users.id))
    .where(and(eq(users.email, 'partner@servenow.in'), isNull(professionals.deletedAt)))
    .limit(1);

  if (!pro) {
    console.error('  ✗ Test partner professional record not found.');
    console.error('    Run seed-test-accounts.ts first, then retry.');
    return;
  }

  console.log(`  Partner: ${pro.fullName} (${pro.id})`);

  // The seeded account represents the catalog's AC Service offering. Align
  // the legacy profile to that exact category/sub-category before cleaning
  // the service links.
  const [acService] = await db
    .select({
      id: services.id,
      categoryId: services.categoryId,
      subCategoryId: services.subCategoryId,
      name: services.name,
    })
    .from(services)
    .where(and(
      eq(services.name, 'AC Service'),
      eq(services.isActive, true),
      isNull(services.deletedAt),
    ))
    .limit(1);
  if (!acService) {
    console.warn('  ⚠ AC Service is not active — run seed-catalog first.');
    return;
  }

  await db.update(professionals)
    .set({
      categoryId: acService.categoryId,
      subCategoryId: acService.subCategoryId,
      updatedAt: new Date(),
    })
    .where(eq(professionals.id, pro.id));
  pro.categoryId = acService.categoryId;
  pro.subCategoryId = acService.subCategoryId;
  console.log('  ✓ Aligned profile to AC Service → AC Service & Repair');

  // Keep only active services in the profile's exact category/sub-category.
  const eligibleServices = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(
      eq(services.isActive, true),
      isNull(services.deletedAt),
      eq(services.categoryId, pro.categoryId),
      pro.subCategoryId
        ? eq(services.subCategoryId, pro.subCategoryId)
        : undefined,
    ));

  if (!eligibleServices.length) {
    console.warn('  ⚠ No active services found — run seed-catalog first.');
    return;
  }

  // Reconcile old broad test links. This removes services outside the
  // professional profile's category/sub-category, including links created by
  // the previous "all active services" version of this script.
  const allowedServiceIds = eligibleServices.map((svc) => svc.id);
  const removedLinks = await db.delete(partnerServices)
    .where(and(
      eq(partnerServices.partnerId, pro.id),
      notInArray(partnerServices.serviceId, allowedServiceIds),
    ))
    .returning({ id: partnerServices.id });
  if (removedLinks.length) {
    console.log(`  ✓ Removed ${removedLinks.length} out-of-category service link(s)`);
  }

  // Remove stale requests created before category eligibility was enforced.
  const validItemIds = db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(inArray(orderItems.serviceId, allowedServiceIds));
  const expired = await db.update(orderItemRequests)
    .set({ status: 'expired', respondedAt: new Date() })
    .where(and(
      eq(orderItemRequests.partnerId, pro.id),
      eq(orderItemRequests.status, 'pending'),
      notInArray(orderItemRequests.orderItemId, validItemIds),
    ))
    .returning({ id: orderItemRequests.id });
  if (expired.length) {
    console.log(`  ✓ Expired ${expired.length} stale out-of-category request(s)`);
  }

  let linked = 0;
  let skipped = 0;
  for (const svc of eligibleServices) {
    const [result] = await db.insert(partnerServices)
      .values({ partnerId: pro.id, serviceId: svc.id })
      .onConflictDoNothing()
      .returning({ id: partnerServices.id });
    if (result) {
      console.log(`  ✓ Linked: ${svc.name}`);
      linked++;
    } else {
      skipped++;
    }
  }

  console.log(`[seed-partner-services] Done ✓  linked=${linked}  already_existed=${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[seed-partner-services] Failed:', err);
  process.exit(1);
});
