import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../config/database.js';
import { otpCodes, type NewOtpCode, type OtpCode } from '../database/schema/otpCodes.js';

export const otpRepository = {
  async create(data: NewOtpCode): Promise<OtpCode> {
    const [otp] = await db.insert(otpCodes).values(data).returning();
    return otp;
  },

  async findLatestActive(email: string, purpose: OtpCode['purpose']): Promise<OtpCode | undefined> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return otp;
  },

  async consume(id: string): Promise<void> {
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, id));
  },

  async incrementAttempts(id: string, attempts: number): Promise<void> {
    await db
      .update(otpCodes)
      .set({ attempts: String(attempts) })
      .where(eq(otpCodes.id, id));
  },
};
