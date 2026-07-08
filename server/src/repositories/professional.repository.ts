import { and, eq, isNull, ilike, desc, asc, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { professionals, type Professional, type NewProfessional } from '../database/schema/professionals.js';

export interface ProfessionalFilters {
  categoryId?: string;
  search?: string;
  sort?: 'rating' | 'price_asc' | 'price_desc' | 'reviews';
  limit?: number;
  offset?: number;
}

export const professionalRepository = {
  async findAll(filters: ProfessionalFilters = {}): Promise<{ data: Professional[]; total: number }> {
    const { categoryId, search, sort = 'rating', limit = 20, offset = 0 } = filters;

    const conditions = [isNull(professionals.deletedAt), eq(professionals.isActive, true)];
    if (categoryId) conditions.push(eq(professionals.categoryId, categoryId));
    if (search) conditions.push(ilike(professionals.name, `%${search}%`));

    const where = and(...conditions);

    const orderBy =
      sort === 'price_asc' ? asc(professionals.basePrice)
      : sort === 'price_desc' ? desc(professionals.basePrice)
      : sort === 'reviews' ? desc(professionals.reviewCount)
      : desc(professionals.rating);

    const [data, [{ count }]] = await Promise.all([
      db.select().from(professionals).where(where).orderBy(orderBy).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(professionals).where(where),
    ]);

    return { data, total: count };
  },

  async findById(id: string): Promise<Professional | undefined> {
    const [pro] = await db.select().from(professionals).where(and(eq(professionals.id, id), isNull(professionals.deletedAt))).limit(1);
    return pro;
  },

  async create(data: NewProfessional): Promise<Professional> {
    const [pro] = await db.insert(professionals).values(data).returning();
    return pro;
  },

  async update(id: string, data: Partial<NewProfessional>): Promise<Professional | undefined> {
    const [pro] = await db.update(professionals).set({ ...data, updatedAt: new Date() }).where(eq(professionals.id, id)).returning();
    return pro;
  },

  async updateRating(id: string, rating: number, reviewCount: number): Promise<void> {
    await db.update(professionals).set({ rating, reviewCount, updatedAt: new Date() }).where(eq(professionals.id, id));
  },
};
