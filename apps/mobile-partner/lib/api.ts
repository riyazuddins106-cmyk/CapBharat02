// EXPO_PUBLIC_API_URL is set by the workflow to the current Replit dev domain
// (e.g. https://<repl-id>.sisko.replit.dev). That domain's port-5000 vite server
// already proxies /api → the Express server on port 8000, so we never need to
// hard-code a port number. This works on both native (Expo Go) and Expo web.
function getApiBase(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
}
const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Token refresh interceptor ──────────────────────────────
// AuthContext registers this after login/restore. When any request returns 401
// the client calls this to get a fresh access token, then retries once.
let _refreshHandler: (() => Promise<string | null>) | null = null;

export function setRefreshHandler(fn: (() => Promise<string | null>) | null) {
  _refreshHandler = fn;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;

  const doFetch = (t: string | undefined) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...init.headers,
      },
    });

  let res = await doFetch(token);

  // On 401, try refreshing the token once and retrying
  if (res.status === 401 && token && _refreshHandler) {
    const newToken = await _refreshHandler().catch(() => null);
    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.message ?? 'Request failed');
  }
  return json.data as T;
}

// ── Types ──────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PartnerProfile {
  id: string;
  userId: string;
  name: string;
  title: string;
  bio: string;
  rating: number;
  reviewCount: number;
  basePrice: number;
  priceUnit: string;
  badge: string | null;
  avatarUrl: string | null;
  tags: string[];
  isActive: boolean;
  categoryId: string;
}

export type JobStatus = 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  customerId: string;
  professionalId: string;
  categoryId: string;
  addressId: string | null;
  serviceName: string;
  proName: string;
  scheduledAt: string;
  status: JobStatus;
  notes: string | null;
  price: number;
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  customerPhone: string | null;
}

export interface Earnings {
  total: number;
  thisMonth: number;
  today: number;
  weekly: { date: string; amount: number }[];
}

// ── Multipart upload (avatar) — no Content-Type header so browser sets boundary ──
async function uploadFile<T>(
  path: string,
  fieldName: string,
  uri: string,
  token: string,
): Promise<T> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    // Web: fetch the local object URL as a Blob and append it
    const blobRes = await fetch(uri);
    const blob = await blobRes.blob();
    formData.append(fieldName, blob, 'avatar.jpg');
  } else {
    // Native: pass the file URI directly — React Native's FormData handles it
    const name = uri.split('/').pop() ?? 'avatar.jpg';
    const ext = /\.(\w+)$/.exec(name)?.[1] ?? 'jpg';
    formData.append(fieldName, { uri, name, type: `image/${ext}` } as any);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error?.message ?? 'Upload failed');
  return json.data as T;
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

export const categoriesApi = {
  list: () => request<Category[]>('/api/categories'),
};

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) =>
    request<AuthTokens>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: (refreshToken: string, token: string) =>
    request<void>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }), token }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST', body: JSON.stringify({ refreshToken }),
    }),

  getMe: (token: string) =>
    request<User>('/api/profile/me', { token }),

  registerPushToken: (pushToken: string, token: string) =>
    request<{ message: string }>('/api/profile/me/push-token', {
      method: 'PATCH',
      body: JSON.stringify({ pushToken }),
      token,
    }),

  forgotPassword: (email: string) =>
    request<void>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    request<void>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  resendOtp: (data: { email: string; purpose: string }) =>
    request<void>('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Partner ────────────────────────────────────────────────
export const partnerApi = {
  getProfile: (token: string) =>
    request<PartnerProfile>('/api/partner/profile', { token }),

  updateProfile: (data: Partial<Pick<PartnerProfile, 'title' | 'bio' | 'basePrice' | 'priceUnit' | 'tags' | 'badge'>>, token: string) =>
    request<PartnerProfile>('/api/partner/profile', { method: 'PATCH', body: JSON.stringify(data), token }),

  updateAccount: (data: { fullName?: string; phone?: string }, token: string) =>
    request<{ message: string }>('/api/partner/account', { method: 'PATCH', body: JSON.stringify(data), token }),

  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>('/api/profile/me/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }), token }),

  uploadAvatar: (uri: string, token: string) =>
    uploadFile<PartnerProfile>('/api/partner/profile/avatar', 'avatar', uri, token),

  listJobs: (token: string) =>
    request<Job[]>('/api/partner/jobs', { token }),

  getJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}`, { token }),

  acceptJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/accept`, { method: 'PATCH', token }),

  rejectJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/reject`, { method: 'PATCH', token }),

  checkIn: (id: string, qrToken: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/checkin`, { method: 'PATCH', body: JSON.stringify({ qrToken }), token }),

  completeJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/complete`, { method: 'PATCH', token }),

  getEarnings: (token: string) =>
    request<Earnings>('/api/partner/earnings', { token }),
};

// ── Notifications ──────────────────────────────────────────
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data?: Record<string, unknown> | null;
  createdAt: string;
}

export const notificationsApi = {
  list:        (token: string) => request<AppNotification[]>('/api/notifications', { token }),
  markRead:    (id: string, token: string) => request<void>(`/api/notifications/${id}/read`, { method: 'PATCH', token }),
  markAllRead: (token: string) => request<void>('/api/notifications/read-all', { method: 'PATCH', token }),
  delete:      (id: string, token: string) => request<void>(`/api/notifications/${id}`, { method: 'DELETE', token }),
  unreadCount: (token: string) => request<{ count: number }>('/api/notifications/unread-count', { token }),
};
