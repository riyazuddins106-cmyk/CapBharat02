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

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<AuthTokens>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
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
};

export const notificationsApi = {
  list:        (token: string) => request<AppNotification[]>('/api/notifications', { token }),
  markRead:    (id: string, token: string) => request<void>(`/api/notifications/${id}/read`, { method: 'PATCH', token }),
  markAllRead: (token: string) => request<void>('/api/notifications/read-all', { method: 'PATCH', token }),
  delete:      (id: string, token: string) => request<void>(`/api/notifications/${id}`, { method: 'DELETE', token }),
  unreadCount: (token: string) => request<{ count: number }>('/api/notifications/unread-count', { token }),
};
