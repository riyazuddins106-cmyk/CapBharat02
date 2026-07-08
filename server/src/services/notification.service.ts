import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { db } from '../config/database.js';
import { users } from '../database/schema/index.js';
import { eq } from 'drizzle-orm';

const expo = new Expo();

export const notificationService = {
  async sendToUser(userId: string, title: string, body: string, data: Record<string, unknown> = {}) {
    try {
      const [user] = await db
        .select({ pushToken: users.pushToken })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const token = user?.pushToken;
      if (!token || !Expo.isExpoPushToken(token)) return;

      const message: ExpoPushMessage = { to: token, sound: 'default', title, body, data };
      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (err) {
      // Push delivery must never break the primary action.
      console.error('[notification] failed to send push notification', err);
    }
  },
};
