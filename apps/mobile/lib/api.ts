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
// Returns null if refresh fails (caller will receive the original 401 error).
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
export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
  iconColor: string;
  serviceCount: number;
}
export interface Professional {
  id: string;
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
  categoryId: string;
  reviews?: Review[];
}
export interface Booking {
  id: string;
  professionalId: string;
  categoryId: string;
  addressId: string | null;
  serviceName: string;
  proName: string;
  scheduledAt: string;
  status: 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  notes: string | null;
  reviewed?: boolean;
  createdAt: string;
}
export interface Review {
  id: string;
  rating: number;
  comment: string;
  customerId: string;
  createdAt: string;
}
export interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  register: (data: { fullName: string; email: string; password: string; phone?: string }) =>
    request<{ userId: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  verifyOtp: (data: { email: string; code: string; purpose: string }) =>
    request<AuthTokens>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),

  resendOtp: (data: { email: string; purpose: string }) =>
    request<void>('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthTokens>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: (refreshToken: string, token: string) =>
    request<void>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }), token }),

  forgotPassword: (email: string) =>
    request<void>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    request<void>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST', body: JSON.stringify({ refreshToken }),
    }),
};

// ── Profile ────────────────────────────────────────────────
export const profileApi = {
  me: (token: string) => request<User>('/api/profile/me', { token }),
  update: (data: Partial<Pick<User, 'fullName' | 'phone'>>, token: string) =>
    request<User>('/api/profile/me', { method: 'PATCH', body: JSON.stringify(data), token }),
  registerPushToken: (pushToken: string, token: string) =>
    request<{ message: string }>('/api/profile/me/push-token', {
      method: 'PATCH',
      body: JSON.stringify({ pushToken }),
      token,
    }),
};

// ── Categories ─────────────────────────────────────────────
export const categoriesApi = {
  list: () => request<Category[]>('/api/categories'),
};

// ── Professionals ──────────────────────────────────────────
export const professionalsApi = {
  list: (params?: { categoryId?: string; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<Professional[]>(`/api/professionals${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<Professional>(`/api/professionals/${id}`),
};

// ── Bookings ───────────────────────────────────────────────
export const bookingsApi = {
  list: (token: string) => request<Booking[]>('/api/bookings', { token }),
  get: (id: string, token: string) => request<Booking>(`/api/bookings/${id}`, { token }),
  create: (data: { professionalId: string; scheduledAt: string; notes?: string; addressId?: string }, token: string) =>
    request<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(data), token }),
  cancel: (id: string, token: string) =>
    request<Booking>(`/api/bookings/${id}/cancel`, { method: 'PATCH', token }),
  reschedule: (id: string, scheduledAt: string, token: string) =>
    request<Booking>(`/api/bookings/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify({ scheduledAt }), token }),
  getQrToken: (id: string, token: string) =>
    request<{ qrToken: string }>(`/api/bookings/${id}/qr`, { token }),
};

// ── Favorites ──────────────────────────────────────────────
export const favoritesApi = {
  list: (token: string) => request<Professional[]>('/api/favorites', { token }),
  toggle: (professionalId: string, token: string) =>
    request<{ isFavorite: boolean }>(`/api/favorites/${professionalId}`, { method: 'POST', token }),
};

// ── Reviews ────────────────────────────────────────────────
export const reviewsApi = {
  create: (data: { bookingId: string; rating: number; comment: string }, token: string) =>
    request<Review>('/api/reviews', { method: 'POST', body: JSON.stringify(data), token }),
};

// ── Addresses ──────────────────────────────────────────────
export const addressesApi = {
  list: (token: string) => request<Address[]>('/api/addresses', { token }),
  create: (data: Omit<Address, 'id' | 'line2'>, token: string) =>
    request<Address>('/api/addresses', { method: 'POST', body: JSON.stringify(data), token }),
  update: (id: string, data: Partial<Address>, token: string) =>
    request<Address>(`/api/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: (id: string, token: string) =>
    request<void>(`/api/addresses/${id}`, { method: 'DELETE', token }),
};
