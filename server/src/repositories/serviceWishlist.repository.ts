import { eq, and } from 'drizzle-orm';
import { db } from '../config/database.js';
import { serviceWishlists } from '../database/schema/serviceWishlists.js';

export const serviceWishlistRepository = {
  async listForCustomer(customerId: string) {
    return db
      .select()
      .from(serviceWishlists)
      .where(eq(serviceWishlists.customerId, customerId));
  },

  async find(customerId: string, serviceId: string) {
    const [row] = await db
      .select()
      .from(serviceWishlists)
      .where(
        and(
          eq(serviceWishlists.customerId, customerId),
          eq(serviceWishlists.serviceId, serviceId),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async create(customerId: string, serviceId: string) {
    const [row] = await db
      .insert(serviceWishlists)
      .values({ customerId, serviceId })
      .returning();
    return row;
  },

  async delete(customerId: string, serviceId: string) {
    await db
      .delete(serviceWishlists)
      .where(
        and(
          eq(serviceWishlists.customerId, customerId),
          eq(serviceWishlists.serviceId, serviceId),
        ),
      );
  },

  async getServiceIds(customerId: string): Promise<string[]> {
    const rows = await db
      .select({ serviceId: serviceWishlists.serviceId })
      .from(serviceWishlists)
      .where(eq(serviceWishlists.customerId, customerId));
    return rows.map((r) => r.serviceId);
  },
};
