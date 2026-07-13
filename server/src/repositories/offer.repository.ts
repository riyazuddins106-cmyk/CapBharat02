import { db } from '../config/database.js';
import { offers } from '../database/schema/index.js';
import { eq, asc } from 'drizzle-orm';

export type Offer = typeof offers.$inferSelect;
export type OfferInsert = typeof offers.$inferInsert;

export const offerRepository = {
  async getAll(): Promise<Offer[]> {
    return db.select().from(offers).orderBy(asc(offers.sortOrder), asc(offers.createdAt));
  },

  async getActive(): Promise<Offer[]> {
    const now = new Date();
    const rows = await db.select().from(offers)
      .where(eq(offers.isActive, true))
      .orderBy(asc(offers.sortOrder), asc(offers.createdAt));
    // filter out expired
    return rows.filter(r => !r.expiresAt || r.expiresAt > now);
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
    await db.delete(offers).where(eq(offers.id, id));
  },
};
