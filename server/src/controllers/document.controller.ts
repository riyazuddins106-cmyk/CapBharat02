import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { documentService } from '../services/document.service.js';
import { AppError } from '../utils/AppError.js';

export const documentController = {
  listDocuments: asyncHandler(async (req: Request, res: Response) => {
    const data = await documentService.listDocuments(req.user!.userId);
    res.json({ success: true, data });
  }),

  uploadDocument: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest('No file uploaded. Use the "file" field.');
    const { documentType } = req.body as { documentType?: string };
    if (!documentType) throw AppError.badRequest('documentType is required.');
    const data = await documentService.upsertDocument(req.user!.userId, documentType, req.file);
    res.json({ success: true, data });
  }),

  deleteDocument: asyncHandler(async (req: Request, res: Response) => {
    await documentService.deleteDocument(req.user!.userId, req.params.id);
    res.json({ success: true, data: { message: 'Document deleted' } });
  }),
};
