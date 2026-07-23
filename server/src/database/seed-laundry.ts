/**
 * One-time script: add Laundry services for each existing subcategory.
 * Run: pnpm --filter @servenow/server exec tsx src/database/seed-laundry.ts
 */
import { db } from '../config/database.js';
import { services } from './schema/services.js';
import { sql } from 'drizzle-orm';

const LAUNDRY_CAT = 'd907f28a-70db-4e32-ba92-b1a02ac6f013';

const newServices = [
  {
    categoryId: LAUNDRY_CAT,
    subCategoryId: 'a085a683-3029-4375-b2d4-fb5f8b4a6a10', // Wash & Fold
    name: 'Wash & Fold Service',
    description: 'Your clothes washed, dried, and neatly folded. Pick-up and drop-off included.',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop'],
    customerPrice: 349, partnerPayout: 210, commission: 139,
    duration: 60, requiredSkill: 'Laundry', badge: 'Top Rated', featured: true, isActive: true,
  },
  {
    categoryId: LAUNDRY_CAT,
    subCategoryId: 'cf2f204f-86f8-4a5d-a511-5c8a6c16d881', // Dry Cleaning
    name: 'Dry Cleaning',
    description: 'Professional dry cleaning for suits, sarees, winter wear and delicate fabrics.',
    images: ['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop'],
    customerPrice: 599, partnerPayout: 360, commission: 239,
    duration: 120, requiredSkill: 'Dry Cleaning', badge: 'Featured', featured: false, isActive: true,
  },
  {
    categoryId: LAUNDRY_CAT,
    subCategoryId: '7e3de000-ffec-4996-8a6f-bfe93463d436', // Ironing Only
    name: 'Steam Ironing',
    description: 'Crisp, wrinkle-free clothes with professional steam ironing. Minimum 5 garments.',
    images: ['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop'],
    customerPrice: 199, partnerPayout: 120, commission: 79,
    duration: 30, requiredSkill: 'Ironing', badge: null, featured: false, isActive: true,
  },
  {
    categoryId: LAUNDRY_CAT,
    subCategoryId: 'a8d51f0b-4e4c-4d7b-80c5-9d858e098cbd', // Stain Removal
    name: 'Stain Removal Treatment',
    description: 'Targeted stain removal for tough stains — oil, ink, wine and more.',
    images: ['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&auto=format&fit=crop'],
    customerPrice: 449, partnerPayout: 270, commission: 179,
    duration: 45, requiredSkill: 'Stain Removal', badge: null, featured: false, isActive: true,
  },
  {
    categoryId: LAUNDRY_CAT,
    subCategoryId: '226f0f4c-8820-4c3d-9d37-ebc25acd5b25', // Curtain Cleaning
    name: 'Curtain Cleaning',
    description: 'On-site or off-site cleaning of curtains and drapes. Restore colour and freshness.',
    images: ['https://images.unsplash.com/photo-1558882224-dda166733046?w=800&auto=format&fit=crop'],
    customerPrice: 799, partnerPayout: 480, commission: 319,
    duration: 90, requiredSkill: 'Curtain Cleaning', badge: null, featured: false, isActive: true,
  },
  {
    categoryId: LAUNDRY_CAT,
    subCategoryId: '96ed4249-23ae-4aaf-bcf5-0fdeb2dc903a', // Shoe Cleaning
    name: 'Shoe Cleaning & Restoration',
    description: 'Deep-clean and restore sneakers, leather shoes and boots to near-new condition.',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop'],
    customerPrice: 299, partnerPayout: 180, commission: 119,
    duration: 45, requiredSkill: 'Shoe Cleaning', badge: null, featured: false, isActive: true,
  },
];

async function run() {
  console.log('Adding Laundry services…');
  for (const svc of newServices) {
    try {
      const [row] = await db.insert(services).values(svc as any).returning({ id: services.id, name: services.name });
      console.log('  ✓ inserted:', row.name);
    } catch (e: any) {
      if (e.code === '23505') console.log('  – already exists:', svc.name);
      else console.error('  ✗ error for', svc.name, ':', e.message);
    }
  }

  const counts = await db.execute(sql`
    SELECT c.name, COUNT(s.id) FILTER (WHERE s.is_active = true) AS svc_count
    FROM service_categories c
    LEFT JOIN services s ON s.category_id = c.id
    WHERE c.is_active = true
    GROUP BY c.name ORDER BY c.name
  `);
  console.log('\n=== Live service counts after insert ===');
  (counts as any).rows.forEach((r: any) => console.log(`  ${r.name}: ${r.svc_count}`));
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
