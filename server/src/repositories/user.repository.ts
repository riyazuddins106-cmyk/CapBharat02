import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users, type NewUser, type User } from '../database/schema/users.js';
import { usernameCandidate } from '../utils/username.js';

export const userRepository = {
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return user;
  },

  async findByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
      .limit(1);
    return user;
  },

  async findByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  },

  async generateUsername(fullName: string, email: string): Promise<string> {
    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate = usernameCandidate(fullName, email, suffix);
      if (!(await this.findByUsername(candidate))) return candidate;
    }
    throw new Error('Could not generate a unique username.');
  },

  async findById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return user;
  },

  async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },

  async markEmailVerified(id: string): Promise<void> {
    await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, id));
  },

  async delete(id: string): Promise<void> {
    // Soft-delete: set deletedAt so existing queries (which filter isNull(deletedAt)) exclude the row.
    await db.update(users).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, id));
  },
};
