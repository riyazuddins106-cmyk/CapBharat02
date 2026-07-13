import { db } from '../config/database.js';
import { notifications, type Notification, type NewNotification } from '../database/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';

export const notificationRepository = {
  async listForUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(100);
  },

  async create(data: NewNotification): Promise<Notification> {
    const [n] = await db.insert(notifications).values(data).returning();
    return n;
  },

  async markRead(id: string, userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  },

  async markAllRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  },

  async delete(id: string, userId: string): Promise<void> {
    await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  },

  async unreadCount(userId: string): Promise<number> {
    const rows = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return rows.length;
  },
};
