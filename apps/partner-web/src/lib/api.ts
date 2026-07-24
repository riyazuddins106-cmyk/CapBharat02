// Use relative URLs so the API works in both dev (vite proxy → :8000)
// and production (Express serves everything on one port).
const API_BASE = '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let _refreshHandler: (() => Promise<string | null>) | null = null;
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
    const newToken = await _refreshHandler().catch(() => null);
    if (newToken) res = await doFetch(newToken);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error?.message ?? 'Request failed');
  return json.data as T;
}

// ── Types ──────────────────────────────────────────────────
export interface User {
  id: string; email: string; fullName: string;
  phone: string | null; avatarUrl: string | null; role: string;
}
export interface AuthTokens { accessToken: string; refreshToken: string; user: User; }

export interface PartnerProfile {
  id: string; userId: string; name: string; title: string; bio: string;
  rating: number; reviewCount: number; basePrice: number; priceUnit: string;
  badge: string | null; avatarUrl: string | null; tags: string[]; isActive: boolean;
  categoryId: string;
  subCategoryId: string | null;
}
export type JobStatus = 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export interface Job {
  id: string; customerId: string; professionalId: string; serviceName: string;
  proName: string; scheduledAt: string; status: JobStatus; notes: string | null;
  price: number; createdAt: string; updatedAt: string;
  customerName: string | null; customerPhone: string | null;
}
export interface Earnings {
  total: number; thisMonth: number; today: number;
  weekly: { date: string; amount: number }[];
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

export interface RegisterPartnerResponse { userId: string; email: string; devCode?: string; }

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<AuthTokens>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  registerPartner: (data: { fullName: string; email: string; phone?: string; password: string; categoryId: string; title: string }) =>
    request<RegisterPartnerResponse>('/api/auth/register-partner', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (email: string, code: string, purpose: 'signup' | 'login' | 'password_reset') =>
    request<AuthTokens>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code, purpose }) }),
  resendOtp: (email: string) =>
    request<{ message: string }>('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  refresh: (refreshToken: string) =>
    request<AuthTokens>('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logout: (token: string) =>
    request<void>('/api/auth/logout', { method: 'POST', token }),
};

// ── Partner ────────────────────────────────────────────────
export const partnerApi = {
  getProfile: (token: string) => request<PartnerProfile>('/api/partner/profile', { token }),
  updateProfile: (data: Partial<Pick<PartnerProfile, 'title' | 'bio' | 'basePrice' | 'priceUnit' | 'tags' | 'badge' | 'categoryId' | 'subCategoryId'>>, token: string) =>
    request<PartnerProfile>('/api/partner/profile', { method: 'PATCH', body: JSON.stringify(data), token }),
  updateAccount: (data: { fullName?: string; phone?: string }, token: string) =>
    request<{ message: string }>('/api/partner/account', { method: 'PATCH', body: JSON.stringify(data), token }),
  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>('/api/profile/me/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }), token }),
  listJobs: (token: string) => request<Job[]>('/api/partner/jobs', { token }),
  getJob: (id: string, token: string) => request<Job>(`/api/partner/jobs/${id}`, { token }),
  completeJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/complete`, { method: 'PATCH', token }),
  acceptJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/accept`, { method: 'PATCH', token }),
  rejectJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/reject`, { method: 'PATCH', token }),
  checkinJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/checkin`, { method: 'PATCH', token }),
  getEarnings: (token: string) => request<Earnings>('/api/partner/earnings', { token }),
  updateAvailability: (status: 'available' | 'busy' | 'offline', token: string) =>
    request<PartnerProfile>('/api/partner/availability', { method: 'PATCH', body: JSON.stringify({ status }), token }),
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
