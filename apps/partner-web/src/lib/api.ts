// Use the Vite proxy for local development and the API's public port when the
// app is opened through a Replit preview host. A relative /api request on the
// preview host is routed to the wrong artifact and returns 502.
function getApiOrigin(): string {
  if (typeof window === 'undefined') return '';
  const { hostname, protocol, port } = window.location;
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || port === '4000';
  const isReplitPreview = hostname.endsWith('.replit.dev') || hostname.endsWith('.repl.co');
  return !isLocalDev && isReplitPreview ? `${protocol}//${hostname}:8000` : '';
}

const API_BASE = getApiOrigin();

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let _refreshHandler: (() => Promise<string | null>) | null = null;
/** Deduplicates concurrent 401 refresh attempts — only one refresh runs at a time. */
let _refreshPromise: Promise<string | null> | null = null;

export function setRefreshHandler(fn: (() => Promise<string | null>) | null) {
  _refreshHandler = fn;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const doFetch = (t?: string) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...init.headers,
      },
    });

  let res = await doFetch(token);
  if (res.status === 401 && token && _refreshHandler) {
    // If another request already started a refresh, reuse that promise
    // instead of firing a second one (avoids token revocation race conditions).
    if (!_refreshPromise) {
      _refreshPromise = _refreshHandler()
        .catch(() => null)
        .finally(() => { _refreshPromise = null; });
    }
    const newToken = await _refreshPromise;
    if (newToken) res = await doFetch(newToken);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error?.message ?? 'Request failed');
  return json.data as T;
}

// ── Types ──────────────────────────────────────────────────
export interface User {
  id: string; username: string; email: string; fullName: string;
  phone: string | null; avatarUrl: string | null; role: string;
}
export interface AuthTokens { accessToken: string; refreshToken: string; user: User; }

export interface PartnerProfile {
  id: string; userId: string; name: string; title: string; bio: string;
  rating: number; reviewCount: number; basePrice: number; priceUnit: string;
  badge: string | null; avatarUrl: string | null; tags: string[]; isActive: boolean;
  categoryId: string;
  subCategoryId: string | null;
  payoutUpiId: string | null;
  availabilityStatus?: 'available' | 'busy' | 'offline';
}
export type JobStatus = 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export interface JobService {
  serviceId: string;
  name: string;
  quantity: number;
  duration: number;        // minutes
  unitPartnerPayout: number;
}
export interface Job {
  id: string; customerId: string; professionalId: string; serviceName: string;
  proName: string; scheduledAt: string; status: JobStatus; notes: string | null;
  price: number; createdAt: string; updatedAt: string;
  customerName: string | null; customerPhone: string | null;
  paymentStatus?: string | null;
  services?: JobService[];
  completedAt?: string | null;
  address?: {
    line1: string; line2?: string | null; city: string; state: string; postalCode: string;
    latitude?: number | null; longitude?: number | null;
  } | null;
}
export interface OrderItemJob {
  requestId?: string | null;
  orderItemId: string;
  orderId: string;
  serviceId: string;
  serviceName?: string;
  customerName?: string;
  status?: string;
  scheduledAt: string;
  durationMinutes: number;
  partnerPayout: number;
  customerPrice?: number;
  orderStatus?: string;
  createdAt?: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  cashReportedAt?: string | null;
  cashConfirmedAt?: string | null;
}
export interface OrderItemJobs {
  pendingRequests: OrderItemJob[];
  activeJobs: OrderItemJob[];
  completedJobs: OrderItemJob[];
}
export interface Earnings {
  total: number; thisMonth: number; today: number;
  pendingPayout: number; paidOut: number; available: number;
  weekly: { date: string; amount: number }[];
}
export interface PartnerScheduleJob {
  id: string; jobType: 'booking' | 'order_item'; serviceName: string; scheduledAt: string; endTime: string;
  status: string; customerName: string | null; customerPhone: string | null; payout: number;
  durationMinutes: number; address: Job['address']; handoffPending?: boolean;
}
export interface PartnerPerformance {
  rating: number; reviewCount: number; jobsCompleted: number; totalJobs: number;
  completionRate: number; cancellationRate: number; acceptanceRate: number; onTimeArrival: number | null;
}
export interface PartnerEvidence {
  id: string; professionalId: string; bookingId: string | null; orderItemId: string | null;
  phase: 'before' | 'after'; fileUrl: string; fileName: string | null; createdAt: string;
}
export interface AppNotification {
  id: string; title: string; body: string; type: string;
  isRead: boolean; createdAt: string;
}

export interface Payout {
  id: string; amount: number; status: string;
  note: string | null; requestedAt: string; resolvedAt: string | null;
}

// ── Categories ─────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  description?: string | null;
  iconName: string;
  color: string;
  iconColor: string;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  featured: boolean;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  featured: boolean;
}

export const categoriesApi = {
  list: () => request<Category[]>('/api/categories'),
  getSubcategories: (categoryId: string) =>
    request<SubCategory[]>(`/api/categories/${categoryId}/subcategories`),
};

export type DocumentStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 're_upload_required' | 'expired';

export interface PartnerDocument {
  id: string;
  document_type: string;
  document_url: string;
  file_name: string | null;
  status: DocumentStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  version: number;
  expiry_date: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

export interface DocumentTypeConfig {
  id: string;
  type_key: string;
  label: string;
  description: string | null;
  emoji: string;
  is_mandatory: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface PartnerDocumentHistory {
  id: string;
  document_type: string;
  document_url: string;
  file_name: string | null;
  status: DocumentStatus;
  rejection_reason: string | null;
  version: number;
  uploaded_at: string;
  reviewed_at: string | null;
  archived_at: string;
}

export interface RegisterPartnerResponse {
  userId: string;
  email: string;
  devCode?: string;
  expiresInSeconds?: number;
  resendAfterSeconds?: number;
}

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<AuthTokens>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  registerPartner: (data: { fullName: string; email: string; phone?: string; password: string; categoryId: string; subCategoryId: string; title: string; city: string; area?: string; pincode?: string }) =>
    request<RegisterPartnerResponse>('/api/auth/register-partner', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (email: string, code: string, purpose: 'signup' | 'login' | 'password_reset') =>
    request<AuthTokens>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code, purpose }) }),
  resendOtp: (email: string, purpose: 'signup' | 'login' | 'password_reset') =>
    request<{ message: string; devCode?: string; expiresInSeconds?: number; resendAfterSeconds?: number }>('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email, purpose }) }),
  refresh: (refreshToken: string) =>
    request<AuthTokens>('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  // Server expects { refreshToken } in body, not a Bearer header
  logout: (refreshToken: string) =>
    request<void>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  forgotPassword: (email: string) =>
    request<{ message: string; devCode?: string; expiresInSeconds?: number; resendAfterSeconds?: number }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) }),
};

// ── Partner ────────────────────────────────────────────────
export const partnerApi = {
  getProfile: (token: string) => request<PartnerProfile>('/api/partner/profile', { token }),
  updateProfile: (data: Partial<Pick<PartnerProfile, 'title' | 'bio' | 'basePrice' | 'priceUnit' | 'tags' | 'badge' | 'categoryId' | 'subCategoryId' | 'payoutUpiId'>>, token: string) =>
    request<PartnerProfile>('/api/partner/profile', { method: 'PATCH', body: JSON.stringify(data), token }),
  updateAccount: (data: { fullName?: string }, token: string) =>
    request<{ message: string }>('/api/partner/account', { method: 'PATCH', body: JSON.stringify(data), token }),
  requestIdentityChange: (field: 'email' | 'phone', value: string, token: string) =>
    request<{ field: 'email' | 'phone'; target: string; expiresInMinutes: number; devCode?: string }>('/api/profile/me/identity/request', {
      method: 'POST', body: JSON.stringify({ field, value }), token,
    }),
  verifyIdentityChange: (field: 'email' | 'phone', value: string, code: string, token: string) =>
    request<User>('/api/profile/me/identity/verify', {
      method: 'POST', body: JSON.stringify({ field, value, code }), token,
    }),
  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>('/api/profile/me/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }), token }),
  listJobs: (token: string) => request<Job[]>('/api/partner/jobs', { token }),
  listOrderItemJobs: (token: string) =>
    request<OrderItemJobs>('/api/partner/order-item-jobs', { token }),
  acceptOrderItemJob: (requestId: string, token: string) =>
    request<OrderItemJob>(`/api/partner/order-item-jobs/${requestId}/accept`, { method: 'PATCH', token }),
  rejectOrderItemJob: (requestId: string, token: string) =>
    request<{ message: string }>(`/api/partner/order-item-jobs/${requestId}/reject`, { method: 'PATCH', token }),
  passOrderItemJob: (itemId: string, reason: string, token: string) =>
    request<{ offeredCount: number; remainsAssigned: boolean; message: string }>(`/api/partner/order-item-jobs/${itemId}/pass`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
      token,
    }),
  checkInOrderItem: (itemId: string, qrToken: string, token: string) =>
    request<OrderItemJob>(`/api/partner/order-item-jobs/${itemId}/checkin`, {
      method: 'PATCH',
      body: JSON.stringify({ qrToken }),
      token,
    }),
  completeOrderItem: (itemId: string, token: string) =>
    request<OrderItemJob>(`/api/partner/order-item-jobs/${itemId}/complete`, { method: 'PATCH', token }),
  confirmCashPayment: (itemId: string, token: string) =>
    request<{ item: OrderItemJob; payment: { status: string } }>(`/api/partner/order-item-jobs/${itemId}/confirm-cash`, { method: 'PATCH', token }),
  getJob: (id: string, token: string) => request<Job>(`/api/partner/jobs/${id}`, { token }),
  completeJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/complete`, { method: 'PATCH', token }),
  acceptJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/accept`, { method: 'PATCH', token }),
  rejectJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/reject`, { method: 'PATCH', token }),
  checkinJob: (id: string, token: string, qrToken: string) =>
    request<Job>(`/api/partner/jobs/${id}/checkin`, { method: 'PATCH', body: JSON.stringify({ qrToken }), token }),
  getEarnings: (token: string) => request<Earnings>('/api/partner/earnings', { token }),
  updateAvailability: (status: 'available' | 'busy' | 'offline', token: string) =>
    request<PartnerProfile>('/api/partner/availability', { method: 'PATCH', body: JSON.stringify({ status }), token }),
  updateLocation: (latitude: number, longitude: number, token: string) =>
    request<PartnerProfile>('/api/partner/location', { method: 'PATCH', body: JSON.stringify({ latitude, longitude }), token }),
  getSchedule: (from: string, to: string, token: string) =>
    request<PartnerScheduleJob[]>(`/api/partner/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { token }),
  getPerformance: (token: string) => request<PartnerPerformance>('/api/partner/performance', { token }),
  listEvidence: (jobType: 'booking' | 'order_item', jobId: string, token: string) =>
    request<PartnerEvidence[]>(`/api/partner/evidence?jobType=${jobType}&jobId=${encodeURIComponent(jobId)}`, { token }),
  uploadEvidence: (jobType: 'booking' | 'order_item', jobId: string, phase: 'before' | 'after', file: File, token: string) => {
    const form = new FormData();
    form.append('jobType', jobType); form.append('jobId', jobId); form.append('phase', phase); form.append('file', file);
    return fetch('/api/partner/evidence', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new ApiError(r.status, j?.error?.message ?? 'Upload failed'); return j.data as PartnerEvidence; });
  },
  reportIssue: (data: { jobType: 'booking' | 'order_item'; jobId: string; issueType: string; message: string; priority?: 'normal' | 'high' | 'urgent' }, token: string) =>
    request<{ id: string }>('/api/partner/issues', { method: 'POST', body: JSON.stringify(data), token }),
};

export const payoutsApi = {
  list: (token: string) => request<Payout[]>('/api/partner/payouts', { token }),
  request: (amount: number, note: string, token: string) =>
    request<Payout>('/api/partner/payouts', { method: 'POST', body: JSON.stringify({ amount, note }), token }),
};

export const documentsApi = {
  listTypes: (token: string) =>
    request<DocumentTypeConfig[]>('/api/partner/documents/types', { token }),
  list: (token: string) =>
    request<PartnerDocument[]>('/api/partner/documents', { token }),
  getHistory: (docType: string, token: string) =>
    request<PartnerDocumentHistory[]>(`/api/partner/documents/${encodeURIComponent(docType)}/history`, { token }),
  upload: (documentType: string, file: File, token: string, onProgress?: (pct: number) => void): Promise<PartnerDocument> => {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('documentType', documentType);
      form.append('file', file);
      const xhr = new XMLHttpRequest();
      if (onProgress) {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      xhr.open('POST', '/api/partner/documents');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onload = () => {
        try {
          const j = JSON.parse(xhr.responseText);
          if (xhr.status >= 400) { reject(new ApiError(xhr.status, j?.error?.message ?? 'Upload failed')); return; }
          resolve(j.data as PartnerDocument);
        } catch { reject(new ApiError(xhr.status, 'Upload failed')); }
      };
      xhr.onerror = () => reject(new ApiError(0, 'Network error'));
      xhr.send(form);
    });
  },
  delete: (id: string, token: string) =>
    request<{ message: string }>(`/api/partner/documents/${id}`, { method: 'DELETE', token }),
};

export const notificationsApi = {
  list:        (token: string) => request<AppNotification[]>('/api/notifications', { token }),
  markRead:    (id: string, token: string) => request<void>(`/api/notifications/${id}/read`, { method: 'PATCH', token }),
  markAllRead: (token: string) => request<void>('/api/notifications/read-all', { method: 'PATCH', token }),
  delete:      (id: string, token: string) => request<void>(`/api/notifications/${id}`, { method: 'DELETE', token }),
  unreadCount: (token: string) => request<{ count: number }>('/api/notifications/unread-count', { token }),
};
