import { and, eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { favorites, type Favorite } from '../database/schema/favorites.js';

export const favoriteRepository = {
  async listForCustomer(customerId: string): Promise<Favorite[]> {
    return db.select().from(favorites).where(eq(favorites.customerId, customerId));
  },

  async find(customerId: string, professionalId: string): Promise<Favorite | undefined> {
    const [fav] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.customerId, customerId), eq(favorites.professionalId, professionalId)))
      .limit(1);
    return fav;
  },

  async create(customerId: string, professionalId: string): Promise<Favorite> {
    const [fav] = await db.insert(favorites).values({ customerId, professionalId }).returning();
    return fav;
  },

  async delete(customerId: string, professionalId: string): Promise<void> {
    await db.delete(favorites).where(and(eq(favorites.customerId, customerId), eq(favorites.professionalId, professionalId)));
  },

  async isProfessionalFavorited(customerId: string, professionalId: string): Promise<boolean> {
    const fav = await this.find(customerId, professionalId);
    return Boolean(fav);
  },
};
