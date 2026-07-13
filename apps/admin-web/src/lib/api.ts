// ── Storage keys — prefixed "admin_" so they never clash with customer-web ──
export const ADMIN_TOKEN_KEY   = 'admin_access_token';
export const ADMIN_REFRESH_KEY = 'admin_refresh_token';
export const ADMIN_USER_KEY    = 'admin_user';

export const adminAuth = {
  getToken:        () => localStorage.getItem(ADMIN_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(ADMIN_REFRESH_KEY),
  getUser: (): AdminUser | null => {
    try { return JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || 'null'); } catch { return null; }
  },
  store(accessToken: string, refreshToken: string, user: AdminUser) {
    localStorage.setItem(ADMIN_TOKEN_KEY,   accessToken);
    localStorage.setItem(ADMIN_REFRESH_KEY, refreshToken);
    localStorage.setItem(ADMIN_USER_KEY,    JSON.stringify(user));
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

export interface BookingRow {
  id: string;
  status: string;
  serviceName: string;
  proName: string;
  price: number;
  notes?: string | null;
  scheduledAt: string;
  createdAt: string;
  customerName?: string | null;
  customerEmail?: string | null;
}

export interface ProfessionalRow {
  id: string;
  name: string;
  title: string;
  bio?: string | null;
  rating: number;
  reviewCount: number;
  basePrice: number;
  priceUnit: string;
  badge?: string | null;
  tags: string[];
  isActive: boolean;
  avatarUrl?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  createdAt: string;
}

export interface CustomerUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  iconName: string;
  color: string;
  iconColor: string;
  serviceCount: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRow {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  customerId: string;
  professionalId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  proName?: string | null;
}

export interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  totalProfessionals: number;
  totalRevenue: number;
  totalCustomers: number;
}

export interface AuditLogRow {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PayoutRow {
  id: string;
  professionalId: string;
  proName: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  note: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface SupportTicketRow {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  response: string | null;
  createdAt: string;
  updatedAt: string;
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
  // Stats
  getStats: (token: string) =>
    request<DashboardStats>('/admin/stats', { token }),

  // Bookings
  getBookings: (token: string) =>
    request<{ bookings: BookingRow[]; total: number }>('/admin/bookings', { token }),
  updateBooking: (id: string, data: { status?: string; notes?: string; price?: number; scheduledAt?: string }, token: string) =>
    request<BookingRow>(`/admin/bookings/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  cancelBooking: (id: string, token: string) =>
    request(`/admin/bookings/${id}/cancel`, { method: 'PATCH', token }),
  deleteBooking: (id: string, token: string) =>
    request<{ id: string }>(`/admin/bookings/${id}`, { method: 'DELETE', token }),

  // Professionals
  getProfessionals: (token: string) =>
    request<{ professionals: ProfessionalRow[]; total: number }>('/admin/professionals', { token }),
  updateProfessional: (id: string, data: { name?: string; title?: string; bio?: string; basePrice?: number; priceUnit?: string; badge?: string; tags?: string[] }, token: string) =>
    request<ProfessionalRow>(`/admin/professionals/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  suspendProfessional: (id: string, token: string) =>
    request(`/admin/professionals/${id}/suspend`, { method: 'PATCH', token }),
  activateProfessional: (id: string, token: string) =>
    request(`/admin/professionals/${id}/activate`, { method: 'PATCH', token }),
  deleteProfessional: (id: string, token: string) =>
    request<{ id: string }>(`/admin/professionals/${id}`, { method: 'DELETE', token }),

  // Users
  getUsers: (token: string) =>
    request<{ users: CustomerUser[]; total: number }>('/admin/users', { token }),
  updateUser: (id: string, data: { fullName?: string; email?: string; phone?: string; role?: string }, token: string) =>
    request<CustomerUser>(`/admin/users/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteUser: (id: string, token: string) =>
    request<{ id: string }>(`/admin/users/${id}`, { method: 'DELETE', token }),
  suspendUser: (id: string, token: string) =>
    request(`/admin/users/${id}/suspend`, { method: 'PATCH', token }),
  activateUser: (id: string, token: string) =>
    request(`/admin/users/${id}/activate`, { method: 'PATCH', token }),

  // Categories
  getCategories: (token: string) =>
    request<{ categories: Category[]; total: number }>('/admin/categories', { token }),
  createCategory: (data: { name: string; description?: string; iconName?: string; color?: string; iconColor?: string; sortOrder?: number }, token: string) =>
    request<Category>('/admin/categories', { method: 'POST', token, body: JSON.stringify(data) }),
  updateCategory: (id: string, data: { name?: string; description?: string; iconName?: string; color?: string; iconColor?: string; sortOrder?: number; isActive?: boolean }, token: string) =>
    request<Category>(`/admin/categories/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteCategory: (id: string, token: string) =>
    request<{ id: string }>(`/admin/categories/${id}`, { method: 'DELETE', token }),

  // Reviews
  getReviews: (token: string) =>
    request<{ reviews: ReviewRow[]; total: number }>('/admin/reviews', { token }),
  deleteReview: (id: string, token: string) =>
    request<{ id: string }>(`/admin/reviews/${id}`, { method: 'DELETE', token }),

  // Audit logs
  getAuditLogs: (token: string) =>
    request<{ logs: AuditLogRow[]; total: number }>('/admin/audit-logs?limit=100', { token }),

  // Payouts
  getPayouts: (token: string) =>
    request<{ payouts: PayoutRow[]; total: number }>('/admin/payouts?limit=100', { token }),
  resolvePayout: (id: string, status: 'paid' | 'rejected', token: string) =>
    request<PayoutRow>(`/admin/payouts/${id}`, { method: 'PATCH', token, body: JSON.stringify({ status }) }),

  // Support Tickets
  getSupportTickets: (token: string) =>
    request<{ tickets: SupportTicketRow[]; total: number }>('/support-tickets', { token }),
  updateSupportTicket: (id: string, data: { status: string; response?: string }, token: string) =>
    request<SupportTicketRow>(`/support-tickets/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

  // Admin: change own password
  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>('/profile/me/change-password', { method: 'POST', token, body: JSON.stringify({ currentPassword, newPassword }) }),
};
