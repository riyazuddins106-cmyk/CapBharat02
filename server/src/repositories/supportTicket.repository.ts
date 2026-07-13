import { db } from '../config/database.js';
import { supportTickets, type SupportTicket, type NewSupportTicket } from '../database/schema/index.js';
import { eq, desc } from 'drizzle-orm';

export const supportTicketRepository = {
  async listAll(): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  },

  async listForUser(userId: string): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
  },

  async create(data: NewSupportTicket): Promise<SupportTicket> {
    const [t] = await db.insert(supportTickets).values(data).returning();
    return t;
  },

  async updateStatus(id: string, status: 'open' | 'in_progress' | 'closed'): Promise<void> {
    await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, id));
  },
};
