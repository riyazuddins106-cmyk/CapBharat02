import { Platform } from 'react-native';

// EXPO_PUBLIC_API_URL is set by the workflow to the current Replit dev domain
// (e.g. https://<repl-id>.sisko.replit.dev). That domain's port-5000 vite server
// already proxies /api → the Express server on port 8000, so we never need to
// hard-code a port number. This works on both native (Expo Go) and Expo web.
function getApiBase(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
}
const API_BASE = getApiBase();
export { API_BASE };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Token refresh interceptor ──────────────────────────────
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
  imageUrl?: string | null;
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
export interface Service {
  id: string;
  categoryId: string;
  subCategoryId: string | null;
  name: string;
  description: string | null;
  images: string[];
  customerPrice: number;
  duration: number;
  requiredSkill: string | null;
  badge: string | null;
  featured: boolean;
  isActive: boolean;
}
export interface CartItem {
  id: string;
  serviceId: string;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  duration: number;
  lineTotal: number;
}
export interface Cart { id: string; items: CartItem[]; total: number; }
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
export interface Offer {
  id: string;
  title: string;
  subtitle: string;
  description: string | null;
  tag: string;
  discountText: string;
  bgColor: string;
  imageUrl: string | null;
  altText: string | null;
  ctaText: string;
  ctaRoute: string;
  textPosition: string;
  overlayColor: string;
  overlayOpacity: number;
  animation: string;
  priority: number;
  status: string;
  isActive: boolean;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  expiresAt: string | null;
}

// ── Multipart upload (avatar) ──────────────────────────────
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
  uploadAvatar: (uri: string, token: string) =>
    uploadFile<User>('/api/profile/me/avatar', 'avatar', uri, token),
  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>('/api/profile/me/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }), token }),
  logoutAll: (token: string) =>
    request<void>('/api/auth/logout-all', { method: 'POST', token }),
  deleteAccount: (password: string, token: string) =>
    request<void>('/api/profile/me', { method: 'DELETE', body: JSON.stringify({ password }), token }),
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

export interface SubCategory {
  id: string;
  categoryId: string;
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

export const subcategoriesApi = {
  listByCategory: (categoryId: string) =>
    request<SubCategory[]>(`/api/categories/${categoryId}/subcategories`),
};

// ── Professionals ──────────────────────────────────────────
export const professionalsApi = {
  list: (params?: { categoryId?: string; subCategoryId?: string; search?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null)) as Record<string, string>
    ).toString();
    return request<Professional[]>(`/api/professionals${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<Professional>(`/api/professionals/${id}`),
};

export const servicesApi = {
  list: (params?: { categoryId?: string; subCategoryId?: string; q?: string }) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null)) as Record<string, string>).toString();
    return request<{ services: Service[]; total: number }>(`/api/services${qs ? `?${qs}` : ''}`);
  },
  featured: () => request<{ services: Service[]; total: number }>('/api/services?featured=true'),
};

export const cartApi = {
  get: (token: string) => request<Cart>('/api/cart', { token }),
  add: (serviceId: string, quantity: number, token: string) =>
    request<Cart>('/api/cart/items', { method: 'POST', body: JSON.stringify({ serviceId, quantity }), token }),
  update: (itemId: string, quantity: number, token: string) =>
    request<Cart>(`/api/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }), token }),
  remove: (itemId: string, token: string) =>
    request<Cart>(`/api/cart/items/${itemId}`, { method: 'DELETE', token }),
  checkout: (payload: { scheduledAt: string; addressId?: string; notes?: string }, token: string) =>
    request<Booking>('/api/bookings/checkout', { method: 'POST', body: JSON.stringify(payload), token }),
};

// ── Offers / Banners ───────────────────────────────────────
export const offersApi = {
  listActive: () => request<Offer[]>('/api/offers'),
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
  list:       (token: string) => request<AppNotification[]>('/api/notifications', { token }),
  markRead:   (id: string, token: string) => request<void>(`/api/notifications/${id}/read`, { method: 'PATCH', token }),
  markAllRead:(token: string) => request<void>('/api/notifications/read-all', { method: 'PATCH', token }),
  delete:     (id: string, token: string) => request<void>(`/api/notifications/${id}`, { method: 'DELETE', token }),
  unreadCount:(token: string) => request<{ count: number }>('/api/notifications/unread-count', { token }),
};

// ── Points & Rewards ───────────────────────────────────────
export interface PointsLedgerEntry {
  id: string;
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  description: string;
  createdAt: string;
}

export interface PointsSummary {
  balance: number;
  redeemableValue: number;
  minRedeemPoints: number;
  earnRate: string;
  history: PointsLedgerEntry[];
}

export const pointsApi = {
  getSummary: (token: string) => request<PointsSummary>('/api/points', { token }),
  redeem: (points: number, token: string) =>
    request<{ redeemedValue: number; balance: number }>('/api/points/redeem', { method: 'POST', body: JSON.stringify({ points }), token }),
};

// ── Support Tickets ────────────────────────────────────────
export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  createdAt: string;
}

export const supportApi = {
  createTicket: (data: { name: string; email: string; subject: string; message: string }, token?: string | null) =>
    request<SupportTicket>('/api/support-tickets', { method: 'POST', body: JSON.stringify(data), ...(token ? { token } : {}) }),
  listMine: (token: string) => request<SupportTicket[]>('/api/support-tickets/mine', { token }),
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
  getPayment: (id: string, token: string) =>
    request<Payment | null>(`/api/bookings/${id}/payment`, { token }),
  submitPayment: (id: string, body: { method: string; notes?: string }, token: string) =>
    request<Payment>(`/api/bookings/${id}/payment`, { method: 'POST', body: JSON.stringify(body), token }),
  createRazorpayOrder: (id: string, token: string) =>
    request<{ orderId: string; amount: number; currency: string; keyId: string; bookingId: string; businessName: string }>(
      `/api/bookings/${id}/razorpay/create-order`, { method: 'POST', body: '{}', token }),
  createStripeSession: (id: string, token: string) =>
    request<{ checkoutUrl: string; sessionId: string }>(
      `/api/bookings/${id}/stripe/create-session`, { method: 'POST', body: '{}', token }),
};

export async function getPaymentConfig(): Promise<{ methods: string[]; upiVpa: string | null; razorpayKeyId: string | null; stripePublishableKey: string | null }> {
  return request<{ methods: string[]; upiVpa: string | null; razorpayKeyId: string | null; stripePublishableKey: string | null }>('/api/payments/config');
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  method: string | null;
  notes: string | null;
  createdAt: string;
}

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
  update: (id: string, data: { rating?: number; comment?: string }, token: string) =>
    request<Review>(`/api/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: (id: string, token: string) =>
    request<void>(`/api/reviews/${id}`, { method: 'DELETE', token }),
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

// ── Platform Policies (public) ──────────────────────────────
export const platformApi = {
  getPolicy: (slug: string) =>
    request<{ id: string; slug: string; title: string; content: string; updatedAt: string }>(
      `/api/platform-policies/${slug}`,
    ),
};

// ── Reels ──────────────────────────────────────────────────
export interface Reel {
  id: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const reelsApi = {
  listActive: () => request<Reel[]>('/api/reels'),
};
