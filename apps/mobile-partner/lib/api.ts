// On web, call the Express server on port 8000 directly using the same
// hostname the browser is already on. Port 8000 is exposed by Replit's proxy
// and Express has CORS open (origin: true), so this works from any port.
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
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

  listJobs: (token: string) =>
    request<Job[]>('/api/partner/jobs', { token }),

  getJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}`, { token }),

  checkIn: (id: string, qrToken: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/checkin`, { method: 'PATCH', body: JSON.stringify({ qrToken }), token }),

  completeJob: (id: string, token: string) =>
    request<Job>(`/api/partner/jobs/${id}/complete`, { method: 'PATCH', token }),

  getEarnings: (token: string) =>
    request<Earnings>('/api/partner/earnings', { token }),
};
