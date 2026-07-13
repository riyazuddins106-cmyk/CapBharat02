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
const client = axios.create({ baseURL: '/api' });

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
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
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

export interface ApiProfessional {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  rating: number;
  reviewCount: number;
  basePrice: number;
  priceUnit: string;
  badge: string | null;
  avatarUrl: string | null;
  tags: string[];
  isFavorite: boolean;
  categoryId: string;
}

export interface ApiBooking {
  id: string;
  serviceName: string;
  proName: string;
  scheduledAt: string;
  status: 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  notes: string | null;
  professionalId: string;
  categoryId: string;
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
    return data.data as { userId: string; email: string };
  },

  async verifyOtp(email: string, code: string, purpose: 'signup' | 'login' | 'password_reset') {
    const { data } = await client.post('/auth/verify-otp', { email, code, purpose });
    return data.data as { user: ApiUser; accessToken: string; refreshToken: string };
  },

  async resendOtp(email: string, purpose: 'signup' | 'login' | 'password_reset') {
    await client.post('/auth/resend-otp', { email, purpose });
  },

  async login(email: string, password: string) {
    const { data } = await client.post('/auth/login', { email, password });
    return data.data as { user: ApiUser; accessToken: string; refreshToken: string };
  },

  async logout(refreshToken: string) {
    await client.post('/auth/logout', { refreshToken });
  },

  async forgotPassword(email: string) {
    await client.post('/auth/forgot-password', { email });
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

  async update(payload: { fullName?: string; phone?: string }) {
    const { data } = await client.patch('/profile/me', payload);
    return data.data as ApiUser;
  },
};

// ─── Categories API ──────────────────────────────────────────────────────────
export const categoriesApi = {
  async list() {
    const { data } = await client.get('/categories');
    return data.data as ApiCategory[];
  },
};

// ─── Professionals API ────────────────────────────────────────────────────────
export const professionalsApi = {
  async list(params?: { categoryId?: string; search?: string; sort?: string; limit?: number; offset?: number }) {
    const { data } = await client.get('/professionals', { params });
    return data.data as ApiProfessional[];
  },

  async getById(id: string) {
    const { data } = await client.get(`/professionals/${id}`);
    return data.data as ApiProfessional & { reviews: ApiReview[] };
  },
};

// ─── Bookings API ─────────────────────────────────────────────────────────────
export const bookingsApi = {
  async list() {
    const { data } = await client.get('/bookings');
    return data.data as ApiBooking[];
  },

  async create(professionalId: string, scheduledAt: string, notes?: string, addressId?: string) {
    const { data } = await client.post('/bookings', { professionalId, scheduledAt, notes, addressId });
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
};

// ─── Favorites API ────────────────────────────────────────────────────────────
export const favoritesApi = {
  async list() {
    const { data } = await client.get('/favorites');
    return data.data as ApiProfessional[];
  },

  async toggle(professionalId: string) {
    const { data } = await client.post(`/favorites/${professionalId}`);
    return data.data as { isFavorite: boolean };
  },
};

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

