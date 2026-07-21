import { db } from '../config/database.js';
import { offers } from '../database/schema/index.js';
import { eq, asc, desc, and, or, isNull, isNotNull, lte, gte } from 'drizzle-orm';

export type Offer = typeof offers.$inferSelect;
export type OfferInsert = typeof offers.$inferInsert;

export const offerRepository = {
  async getAll(): Promise<Offer[]> {
    return db.select().from(offers)
      .where(isNull(offers.deletedAt))
      .orderBy(desc(offers.priority), asc(offers.sortOrder), asc(offers.createdAt));
  },

  async getDeleted(): Promise<Offer[]> {
    return db.select().from(offers)
      .where(isNotNull(offers.deletedAt))
      .orderBy(desc(offers.deletedAt));
  },

  async getActive(): Promise<Offer[]> {
    const now = new Date();
    return db.select().from(offers)
      .where(
        and(
          isNull(offers.deletedAt),
          eq(offers.status, 'active'),
          eq(offers.isActive, true),
          or(isNull(offers.startDate), lte(offers.startDate, now)),
          or(isNull(offers.endDate),   gte(offers.endDate,   now)),
          or(isNull(offers.expiresAt), gte(offers.expiresAt, now)),
        )
      )
      .orderBy(desc(offers.priority), asc(offers.sortOrder), asc(offers.createdAt));
  },

  async getById(id: string): Promise<Offer | undefined> {
    const [row] = await db.select().from(offers).where(eq(offers.id, id));
    return row;
  },

  async create(data: Omit<OfferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<Offer> {
    const [row] = await db.insert(offers).values(data).returning();
    return row;
  },

  async update(id: string, data: Partial<Omit<OfferInsert, 'id' | 'createdAt'>>): Promise<Offer | undefined> {
    const [row] = await db.update(offers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return row;
  },

  async delete(id: string): Promise<void> {
    await db.update(offers)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(offers.id, id));
  },

  async restore(id: string): Promise<Offer | undefined> {
    const [row] = await db.update(offers)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return row;
  },
};
