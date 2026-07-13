import { notificationRepository } from '../repositories/notification.repository.js';
import type { NewNotification } from '../database/schema/index.js';

export const notificationDbService = {
  async list(userId: string) {
    return notificationRepository.listForUser(userId);
  },

  async create(data: Omit<NewNotification, 'id' | 'createdAt'>) {
    return notificationRepository.create(data);
  },

  async markRead(id: string, userId: string) {
    await notificationRepository.markRead(id, userId);
  },

  async markAllRead(userId: string) {
    await notificationRepository.markAllRead(userId);
  },

  async delete(id: string, userId: string) {
    await notificationRepository.delete(id, userId);
  },

  async unreadCount(userId: string) {
    return notificationRepository.unreadCount(userId);
  },
};
