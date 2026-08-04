import { Platform } from 'react-native';

// EXPO_PUBLIC_API_URL is set by the workflow to the current Replit dev domain
// (e.g. https://<repl-id>.sisko.replit.dev). That domain's port-5000 vite server
// already proxies /api → the Express server on port 8000, so we never need to
// hard-code a port number. This works on both native (Expo Go) and Expo web.
function getApiBase(): string {
  const envBase = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  if (envBase) return envBase;

  // Web-only fallback: strip Expo dev-server port (8080/8082/19006) so API
  // requests reach the Replit proxy rather than the Metro HTML server.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const expoDevPorts = new Set(['8080', '8081', '8082', '8099', '19006']);
    if (expoDevPorts.has(port)) {
      return `${protocol}//${hostname}`;
    }
    return window.location.origin;
  }

  return '';
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

const REQUEST_TIMEOUT_MS = 8000;

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;

  const doFetch = (t: string | undefined) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    return fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...init.headers,
      },
    }).finally(() => clearTimeout(timer));
  };

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
  availabilityStatus?: 'available' | 'offline' | 'busy';
  currentBookingStatus?: string;
}

export type JobStatus = 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export interface JobService {
  name: string;
  quantity: number;
  unitPartnerPayout: number;
  duration: number;
  lineTotal: number;
}

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
  services?: JobService[];
  paymentStatus?: string | null;
}

export interface Earnings {
  total: number;
  thisMonth: number;
  today: number;
  weekly: { date: string; amount: number }[];
}

export interface OrderItemJob {
  requestId?: string;
  orderItemId: string;
  orderId: string;
  serviceId: string;
  status?: string;
  scheduledAt: string;
  durationMinutes: number;
  partnerPayout: number;
  customerPrice?: number;
  orderStatus?: string;
  createdAt?: string;
}

export interface OrderItemJobs {
  pendingRequests: OrderItemJob[];
  activeJobs: OrderItemJob[];
  completedJobs: OrderItemJob[];
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

  registerPartner: (data: { fullName: string; email: string; password: string; phone?: string; categoryId: string; title: string; city: string; area?: string; pincode?: string }) =>
    request<{ userId: string; email: string; devCode?: string }>('/api/auth/register-partner', { method: 'POST', body: JSON.stringify(data) }),

  verifyOtp: (data: { email: string; code: string; purpose: string }) =>
    request<AuthTokens>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Partner ────────────────────────────────────────────────
export const partnerApi = {
  getProfile: (token: string) =>
    request<PartnerProfile>('/api/partner/profile', { token }),

  updateAvailability: (availabilityStatus: 'available' | 'offline' | 'busy', token: string) =>
    request<PartnerProfile>('/api/partner/availability', {
      method: 'PATCH',
      body: JSON.stringify({ availabilityStatus }),
      token,
    }),

  updateLocation: (latitude: number, longitude: number, token: string) =>
    request<PartnerProfile>('/api/partner/location', {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude }),
      token,
    }),

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

  listOrderItemJobs: (token: string) =>
    request<OrderItemJobs>('/api/partner/order-item-jobs', { token }),

  acceptOrderItemJob: (requestId: string, token: string) =>
    request<OrderItemJob>(`/api/partner/order-item-jobs/${requestId}/accept`, { method: 'PATCH', token }),

  rejectOrderItemJob: (requestId: string, token: string) =>
    request<{ message: string }>(`/api/partner/order-item-jobs/${requestId}/reject`, { method: 'PATCH', token }),

  checkInOrderItem: (itemId: string, token: string) =>
    request<OrderItemJob>(`/api/partner/order-item-jobs/${itemId}/checkin`, { method: 'PATCH', token }),

  completeOrderItem: (itemId: string, token: string) =>
    request<OrderItemJob>(`/api/partner/order-item-jobs/${itemId}/complete`, { method: 'PATCH', token }),

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

  requestPayout: (amount: number, token: string) =>
    request<{ id: string; amount: number; status: string }>('/api/partner/payouts', {
      method: 'POST',
      body: JSON.stringify({ amount }),
      token,
    }),

  listPayouts: (token: string) =>
    request<{ id: string; amount: number; status: string; createdAt: string }[]>('/api/partner/payouts', { token }),
};

// ── Documents ──────────────────────────────────────────────
export type DocumentStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 're_upload_required' | 'expired';

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

async function uploadDocument<T>(
  path: string,
  fields: Record<string, string>,
  uri: string,
  mimeType: string,
  token: string,
): Promise<T> {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  if (Platform.OS === 'web') {
    const blobRes = await fetch(uri);
    const blob = await blobRes.blob();
    const name = uri.split('/').pop() ?? 'document';
    formData.append('file', blob, name);
  } else {
    const name = uri.split('/').pop() ?? 'document';
    formData.append('file', { uri, name, type: mimeType } as any);
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

export const documentsApi = {
  listTypes: (token: string) =>
    request<DocumentTypeConfig[]>('/api/partner/documents/types', { token }),

  list: (token: string) =>
    request<PartnerDocument[]>('/api/partner/documents', { token }),

  getHistory: (docType: string, token: string) =>
    request<PartnerDocumentHistory[]>(`/api/partner/documents/${encodeURIComponent(docType)}/history`, { token }),

  upload: (documentType: string, uri: string, mimeType: string, token: string) =>
    uploadDocument<PartnerDocument>('/api/partner/documents', { documentType }, uri, mimeType, token),

  delete: (id: string, token: string) =>
    request<{ message: string }>(`/api/partner/documents/${id}`, { method: 'DELETE', token }),
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
