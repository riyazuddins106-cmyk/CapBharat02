import axios from 'axios';

const TOKEN_KEY = 'sn_access_token';
const REFRESH_KEY = 'sn_refresh_token';
const USER_KEY = 'sn_user';

// ─── Token helpers ──────────────────────────────────────────────────────────
export const auth = {
  getToken:        () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser:         () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } },
  store(accessToken: string, refreshToken: string, user: unknown) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn: () => Boolean(localStorage.getItem(TOKEN_KEY)),
};

// ─── Axios instance ─────────────────────────────────────────────────────────
// In a Replit preview, the web app and API are exposed on separate public
// ports. Relative /api requests hit the preview app router instead of the
// ServeNow API (502). Keep relative requests for local Vite proxy and
// single-port production.
function getApiOrigin(): string {
  if (typeof window === 'undefined') return '';
  const { hostname, protocol, port } = window.location;
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || port === '5000';
  const isReplitPreview = hostname.endsWith('.replit.dev') || hostname.endsWith('.repl.co');
  return !isLocalDev && isReplitPreview ? `${protocol}//${hostname}:8000` : '';
}

const API_ORIGIN = getApiOrigin();
const API_PREFIX = `${API_ORIGIN}/api`;
const client = axios.create({ baseURL: API_PREFIX });

client.interceptors.request.use((config) => {
  const token = auth.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = auth.getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_PREFIX}/auth/refresh`, { refreshToken });
          auth.store(data.data.accessToken, data.data.refreshToken, data.data.user);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return client(original);
        } catch {
          auth.clear();
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  },
);

// ─── API types ───────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: 'customer' | 'partner' | 'admin';
  emailVerified: boolean;
}

export interface ApiCategory {
  id: string;
  name: string;
  iconName: string;
  color: string;
  iconColor: string;
  serviceCount: number;
  sortOrder: number;
}

export interface ApiBooking {
  id: string;
  serviceName: string;
  proName: string | null;
  scheduledAt: string;
  status: 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  dispatchStatus: 'searching_partner' | 'waiting_operation' | 'assigned' | 'no_partner_found' | null;
  dispatchDeadline?: string | null;
  price: number;
  notes: string | null;
  professionalId: string | null;
  categoryId: string;
  createdAt?: string;
}

export interface ApiService {
  id: string;
  categoryId: string;
  subCategoryId: string | null;
  name: string;
  description: string | null;
  images: string[];
  customerPrice: number;
  partnerPayout: number;
  duration: number;
  requiredSkill: string | null;
  badge: string | null;
  featured: boolean;
  isActive: boolean;
}

export interface ApiCartItem {
  id: string;
  serviceId: string;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  duration: number;
  lineTotal: number;
  minAdvanceMinutes: number | null; // null = inherit global booking_config
}

export interface ApiCart {
  id: string;
  items: ApiCartItem[];
  total: number;
}

export type ApiOrderItemStatus =
  | "searching_partner"
  | "waiting_operation"
  | "assigned"
  | "partner_accepted"
  | "partner_arrived"
  | "payment_pending"
  | "payment_completed"
  | "service_started"
  | "service_completed"
  | "cancelled";

export interface ApiOrderItem {
  id: string;
  orderId: string;
  serviceId: string;
  serviceName: string | null;
  partnerId: string | null;
  partnerName: string | null;
  status: ApiOrderItemStatus;
  scheduledAt: string;
  dispatchDeadline?: string | null;
  createdAt?: string;
  updatedAt?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  customerPrice: number;
  partnerPayout: number;
  quantity: number;
  cancellationReason?: string | null;
  cancellationFee?: number | null;
  cancelledAt?: string | null;
  payment: {
    id: string;
    status: "created" | "paid" | "failed" | "refunded";
    method: string | null;
    amount: number;
    notes: string | null;
    cashReportedAt?: string | null;
    cashConfirmedAt?: string | null;
  } | null;
}

export interface ApiOrder {
  id: string;
  customerId: string;
  addressId: string | null;
  scheduledAt: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  items: ApiOrderItem[];
}

export interface ApiReview {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ApiAddress {
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

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  async register(fullName: string, email: string, password: string, phone?: string) {
    const { data } = await client.post('/auth/register', { fullName, email, password, phone });
    return data.data as { userId: string; email: string; devCode?: string; expiresInSeconds?: number; resendAfterSeconds?: number };
  },

  async verifyOtp(email: string, code: string, purpose: 'signup' | 'login' | 'password_reset') {
    const { data } = await client.post('/auth/verify-otp', { email, code, purpose });
    return data.data as { user: ApiUser; accessToken: string; refreshToken: string };
  },

  async resendOtp(email: string, purpose: 'signup' | 'login' | 'password_reset') {
    const { data } = await client.post('/auth/resend-otp', { email, purpose });
    return data.data as { devCode?: string; expiresInSeconds?: number; resendAfterSeconds?: number };
  },

  async login(email: string, password: string) {
    const { data } = await client.post('/auth/login', { email, password });
    return data.data as { user: ApiUser; accessToken: string; refreshToken: string };
  },

  async logout(refreshToken: string) {
    await client.post('/auth/logout', { refreshToken });
  },

  async forgotPassword(email: string) {
    const { data } = await client.post('/auth/forgot-password', { email });
    return data.data as { devCode?: string; expiresInSeconds?: number; resendAfterSeconds?: number };
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    await client.post('/auth/reset-password', { email, code, newPassword });
  },
};

// ─── Profile API ─────────────────────────────────────────────────────────────
export const profileApi = {
  async get() {
    const { data } = await client.get('/profile/me');
    return data.data as ApiUser;
  },

  async update(payload: { fullName?: string }) {
    const { data } = await client.patch('/profile/me', payload);
    return data.data as ApiUser;
  },
  async requestIdentityChange(field: 'email' | 'phone', value: string) {
    const { data } = await client.post('/profile/me/identity/request', { field, value });
    return data.data as { field: 'email' | 'phone'; target: string; expiresInMinutes: number; devCode?: string };
  },
  async verifyIdentityChange(field: 'email' | 'phone', value: string, code: string) {
    const { data } = await client.post('/profile/me/identity/verify', { field, value, code });
    return data.data as ApiUser;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    await client.post('/profile/me/change-password', { currentPassword, newPassword });
  },
};

// ─── Categories API ──────────────────────────────────────────────────────────
export const categoriesApi = {
  async list() {
    const { data } = await client.get('/categories');
    return data.data as ApiCategory[];
  },
};

export interface ApiSubCategory {
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
  async listByCategory(categoryId: string) {
    const { data } = await client.get(`/categories/${categoryId}/subcategories`);
    return data.data as ApiSubCategory[];
  },
};

// ─── Bookings API ─────────────────────────────────────────────────────────────
export const bookingsApi = {
  async list() {
    const { data } = await client.get('/bookings');
    return data.data as ApiBooking[];
  },
  async continueSearching(id: string) {
    const { data } = await client.patch(`/bookings/${id}/continue-searching`);
    return data.data as ApiBooking;
  },

  async create(scheduledAt: string, notes?: string, addressId?: string) {
    const { data } = await client.post('/bookings', { scheduledAt, notes, addressId });
    return data.data as ApiBooking;
  },

  async cancel(id: string) {
    const { data } = await client.patch(`/bookings/${id}/cancel`);
    return data.data as ApiBooking;
  },

  async reschedule(id: string, scheduledAt: string) {
    const { data } = await client.patch(`/bookings/${id}/reschedule`, { scheduledAt });
    return data.data as ApiBooking;
  },

  async getPayment(id: string) {
    const { data } = await client.get(`/bookings/${id}/payment`);
    return data.data as ApiPayment | null;
  },

  async submitPayment(id: string, method: string, notes?: string) {
    const { data } = await client.post(`/bookings/${id}/payment`, { method, notes });
    return data.data as ApiPayment;
  },

  async createRazorpayOrder(id: string) {
    const { data } = await client.post(`/bookings/${id}/razorpay/create-order`);
    return data.data as { orderId: string; amount: number; currency: string; keyId: string; bookingId: string; businessName: string };
  },

  async verifyRazorpay(id: string, razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string) {
    const { data } = await client.post(`/bookings/${id}/razorpay/verify`, { razorpay_payment_id, razorpay_order_id, razorpay_signature });
    return data.data as ApiPayment;
  },

  async createStripeSession(id: string) {
    const { data } = await client.post(`/bookings/${id}/stripe/create-session`);
    return data.data as { checkoutUrl: string | null; sessionId: string; testMode?: boolean };
  },

  async testPay(id: string, method = 'cash') {
    const { data } = await client.post(`/bookings/${id}/test-pay`, { method });
    return data.data as ApiPayment;
  },
};

export const ordersApi = {
  async list() {
    const { data } = await client.get("/orders");
    return data.data as ApiOrder[];
  },

  async cancelItem(orderId: string, itemId: string, reason?: string) {
    const { data } = await client.patch(`/orders/${orderId}/items/${itemId}/cancel`, {
      reason: reason?.trim() || undefined,
    });
    return data.data as ApiOrder;
  },

  async getItemQr(orderId: string, itemId: string) {
    const { data } = await client.get(`/orders/${orderId}/items/${itemId}/qr`);
    return data.data as { qrToken: string; expiresIn: number; orderId: string; orderItemId: string };
  },

  async continueSearching(orderId: string, itemId: string) {
    const { data } = await client.patch(`/orders/${orderId}/items/${itemId}/continue-searching`);
    return data.data as { message: string };
  },

  async payItem(orderId: string, itemId: string, method: "cash" | "upi_manual", notes?: string) {
    const { data } = await client.post(`/orders/${orderId}/items/${itemId}/pay`, { method, notes });
    return data.data;
  },

  async testPayItem(orderId: string, itemId: string, method = "cash") {
    const { data } = await client.post(`/orders/${orderId}/items/${itemId}/test-pay`, { method });
    return data.data;
  },

  async createRazorpayOrder(orderId: string, itemId: string) {
    const { data } = await client.post(`/orders/${orderId}/items/${itemId}/razorpay/create-order`);
    return data.data as { orderId: string; amount: number; currency: string; keyId: string; itemId: string; serviceName: string; testMode?: boolean };
  },

  async verifyRazorpay(orderId: string, itemId: string, payload: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
    const { data } = await client.post(`/orders/${orderId}/items/${itemId}/razorpay/verify`, payload);
    return data.data;
  },

  async createStripeSession(orderId: string, itemId: string) {
    const { data } = await client.post(`/orders/${orderId}/items/${itemId}/stripe/create-session`);
    return data.data as { checkoutUrl: string | null; sessionId: string; testMode?: boolean };
  },
};

export interface ApiPayment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  method: string | null;
  notes: string | null;
  createdAt: string;
}

export async function getPaymentConfig(): Promise<{ methods: string[]; upiVpa: string | null; razorpayKeyId: string | null; testMode: boolean }> {
  const { data } = await client.get('/payments/config');
  return data.data;
}

// ─── Reviews API ──────────────────────────────────────────────────────────────
export const reviewsApi = {
  async create(bookingId: string, rating: number, comment?: string) {
    const { data } = await client.post('/reviews', { bookingId, rating, comment });
    return data.data as ApiReview;
  },
};

// ─── Addresses API ────────────────────────────────────────────────────────────
export const addressesApi = {
  async list() {
    const { data } = await client.get('/addresses');
    return data.data as ApiAddress[];
  },

  async create(payload: Omit<ApiAddress, 'id'>) {
    const { data } = await client.post('/addresses', payload);
    return data.data as ApiAddress;
  },

  async update(id: string, payload: Partial<Omit<ApiAddress, 'id'>>) {
    const { data } = await client.patch(`/addresses/${id}`, payload);
    return data.data as ApiAddress;
  },

  async delete(id: string) {
    await client.delete(`/addresses/${id}`);
  },
};

export const servicesApi = {
  async list(params?: { categoryId?: string; subCategoryId?: string; q?: string }) {
    const { data } = await client.get('/services', { params });
    return data.data as { services: ApiService[]; total: number };
  },
  async featured() {
    const { data } = await client.get('/services', { params: { featured: 'true' } });
    return data.data as { services: ApiService[]; total: number };
  },
  async getById(id: string) {
    const { data } = await client.get(`/services/${id}`);
    return data.data as ApiService;
  },
};

export const cartApi = {
  async get() { const { data } = await client.get('/cart'); return data.data as ApiCart; },
  async add(serviceId: string, quantity = 1) { const { data } = await client.post('/cart/items', { serviceId, quantity }); return data.data as ApiCart; },
  async update(itemId: string, quantity: number) { const { data } = await client.patch(`/cart/items/${itemId}`, { quantity }); return data.data as ApiCart; },
  async remove(itemId: string) { const { data } = await client.delete(`/cart/items/${itemId}`); return data.data as ApiCart; },
  async checkout(payload: { scheduledAt: string; addressId?: string; notes?: string }) { const { data } = await client.post('/orders/checkout', payload); return data.data as ApiOrder; },
};

// ─── Offers API ───────────────────────────────────────────────────────────────
export interface ApiOffer {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  discountText: string;
  bgColor: string;
  ctaText: string;
  ctaRoute: string;
  isActive: boolean;
  sortOrder: number;
  expiresAt: string | null;
}

export const offersApi = {
  async list() {
    const { data } = await client.get('/offers');
    return data.data as ApiOffer[];
  },
};

// ─── Reels API ────────────────────────────────────────────────────────────────
export interface ApiReel {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  isActive: boolean;
  professionalId?: string;
  createdAt: string;
}

export const reelsApi = {
  async listActive() {
    const { data } = await client.get('/reels');
    return data.data as ApiReel[];
  },
};

// ─── Notifications API ────────────────────────────────────────────────────────
export interface ApiNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  async list() {
    const { data } = await client.get('/notifications');
    return data.data as ApiNotification[];
  },
  async markRead(id: string) {
    await client.patch(`/notifications/${id}/read`);
  },
  async markAllRead() {
    await client.patch('/notifications/read-all');
  },
  async delete(id: string) {
    await client.delete(`/notifications/${id}`);
  },
  async unreadCount() {
    const { data } = await client.get('/notifications/unread-count');
    return data.data as { count: number };
  },
};

// ─── Service Wishlist API ─────────────────────────────────────────────────────
export interface ApiWishlistedService {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  customerPrice: number;
  duration: number;
  badge: string | null;
  categoryId: string;
  isWishlisted: boolean;
}

export const serviceWishlistApi = {
  async list() {
    const { data } = await client.get('/service-wishlist');
    return data.data as ApiWishlistedService[];
  },
  async toggle(serviceId: string) {
    const { data } = await client.post(`/service-wishlist/${serviceId}`);
    return data.data as { isWishlisted: boolean };
  },
  async getIds() {
    const { data } = await client.get('/service-wishlist/ids');
    return data.data as { ids: string[] };
  },
};

// ─── Support Tickets API ──────────────────────────────────────────────────────
export interface ApiSupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export const supportTicketsApi = {
  async create(subject: string, message: string) {
    const { data } = await client.post('/support-tickets', { subject, message });
    return data.data as ApiSupportTicket;
  },
  async listMine() {
    const { data } = await client.get('/support-tickets/mine');
    return data.data as ApiSupportTicket[];
  },
};

// ─── Platform Policies API ────────────────────────────────────────────────────
export interface ApiPolicy {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export const platformPoliciesApi = {
  async list() {
    const { data } = await client.get('/platform-policies');
    return data.data as ApiPolicy[];
  },
  async getOne(slug: string) {
    const { data } = await client.get(`/platform-policies/${slug}`);
    return data.data as ApiPolicy;
  },
};

// ─── Points API ───────────────────────────────────────────────────────────────
export interface ApiPointsTransaction {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  createdAt: string;
}

export interface ApiPointsSummary {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  redeemableValue: number;
  transactions: ApiPointsTransaction[];
}

export const pointsApi = {
  async getSummary() {
    const { data } = await client.get('/points');
    return data.data as ApiPointsSummary;
  },
  async redeem(points: number) {
    const { data } = await client.post('/points/redeem', { points });
    return data.data as { newBalance: number };
  },
};

