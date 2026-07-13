import { Request, Response, NextFunction } from 'express';
import { offerRepository } from '../repositories/offer.repository.js';
import { sendSuccess } from '../utils/response.js';

export const offerController = {
  // Public: active offers for mobile app
  async listActive(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await offerRepository.getActive();
      sendSuccess(res, rows);
    } catch (e) { next(e); }
  },

  // Admin: all offers
  async adminList(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await offerRepository.getAll();
      sendSuccess(res, { offers: rows, total: rows.length });
    } catch (e) { next(e); }
  },

  // Admin: create offer
  async adminCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, subtitle, tag, discountText, bgColor, ctaText, ctaRoute, isActive, sortOrder, expiresAt } = req.body as {
        title: string; subtitle?: string; tag?: string; discountText?: string;
        bgColor?: string; ctaText?: string; ctaRoute?: string;
        isActive?: boolean; sortOrder?: number; expiresAt?: string | null;
      };
      const offer = await offerRepository.create({
        title,
        subtitle:     subtitle     ?? '',
        tag:          tag          ?? 'LIMITED OFFER',
        discountText: discountText ?? '',
        bgColor:      bgColor      ?? '#5B3EF5',
        ctaText:      ctaText      ?? 'Book Now',
        ctaRoute:     ctaRoute     ?? '/(tabs)/services',
        isActive:     isActive     ?? true,
        sortOrder:    sortOrder    ?? 0,
        expiresAt:    expiresAt    ? new Date(expiresAt) : null,
      });
      sendSuccess(res, offer, 201);
    } catch (e) { next(e); }
  },

  // Admin: update offer
  async adminUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { title, subtitle, tag, discountText, bgColor, ctaText, ctaRoute, isActive, sortOrder, expiresAt } = req.body as {
        title?: string; subtitle?: string; tag?: string; discountText?: string;
        bgColor?: string; ctaText?: string; ctaRoute?: string;
        isActive?: boolean; sortOrder?: number; expiresAt?: string | null;
      };
      const patch: Record<string, unknown> = {};
      if (title        !== undefined) patch.title        = title;
      if (subtitle     !== undefined) patch.subtitle     = subtitle;
      if (tag          !== undefined) patch.tag          = tag;
      if (discountText !== undefined) patch.discountText = discountText;
      if (bgColor      !== undefined) patch.bgColor      = bgColor;
      if (ctaText      !== undefined) patch.ctaText      = ctaText;
      if (ctaRoute     !== undefined) patch.ctaRoute     = ctaRoute;
      if (isActive     !== undefined) patch.isActive     = isActive;
      if (sortOrder    !== undefined) patch.sortOrder    = sortOrder;
      if (expiresAt    !== undefined) patch.expiresAt    = expiresAt ? new Date(expiresAt) : null;

      const offer = await offerRepository.update(id, patch as any);
      if (!offer) return res.status(404).json({ success: false, error: { message: 'Offer not found' } });
      sendSuccess(res, offer);
    } catch (e) { next(e); }
  },

  // Admin: delete offer
  async adminDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = await offerRepository.getById(id);
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Offer not found' } });
      await offerRepository.delete(id);
      sendSuccess(res, { id });
    } catch (e) { next(e); }
  },
};
