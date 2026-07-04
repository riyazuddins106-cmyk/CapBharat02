import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { addressService } from '../services/address.service.js';

export const addressController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const addresses = await addressService.list(req.user!.userId);
    sendSuccess(res, addresses);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.create(req.user!.userId, req.body);
    sendSuccess(res, address, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.update(req.user!.userId, req.params.id, req.body);
    sendSuccess(res, address);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await addressService.remove(req.user!.userId, req.params.id);
    sendSuccess(res, { message: 'Address deleted.' });
  }),
};
