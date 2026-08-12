import { AppError } from '../utils/AppError.js';
import { storageService } from './storage.service.js';
import { notificationDbService } from './notificationDb.service.js';
import type { Express } from 'express';

export const VALID_STATUSES = [
  'pending', 'under_review', 'approved', 'rejected', 're_upload_required', 'expired',
] as const;
export type DocumentStatus = (typeof VALID_STATUSES)[number];

/**
 * Return professionals whose active mandatory document types all have a
 * current approved document. If Admin has not marked a type as mandatory yet,
 * a partner still needs at least one uploaded document and every current
 * upload must be approved; partners with no documents must never receive jobs.
 *
 * Keep this check server-side and reuse it for automatic dispatch, Admin
 * eligibility lists, and every manual/partner acceptance path.
 */
export async function getProfessionalsWithApprovedMandatoryDocuments(
  professionalIds: string[],
): Promise<Set<string>> {
  if (!professionalIds.length) return new Set();

  const { db, sql } = await getDb();
  const mandatoryRows = await db.execute(sql`
    SELECT type_key
    FROM document_type_configs
    WHERE is_mandatory = true AND is_active = true
  `);
  const mandatoryKeys: string[] = ((mandatoryRows as any).rows ?? (mandatoryRows as any))
    .map((row: any) => row.type_key);

  const professionalIdList = sql.join(
    professionalIds.map((professionalId) => sql`${professionalId}::uuid`),
    sql`, `,
  );
  const documentRows = await db.execute(sql`
    SELECT professional_id, document_type, status
    FROM partner_documents
    WHERE professional_id IN (${professionalIdList})
  `);
  const approvedByProfessional = new Map<string, Set<string>>();
  const documentCounts = new Map<string, { total: number; approved: number }>();
  for (const row of ((documentRows as any).rows ?? (documentRows as any)) as any[]) {
    const counts = documentCounts.get(row.professional_id) ?? { total: 0, approved: 0 };
    counts.total += 1;
    if (row.status === 'approved') counts.approved += 1;
    documentCounts.set(row.professional_id, counts);
    if (row.status !== 'approved') continue;
    if (!approvedByProfessional.has(row.professional_id)) {
      approvedByProfessional.set(row.professional_id, new Set());
    }
    approvedByProfessional.get(row.professional_id)!.add(row.document_type);
  }

  if (!mandatoryKeys.length) {
    return new Set(
      professionalIds.filter((professionalId) => {
        const approved = approvedByProfessional.get(professionalId);
        const counts = documentCounts.get(professionalId);
        return Boolean(
          counts && counts.total > 0 && counts.total === counts.approved &&
          approved && approved.size > 0,
        );
      }),
    );
  }

  return new Set(
    professionalIds.filter((professionalId) => {
      const approved = approvedByProfessional.get(professionalId) ?? new Set<string>();
      return mandatoryKeys.every((key) => approved.has(key));
    }),
  );
}

async function getDb() {
  const { db } = await import('../config/database.js');
  const { sql } = await import('drizzle-orm');
  return { db, sql };
}

async function getProIdByUserId(userId: string): Promise<string> {
  const { db, sql } = await getDb();
  const rows = await db.execute(sql`SELECT id FROM professionals WHERE user_id = ${userId} LIMIT 1`);
  const row = (rows as any)[0] ?? (rows as any).rows?.[0];
  if (!row?.id) throw AppError.notFound('Partner profile not found.');
  return row.id as string;
}

async function getPartnerUserIdByDocId(docId: string): Promise<string | null> {
  const { db, sql } = await getDb();
  const rows = await db.execute(sql`
    SELECT u.id AS user_id
    FROM partner_documents pd
    JOIN professionals p ON p.id = pd.professional_id
    JOIN users u ON u.id = p.user_id
    WHERE pd.id = ${docId}
    LIMIT 1
  `);
  const row = (rows as any).rows?.[0] ?? (rows as any)[0];
  return row?.user_id ?? null;
}

async function getDocTypeLabel(docType: string): Promise<string> {
  const { db, sql } = await getDb();
  const rows = await db.execute(sql`SELECT label FROM document_type_configs WHERE type_key = ${docType} LIMIT 1`);
  const row = (rows as any).rows?.[0] ?? (rows as any)[0];
  return row?.label ?? docType.replace(/_/g, ' ');
}

function _computeOverallStatus(r: {
  approved_count: number | string; pending_count: number | string;
  rejected_count: number | string; re_upload_count: number | string;
  under_review_count: number | string; expired_count?: number | string;
  uploaded_count: number | string; total_required: number | string;
}): string {
  const approved    = Number(r.approved_count    ?? 0);
  const rejected    = Number(r.rejected_count    ?? 0);
  const reUpload    = Number(r.re_upload_count   ?? 0);
  const pending     = Number(r.pending_count     ?? 0);
  const underReview = Number(r.under_review_count ?? 0);
  const uploaded    = Number(r.uploaded_count    ?? 0);
  const required    = Number(r.total_required    ?? 0);

  if (uploaded === 0)                        return 'no_documents';
  if (rejected > 0)                          return 'rejected';
  if (reUpload > 0)                          return 'action_required';
  // When no document types are mandatory, approval is complete once every
  // uploaded document is approved. The old required > 0 guard made partners
  // with fully approved optional documents appear as "pending" forever.
  if (
    (required > 0 && approved >= required) ||
    (required === 0 && approved === uploaded)
  ) return 'approved';
  if (underReview > 0 || pending > 0)        return 'pending';
  return 'pending';
}

export const documentService = {
  // ── Partner: Document Types ──────────────────────────────────────────────

  async getDocumentTypes() {
    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      SELECT id, type_key, label, description, emoji, is_mandatory, sort_order, is_active
      FROM document_type_configs
      WHERE is_active = true
      ORDER BY sort_order ASC, label ASC
    `);
    return (rows as any).rows ?? (rows as any) as any[];
  },

  // ── Partner: Current Documents ──────────────────────────────────────────

  async listDocuments(userId: string) {
    const proId = await getProIdByUserId(userId);
    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      SELECT id, document_type, document_url, file_name, status, rejection_reason,
             reviewed_by, version, expiry_date, uploaded_at, reviewed_at
      FROM partner_documents
      WHERE professional_id = ${proId}
      ORDER BY uploaded_at DESC
    `);
    return (rows as any).rows ?? (rows as any) as any[];
  },

  async getDocumentHistory(userId: string, docType: string) {
    const proId = await getProIdByUserId(userId);
    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      SELECT id, document_type, document_url, file_name, status, rejection_reason,
             version, uploaded_at, reviewed_at, archived_at
      FROM partner_document_history
      WHERE professional_id = ${proId} AND document_type = ${docType}
      ORDER BY version DESC, archived_at DESC
    `);
    return (rows as any).rows ?? (rows as any) as any[];
  },

  async upsertDocument(userId: string, documentType: string, file: Express.Multer.File) {
    const proId = await getProIdByUserId(userId);

    // Validate type against config
    const types = await documentService.getDocumentTypes();
    const validKeys = types.map((t: any) => t.type_key);
    if (!validKeys.includes(documentType)) {
      throw AppError.badRequest(`Invalid document type: ${documentType}`);
    }

    const url = await storageService.uploadPartnerDocument(proId, documentType, file);
    const fileName = file.originalname;

    const { db, sql } = await getDb();

    // Archive existing document to history before overwriting
    await db.execute(sql`
      INSERT INTO partner_document_history (
        professional_id, document_type, document_url, file_name,
        status, rejection_reason, reviewed_by, version, uploaded_at, reviewed_at
      )
      SELECT professional_id, document_type, document_url, file_name,
             status, rejection_reason, reviewed_by, version, uploaded_at, reviewed_at
      FROM partner_documents
      WHERE professional_id = ${proId} AND document_type = ${documentType}
    `);

    // Compute next version
    const versionRows = await db.execute(sql`
      SELECT COALESCE(MAX(version), 0) + 1 AS next_version
      FROM partner_document_history
      WHERE professional_id = ${proId} AND document_type = ${documentType}
    `);
    const nextVersion = ((versionRows as any).rows?.[0] ?? (versionRows as any)[0])?.next_version ?? 1;

    // Upsert current document record
    const rows = await db.execute(sql`
      INSERT INTO partner_documents
        (professional_id, document_type, document_url, file_name, status, version)
      VALUES (${proId}, ${documentType}, ${url}, ${fileName}, 'pending', ${nextVersion})
      ON CONFLICT (professional_id, document_type)
      DO UPDATE SET
        document_url     = EXCLUDED.document_url,
        file_name        = EXCLUDED.file_name,
        status           = 'pending',
        rejection_reason = NULL,
        reviewed_by      = NULL,
        version          = ${nextVersion},
        uploaded_at      = NOW(),
        reviewed_at      = NULL,
        expiry_date      = NULL
      RETURNING id, document_type, document_url, file_name, status, rejection_reason,
                reviewed_by, version, expiry_date, uploaded_at, reviewed_at
    `);
    return (rows as any).rows?.[0] ?? (rows as any)[0];
  },

  async deleteDocument(userId: string, docId: string) {
    const proId = await getProIdByUserId(userId);
    const { db, sql } = await getDb();

    // Archive to history before deleting (only non-approved docs can be deleted)
    await db.execute(sql`
      INSERT INTO partner_document_history (
        professional_id, document_type, document_url, file_name,
        status, rejection_reason, reviewed_by, version, uploaded_at, reviewed_at
      )
      SELECT professional_id, document_type, document_url, file_name,
             status, rejection_reason, reviewed_by, version, uploaded_at, reviewed_at
      FROM partner_documents
      WHERE id = ${docId} AND professional_id = ${proId} AND status != 'approved'
    `);

    await db.execute(sql`
      DELETE FROM partner_documents
      WHERE id = ${docId} AND professional_id = ${proId} AND status != 'approved'
    `);
  },

  // ── Admin: Document Review ───────────────────────────────────────────────

  async adminListDocuments(filter: { status?: string; proId?: string } = {}) {
    const { db, sql } = await getDb();

    // Build filter dynamically
    const conditions: string[] = [];
    if (filter.status) conditions.push(`pd.status = '${filter.status.replace(/'/g, "''")}'`);
    if (filter.proId)  conditions.push(`pd.professional_id = '${filter.proId.replace(/'/g, "''")}'`);
    const where = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    const rows = await db.execute(sql`
      SELECT pd.id, pd.professional_id, pd.document_type, pd.document_url, pd.file_name,
             pd.status, pd.rejection_reason, pd.reviewed_by, pd.version, pd.expiry_date,
             pd.uploaded_at, pd.reviewed_at,
             p.name AS partner_name,
             u.email AS partner_email,
             ru.full_name AS reviewer_name
      FROM partner_documents pd
      JOIN professionals p ON p.id = pd.professional_id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN users ru ON ru.id = pd.reviewed_by
      ORDER BY
        CASE pd.status
          WHEN 'pending'            THEN 1
          WHEN 'under_review'       THEN 2
          WHEN 're_upload_required' THEN 3
          WHEN 'rejected'           THEN 4
          WHEN 'expired'            THEN 5
          WHEN 'approved'           THEN 6
          ELSE 7
        END,
        pd.uploaded_at DESC
    `);
    const all = (rows as any).rows ?? (rows as any) as any[];

    // Apply filters in JS (simpler than dynamic SQL with drizzle)
    return all.filter((doc: any) => {
      if (filter.status && doc.status !== filter.status) return false;
      if (filter.proId  && doc.professional_id !== filter.proId) return false;
      return true;
    });
  },

  async adminGetDocumentHistory(docId: string) {
    const { db, sql } = await getDb();
    const current = await db.execute(sql`
      SELECT professional_id, document_type FROM partner_documents WHERE id = ${docId} LIMIT 1
    `);
    const curr = (current as any).rows?.[0] ?? (current as any)[0];
    if (!curr) throw AppError.notFound('Document not found.');

    const rows = await db.execute(sql`
      SELECT id, document_type, document_url, file_name, status, rejection_reason,
             version, uploaded_at, reviewed_at, archived_at
      FROM partner_document_history
      WHERE professional_id = ${curr.professional_id} AND document_type = ${curr.document_type}
      ORDER BY version DESC, archived_at DESC
    `);
    return (rows as any).rows ?? (rows as any) as any[];
  },

  async adminUpdateDocumentStatus(
    docId: string,
    status: DocumentStatus,
    reason: string | null,
    reviewerId: string,
  ) {
    if (!VALID_STATUSES.includes(status as any)) {
      throw AppError.badRequest(`Invalid status: ${status}`);
    }
    if ((status === 'rejected' || status === 're_upload_required') && !reason?.trim()) {
      throw AppError.badRequest('A reason is required when rejecting or requesting re-upload.');
    }

    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      UPDATE partner_documents
      SET status           = ${status},
          rejection_reason = ${reason ?? null},
          reviewed_by      = ${reviewerId},
          reviewed_at      = NOW()
      WHERE id = ${docId}
      RETURNING id, document_type, status, professional_id
    `);
    const updated = (rows as any).rows?.[0] ?? (rows as any)[0];
    if (!updated) throw AppError.notFound('Document not found.');

    // Notify partner
    try {
      const partnerUserId = await getPartnerUserIdByDocId(docId);
      if (partnerUserId) {
        const docLabel = await getDocTypeLabel(updated.document_type);
        const msgs: Record<DocumentStatus, { title: string; body: string } | null> = {
          approved:            { title: 'Document Approved ✓',  body: `Your ${docLabel} has been verified and approved.` },
          rejected:            { title: 'Document Rejected',     body: `Your ${docLabel} was rejected. Reason: ${reason}. Please re-upload.` },
          re_upload_required:  { title: 'Re-upload Required',    body: `Please re-upload your ${docLabel}. Reason: ${reason}` },
          under_review:        { title: 'Document Under Review', body: `Your ${docLabel} is being reviewed by our team.` },
          expired:             { title: 'Document Expired',      body: `Your ${docLabel} has expired. Please upload a new one.` },
          pending:             null,
        };
        const msg = msgs[status];
        if (msg) {
          await notificationDbService.create({
            userId: partnerUserId, title: msg.title, body: msg.body,
            type: 'document_status', isRead: false,
            data: { docId, docType: updated.document_type, status },
          });
        }
        if (status === 'approved') {
          await documentService._checkAndNotifyAllDocsApproved(updated.professional_id, partnerUserId);
        }
      }
    } catch (e) {
      console.error('[doc] Notification failed:', e);
    }

    return updated;
  },

  async _checkAndNotifyAllDocsApproved(proId: string, userId: string) {
    const { db, sql } = await getDb();
    const typeRows = await db.execute(sql`
      SELECT type_key FROM document_type_configs WHERE is_mandatory = true AND is_active = true
    `);
    const mandatoryKeys = ((typeRows as any).rows ?? (typeRows as any)).map((r: any) => r.type_key) as string[];
    if (mandatoryKeys.length === 0) return;

    const approvedRows = await db.execute(sql`
      SELECT document_type FROM partner_documents
      WHERE professional_id = ${proId} AND status = 'approved'
    `);
    const approved = new Set(((approvedRows as any).rows ?? (approvedRows as any)).map((r: any) => r.document_type));
    if (mandatoryKeys.every(k => approved.has(k))) {
      await notificationDbService.create({
        userId, title: 'All Documents Verified! 🎉',
        body: 'Congratulations! All mandatory documents are approved. You can now accept bookings.',
        type: 'document_all_verified', isRead: false, data: { proId },
      });
    }
  },

  // ── Admin: Document Type Config ──────────────────────────────────────────

  async adminListDocumentTypes() {
    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      SELECT id, type_key, label, description, emoji, is_mandatory, sort_order, is_active, created_at, updated_at
      FROM document_type_configs
      ORDER BY sort_order ASC, label ASC
    `);
    return (rows as any).rows ?? (rows as any) as any[];
  },

  async adminCreateDocumentType(data: {
    typeKey: string; label: string; description?: string;
    emoji?: string; isMandatory?: boolean; sortOrder?: number;
  }) {
    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      INSERT INTO document_type_configs (type_key, label, description, emoji, is_mandatory, sort_order)
      VALUES (${data.typeKey}, ${data.label}, ${data.description ?? null}, ${data.emoji ?? '📄'}, ${data.isMandatory ?? true}, ${data.sortOrder ?? 0})
      RETURNING id, type_key, label, description, emoji, is_mandatory, sort_order, is_active, created_at, updated_at
    `);
    return (rows as any).rows?.[0] ?? (rows as any)[0];
  },

  async adminUpdateDocumentType(id: string, data: {
    label?: string; description?: string; emoji?: string;
    isMandatory?: boolean; sortOrder?: number; isActive?: boolean;
  }) {
    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      UPDATE document_type_configs SET
        label        = COALESCE(${data.label        ?? null}, label),
        description  = COALESCE(${data.description  ?? null}, description),
        emoji        = COALESCE(${data.emoji        ?? null}, emoji),
        is_mandatory = COALESCE(${data.isMandatory  ?? null}, is_mandatory),
        sort_order   = COALESCE(${data.sortOrder    ?? null}, sort_order),
        is_active    = COALESCE(${data.isActive     ?? null}, is_active),
        updated_at   = NOW()
      WHERE id = ${id}
      RETURNING id, type_key, label, description, emoji, is_mandatory, sort_order, is_active, created_at, updated_at
    `);
    const row = (rows as any).rows?.[0] ?? (rows as any)[0];
    if (!row) throw AppError.notFound('Document type not found.');
    return row;
  },

  async adminDeleteDocumentType(id: string) {
    const { db, sql } = await getDb();
    await db.execute(sql`DELETE FROM document_type_configs WHERE id = ${id}`);
  },

  // ── Admin: Partner Documents Overview (one row per partner) ─────────────────

  async adminListPartners() {
    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      SELECT
        p.id                                                            AS professional_id,
        p.name                                                          AS partner_name,
        u.email                                                         AS partner_email,
        u.phone                                                         AS partner_phone,
        sc.name                                                         AS category_name,
        p.created_at                                                    AS registered_at,
        (SELECT COUNT(*) FROM document_type_configs
         WHERE is_mandatory = true AND is_active = true)               AS total_required,
        COUNT(pd.id)                                                    AS uploaded_count,
        COUNT(CASE WHEN pd.status = 'approved'           THEN 1 END)  AS approved_count,
        COUNT(CASE WHEN pd.status = 'pending'            THEN 1 END)  AS pending_count,
        COUNT(CASE WHEN pd.status = 'rejected'           THEN 1 END)  AS rejected_count,
        COUNT(CASE WHEN pd.status = 're_upload_required' THEN 1 END)  AS re_upload_count,
        COUNT(CASE WHEN pd.status = 'under_review'       THEN 1 END)  AS under_review_count,
        COUNT(CASE WHEN pd.status = 'expired'            THEN 1 END)  AS expired_count,
        MAX(pd.uploaded_at)                                            AS last_updated
      FROM professionals p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN service_categories sc ON sc.id = p.category_id
      LEFT JOIN partner_documents pd ON pd.professional_id = p.id
      GROUP BY p.id, p.name, u.email, u.phone, sc.name, p.created_at
      ORDER BY p.name ASC
    `);
    const data = (rows as any).rows ?? (rows as any) as any[];
    return data.map((r: any) => ({ ...r, overall_status: _computeOverallStatus(r) }));
  },

  // ── Admin: Partner Document Details (all docs for one partner) ──────────────

  async adminGetPartnerDocuments(proId: string) {
    const { db, sql } = await getDb();

    const pRows = await db.execute(sql`
      SELECT p.id AS professional_id, p.name AS partner_name, p.created_at AS registered_at,
             u.email AS partner_email, u.phone AS partner_phone, sc.name AS category_name
      FROM professionals p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN service_categories sc ON sc.id = p.category_id
      WHERE p.id = ${proId}
      LIMIT 1
    `);
    const partner = (pRows as any).rows?.[0] ?? (pRows as any)[0];
    if (!partner) throw AppError.notFound('Partner not found.');

    const docRows = await db.execute(sql`
      SELECT pd.id, pd.document_type, pd.document_url, pd.file_name, pd.status,
             pd.rejection_reason, pd.reviewed_by, pd.version, pd.expiry_date,
             pd.uploaded_at, pd.reviewed_at,
             p.name AS partner_name,
             u.email AS partner_email,
             ru.full_name AS reviewer_name
      FROM partner_documents pd
      JOIN professionals p ON p.id = pd.professional_id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN users ru ON ru.id = pd.reviewed_by
      WHERE pd.professional_id = ${proId}
      ORDER BY pd.uploaded_at DESC
    `);
    const documents = (docRows as any).rows ?? (docRows as any) as any[];
    const document_types = await documentService.getDocumentTypes();

    // Compute counts for overall status
    const counts = {
      approved_count:      documents.filter((d: any) => d.status === 'approved').length,
      pending_count:       documents.filter((d: any) => d.status === 'pending').length,
      rejected_count:      documents.filter((d: any) => d.status === 'rejected').length,
      re_upload_count:     documents.filter((d: any) => d.status === 're_upload_required').length,
      under_review_count:  documents.filter((d: any) => d.status === 'under_review').length,
      expired_count:       documents.filter((d: any) => d.status === 'expired').length,
      uploaded_count:      documents.length,
      total_required:      document_types.filter((t: any) => t.is_mandatory).length,
    };

    return {
      partner: { ...partner, overall_status: _computeOverallStatus(counts) },
      documents,
      document_types,
    };
  },

  // ── Admin: Review Queue ─────────────────────────────────────────────────────

  async adminGetReviewQueue(filter: { status?: string; search?: string; sort?: string } = {}) {
    const { db, sql } = await getDb();
    const rows = await db.execute(sql`
      SELECT pd.id, pd.professional_id, pd.document_type, pd.document_url, pd.file_name,
             pd.status, pd.rejection_reason, pd.reviewed_by, pd.version, pd.expiry_date,
             pd.uploaded_at, pd.reviewed_at,
             p.name  AS partner_name,
             u.email AS partner_email,
             u.phone AS partner_phone,
              sc.name AS category_name,
             ru.full_name AS reviewer_name,
             dtc.label AS document_label,
             dtc.emoji AS document_emoji
      FROM partner_documents pd
      JOIN professionals p ON p.id = pd.professional_id
      JOIN users u ON u.id = p.user_id
      LEFT JOIN service_categories sc ON sc.id = p.category_id
      LEFT JOIN users ru ON ru.id = pd.reviewed_by
      LEFT JOIN document_type_configs dtc ON dtc.type_key = pd.document_type
      ORDER BY
        CASE pd.status
          WHEN 'pending'            THEN 1
          WHEN 'under_review'       THEN 2
          WHEN 're_upload_required' THEN 3
          WHEN 'rejected'           THEN 4
          WHEN 'expired'            THEN 5
          WHEN 'approved'           THEN 6
          ELSE 7
        END,
        pd.uploaded_at DESC
    `);
    let all = (rows as any).rows ?? (rows as any) as any[];

    // Apply filters in JS
    if (filter.status) all = all.filter((d: any) => d.status === filter.status);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      all = all.filter((d: any) =>
        d.partner_name?.toLowerCase().includes(q) ||
        d.partner_email?.toLowerCase().includes(q) ||
        d.partner_phone?.toLowerCase().includes(q) ||
        d.document_type?.toLowerCase().includes(q) ||
        d.document_label?.toLowerCase().includes(q) ||
        d.professional_id?.toLowerCase().includes(q)
      );
    }
    if (filter.sort === 'oldest') all = all.reverse();
    else if (filter.sort === 'name') all = all.sort((a: any, b: any) => a.partner_name.localeCompare(b.partner_name));
    else if (filter.sort === 'status') all = all.sort((a: any, b: any) => a.status.localeCompare(b.status));

    return all;
  },
};
