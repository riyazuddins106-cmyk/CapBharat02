import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { db } from '../config/database.js';
import { serviceCategories } from '../database/schema/serviceCategories.js';
import { professionals } from '../database/schema/professionals.js';
import { isProduction } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.post(
  '/',
  asyncHandler(async (_req, res) => {
    if (isProduction) throw AppError.forbidden('Seeding is disabled in production.');

    // Upsert categories
    const categoryData = [
      { name: 'Cleaning',   iconName: 'Sparkles',    color: '#EDE9FD', iconColor: '#5B3EF5', serviceCount: 120, sortOrder: 1 },
      { name: 'Plumbing',   iconName: 'Wrench',      color: '#FEF3C7', iconColor: '#D97706', serviceCount: 85,  sortOrder: 2 },
      { name: 'Electrical', iconName: 'Zap',         color: '#DCFCE7', iconColor: '#16A34A', serviceCount: 94,  sortOrder: 3 },
      { name: 'Salon',      iconName: 'Scissors',    color: '#FCE7F3', iconColor: '#DB2777', serviceCount: 200, sortOrder: 4 },
      { name: 'Painting',   iconName: 'Paintbrush',  color: '#DBEAFE', iconColor: '#2563EB', serviceCount: 62,  sortOrder: 5 },
      { name: 'AC Repair',  iconName: 'Wind',        color: '#FFF7ED', iconColor: '#EA580C', serviceCount: 78,  sortOrder: 6 },
      { name: 'Laundry',    iconName: 'Droplets',    color: '#F0FDF4', iconColor: '#15803D', serviceCount: 55,  sortOrder: 7 },
      { name: 'More',       iconName: 'Grid',        color: '#F3F4F6', iconColor: '#6B7280', serviceCount: 500, sortOrder: 8 },
    ];

    const insertedCats = await db
      .insert(serviceCategories)
      .values(categoryData)
      .onConflictDoUpdate({ target: serviceCategories.name, set: { updatedAt: new Date() } })
      .returning();

    const catMap = Object.fromEntries(insertedCats.map((c) => [c.name, c.id]));

    // Upsert professionals
    const proData = [
      {
        categoryId: catMap['Cleaning'],
        name: 'Priya Sharma',
        title: 'Home Cleaning Expert',
        bio: 'Certified deep cleaning specialist with 7+ years of experience. Trusted by 300+ happy customers.',
        rating: 4.9,
        reviewCount: 312,
        basePrice: 399,
        priceUnit: '/visit',
        badge: 'Top Rated',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&auto=format',
        tags: ['Deep Clean', 'Sanitize'],
      },
      {
        categoryId: catMap['Electrical'],
        name: 'Rajan Verma',
        title: 'Certified Electrician',
        bio: 'Licensed electrician with expertise in wiring, fixtures, and electrical safety inspections.',
        rating: 4.8,
        reviewCount: 189,
        basePrice: 249,
        priceUnit: '/hr',
        badge: 'Verified',
        avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&auto=format',
        tags: ['Wiring', 'Fixtures'],
      },
      {
        categoryId: catMap['Salon'],
        name: 'Meena Pillai',
        title: 'Beauty & Salon Pro',
        bio: 'Award-winning beauty professional specialising in hair, facials, and bridal makeup.',
        rating: 4.9,
        reviewCount: 447,
        basePrice: 599,
        priceUnit: '/session',
        badge: 'Top Rated',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&auto=format',
        tags: ['Hair', 'Facial'],
      },
      {
        categoryId: catMap['Plumbing'],
        name: 'Suresh Kumar',
        title: 'Master Plumber',
        bio: 'Expert plumber handling leaks, pipe installations, and bathroom fittings since 2010.',
        rating: 4.7,
        reviewCount: 234,
        basePrice: 299,
        priceUnit: '/hr',
        badge: 'Verified',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format',
        tags: ['Leaks', 'Pipes'],
      },
      {
        categoryId: catMap['Painting'],
        name: 'Arjun Nair',
        title: 'Interior Painting Specialist',
        bio: 'Professional painter with an eye for detail, specialising in interior and exterior painting.',
        rating: 4.6,
        reviewCount: 98,
        basePrice: 349,
        priceUnit: '/day',
        badge: null,
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&auto=format',
        tags: ['Interior', 'Exterior'],
      },
      {
        categoryId: catMap['AC Repair'],
        name: 'Deepak Joshi',
        title: 'AC & HVAC Technician',
        bio: 'Certified HVAC technician with experience in all major AC brands for repair and servicing.',
        rating: 4.8,
        reviewCount: 156,
        basePrice: 399,
        priceUnit: '/visit',
        badge: 'Verified',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&auto=format',
        tags: ['Repair', 'Service'],
      },
    ];

    // Insert only if not exists (by name)
    const existing = await db.select({ name: professionals.name }).from(professionals);
    const existingNames = new Set(existing.map((p) => p.name));
    const toInsert = proData.filter((p) => !existingNames.has(p.name));

    let insertedPros: typeof professionals.$inferSelect[] = [];
    if (toInsert.length) {
      insertedPros = await db.insert(professionals).values(toInsert).returning();
    }

    sendSuccess(res, {
      categories: insertedCats.length,
      professionals: insertedPros.length,
      message: `Seeded ${insertedCats.length} categories and ${insertedPros.length} new professionals.`,
    });
  }),
);

export default router;
