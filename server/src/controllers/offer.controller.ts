import { Request, Response, NextFunction } from 'express';
import { offerRepository } from '../repositories/offer.repository.js';
import { storageService } from '../services/storage.service.js';
import { AppError } from '../utils/AppError.js';
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

  // Admin: upload banner image
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw AppError.badRequest('No image file provided.');
      const url = await storageService.uploadBannerImage(`banner-${Date.now()}`, req.file);
      sendSuccess(res, { url });
    } catch (e) { next(e); }
  },

  // Admin: create offer
  async adminCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        title, subtitle, description, tag, discountText, bgColor,
        imageUrl, altText, ctaText, ctaRoute,
        textPosition, overlayColor, overlayOpacity, animation,
        priority, status, isActive, sortOrder,
        startDate, endDate, expiresAt,
      } = req.body as Record<string, any>;

      if (!title?.trim()) throw AppError.badRequest('Title is required.');

      const offer = await offerRepository.create({
        title:          title.trim(),
        subtitle:       subtitle       ?? '',
        description:    description    ?? null,
        tag:            tag            ?? 'LIMITED OFFER',
        discountText:   discountText   ?? '',
        bgColor:        bgColor        ?? '#5B3EF5',
        imageUrl:       imageUrl       ?? null,
        altText:        altText        ?? null,
        ctaText:        ctaText        ?? 'Book Now',
        ctaRoute:       ctaRoute       ?? '/(tabs)/services',
        textPosition:   textPosition   ?? 'bottom-left',
        overlayColor:   overlayColor   ?? '#000000',
        overlayOpacity: overlayOpacity != null ? Number(overlayOpacity) : 0.3,
        animation:      animation      ?? 'slide',
        priority:       priority != null ? Number(priority) : 0,
        status:         status         ?? 'active',
        isActive:       isActive       ?? true,
        sortOrder:      sortOrder != null ? Number(sortOrder) : 0,
        startDate:      startDate      ? new Date(startDate) : null,
        endDate:        endDate        ? new Date(endDate)   : null,
        expiresAt:      expiresAt      ? new Date(expiresAt) : null,
      });
      sendSuccess(res, offer, 201);
    } catch (e) { next(e); }
  },

  // Admin: update offer
  async adminUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        title, subtitle, description, tag, discountText, bgColor,
        imageUrl, altText, ctaText, ctaRoute,
        textPosition, overlayColor, overlayOpacity, animation,
        priority, status, isActive, sortOrder,
        startDate, endDate, expiresAt,
      } = req.body as Record<string, any>;

      const patch: Record<string, unknown> = {};
      if (title        !== undefined) patch.title        = title;
      if (subtitle     !== undefined) patch.subtitle     = subtitle;
      if (description  !== undefined) patch.description  = description;
      if (tag          !== undefined) patch.tag          = tag;
      if (discountText !== undefined) patch.discountText = discountText;
      if (bgColor      !== undefined) patch.bgColor      = bgColor;
      if (imageUrl     !== undefined) patch.imageUrl     = imageUrl;
      if (altText      !== undefined) patch.altText      = altText;
      if (ctaText      !== undefined) patch.ctaText      = ctaText;
      if (ctaRoute     !== undefined) patch.ctaRoute     = ctaRoute;
      if (textPosition !== undefined) patch.textPosition = textPosition;
      if (overlayColor !== undefined) patch.overlayColor = overlayColor;
      if (overlayOpacity !== undefined) patch.overlayOpacity = Number(overlayOpacity);
      if (animation    !== undefined) patch.animation    = animation;
      if (priority     !== undefined) patch.priority     = Number(priority);
      if (status       !== undefined) patch.status       = status;
      if (isActive     !== undefined) patch.isActive     = isActive;
      if (sortOrder    !== undefined) patch.sortOrder    = Number(sortOrder);
      if (startDate    !== undefined) patch.startDate    = startDate ? new Date(startDate) : null;
      if (endDate      !== undefined) patch.endDate      = endDate   ? new Date(endDate)   : null;
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
