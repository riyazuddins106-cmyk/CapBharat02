// ── Storage keys — prefixed "admin_" so they never clash with customer-web ──
export const ADMIN_TOKEN_KEY = 'admin_access_token';
export const ADMIN_REFRESH_KEY = 'admin_refresh_token';
export const ADMIN_USER_KEY = 'admin_user';

export const adminAuth = {
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(ADMIN_REFRESH_KEY),
  getUser: (): AdminUser | null => {
    try { return JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || 'null'); } catch { return null; }
  },
  store(accessToken: string, refreshToken: string, user: AdminUser) {
    localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
    localStorage.setItem(ADMIN_REFRESH_KEY, refreshToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },
  isLoggedIn: () => Boolean(localStorage.getItem(ADMIN_TOKEN_KEY)),
};

// ── Types ────────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'admin';
  avatarUrl?: string | null;
}

export interface Booking {
  id: string;
  status: string;
  totalAmount: number;
  scheduledAt: string;
  createdAt: string;
  customer?: { fullName: string; email: string } | null;
  professional?: { fullName: string } | null;
  service?: { name: string } | null;
}

export interface Professional {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  rating?: number | null;
  totalJobs?: number | null;
  totalEarnings?: number | null;
  avatarUrl?: string | null;
  service?: { name: string } | null;
}

export interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  totalProfessionals: number;
  totalRevenue: number;
  totalCustomers: number;
}

// ── Base request ─────────────────────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...init } = options;
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json.data as T;
}

// ── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string) {
    const data = await request<{ accessToken: string; refreshToken: string; user: AdminUser }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    if (data.user.role !== 'admin') throw new Error('This account does not have admin access.');
    return data;
  },
  async refresh(refreshToken: string) {
    return request<{ accessToken: string; refreshToken: string; user: AdminUser }>(
      '/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }
    );
  },
  async logout(refreshToken: string, token: string) {
    await request('/auth/logout', { method: 'POST', token, body: JSON.stringify({ refreshToken }) }).catch(() => {});
  },
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminApi = {
  getBookings: (token: string) =>
    request<{ bookings: Booking[]; total: number }>('/admin/bookings', { token }),
  getProfessionals: (token: string) =>
    request<{ professionals: Professional[]; total: number }>('/admin/professionals', { token }),
  getStats: (token: string) =>
    request<DashboardStats>('/admin/stats', { token }),
  suspendProfessional: (id: string, token: string) =>
    request(`/admin/professionals/${id}/suspend`, { method: 'PATCH', token }),
  activateProfessional: (id: string, token: string) =>
    request(`/admin/professionals/${id}/activate`, { method: 'PATCH', token }),
};
