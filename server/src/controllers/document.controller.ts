import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { documentService } from '../services/document.service.js';
import { AppError } from '../utils/AppError.js';

export const documentController = {
  // ── Partner endpoints ──────────────────────────────────────────────────

  listDocumentTypes: asyncHandler(async (req: Request, res: Response) => {
    const data = await documentService.getDocumentTypes();
    res.json({ success: true, data });
  }),

  listDocuments: asyncHandler(async (req: Request, res: Response) => {
    const data = await documentService.listDocuments(req.user!.userId);
    res.json({ success: true, data });
  }),

  getDocumentHistory: asyncHandler(async (req: Request, res: Response) => {
    const { docType } = req.params as { docType: string };
    const data = await documentService.getDocumentHistory(req.user!.userId, docType);
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

  // ── Admin endpoints ────────────────────────────────────────────────────

  adminListDocuments: asyncHandler(async (req: Request, res: Response) => {
    const { status, proId } = req.query as { status?: string; proId?: string };
    const data = await documentService.adminListDocuments({ status, proId });
    res.json({ success: true, data });
  }),

  adminGetDocumentHistory: asyncHandler(async (req: Request, res: Response) => {
    const data = await documentService.adminGetDocumentHistory(req.params.id);
    res.json({ success: true, data });
  }),

  adminUpdateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status, reason } = req.body as { status?: string; reason?: string };
    if (!status) throw AppError.badRequest('status is required.');
    const data = await documentService.adminUpdateDocumentStatus(
      req.params.id,
      status as any,
      reason?.trim() || null,
      req.user!.userId,
    );
    res.json({ success: true, data });
  }),

  // Admin: Document type config CRUD

  adminListDocumentTypes: asyncHandler(async (req: Request, res: Response) => {
    const data = await documentService.adminListDocumentTypes();
    res.json({ success: true, data });
  }),

  adminCreateDocumentType: asyncHandler(async (req: Request, res: Response) => {
    const { typeKey, label, description, emoji, isMandatory, sortOrder } = req.body;
    if (!typeKey || !label) throw AppError.badRequest('typeKey and label are required.');
    const data = await documentService.adminCreateDocumentType({
      typeKey, label, description, emoji, isMandatory, sortOrder,
    });
    res.json({ success: true, data });
  }),

  adminUpdateDocumentType: asyncHandler(async (req: Request, res: Response) => {
    const { label, description, emoji, isMandatory, sortOrder, isActive } = req.body;
    const data = await documentService.adminUpdateDocumentType(req.params.id, {
      label, description, emoji, isMandatory, sortOrder, isActive,
    });
    res.json({ success: true, data });
  }),

  adminDeleteDocumentType: asyncHandler(async (req: Request, res: Response) => {
    await documentService.adminDeleteDocumentType(req.params.id);
    res.json({ success: true, data: { message: 'Document type deleted' } });
  }),
};
