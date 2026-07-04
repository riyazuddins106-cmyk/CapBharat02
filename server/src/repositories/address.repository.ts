import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../config/database.js';
import { addresses, type Address, type NewAddress } from '../database/schema/addresses.js';

export const addressRepository = {
  async listForUser(userId: string): Promise<Address[]> {
    return db
      .select()
      .from(addresses)
      .where(and(eq(addresses.userId, userId), isNull(addresses.deletedAt)))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  },

  async findById(id: string, userId: string): Promise<Address | undefined> {
    const [address] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId), isNull(addresses.deletedAt)))
      .limit(1);
    return address;
  },

  async create(data: NewAddress): Promise<Address> {
    const [address] = await db.insert(addresses).values(data).returning();
    return address;
  },

  async update(id: string, userId: string, data: Partial<NewAddress>): Promise<Address | undefined> {
    const [address] = await db
      .update(addresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();
    return address;
  },

  async softDelete(id: string, userId: string): Promise<void> {
    await db
      .update(addresses)
      .set({ deletedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  },

  async clearDefault(userId: string): Promise<void> {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  },
};
