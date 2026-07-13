import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { supportTicketService } from '../services/supportTicket.service.js';

export const supportTicketController = {
  // Customer: submit a ticket
  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body as { name: string; email: string; subject: string; message: string };
    if (!name || !email || !subject || !message) throw AppError.badRequest('name, email, subject, message are all required.');
    const ticket = await supportTicketService.create({
      userId: req.user?.userId,
      name, email, subject, message,
    });
    sendSuccess(res, ticket, 201);
  }),

  // Customer: list own tickets
  listMine: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized('Authentication required.');
    const data = await supportTicketService.listForUser(req.user.userId);
    sendSuccess(res, data);
  }),

  // Admin: list all tickets
  listAll: asyncHandler(async (_req: Request, res: Response) => {
    const data = await supportTicketService.listAll();
    sendSuccess(res, data);
  }),

  // Admin: update ticket status
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body as { status: 'open' | 'in_progress' | 'closed' };
    if (!['open', 'in_progress', 'closed'].includes(status)) throw AppError.badRequest('Invalid status.');
    await supportTicketService.updateStatus(req.params.id, status);
    sendSuccess(res, { message: 'Status updated.' });
  }),
};
