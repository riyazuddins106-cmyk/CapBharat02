/**
 * Document Verification Module — refactored to partner-based architecture
 *
 * Sub-views:
 *  1. Partner Documents  — one row per partner, overall verification status
 *  2. Partner Detail     — all docs for one partner, per-document review actions
 *  3. Review Queue       — filterable list of all documents needing attention
 *  4. Document Types     — admin CRUD for document type configuration
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ShieldCheck, Shield, Eye, Download, History as HistoryIcon,
  Pencil, Plus, Trash2, RefreshCw, Loader2, CheckCircle, AlertCircle,
  X, ExternalLink, ChevronLeft, Search, ArrowUpDown, Filter,
  FileText, Clock, User, Mail, Phone, Calendar, Building2,
} from "lucide-react";
import {
  adminApi,
  type PartnerDocSummaryRow,
  type PartnerWithDocuments,
  type ReviewQueueRow,
  type PartnerDocumentRow,
  type PartnerDocumentHistoryRow,
  type DocumentTypeConfigRow,
  type DocumentStatus,
} from "@/lib/api";

/* ─── UI Constants ─────────────────────────────────────────────────────────── */
const CARD      = { background: "rgba(255,255,255,0.04)" } as const;
const MODAL_BG  = { background: "#1a2035" } as const;
const INPUT_STY = { background: "rgba(255,255,255,0.05)", WebkitAppearance: "none" } as const;

/* ─── Status Styles ────────────────────────────────────────────────────────── */
const DOC_STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending:            { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  label: "Pending"          },
  under_review:       { color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  label: "Under Review"     },
  approved:           { color: "#16A34A", bg: "rgba(22,163,74,0.12)",   label: "Approved"         },
  rejected:           { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   label: "Rejected"         },
  re_upload_required: { color: "#F97316", bg: "rgba(249,115,22,0.12)",  label: "Re-upload Needed" },
  expired:            { color: "#6B7280", bg: "rgba(107,114,128,0.12)", label: "Expired"          },
};

const PARTNER_STATUS_STYLES: Record<string, { color: string; bg: string; label: string; border: string }> = {
  approved:        { color: "#16A34A", bg: "rgba(22,163,74,0.12)",    label: "Fully Approved",       border: "rgba(22,163,74,0.3)"    },
  pending:         { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",   label: "Pending Verification", border: "rgba(245,158,11,0.3)"   },
  action_required: { color: "#F97316", bg: "rgba(249,115,22,0.12)",   label: "Action Required",      border: "rgba(249,115,22,0.3)"   },
  rejected:        { color: "#EF4444", bg: "rgba(239,68,68,0.12)",    label: "Rejected",             border: "rgba(239,68,68,0.3)"    },
  no_documents:    { color: "#6B7280", bg: "rgba(107,114,128,0.12)",  label: "No Documents",         border: "rgba(107,114,128,0.3)"  },
};

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

async function downloadDoc(url: string, docType: string, partnerName: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = url.split("?")[0].split(".").pop() ?? "jpg";
    const filename = `${partnerName.replace(/\s+/g, "_")}_${docType}.${ext}`;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status, style = "doc" }: { status: string; style?: "doc" | "partner" }) {
  const map = style === "partner" ? PARTNER_STATUS_STYLES : DOC_STATUS_STYLES;
  const st = map[status] ?? DOC_STATUS_STYLES["pending"];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
      style={{ background: st.bg, color: st.color }}
    >
      {st.label}
    </span>
  );
}

/* ─── Local Modal wrapper ───────────────────────────────────────────────────── */
function Modal({
  title, onClose, children, wide = false,
}: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className={`w-full rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto ${wide ? "max-w-2xl" : "max-w-md"}`}
        style={MODAL_BG}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  ) as unknown as React.ReactElement;
}

/* ─── Shared Modals ─────────────────────────────────────────────────────────── */

function PreviewModal({
  doc, partnerName, onClose,
}: {
  doc: { document_url: string; document_type: string; version: number; uploaded_at: string };
  partnerName: string;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)" }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-white/10 overflow-hidden flex flex-col"
        style={{ ...MODAL_BG, maxHeight: "92vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
          <div>
            <p className="text-white font-bold text-sm">
              {partnerName} —{" "}
              <span className="capitalize font-normal text-white/60">
                {doc.document_type.replace(/_/g, " ")}
              </span>
            </p>
            <p className="text-white/30 text-xs mt-0.5">
              v{doc.version} · uploaded {fmtDate(doc.uploaded_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={doc.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-violet-400/25 text-violet-400 hover:bg-violet-500/10 transition-colors"
            >
              <ExternalLink size={11} /> Open
            </a>
            <button
              onClick={() => downloadDoc(doc.document_url, doc.document_type, partnerName)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-emerald-400/25 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Download size={11} /> Download
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div
          className="flex-1 overflow-auto p-4 flex items-center justify-center"
          style={{ minHeight: "300px" }}
        >
          {isImageUrl(doc.document_url) ? (
            <img
              src={doc.document_url}
              alt="document preview"
              className="max-w-full max-h-[60vh] rounded-xl object-contain"
            />
          ) : (
            <iframe
              src={doc.document_url}
              className="w-full rounded-xl border-0"
              style={{ height: "60vh" }}
              title="document preview"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  ) as unknown as React.ReactElement;
}

function ReviewModal({
  doc, partnerName, token, onClose, onSaved,
}: {
  doc: PartnerDocumentRow | ReviewQueueRow;
  partnerName: string;
  token: string;
  onClose: () => void;
  onSaved: (docId: string, newStatus: DocumentStatus) => void;
}) {
  const [status, setStatus]   = useState<DocumentStatus | "">(doc.status);
  const [reason, setReason]   = useState(doc.rejection_reason ?? "");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");

  const needsReason = status === "rejected" || status === "re_upload_required";

  async function handleSave() {
    if (!status) return;
    if (needsReason && !reason.trim()) {
      setErr("A reason is required for this status."); return;
    }
    setSaving(true); setErr("");
    try {
      await adminApi.reviewDocument(doc.id, { status, reason: needsReason ? reason.trim() : null }, token);
      onSaved(doc.id, status as DocumentStatus);
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Review — ${partnerName}`}
      onClose={onClose}
    >
      <p className="text-white/40 text-sm mb-5 capitalize">
        {(("document_label" in doc && doc.document_label) || doc.document_type).replace(/_/g, " ")} · v{doc.version}
      </p>

      <p className="text-white/50 text-xs mb-3 font-semibold uppercase tracking-wide">Set Status</p>
      <div className="space-y-2 mb-5">
        {(["approved", "under_review", "rejected", "re_upload_required", "expired"] as const).map((s) => {
          const st = DOC_STATUS_STYLES[s];
          return (
            <label
              key={s}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                status === s ? "border-violet-500/50" : "border-white/[0.07] hover:border-white/15"
              }`}
              style={{ background: status === s ? "rgba(91,62,245,0.1)" : "rgba(255,255,255,0.03)" }}
            >
              <input type="radio" className="hidden" checked={status === s} onChange={() => { setStatus(s); setErr(""); }} />
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: status === s ? "#7C5BF8" : "rgba(255,255,255,0.15)" }}
              />
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
              {(s === "rejected" || s === "re_upload_required") && (
                <span className="text-[10px] text-white/30 ml-auto">reason required</span>
              )}
            </label>
          );
        })}
      </div>

      {needsReason && (
        <div className="mb-5">
          <label className="text-white/50 text-xs block mb-1.5">
            Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setErr(""); }}
            rows={3}
            placeholder="Explain why the document was rejected or needs re-upload…"
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50 resize-none"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        </div>
      )}

      {status === "approved" && (
        <div
          className="mb-5 px-3 py-2.5 rounded-xl border border-green-400/20 text-green-400 text-xs flex items-center gap-2"
          style={{ background: "rgba(22,163,74,0.08)" }}
        >
          <CheckCircle size={12} /> Partner will be notified that this document is approved.
        </div>
      )}

      {err && (
        <p className="mb-4 text-red-400 text-xs flex items-center gap-1">
          <AlertCircle size={12} /> {err}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 border border-white/10 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !status}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Save Decision"}
        </button>
      </div>
    </Modal>
  );
}

function HistoryModal({
  doc, partnerName, token, onClose,
}: {
  doc: PartnerDocumentRow | ReviewQueueRow;
  partnerName: string;
  token: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<PartnerDocumentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDocumentHistory(doc.id, token)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [doc.id, token]);

  const docLabel = (("document_label" in doc && doc.document_label) || doc.document_type).replace(/_/g, " ");

  return (
    <Modal title={`History — ${partnerName}`} onClose={onClose}>
      <p className="text-white/40 text-sm mb-5 capitalize">{docLabel}</p>
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 size={20} className="animate-spin" style={{ color: "#5B3EF5" }} />
        </div>
      ) : history.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-8">No previous versions found</p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => {
            const st = DOC_STATUS_STYLES[h.status] ?? DOC_STATUS_STYLES["pending"];
            return (
              <div key={h.id} className="p-3 rounded-xl border border-white/[0.07]" style={CARD}>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                  <span className="text-white/25 text-[10px]">v{h.version}</span>
                </div>
                <p className="text-white/30 text-xs">Uploaded: {fmtDate(h.uploaded_at)}</p>
                {h.reviewed_at && (
                  <p className="text-white/20 text-xs">Reviewed: {fmtDate(h.reviewed_at)}</p>
                )}
                {h.archived_at && (
                  <p className="text-white/20 text-xs">Archived: {fmtDate(h.archived_at)}</p>
                )}
                {h.rejection_reason && (
                  <p
                    className="text-red-300 text-xs mt-1.5 border border-red-400/15 px-2 py-1 rounded-lg"
                    style={{ background: "rgba(239,68,68,0.06)" }}
                  >
                    {h.rejection_reason}
                  </p>
                )}
                {h.document_url && (
                  <a
                    href={h.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-violet-400 text-xs hover:underline"
                  >
                    <ExternalLink size={10} /> View file
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/* ─── Document Action Buttons ───────────────────────────────────────────────── */
function DocActions({
  doc, partnerName,
  onPreview, onHistory, onReview,
}: {
  doc: PartnerDocumentRow | ReviewQueueRow;
  partnerName: string;
  token: string;
  onPreview: () => void;
  onHistory: () => void;
  onReview: () => void;
  onStatusUpdated?: (docId: string, status: DocumentStatus) => void;
}) {
  const btn = (label: string, onClick: () => void, cls: string, icon?: React.ReactNode) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${cls}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {doc.document_url && btn("Preview",  onPreview,  "border border-violet-400/25 text-violet-400 hover:bg-violet-500/10",   <Eye size={11} />)}
      {doc.document_url && btn("Download", () => downloadDoc(doc.document_url, doc.document_type, partnerName), "border border-emerald-400/25 text-emerald-400 hover:bg-emerald-500/10", <Download size={11} />)}
      {btn("History", onHistory, "border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5",  <HistoryIcon size={11} />)}
      {btn("Review",  onReview,  "border border-violet-500/30 text-violet-300 hover:bg-violet-500/10",         <Pencil size={11} />)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   1. PARTNER LIST VIEW
═══════════════════════════════════════════════════════════════════ */

function PartnerListView({
  accessToken,
  onSelectPartner,
}: {
  accessToken: string;
  onSelectPartner: (partnerId: string, name: string) => void;
}) {
  const [partners, setPartners] = useState<PartnerDocSummaryRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("");
  const [sort,     setSort]     = useState<"name" | "status" | "progress">("name");

  const load = useCallback(async () => {
    setLoading(true);
    try { setPartners(await adminApi.getPartnersDocumentsSummary(accessToken)); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const filtered = partners
    .filter((p) => {
      if (filter && p.overall_status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.partner_name.toLowerCase().includes(q) ||
          p.partner_email?.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "status")   return a.overall_status.localeCompare(b.overall_status);
      if (sort === "progress") return Number(b.uploaded_count) - Number(a.uploaded_count);
      return a.partner_name.localeCompare(b.partner_name);
    });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partner name, email, category…"
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
            style={INPUT_STY}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
          style={INPUT_STY as React.CSSProperties}
        >
          <option value="">All statuses</option>
          {Object.entries(PARTNER_STATUS_STYLES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
          style={INPUT_STY as React.CSSProperties}
        >
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
          <option value="progress">Sort: Progress</option>
        </select>
        <button
          onClick={load}
          title="Refresh"
          className="px-3 py-2 rounded-xl text-white/40 hover:text-white border border-white/10 transition-colors"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <p className="text-white/30 text-xs mb-4">
        {filtered.length} partner{filtered.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin" style={{ color: "#5B3EF5" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-white/20">
          <Shield size={32} className="mb-3" />
          <p className="text-sm">No partners found</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => {
            const uploaded = Number(p.uploaded_count);
            const required = Number(p.total_required);
            const pct = required > 0 ? Math.round((Number(p.approved_count) / required) * 100) : 0;

            return (
              <div
                key={p.professional_id}
                className="rounded-2xl border border-white/[0.07] p-4 flex flex-wrap gap-4 items-center"
                style={CARD}
              >
                {/* Partner info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-semibold text-sm">{p.partner_name}</span>
                    {p.category_name && (
                      <span className="text-white/30 text-xs px-1.5 py-0.5 rounded bg-white/5">
                        {p.category_name}
                      </span>
                    )}
                  </div>
                  {p.partner_email && (
                    <p className="text-white/35 text-xs mb-2">{p.partner_email}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={p.overall_status} style="partner" />
                    <span className="text-white/30 text-[11px]">
                      {uploaded}/{required} docs uploaded
                    </span>
                    {p.last_updated && (
                      <span className="text-white/20 text-[10px]">
                        Updated {fmtDate(p.last_updated)}
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-white/10">
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100 ? "#16A34A" : "linear-gradient(90deg,#5b3ef5,#7c5bf8)",
                        }}
                      />
                    </div>
                    <span className="text-white/25 text-[10px] w-7 text-right">{pct}%</span>
                  </div>
                </div>

                {/* Doc count pills */}
                <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                  {Number(p.approved_count) > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: DOC_STATUS_STYLES.approved.bg, color: DOC_STATUS_STYLES.approved.color }}>
                      {p.approved_count} ✓
                    </span>
                  )}
                  {Number(p.pending_count) > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: DOC_STATUS_STYLES.pending.bg, color: DOC_STATUS_STYLES.pending.color }}>
                      {p.pending_count} pending
                    </span>
                  )}
                  {Number(p.rejected_count) > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: DOC_STATUS_STYLES.rejected.bg, color: DOC_STATUS_STYLES.rejected.color }}>
                      {p.rejected_count} rejected
                    </span>
                  )}
                  {Number(p.re_upload_count) > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: DOC_STATUS_STYLES.re_upload_required.bg, color: DOC_STATUS_STYLES.re_upload_required.color }}>
                      {p.re_upload_count} re-upload
                    </span>
                  )}
                  {Number(p.under_review_count) > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: DOC_STATUS_STYLES.under_review.bg, color: DOC_STATUS_STYLES.under_review.color }}>
                      {p.under_review_count} reviewing
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onSelectPartner(p.professional_id, p.partner_name)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
                >
                  View Documents
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. PARTNER DETAIL VIEW
═══════════════════════════════════════════════════════════════════ */

function PartnerDetailView({
  partnerId, accessToken, onBack,
}: {
  partnerId: string;
  accessToken: string;
  onBack: () => void;
}) {
  const [data,     setData]     = useState<PartnerWithDocuments | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [previewDoc, setPreviewDoc] = useState<PartnerDocumentRow | null>(null);
  const [reviewDoc,  setReviewDoc]  = useState<PartnerDocumentRow | null>(null);
  const [historyDoc, setHistoryDoc] = useState<PartnerDocumentRow | null>(null);
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminApi.getPartnerDocuments(partnerId, accessToken)); }
    finally { setLoading(false); }
  }, [partnerId, accessToken]);

  useEffect(() => { load(); }, [load]);

  function handleStatusUpdated(docId: string, newStatus: DocumentStatus) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === docId ? { ...d, status: newStatus } : d
        ),
      };
    });
    setMsg({ text: "Document status updated.", ok: true });
    setTimeout(() => setMsg(null), 3000);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin" style={{ color: "#5B3EF5" }} />
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-48 text-white/20">
      <AlertCircle size={28} className="mb-2" />
      <p className="text-sm">Partner not found</p>
      <button onClick={onBack} className="mt-3 text-violet-400 text-xs hover:underline">← Back</button>
    </div>
  );

  const { partner, documents, document_types } = data;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-5 transition-colors"
      >
        <ChevronLeft size={16} /> Partner Documents
      </button>

      {/* Toast */}
      {msg && (
        <div
          className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${
            msg.ok ? "text-green-400 border-green-400/20" : "text-red-400 border-red-400/20"
          }`}
          style={{ background: msg.ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)" }}
        >
          {msg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span className="flex-1">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="opacity-50 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Partner info card */}
      <div className="rounded-2xl border border-white/[0.07] p-5 mb-6" style={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-white font-bold text-lg">{partner.partner_name}</h2>
              <StatusBadge status={partner.overall_status} style="partner" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 mt-2">
              {partner.partner_email && (
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <Mail size={11} /> {partner.partner_email}
                </div>
              )}
              {partner.partner_phone && (
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <Phone size={11} /> {partner.partner_phone}
                </div>
              )}
              {partner.category_name && (
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <Building2 size={11} /> {partner.category_name}
                </div>
              )}
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Calendar size={11} /> Registered {fmtDate(partner.registered_at)}
              </div>
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <User size={11} /> ID: {partner.professional_id.slice(0, 8)}…
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/25 text-xs mb-1">Documents</p>
            <p className="text-white font-bold text-2xl">{documents.length}</p>
            <p className="text-white/30 text-xs">of {document_types.filter((t) => t.is_mandatory).length} required</p>
          </div>
        </div>
      </div>

      {/* Document cards */}
      <div className="space-y-4">
        {document_types.map((dt) => {
          const doc = documents.find((d) => d.document_type === dt.type_key);
          const st = doc ? (DOC_STATUS_STYLES[doc.status] ?? DOC_STATUS_STYLES["pending"]) : null;

          return (
            <div
              key={dt.type_key}
              className="rounded-2xl border p-5"
              style={{
                ...CARD,
                borderColor: doc
                  ? (st ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.07)")
                  : "rgba(255,255,255,0.04)",
              }}
            >
              {/* Doc header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dt.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{dt.label}</p>
                      {dt.is_mandatory ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-400 bg-amber-400/10">REQUIRED</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white/20 bg-white/5">OPTIONAL</span>
                      )}
                    </div>
                    {dt.description && <p className="text-white/30 text-xs mt-0.5">{dt.description}</p>}
                  </div>
                </div>
                {doc ? (
                  <StatusBadge status={doc.status} />
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-white/25 bg-white/5">
                    Not Uploaded
                  </span>
                )}
              </div>

              {doc ? (
                <>
                  {/* Doc metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div>
                      <p className="text-white/25 text-[10px] mb-0.5">Version</p>
                      <p className="text-white/60 text-xs font-semibold">v{doc.version}</p>
                    </div>
                    <div>
                      <p className="text-white/25 text-[10px] mb-0.5">Uploaded</p>
                      <p className="text-white/60 text-xs">{fmtDate(doc.uploaded_at)}</p>
                    </div>
                    {doc.reviewed_at && (
                      <div>
                        <p className="text-white/25 text-[10px] mb-0.5">Reviewed</p>
                        <p className="text-white/60 text-xs">{fmtDate(doc.reviewed_at)}</p>
                      </div>
                    )}
                    {doc.reviewer_name && (
                      <div>
                        <p className="text-white/25 text-[10px] mb-0.5">Reviewer</p>
                        <p className="text-white/60 text-xs">{doc.reviewer_name}</p>
                      </div>
                    )}
                    {doc.expiry_date && (
                      <div>
                        <p className="text-white/25 text-[10px] mb-0.5">Expires</p>
                        <p className="text-white/60 text-xs">{fmtDate(doc.expiry_date)}</p>
                      </div>
                    )}
                  </div>

                  {/* Rejection reason */}
                  {doc.rejection_reason && (
                    <div
                      className="mb-4 px-3 py-2.5 rounded-xl border border-red-400/15 text-red-300 text-xs flex items-start gap-2"
                      style={{ background: "rgba(239,68,68,0.06)" }}
                    >
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      {doc.rejection_reason}
                    </div>
                  )}

                  {/* Actions */}
                  <DocActions
                    doc={doc}
                    partnerName={partner.partner_name}
                    token={accessToken}
                    onPreview={() => setPreviewDoc(doc)}
                    onHistory={() => setHistoryDoc(doc)}
                    onReview={() => setReviewDoc(doc)}
                    onStatusUpdated={handleStatusUpdated}
                  />
                </>
              ) : (
                <p className="text-white/20 text-xs italic">
                  This partner has not uploaded this document yet.
                </p>
              )}
            </div>
          );
        })}

        {/* Extra uploaded docs not in the type config */}
        {documents.filter((d) => !document_types.find((t) => t.type_key === d.document_type)).map((doc) => (
          <div key={doc.id} className="rounded-2xl border border-white/[0.07] p-5" style={CARD}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-white font-semibold text-sm capitalize">
                  {doc.document_type.replace(/_/g, " ")}
                </p>
                <p className="text-white/30 text-xs mt-0.5">Additional document</p>
              </div>
              <StatusBadge status={doc.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-white/25 text-[10px] mb-0.5">Version</p>
                <p className="text-white/60 text-xs font-semibold">v{doc.version}</p>
              </div>
              <div>
                <p className="text-white/25 text-[10px] mb-0.5">Uploaded</p>
                <p className="text-white/60 text-xs">{fmtDate(doc.uploaded_at)}</p>
              </div>
              {doc.reviewer_name && (
                <div>
                  <p className="text-white/25 text-[10px] mb-0.5">Reviewer</p>
                  <p className="text-white/60 text-xs">{doc.reviewer_name}</p>
                </div>
              )}
            </div>
            {doc.rejection_reason && (
              <div
                className="mb-4 px-3 py-2.5 rounded-xl border border-red-400/15 text-red-300 text-xs flex items-start gap-2"
                style={{ background: "rgba(239,68,68,0.06)" }}
              >
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                {doc.rejection_reason}
              </div>
            )}
            <DocActions
              doc={doc}
              partnerName={partner.partner_name}
              token={accessToken}
              onPreview={() => setPreviewDoc(doc)}
              onHistory={() => setHistoryDoc(doc)}
              onReview={() => setReviewDoc(doc)}
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        ))}
      </div>

      {/* Modals */}
      {previewDoc && (
        <PreviewModal
          doc={previewDoc}
          partnerName={partner.partner_name}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      {reviewDoc && (
        <ReviewModal
          doc={reviewDoc}
          partnerName={partner.partner_name}
          token={accessToken}
          onClose={() => setReviewDoc(null)}
          onSaved={(id, st) => { handleStatusUpdated(id, st); setReviewDoc(null); }}
        />
      )}
      {historyDoc && (
        <HistoryModal
          doc={historyDoc}
          partnerName={partner.partner_name}
          token={accessToken}
          onClose={() => setHistoryDoc(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. REVIEW QUEUE VIEW
═══════════════════════════════════════════════════════════════════ */

function ReviewQueueView({ accessToken }: { accessToken: string }) {
  const [docs,    setDocs]    = useState<ReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState("");
  const [sort,    setSort]    = useState("latest");
  const [previewDoc, setPreviewDoc] = useState<ReviewQueueRow | null>(null);
  const [reviewDoc,  setReviewDoc]  = useState<ReviewQueueRow | null>(null);
  const [historyDoc, setHistoryDoc] = useState<ReviewQueueRow | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      setDocs(await adminApi.getDocumentReviewQueue(accessToken, {
        status: status || undefined,
        search: (q ?? search) || undefined,
        sort: sort !== "latest" ? sort : undefined,
      }));
    } finally { setLoading(false); }
  }, [accessToken, status, sort, search]);

  useEffect(() => { load(); }, [status, sort, accessToken]);

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 350);
  }

  function handleStatusUpdated(docId: string, newStatus: DocumentStatus) {
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: newStatus } : d))
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search partner, email, phone, document type…"
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
            style={INPUT_STY}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
          style={INPUT_STY as React.CSSProperties}
        >
          <option value="">All statuses</option>
          {Object.entries(DOC_STATUS_STYLES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
          style={INPUT_STY as React.CSSProperties}
        >
          <option value="latest">Latest Upload</option>
          <option value="oldest">Oldest Upload</option>
          <option value="name">Partner Name</option>
          <option value="status">Status</option>
        </select>
        <button
          onClick={() => load()}
          title="Refresh"
          className="px-3 py-2 rounded-xl text-white/40 hover:text-white border border-white/10 transition-colors"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <p className="text-white/30 text-xs mb-4">
        {docs.length} document{docs.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin" style={{ color: "#5B3EF5" }} />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-white/20">
          <ShieldCheck size={32} className="mb-3" />
          <p className="text-sm">No documents found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const st = DOC_STATUS_STYLES[doc.status] ?? DOC_STATUS_STYLES["pending"];
            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-white/[0.07] p-4 flex flex-wrap gap-4 items-start"
                style={CARD}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-semibold text-sm">{doc.partner_name}</span>
                    {doc.partner_email && (
                      <span className="text-white/30 text-xs">{doc.partner_email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    {doc.document_emoji && <span>{doc.document_emoji}</span>}
                    <span className="text-white/50 text-xs capitalize">
                      {(doc.document_label || doc.document_type).replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={doc.status} />
                    <span className="text-white/25 text-[10px]">v{doc.version}</span>
                    <span className="text-white/25 text-[10px]">{fmtDate(doc.uploaded_at)}</span>
                    {doc.reviewer_name && (
                      <span className="text-white/25 text-[10px]">· {doc.reviewer_name}</span>
                    )}
                  </div>
                  {doc.rejection_reason && (
                    <p
                      className="mt-2 text-xs text-red-300 border border-red-400/15 px-2 py-1.5 rounded-lg"
                      style={{ background: "rgba(239,68,68,0.06)" }}
                    >
                      <AlertCircle size={10} className="inline mr-1" />
                      {doc.rejection_reason}
                    </p>
                  )}
                </div>
                <DocActions
                  doc={doc}
                  partnerName={doc.partner_name}
                  token={accessToken}
                  onPreview={() => setPreviewDoc(doc)}
                  onHistory={() => setHistoryDoc(doc)}
                  onReview={() => setReviewDoc(doc)}
                  onStatusUpdated={handleStatusUpdated}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {previewDoc && (
        <PreviewModal
          doc={previewDoc}
          partnerName={previewDoc.partner_name}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      {reviewDoc && (
        <ReviewModal
          doc={reviewDoc}
          partnerName={reviewDoc.partner_name}
          token={accessToken}
          onClose={() => setReviewDoc(null)}
          onSaved={(id, st) => { handleStatusUpdated(id, st); setReviewDoc(null); }}
        />
      )}
      {historyDoc && (
        <HistoryModal
          doc={historyDoc}
          partnerName={historyDoc.partner_name}
          token={accessToken}
          onClose={() => setHistoryDoc(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   4. DOCUMENT TYPES VIEW  (migrated from App.tsx)
═══════════════════════════════════════════════════════════════════ */

function DocumentTypesView({ accessToken }: { accessToken: string }) {
  const [docTypes,      setDocTypes]      = useState<DocumentTypeConfigRow[]>([]);
  const [typesLoading,  setTypesLoading]  = useState(true);
  const [typeModal,     setTypeModal]     = useState(false);
  const [editType,      setEditType]      = useState<DocumentTypeConfigRow | null>(null);
  const [typeKey,       setTypeKey]       = useState("");
  const [typeLabel,     setTypeLabel]     = useState("");
  const [typeDesc,      setTypeDesc]      = useState("");
  const [typeEmoji,     setTypeEmoji]     = useState("📄");
  const [typeMandatory, setTypeMandatory] = useState(false);
  const [typeSaving,    setTypeSaving]    = useState(false);
  const [msg,           setMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try { setDocTypes(await adminApi.getDocumentTypes(accessToken)); }
    finally { setTypesLoading(false); }
  }, [accessToken]);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  function openTypeModal(t?: DocumentTypeConfigRow) {
    if (t) {
      setEditType(t); setTypeKey(t.type_key); setTypeLabel(t.label);
      setTypeDesc(t.description ?? ""); setTypeEmoji(t.emoji); setTypeMandatory(t.is_mandatory);
    } else {
      setEditType(null); setTypeKey(""); setTypeLabel(""); setTypeDesc(""); setTypeEmoji("📄"); setTypeMandatory(false);
    }
    setTypeModal(true);
  }

  async function saveType() {
    setTypeSaving(true);
    try {
      if (editType) {
        const updated = await adminApi.updateDocumentType(editType.id, {
          label: typeLabel, description: typeDesc, emoji: typeEmoji, isMandatory: typeMandatory,
        }, accessToken);
        setDocTypes((prev) => prev.map((t) => (t.id === editType.id ? updated : t)));
      } else {
        const created = await adminApi.createDocumentType(
          { typeKey, label: typeLabel, description: typeDesc, emoji: typeEmoji, isMandatory: typeMandatory },
          accessToken
        );
        setDocTypes((prev) => [...prev, created]);
      }
      setTypeModal(false);
      setMsg({ text: "Document type saved.", ok: true });
    } catch (e: any) {
      setMsg({ text: e.message ?? "Save failed", ok: false });
    } finally { setTypeSaving(false); }
  }

  async function toggleTypeActive(t: DocumentTypeConfigRow) {
    try {
      const updated = await adminApi.updateDocumentType(t.id, { isActive: !t.is_active }, accessToken);
      setDocTypes((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch (e: any) { setMsg({ text: e.message ?? "Failed", ok: false }); }
  }

  async function deleteType(t: DocumentTypeConfigRow) {
    if (!confirm(`Delete document type "${t.label}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteDocumentType(t.id, accessToken);
      setDocTypes((prev) => prev.filter((x) => x.id !== t.id));
      setMsg({ text: "Document type deleted.", ok: true });
    } catch (e: any) { setMsg({ text: e.message ?? "Delete failed", ok: false }); }
  }

  return (
    <div>
      {msg && (
        <div
          className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${
            msg.ok ? "text-green-400 border-green-400/20" : "text-red-400 border-red-400/20"
          }`}
          style={{ background: msg.ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)" }}
        >
          {msg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span className="flex-1">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="opacity-50 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      <div className="flex justify-between items-center mb-5">
        <p className="text-white/40 text-sm">Configure which documents partners must upload to accept bookings</p>
        <button
          onClick={() => openTypeModal()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
        >
          <Plus size={14} /> Add Type
        </button>
      </div>

      {typesLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin" style={{ color: "#5B3EF5" }} />
        </div>
      ) : docTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-white/20">
          <Shield size={32} className="mb-3" />
          <p className="text-sm">No document types configured yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...docTypes].sort((a, b) => a.sort_order - b.sort_order).map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-white/[0.07] p-4 flex items-center gap-4"
              style={CARD}
            >
              <span className="text-2xl flex-shrink-0">{t.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-white font-semibold text-sm">{t.label}</p>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      t.is_mandatory ? "text-amber-400 bg-amber-400/10" : "text-white/30 bg-white/5"
                    }`}
                  >
                    {t.is_mandatory ? "REQUIRED" : "OPTIONAL"}
                  </span>
                  {!t.is_active && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-red-400 bg-red-400/10">
                      INACTIVE
                    </span>
                  )}
                </div>
                <p className="text-white/30 text-[11px]">{t.type_key}</p>
                {t.description && <p className="text-white/40 text-xs mt-0.5">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleTypeActive(t)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                  {t.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => openTypeModal(t)}
                  className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/10 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteType(t)}
                  className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Type Modal */}
      {typeModal && (
        <Modal
          title={editType ? "Edit Document Type" : "Add Document Type"}
          onClose={() => setTypeModal(false)}
        >
          <div className="space-y-4 mb-5">
            {!editType && (
              <div>
                <label className="text-white/50 text-xs block mb-1.5">
                  Type Key <span className="text-white/25 font-normal">(snake_case, e.g. gst_certificate)</span>
                </label>
                <input
                  value={typeKey}
                  onChange={(e) =>
                    setTypeKey(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  placeholder="gst_certificate"
                />
              </div>
            )}
            <div>
              <label className="text-white/50 text-xs block mb-1.5">Label</label>
              <input
                value={typeLabel}
                onChange={(e) => setTypeLabel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
                style={{ background: "rgba(255,255,255,0.05)" }}
                placeholder="GST Certificate"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1.5">Emoji</label>
              <input
                value={typeEmoji}
                onChange={(e) => setTypeEmoji(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
                style={{ background: "rgba(255,255,255,0.05)" }}
                placeholder="📄"
                maxLength={2}
              />
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1.5">
                Description <span className="font-normal text-white/25">(optional)</span>
              </label>
              <input
                value={typeDesc}
                onChange={(e) => setTypeDesc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
                style={{ background: "rgba(255,255,255,0.05)" }}
                placeholder="Short description shown to partners"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => setTypeMandatory((m) => !m)}>
              <div
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                  typeMandatory ? "bg-violet-600" : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    typeMandatory ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-sm text-white/70">Required for all partners</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setTypeModal(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveType}
              disabled={typeSaving || !typeLabel.trim() || (!editType && !typeKey.trim())}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
            >
              {typeSaving ? <Loader2 size={14} className="animate-spin" /> : editType ? "Save Changes" : "Add Type"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT — DocumentVerificationView
═══════════════════════════════════════════════════════════════════ */

type DocSection = "partner-list" | "partner-detail" | "review-queue" | "types";

export function DocumentVerificationView({ accessToken }: { accessToken: string }) {
  const [section,   setSection]   = useState<DocSection>("partner-list");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [msg,       setMsg]       = useState<{ text: string; ok: boolean } | null>(null);

  function goToPartner(id: string) {
    setPartnerId(id);
    setSection("partner-detail");
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 pb-6">
      {/* Global toast */}
      {msg && (
        <div
          className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${
            msg.ok ? "text-green-400 border-green-400/20" : "text-red-400 border-red-400/20"
          }`}
          style={{ background: msg.ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)" }}
        >
          {msg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span className="flex-1">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="opacity-50 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {/* Sub-navigation tabs */}
      {section !== "partner-detail" && (
        <div className="flex gap-2 mb-6">
          {(
            [
              { id: "partner-list",  label: "🧑‍🤝‍🧑 Partner Documents" },
              { id: "review-queue",  label: "📋 Review Queue"        },
              { id: "types",         label: "⚙️ Document Types"      },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                section === tab.id
                  ? "text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
              style={
                section === tab.id
                  ? { background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }
                  : { background: "rgba(255,255,255,0.04)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Sub-views */}
      {section === "partner-list" && (
        <PartnerListView
          accessToken={accessToken}
          onSelectPartner={(id) => goToPartner(id)}
        />
      )}
      {section === "partner-detail" && partnerId && (
        <PartnerDetailView
          partnerId={partnerId}
          accessToken={accessToken}
          onBack={() => setSection("partner-list")}
        />
      )}
      {section === "review-queue" && (
        <ReviewQueueView accessToken={accessToken} />
      )}
      {section === "types" && (
        <DocumentTypesView accessToken={accessToken} />
      )}
    </div>
  );
}
