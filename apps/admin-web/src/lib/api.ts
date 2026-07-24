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
  role: 'admin' | 'operations_manager';
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

export interface ServiceRow {
  id: string;
  categoryId: string;
  categoryName?: string | null;
  subCategoryId?: string | null;
  subCategoryName?: string | null;
  name: string;
  description?: string | null;
  images: string[];
  customerPrice: number;
  partnerPayout: number;
  commission: number;
  duration: number;
  requiredSkill?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchRequestRow {
  id: string;
  status: string;
  dispatchStatus: string;
  assignmentType: string;
  serviceName: string;
  proName: string | null;
  price: number;
  scheduledAt: string;
  customerName: string;
  requests: Array<{ request: { id: string; status: string; sentAt: string; respondedAt: string | null }; partner: { id: string; name: string; rating: number; availabilityStatus: string } }>;
}

export interface EligiblePartner {
  id: string;
  name: string;
  rating: number;
  availabilityStatus: string;
  currentBookingStatus: string;
}

export type DocumentStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 're_upload_required' | 'expired';

export interface PartnerDocumentRow {
  id: string;
  professional_id: string;
  document_type: string;
  document_url: string;
  file_name: string | null;
  status: DocumentStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewer_name: string | null;
  version: number;
  expiry_date: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  partner_name: string;
  partner_email: string | null;
}

export interface PartnerDocumentHistoryRow {
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

export interface DocumentTypeConfigRow {
  id: string;
  type_key: string;
  label: string;
  description: string | null;
  emoji: string;
  is_mandatory: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ServiceInput = {
  name: string;
  categoryId: string;
  subCategoryId?: string | null;
  description?: string;
  images?: string[];
  customerPrice: number;
  partnerPayout: number;
  duration?: number;
  requiredSkill?: string;
  isActive?: boolean;
};

// ── Base request ─────────────────────────────────────────────────────────────
// ── Silent token refresh ──────────────────────────────────────────────────────
// One in-flight refresh at a time; concurrent callers wait for the same promise.
let refreshPromise: Promise<string> | null = null;

async function silentRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const storedRefresh = adminAuth.getRefreshToken();
    if (!storedRefresh) throw new Error('No refresh token');
    const data = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    }).then(r => r.json());
    if (!data?.data?.accessToken) throw new Error('Refresh failed');
    adminAuth.store(data.data.accessToken, data.data.refreshToken, data.data.user);
    window.dispatchEvent(new CustomEvent('admin:token-refreshed', { detail: data.data }));
    return data.data.accessToken as string;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function doFetch(path: string, init: RequestInit, token?: string): Promise<Response> {
  return fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...init } = options;
  let res = await doFetch(path, init, token);

  // On 401, attempt a silent refresh and retry once (skip for auth endpoints)
  if (res.status === 401 && !path.includes('/auth/')) {
    try {
      const newToken = await silentRefresh();
      res = await doFetch(path, init, newToken);
    } catch {
      adminAuth.clear();
      window.dispatchEvent(new CustomEvent('admin:unauthorized'));
    }
  }

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
    if (!['admin', 'operations_manager'].includes(data.user.role)) throw new Error('This account does not have admin access.');
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
  createProfessional: (data: {
    fullName: string; email: string; password: string; phone?: string;
    title: string; bio?: string; categoryId: string; subCategoryId?: string;
    basePrice: number; priceUnit?: string; badge?: string; tags?: string[];
  }, token: string) =>
    request<ProfessionalRow>('/admin/professionals', { method: 'POST', token, body: JSON.stringify(data) }),
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
  uploadProfessionalAvatar: (id: string, file: File, token: string) => {
    const fd = new FormData(); fd.append('avatar', file);
    return fetch(`/api/admin/professionals/${id}/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      .then(r => r.json().then((j: any) => { if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`); return j.data as ProfessionalRow; }));
  },

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
  restoreSubcategory: (id: string, token: string) =>
    request<SubCategory>(`/admin/subcategories/${id}/restore`, { method: 'PATCH', token }),
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
  restoreReel: (id: string, token: string) =>
    request<ReelRow>(`/admin/reels/${id}/restore`, { method: 'PATCH', token }),
  getDeletedReels: (token: string) =>
    request<ReelRow[]>('/admin/reels/deleted', { token }),
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
  restoreReview: (id: string, token: string) =>
    request<{ id: string }>(`/admin/reviews/${id}/restore`, { method: 'PATCH', token }),

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
  restorePlatformPolicy: (slug: string, token: string) =>
    request<PlatformPolicyRow>(`/admin/platform-policies/${slug}/restore`, { method: 'PATCH', token }),

  // Offers / Banners
  getOffers: (token: string) =>
    request<{ offers: OfferRow[]; total: number }>('/admin/offers', { token }),
  createOffer: (data: OfferInput, token: string) =>
    request<OfferRow>('/admin/offers', { method: 'POST', token, body: JSON.stringify(data) }),
  updateOffer: (id: string, data: Partial<OfferInput>, token: string) =>
    request<OfferRow>(`/admin/offers/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteOffer: (id: string, token: string) =>
    request<{ id: string }>(`/admin/offers/${id}`, { method: 'DELETE', token }),
  restoreOffer: (id: string, token: string) =>
    request<OfferRow>(`/admin/offers/${id}/restore`, { method: 'PATCH', token }),
  getDeletedOffers: (token: string) =>
    request<{ offers: OfferRow[]; total: number }>('/admin/offers/deleted', { token }),
  uploadBannerImage: async (file: File, token: string): Promise<string> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/admin/offers/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message ?? 'Upload failed.');
    return json.data.url;
  },

  // Services
  getServices: (token: string, params?: { categoryId?: string; subCategoryId?: string; q?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : '';
    return request<{ services: ServiceRow[]; total: number }>(`/admin/services${qs}`, { token });
  },
  createService: (data: ServiceInput, token: string) =>
    request<ServiceRow>('/admin/services', { method: 'POST', token, body: JSON.stringify(data) }),
  updateService: (id: string, data: Partial<ServiceInput>, token: string) =>
    request<ServiceRow>(`/admin/services/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteService: (id: string, token: string) =>
    request<{ id: string }>(`/admin/services/${id}`, { method: 'DELETE', token }),

  getDispatch: (token: string, status?: string) =>
    request<DispatchRequestRow[]>(`/operations/dispatch${status ? `?status=${encodeURIComponent(status)}` : ''}`, { token }),
  getEligiblePartners: (bookingId: string, token: string) =>
    request<EligiblePartner[]>(`/operations/dispatch/${bookingId}/eligible-partners`, { token }),
  assignPartner: (bookingId: string, partnerId: string, token: string) =>
    request<BookingRow>(`/operations/dispatch/${bookingId}/assign`, { method: 'POST', token, body: JSON.stringify({ partnerId }) }),

  // Platform Settings
  getSettings: (key: 'payment_config' | 'email_config' | 'sms_config' | 'contact_config', token: string) =>
    request<{ key: string; value: unknown }>(`/admin/settings/${key}`, { token }),
  saveSettings: (key: 'payment_config' | 'email_config' | 'sms_config' | 'contact_config', value: unknown, token: string) =>
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

  // Partner document review
  getDocuments: (token: string, params?: { status?: string; proId?: string }) => {
    const qs = params
      ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString()
      : '';
    return request<PartnerDocumentRow[]>(`/admin/documents${qs}`, { token });
  },
  getDocumentHistory: (docId: string, token: string) =>
    request<PartnerDocumentHistoryRow[]>(`/admin/documents/${docId}/history`, { token }),
  updateDocumentStatus: (docId: string, status: string, reason: string | null, token: string) =>
    request<{ id: string; status: string }>(`/admin/documents/${docId}/status`, {
      method: 'PATCH', token, body: JSON.stringify({ status, reason }),
    }),

  // Document type configuration
  getDocumentTypes: (token: string) =>
    request<DocumentTypeConfigRow[]>('/admin/document-types', { token }),
  createDocumentType: (data: {
    typeKey: string; label: string; description?: string;
    emoji?: string; isMandatory?: boolean; sortOrder?: number;
  }, token: string) =>
    request<DocumentTypeConfigRow>('/admin/document-types', { method: 'POST', token, body: JSON.stringify(data) }),
  updateDocumentType: (id: string, data: Partial<{
    label: string; description: string; emoji: string;
    isMandatory: boolean; sortOrder: number; isActive: boolean;
  }>, token: string) =>
    request<DocumentTypeConfigRow>(`/admin/document-types/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteDocumentType: (id: string, token: string) =>
    request<{ message: string }>(`/admin/document-types/${id}`, { method: 'DELETE', token }),
};
