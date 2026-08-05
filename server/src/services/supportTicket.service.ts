import { supportTicketRepository } from '../repositories/supportTicket.repository.js';
import type { NewSupportTicket } from '../database/schema/index.js';

export const supportTicketService = {
  async listAll() {
    return supportTicketRepository.listAll();
  },

  async listForUser(userId: string) {
    return supportTicketRepository.listForUser(userId);
  },

  async create(data: {
    userId?: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    bookingId?: string;
    orderItemId?: string;
    issueType?: string;
    priority?: 'normal' | 'high' | 'urgent';
  }) {
    return supportTicketRepository.create(data as NewSupportTicket);
  },

  async updateStatus(id: string, status: 'open' | 'in_progress' | 'closed', response?: string) {
    await supportTicketRepository.updateStatus(id, status, response);
  },
};
