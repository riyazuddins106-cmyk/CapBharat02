import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { refreshTokens, type NewRefreshToken, type RefreshToken } from '../database/schema/refreshTokens.js';

export const refreshTokenRepository = {
  async create(data: NewRefreshToken): Promise<RefreshToken> {
    const [token] = await db.insert(refreshTokens).values(data).returning();
    return token;
  },

  async findById(id: string): Promise<RefreshToken | undefined> {
    const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.id, id)).limit(1);
    return token;
  },

  async updateHash(id: string, tokenHash: string): Promise<void> {
    await db.update(refreshTokens).set({ tokenHash }).where(eq(refreshTokens.id, id));
  },

  async revoke(id: string): Promise<void> {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, userId));
  },
};
