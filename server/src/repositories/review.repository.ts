import { and, eq, desc, sql, avg } from 'drizzle-orm';
import { db } from '../config/database.js';
import { reviews, type Review, type NewReview } from '../database/schema/reviews.js';

export const reviewRepository = {
  async listForProfessional(professionalId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.professionalId, professionalId)).orderBy(desc(reviews.createdAt));
  },

  async findByBooking(bookingId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
    return review;
  },

  async findByIdAndCustomer(id: string, customerId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.customerId, customerId)))
      .limit(1);
    return review;
  },

  async create(data: NewReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  },

  async update(id: string, data: Partial<Pick<NewReview, 'rating' | 'comment'>>): Promise<Review> {
    const [review] = await db
      .update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return review;
  },

  async remove(id: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  },

  async getAverageRating(professionalId: string): Promise<{ avg: number; count: number }> {
    const [row] = await db
      .select({ avg: avg(reviews.rating), count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.professionalId, professionalId));
    return { avg: Number(row?.avg ?? 0), count: row?.count ?? 0 };
  },
};
