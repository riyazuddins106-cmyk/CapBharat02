import { AppError } from '../utils/AppError.js';
import { storageService } from './storage.service.js';
import type { Express } from 'express';

export const DOCUMENT_TYPES = [
  'aadhaar_front',
  'aadhaar_back',
  'pan_card',
  'profile_photo',
  'address_proof',
  'bank_passbook',
  'police_verification',
  'service_certificate',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

async function getProIdByUserId(userId: string): Promise<string> {
  const { db } = await import('../config/database.js');
  const { sql } = await import('drizzle-orm');
  const rows = await db.execute(sql`
    SELECT id FROM professionals WHERE user_id = ${userId} LIMIT 1
  `);
  const row = (rows as any)[0] ?? (rows as any).rows?.[0];
  if (!row?.id) throw AppError.notFound('Partner profile not found.');
  return row.id as string;
}

export const documentService = {
  async listDocuments(userId: string) {
    const proId = await getProIdByUserId(userId);
    const { db } = await import('../config/database.js');
    const { sql } = await import('drizzle-orm');
    const rows = await db.execute(sql`
      SELECT id, document_type, document_url, file_name, status, rejection_reason, uploaded_at, reviewed_at
      FROM partner_documents
      WHERE professional_id = ${proId}
      ORDER BY uploaded_at DESC
    `);
    return (rows as any).rows ?? (rows as any) as any[];
  },

  async upsertDocument(userId: string, documentType: string, file: Express.Multer.File) {
    if (!DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      throw AppError.badRequest(`Invalid document type: ${documentType}`);
    }
    const proId = await getProIdByUserId(userId);
    const url = await storageService.uploadPartnerDocument(proId, documentType, file);
    const fileName = file.originalname;

    const { db } = await import('../config/database.js');
    const { sql } = await import('drizzle-orm');
    const rows = await db.execute(sql`
      INSERT INTO partner_documents (professional_id, document_type, document_url, file_name, status)
      VALUES (${proId}, ${documentType}, ${url}, ${fileName}, 'pending')
      ON CONFLICT (professional_id, document_type)
      DO UPDATE SET
        document_url     = EXCLUDED.document_url,
        file_name        = EXCLUDED.file_name,
        status           = 'pending',
        rejection_reason = NULL,
        uploaded_at      = NOW(),
        reviewed_at      = NULL
      RETURNING id, document_type, document_url, file_name, status, rejection_reason, uploaded_at, reviewed_at
    `);
    const row = (rows as any).rows?.[0] ?? (rows as any)[0];
    return row;
  },

  async deleteDocument(userId: string, docId: string) {
    const proId = await getProIdByUserId(userId);
    const { db } = await import('../config/database.js');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`
      DELETE FROM partner_documents WHERE id = ${docId} AND professional_id = ${proId}
    `);
  },
};
