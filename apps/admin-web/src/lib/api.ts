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
  patchUser(user: AdminUser) {
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  },
};

// ── Types ────────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  phone?: string | null;
  fullName: string;
  role: 'admin';
  avatarUrl?: string | null;
}

export interface PlatformPolicyRow {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface OfferRow {
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
  createdAt: string;
  updatedAt: string;
}

export type OfferInput = Omit<OfferRow, 'id' | 'createdAt' | 'updatedAt'>;

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
  subCategoryId?: string | null;
  subCategoryName?: string | null;
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
  imageUrl?: string | null;
  serviceCount: number;
  sortOrder: number;
  featured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  featured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReelRow {
  id: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  platform: string;
  thumbnailUrl?: string | null;
  customThumbnailUrl?: string | null;
  effectiveThumbnail?: string | null;
  category?: string | null;
  serviceCategoryId?: string | null;
  sortOrder: number;
  isActive: boolean;
  featured: boolean;
  publishDate?: string | null;
  expiryDate?: string | null;
  clickCount: number;
  viewCount: number;
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

export interface NotificationRow {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
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
  updateProfessional: (id: string, data: { name?: string; title?: string; bio?: string; basePrice?: number; priceUnit?: string; badge?: string; tags?: string[]; categoryId?: string; subCategoryId?: string | null }, token: string) =>
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
  updateCategory: (id: string, data: { name?: string; description?: string; iconName?: string; color?: string; iconColor?: string; sortOrder?: number; isActive?: boolean; featured?: boolean }, token: string) =>
    request<Category>(`/admin/categories/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteCategory: (id: string, token: string) =>
    request<{ id: string }>(`/admin/categories/${id}`, { method: 'DELETE', token }),
  uploadCategoryImage: (id: string, file: File, token: string) => {
    const fd = new FormData(); fd.append('image', file);
    return fetch(`/api/admin/categories/${id}/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      .then(r => r.json().then((j: any) => { if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`); return j.data as Category; }));
  },

  // Subcategories
  getSubcategories: (categoryId: string, token: string) =>
    request<{ subcategories: SubCategory[]; total: number }>(`/admin/categories/${categoryId}/subcategories`, { token }),
  createSubcategory: (categoryId: string, data: { name: string; description?: string; iconName?: string; color?: string; iconColor?: string; sortOrder?: number }, token: string) =>
    request<SubCategory>(`/admin/categories/${categoryId}/subcategories`, { method: 'POST', token, body: JSON.stringify(data) }),
  updateSubcategory: (id: string, data: { name?: string; description?: string; iconName?: string; color?: string; iconColor?: string; sortOrder?: number; isActive?: boolean }, token: string) =>
    request<SubCategory>(`/admin/subcategories/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteSubcategory: (id: string, token: string) =>
    request<{ id: string }>(`/admin/subcategories/${id}`, { method: 'DELETE', token }),
  uploadSubcategoryImage: (id: string, file: File, token: string) => {
    const fd = new FormData(); fd.append('image', file);
    return fetch(`/api/admin/subcategories/${id}/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      .then(r => r.json().then((j: any) => { if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`); return j.data as SubCategory; }));
  },

  // Reels
  getReels: (token: string) =>
    request<{ reels: ReelRow[]; total: number }>('/admin/reels', { token }),
  detectReelPlatform: (url: string, token: string) =>
    request<{ valid: boolean; platform: string; autoThumbnail: string | null }>(`/admin/reels/detect-platform?url=${encodeURIComponent(url)}`, { token }),
  createReel: (data: {
    title: string; description?: string; videoUrl: string;
    category?: string; serviceCategoryId?: string; sortOrder?: number;
    featured?: boolean; publishDate?: string | null; expiryDate?: string | null;
  }, token: string) =>
    request<ReelRow>('/admin/reels', { method: 'POST', token, body: JSON.stringify(data) }),
  updateReel: (id: string, data: Partial<{
    title: string; description: string; videoUrl: string;
    category: string; serviceCategoryId: string | null;
    sortOrder: number; isActive: boolean; featured: boolean;
    publishDate: string | null; expiryDate: string | null;
  }>, token: string) =>
    request<ReelRow>(`/admin/reels/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteReel: (id: string, token: string) =>
    request<{ id: string }>(`/admin/reels/${id}`, { method: 'DELETE', token }),
  uploadReelThumbnail: (id: string, file: File, token: string) => {
    const fd = new FormData(); fd.append('image', file);
    return fetch(`/api/admin/reels/${id}/thumbnail`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      .then(r => r.json().then((j: any) => { if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`); return j.data as ReelRow; }));
  },
  uploadReelVideo: (id: string, file: File, token: string) => {
    const fd = new FormData(); fd.append('video', file);
    return fetch(`/api/admin/reels/${id}/video`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      .then(r => r.json().then((j: any) => { if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`); return j.data as ReelRow; }));
  },

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
    request<SupportTicketRow[]>('/support-tickets', { token }),
  updateSupportTicket: (id: string, data: { status: string; response?: string }, token: string) =>
    request<SupportTicketRow>(`/support-tickets/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

  // Admin: change own password
  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>('/profile/me/change-password', { method: 'POST', token, body: JSON.stringify({ currentPassword, newPassword }) }),

  // Admin: update own profile details
  updateProfile: (data: { fullName?: string; phone?: string }, token: string) =>
    request<AdminUser>('/profile/me', { method: 'PATCH', token, body: JSON.stringify(data) }),

  // Platform Policies
  getPlatformPolicies: (token: string) =>
    request<PlatformPolicyRow[]>('/admin/platform-policies', { token }),
  createPlatformPolicy: (data: { title: string; content: string; slug?: string }, token: string) =>
    request<PlatformPolicyRow>('/admin/platform-policies', { method: 'POST', token, body: JSON.stringify(data) }),
  updatePlatformPolicy: (slug: string, data: { title: string; content: string }, token: string) =>
    request<PlatformPolicyRow>(`/admin/platform-policies/${slug}`, { method: 'PUT', token, body: JSON.stringify(data) }),
  deletePlatformPolicy: (slug: string, token: string) =>
    request<{ slug: string }>(`/admin/platform-policies/${slug}`, { method: 'DELETE', token }),

  // Offers / Banners
  getOffers: (token: string) =>
    request<{ offers: OfferRow[]; total: number }>('/admin/offers', { token }),
  createOffer: (data: OfferInput, token: string) =>
    request<OfferRow>('/admin/offers', { method: 'POST', token, body: JSON.stringify(data) }),
  updateOffer: (id: string, data: Partial<OfferInput>, token: string) =>
    request<OfferRow>(`/admin/offers/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteOffer: (id: string, token: string) =>
    request<{ id: string }>(`/admin/offers/${id}`, { method: 'DELETE', token }),
  uploadBannerImage: async (file: File, token: string): Promise<string> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/admin/offers/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message ?? 'Upload failed.');
    return json.data.url;
  },

  // Platform Settings
  getSettings: (key: 'payment_config' | 'email_config', token: string) =>
    request<{ key: string; value: unknown }>(`/admin/settings/${key}`, { token }),
  saveSettings: (key: 'payment_config' | 'email_config', value: unknown, token: string) =>
    request<{ key: string; value: unknown }>(`/admin/settings/${key}`, { method: 'PUT', token, body: JSON.stringify(value) }),
  sendTestEmail: (to: string, token: string) =>
    request<{ message: string }>('/admin/settings/email/test', { method: 'POST', token, body: JSON.stringify({ to }) }),

  // Notifications
  getNotifications: (token: string) =>
    request<NotificationRow[]>('/notifications', { token }),
  getUnreadNotificationCount: (token: string) =>
    request<{ count: number }>('/notifications/unread-count', { token }),
  markNotificationRead: (id: string, token: string) =>
    request<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH', token }),
  markAllNotificationsRead: (token: string) =>
    request<{ message: string }>('/notifications/read-all', { method: 'PATCH', token }),
  deleteNotification: (id: string, token: string) =>
    request<{ message: string }>(`/notifications/${id}`, { method: 'DELETE', token }),
};
