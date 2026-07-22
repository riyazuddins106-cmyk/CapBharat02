import { and, eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { serviceCategories, services, subServiceCategories } from './schema/index.js';

const catalog = [
  {
    name: 'Cleaning', iconName: 'Sparkles', color: '#EDE9FD', iconColor: '#5B3EF5',
    subcategories: [
      { name: 'Deep Home Cleaning', skill: 'Home Cleaning' },
      { name: 'Bathroom Cleaning', skill: 'Bathroom Cleaning' },
      { name: 'Sofa & Carpet Cleaning', skill: 'Upholstery Cleaning' },
    ],
    products: [
      { sub: 'Deep Home Cleaning', name: 'Full Home Deep Cleaning', description: 'A detailed top-to-bottom clean for your entire home.', price: 2499, payout: 1500, duration: 240, skill: 'Home Cleaning', badge: 'Top Rated', featured: true, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop' },
      { sub: 'Deep Home Cleaning', name: 'Kitchen Deep Cleaning', description: 'Degreasing and sanitisation for cabinets, counters and appliances.', price: 999, payout: 600, duration: 120, skill: 'Kitchen Cleaning', badge: 'Featured', featured: true, image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop' },
      { sub: 'Bathroom Cleaning', name: 'Bathroom Cleaning', description: 'Professional bathroom scrubbing and sanitisation.', price: 599, payout: 360, duration: 60, skill: 'Bathroom Cleaning', badge: 'Top Rated', featured: true, image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop' },
      { sub: 'Sofa & Carpet Cleaning', name: 'Sofa Cleaning', description: 'Deep extraction cleaning for sofas and upholstered furniture.', price: 799, payout: 480, duration: 90, skill: 'Upholstery Cleaning', badge: 'Featured', featured: true, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop' },
    ],
  },
  {
    name: 'Plumbing', iconName: 'Wrench', color: '#FEF3C7', iconColor: '#D97706',
    subcategories: [
      { name: 'Pipe & Leak Repair', skill: 'Plumbing' },
      { name: 'Tap & Faucet', skill: 'Plumbing' },
    ],
    products: [
      { sub: 'Pipe & Leak Repair', name: 'Pipe Leak Repair', description: 'Find and fix leaking pipes, joints and connections.', price: 349, payout: 210, duration: 60, skill: 'Plumbing', badge: 'Top Rated', featured: true, image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&auto=format&fit=crop' },
      { sub: 'Tap & Faucet', name: 'Tap Repair & Installation', description: 'Repair or install taps, mixers and faucets.', price: 249, payout: 150, duration: 45, skill: 'Plumbing', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop' },
    ],
  },
  {
    name: 'Electrical', iconName: 'Zap', color: '#DCFCE7', iconColor: '#16A34A',
    subcategories: [
      { name: 'Switches & Sockets', skill: 'Electrical Repair' },
      { name: 'Fans & Lights', skill: 'Electrical Repair' },
    ],
    products: [
      { sub: 'Switches & Sockets', name: 'Switch & Socket Repair', description: 'Safe replacement and repair of switches and sockets.', price: 199, payout: 120, duration: 45, skill: 'Electrical Repair', image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop' },
      { sub: 'Fans & Lights', name: 'Fan Installation', description: 'Professional ceiling fan installation and balancing.', price: 299, payout: 180, duration: 60, skill: 'Electrical Repair', image: 'https://images.unsplash.com/photo-1558008258-3256797b43f3?w=800&auto=format&fit=crop' },
    ],
  },
  {
    name: 'Salon', iconName: 'Scissors', color: '#FCE7F3', iconColor: '#DB2777',
    subcategories: [
      { name: 'Hair Care', skill: 'Hair Styling' },
      { name: 'Facial & Skin Care', skill: 'Beauty Services' },
    ],
    products: [
      { sub: 'Hair Care', name: 'Haircut for Men', description: 'A professional haircut at your home.', price: 399, payout: 240, duration: 45, skill: 'Hair Styling', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&auto=format&fit=crop' },
      { sub: 'Facial & Skin Care', name: 'Classic Facial', description: 'Relaxing facial with cleansing, scrub and massage.', price: 699, payout: 420, duration: 60, skill: 'Beauty Services', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop' },
    ],
  },
  {
    name: 'Painting', iconName: 'Paintbrush', color: '#DBEAFE', iconColor: '#2563EB',
    subcategories: [{ name: 'Interior Painting', skill: 'Painting' }],
    products: [
      { sub: 'Interior Painting', name: 'Single Room Painting', description: 'Fresh interior painting with neat preparation and cleanup.', price: 1999, payout: 1200, duration: 360, skill: 'Painting', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&auto=format&fit=crop' },
    ],
  },
  {
    name: 'AC Repair', iconName: 'Wind', color: '#FFF7ED', iconColor: '#EA580C',
    subcategories: [{ name: 'AC Service & Repair', skill: 'AC Repair' }],
    products: [
      { sub: 'AC Service & Repair', name: 'AC Service', description: 'Complete split or window AC cleaning and performance check.', price: 499, payout: 300, duration: 60, skill: 'AC Repair', image: 'https://images.unsplash.com/photo-1631545806609-9c5d7d7b8f7b?w=800&auto=format&fit=crop' },
    ],
  },
];

export async function seedCatalog() {
  let categoryCount = 0;
  let subcategoryCount = 0;
  let serviceCount = 0;

  for (const [index, entry] of catalog.entries()) {
    let [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.name, entry.name)).limit(1);
    if (!category) {
      [category] = await db.insert(serviceCategories).values({
        name: entry.name, iconName: entry.iconName, color: entry.color, iconColor: entry.iconColor,
        sortOrder: index + 1, serviceCount: entry.products.length,
      }).returning();
      categoryCount++;
    } else {
      [category] = await db.update(serviceCategories).set({
        iconName: entry.iconName, color: entry.color, iconColor: entry.iconColor,
        serviceCount: entry.products.length, isActive: true, updatedAt: new Date(),
      }).where(eq(serviceCategories.id, category.id)).returning();
    }

    const subIds = new Map<string, string>();
    for (const [subIndex, sub] of entry.subcategories.entries()) {
      let [row] = await db.select().from(subServiceCategories).where(and(
        eq(subServiceCategories.categoryId, category.id), eq(subServiceCategories.name, sub.name),
      )).limit(1);
      if (!row) {
        [row] = await db.insert(subServiceCategories).values({
          categoryId: category.id, name: sub.name, description: `${sub.name} services`,
          sortOrder: subIndex + 1, isActive: true, featured: subIndex === 0,
        }).returning();
        subcategoryCount++;
      }
      subIds.set(sub.name, row.id);
    }

    for (const product of entry.products) {
      const subCategoryId = subIds.get(product.sub);
      if (!subCategoryId) continue;
      const values = {
        categoryId: category.id, subCategoryId, name: product.name,
        description: product.description, images: [product.image],
        customerPrice: product.price, partnerPayout: product.payout,
        commission: product.price - product.payout, duration: product.duration,
        requiredSkill: product.skill, badge: product.badge ?? null, featured: product.featured ?? false, isActive: true, deletedAt: null,
        updatedAt: new Date(),
      };
      const [existing] = await db.select({ id: services.id }).from(services)
        .where(eq(services.name, product.name)).limit(1);
      if (existing) {
        await db.update(services).set(values).where(eq(services.id, existing.id));
      } else {
        await db.insert(services).values(values);
      }
      serviceCount++;
    }
  }

  return { categories: categoryCount, subcategories: subcategoryCount, services: serviceCount };
}

if (process.argv[1]?.endsWith('seed-catalog.ts')) {
  seedCatalog().then((result) => {
    console.log('[seed-catalog] Catalog ready:', result);
    process.exit(0);
  }).catch((error) => {
    console.error('[seed-catalog] Failed:', error);
    process.exit(1);
  });
}