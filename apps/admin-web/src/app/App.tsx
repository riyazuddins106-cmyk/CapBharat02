import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Bell, Home, BookOpen, Sparkles, DollarSign, Search, Clock,
  BarChart2, Users, Settings, RefreshCw, Activity, LogOut,
  Loader2, UserCheck, XCircle, Pencil, Trash2, ShieldOff,
  ShieldCheck, Star, Grid, Plus, ChevronDown, ChevronUp,
  Shield, HelpCircle, Lock, MessageSquare, ExternalLink, Tag,
  Film, ChevronRight, Image, Upload, CreditCard, Mail, Eye, EyeOff,
  Send, Wallet, Smartphone, Zap, UserPlus, CheckCircle, Package, Navigation,
  AlertCircle, History as HistoryIcon, X,
} from "lucide-react";
import { adminAuth, authApi, adminApi } from "@/lib/api";
import type {
  AdminUser, BookingRow, ProfessionalRow, CustomerUser,
  Category, SubCategory, ReelRow, ReviewRow, DashboardStats, AuditLogRow, SupportTicketRow,
  PlatformPolicyRow, OfferRow, OfferInput, NotificationRow, ServiceRow, ServiceInput,
  DispatchRequestRow, EligiblePartner,
  PartnerDocumentRow, PartnerDocumentHistoryRow, DocumentTypeConfigRow, DocumentStatus,
} from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════════
   SHARED UI HELPERS
═══════════════════════════════════════════════════════════════════ */

const CARD = { background: "rgba(255,255,255,0.04)" } as const;
const MODAL_BG = { background: "#1a2035" } as const;
const INPUT_STYLE = {
  background: "rgba(255,255,255,0.05)",
  WebkitAppearance: "none",
} as const;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto" style={MODAL_BG}>
        <h3 className="text-white font-bold text-base mb-5">{title}</h3>
        {children}
      </div>
    </div>,
    document.body
  ) as unknown as React.ReactElement;
}

function ConfirmDialog({
  title, body, confirmLabel = "Confirm", danger = true, saving, onConfirm, onCancel,
}: {
  title: string; body: string; confirmLabel?: string; danger?: boolean;
  saving: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-sm rounded-2xl border p-6" style={{ ...MODAL_BG, borderColor: danger ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.1)" }}>
        <h3 className="text-white font-bold text-base mb-2">{title}</h3>
        <p className="text-white/50 text-sm mb-6">{body}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm} disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-60"
            style={{ background: danger ? "#DC2626" : "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
          >
            {saving ? "…" : confirmLabel}
          </button>
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl font-bold text-sm border border-white/10 text-white/60 hover:bg-white/5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/50 text-xs mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, type = "text", placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors"
      style={INPUT_STYLE}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors resize-none"
      style={INPUT_STYLE}
    />
  );
}

function SelectInput({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors disabled:opacity-40"
      style={{ background: "#1a2035" }}
    >
      {children}
    </select>
  );
}

function SaveCancelButtons({ onSave, onCancel, saving, saveLabel = "Save changes" }: {
  onSave: () => void; onCancel: () => void; saving: boolean; saveLabel?: string;
}) {
  return (
    <div className="flex gap-3 mt-6">
      <button
        onClick={onSave} disabled={saving}
        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
      >
        {saving ? "Saving…" : saveLabel}
      </button>
      <button onClick={onCancel} className="px-5 py-2.5 rounded-xl font-bold text-sm border border-white/10 text-white/60 hover:bg-white/5">
        Cancel
      </button>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
        style={{ background: "rgba(255,255,255,0.05)" }}
      />
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize whitespace-nowrap"
      style={{ background: color + "20", color }}
    >
      {label}
    </span>
  );
}

function ActionBtn({
  onClick, variant, children, disabled,
}: {
  onClick: () => void; variant: "edit" | "danger" | "warn" | "green"; children: React.ReactNode; disabled?: boolean;
}) {
  const styles = {
    edit:   { borderColor: "rgba(91,62,245,0.3)",  color: "#7C5BF8" },
    danger: { borderColor: "rgba(239,68,68,0.3)",  color: "#EF4444" },
    warn:   { borderColor: "rgba(245,158,11,0.3)", color: "#F59E0B" },
    green:  { borderColor: "rgba(22,163,74,0.3)",  color: "#16A34A" },
  };
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap disabled:opacity-40"
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return <tr><td colSpan={cols} className="px-4 py-8 text-white/30 text-center text-sm">{text}</td></tr>;
}

/* ═══════════════════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════════════════ */

function LoginPage({ onLogin }: { onLogin: (user: AdminUser, access: string, refresh: string) => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await authApi.login(email, password);
      adminAuth.store(data.accessToken, data.refreshToken, data.user);
      onLogin(data.user, data.accessToken, data.refreshToken);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0f1117" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            <Sparkles size={20} color="white" />
          </div>
          <span className="text-white font-bold text-xl">ServeNow Admin</span>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 p-6" style={{ background: "#161B27" }}>
          <h2 className="text-white font-bold text-lg mb-1">Welcome back</h2>
          <p className="text-white/40 text-sm mb-6">Sign in to the admin panel</p>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-400/20" style={{ background: "rgba(239,68,68,0.08)" }}>
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Field label="Email">
              <TextInput type="email" value={email} onChange={setEmail} placeholder="admin@servenow.in" />
            </Field>
            <Field label="Password">
              <TextInput type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            </Field>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full mt-6 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN PANEL SHELL
═══════════════════════════════════════════════════════════════════ */

const ADMIN_SIDEBAR = [
  { id: "dashboard",  icon: Home,       label: "Dashboard"          },
  { id: "bookings",   icon: BookOpen,   label: "Bookings"           },
  { id: "pros",       icon: Users,      label: "Professionals"      },
  { id: "users",      icon: UserCheck,  label: "Users"              },
  { id: "categories", icon: Grid,       label: "Categories"         },
  { id: "services",   icon: Package,    label: "Services"           },
  { id: "dispatch",   icon: Navigation, label: "Booking Operations Centre" },
  { id: "reels",      icon: Film,       label: "Reels"              },
  { id: "offers",     icon: Tag,        label: "Offers / Banners"   },
  { id: "reviews",    icon: Star,       label: "Reviews"            },
  { id: "analytics",  icon: BarChart2,  label: "Analytics"          },
  { id: "audit-logs", icon: Activity,   label: "Audit Logs"         },
  { id: "privacy",    icon: Shield,     label: "Privacy & Security" },
  { id: "support",        icon: HelpCircle,  label: "Help & Support"    },
  { id: "payment-config", icon: CreditCard,  label: "Payment Config"    },
  { id: "email-config",   icon: Mail,        label: "Email Config"      },
  { id: "sms-config",     icon: Smartphone,  label: "SMS Config"        },
  { id: "documents",      icon: ShieldCheck, label: "Document Verification" },
  { id: "settings",       icon: Settings,    label: "Settings"          },
];

const STATUS_COLOR: Record<string, string> = {
  upcoming:    "#5B3EF5",
  in_progress: "#F59E0B",
  completed:   "#16A34A",
  cancelled:   "#EF4444",
  pending:     "#6B7280",
};

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

function AdminPanel({ user, accessToken, onLogout }: { user: AdminUser; accessToken: string; onLogout: () => void }) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [localUser,     setLocalUser]     = useState<AdminUser>(user);

  const handleUserUpdate = (updated: AdminUser) => {
    setLocalUser(updated);
    adminAuth.patchUser(updated);
  };

  const [stats,        setStats]        = useState<DashboardStats | null>(null);
  const [bookingList,  setBookingList]  = useState<BookingRow[]>([]);
  const [proList,      setProList]      = useState<ProfessionalRow[]>([]);
  const [userList,     setUserList]     = useState<CustomerUser[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [reviewList,   setReviewList]   = useState<ReviewRow[]>([]);
  const [auditLogs,    setAuditLogs]    = useState<AuditLogRow[]>([]);
  const [offerList,    setOfferList]    = useState<OfferRow[]>([]);
  const [reelList,     setReelList]     = useState<ReelRow[]>([]);
  const [serviceList,  setServiceList]  = useState<ServiceRow[]>([]);
  const [dispatchList, setDispatchList] = useState<DispatchRequestRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, p, u, c, r, a, o, rl, sv, d] = await Promise.all([
        adminApi.getStats(accessToken),
        adminApi.getBookings(accessToken),
        adminApi.getProfessionals(accessToken),
        adminApi.getUsers(accessToken),
        adminApi.getCategories(accessToken),
        adminApi.getReviews(accessToken),
        adminApi.getAuditLogs(accessToken),
        adminApi.getOffers(accessToken),
        adminApi.getReels(accessToken),
        adminApi.getServices(accessToken),
        adminApi.getDispatch(accessToken),
      ]);
      setStats(s);
      setBookingList(b.bookings);
      setProList(p.professionals);
      setUserList(u.users);
      setCategoryList(c.categories);
      setReviewList(r.reviews);
      setAuditLogs(a.logs);
      setOfferList(o.offers);
      setReelList(rl.reels);
      setServiceList(sv.services);
      setDispatchList(d);
    } catch (err: any) {
      showMsg(err.message ?? "Failed to load data", "error");
    } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  /* ── Notifications ── */
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const [rows, unread] = await Promise.all([
        adminApi.getNotifications(accessToken),
        adminApi.getUnreadNotificationCount(accessToken),
      ]);
      setNotifications(rows);
      setUnreadCount(unread.count);
    } catch {
      // silent — notification bell should not disrupt the rest of the panel
    }
  }, [accessToken]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const toggleNotifDropdown = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) { setNotifLoading(true); await loadNotifications(); setNotifLoading(false); }
  };

  const handleMarkNotifRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try { await adminApi.markNotificationRead(id, accessToken); } catch { loadNotifications(); }
  };

  const handleMarkAllNotifRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try { await adminApi.markAllNotificationsRead(accessToken); } catch { loadNotifications(); }
  };

  const handleDeleteNotif = async (id: string) => {
    const wasUnread = notifications.find(n => n.id === id)?.isRead === false;
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
    try { await adminApi.deleteNotification(id, accessToken); } catch { loadNotifications(); }
  };

  /* ── Booking handlers ── */
  const editBooking = async (id: string, patch: { status?: string; notes?: string; price?: number; scheduledAt?: string }) => {
    await adminApi.updateBooking(id, patch, accessToken);
    showMsg("Booking updated"); load();
  };
  const deleteBooking = async (id: string) => {
    await adminApi.deleteBooking(id, accessToken);
    showMsg("Booking deleted"); load();
  };
  const cancelBooking = async (id: string) => {
    await adminApi.cancelBooking(id, accessToken);
    showMsg("Booking cancelled"); load();
  };

  /* ── Professional handlers ── */
  const createPro = async (data: { fullName: string; email: string; password: string; phone?: string; title: string; bio?: string; categoryId: string; subCategoryId?: string; basePrice: number; priceUnit?: string; badge?: string; tags?: string[] }): Promise<string> => {
    const pro = await adminApi.createProfessional(data, accessToken);
    showMsg("Professional created successfully"); load();
    return pro.id;
  };
  const editPro = async (id: string, patch: { name?: string; title?: string; bio?: string; basePrice?: number; priceUnit?: string; badge?: string; tags?: string[]; categoryId?: string; subCategoryId?: string | null }) => {
    await adminApi.updateProfessional(id, patch, accessToken);
    showMsg("Professional updated"); load();
  };
  const togglePro = async (id: string, active: boolean) => {
    if (active) await adminApi.suspendProfessional(id, accessToken);
    else        await adminApi.activateProfessional(id, accessToken);
    showMsg(active ? "Professional suspended" : "Professional activated"); load();
  };
  const deletePro = async (id: string) => {
    await adminApi.deleteProfessional(id, accessToken);
    showMsg("Professional deleted"); load();
  };

  /* ── User handlers ── */
  const editUser = async (u: CustomerUser, patch: { fullName: string; email: string; phone: string; role: string }) => {
    await adminApi.updateUser(u.id, patch, accessToken);
    showMsg("User updated"); load();
  };
  const deleteUser = async (id: string) => {
    await adminApi.deleteUser(id, accessToken);
    showMsg("User deleted"); load();
  };
  const toggleUser = async (id: string, active: boolean) => {
    if (active) await adminApi.suspendUser(id, accessToken);
    else        await adminApi.activateUser(id, accessToken);
    showMsg(active ? "User suspended" : "User activated"); load();
  };

  /* ── Category handlers ── */
  const createCategory = async (data: { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; featured: boolean }) => {
    await adminApi.createCategory(data, accessToken);
    showMsg("Category created"); load();
  };
  const editCategory = async (id: string, data: { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; isActive: boolean; featured: boolean }) => {
    await adminApi.updateCategory(id, data, accessToken);
    showMsg("Category updated"); load();
  };
  const deleteCategory = async (id: string) => {
    await adminApi.deleteCategory(id, accessToken);
    showMsg("Category deactivated"); load();
  };

  /* ── Review handlers ── */
  const deleteReview = async (id: string) => {
    await adminApi.deleteReview(id, accessToken);
    showMsg("Review moved to trash"); load();
  };
  const restoreReview = async (id: string) => {
    await adminApi.restoreReview(id, accessToken);
    showMsg("Review restored"); load();
  };

  /* ── Service handlers ── */
  const createService = async (data: ServiceInput) => {
    await adminApi.createService(data, accessToken);
    showMsg("Service created"); load();
  };
  const editService = async (id: string, data: Partial<ServiceInput>) => {
    await adminApi.updateService(id, data, accessToken);
    showMsg("Service updated"); load();
  };
  const deleteService = async (id: string) => {
    await adminApi.deleteService(id, accessToken);
    showMsg("Service deleted"); load();
  };

  /* ── Offer handlers ── */
  const createOffer = async (data: OfferInput) => {
    await adminApi.createOffer(data, accessToken);
    showMsg("Offer created"); load();
  };
  const editOffer = async (id: string, data: Partial<OfferInput>) => {
    await adminApi.updateOffer(id, data, accessToken);
    showMsg("Offer updated"); load();
  };
  const deleteOffer = async (id: string) => {
    await adminApi.deleteOffer(id, accessToken);
    showMsg("Offer moved to trash"); load();
  };
  const restoreOffer = async (id: string) => {
    await adminApi.restoreOffer(id, accessToken);
    showMsg("Offer restored"); load();
  };
  const uploadBannerImage = async (file: File): Promise<string> =>
    adminApi.uploadBannerImage(file, accessToken);

  /* ── Reel handlers ── */
  const createReel = async (data: { title: string; description?: string; videoUrl: string; thumbnailUrl?: string; sortOrder?: number }) => {
    await adminApi.createReel(data, accessToken);
    showMsg("Reel created"); load();
  };
  const editReel = async (id: string, data: Partial<{ title: string; description: string; videoUrl: string; thumbnailUrl: string; sortOrder: number; isActive: boolean }>) => {
    await adminApi.updateReel(id, data, accessToken);
    showMsg("Reel updated"); load();
  };
  const deleteReel = async (id: string) => {
    await adminApi.deleteReel(id, accessToken);
    showMsg("Reel moved to trash"); load();
  };
  const restoreReel = async (id: string) => {
    await adminApi.restoreReel(id, accessToken);
    showMsg("Reel restored"); load();
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "#0f1117" }}>
      {/* Toast */}
      {actionMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm text-white border shadow-xl"
          style={{ background: "#1e2535", borderColor: actionMsg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)" }}>
          {actionMsg.text}
        </div>
      )}

      {/* Sidebar */}
      <div className="flex flex-col border-r border-white/[0.08] transition-all duration-200 flex-shrink-0 h-full"
        style={{ width: sidebarOpen ? 220 : 64, background: "#161B27" }}>
        <div className="px-4 py-5 flex items-center gap-3 border-b border-white/[0.08]">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
            onClick={() => setSidebarOpen(v => !v)}>
            <Sparkles size={16} color="white" />
          </div>
          {sidebarOpen && <span className="text-white font-bold text-sm whitespace-nowrap">ServeNow Admin</span>}
        </div>

        <div className="flex-1 py-3 flex flex-col gap-1 px-2 overflow-y-auto">
          {ADMIN_SIDEBAR.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                style={{ background: active ? "rgba(91,62,245,0.15)" : "transparent", color: active ? "#7C5BF8" : "rgba(255,255,255,0.45)" }}>
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-semibold">{item.label}</span>}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-white/[0.08]">
          {sidebarOpen && (
            <div className="flex items-center gap-2 mb-2 px-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#5B3EF5" }}>
                {localUser.fullName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{localUser.fullName}</p>
                <p className="text-white/30 text-[10px] truncate">{localUser.email}</p>
              </div>
            </div>
          )}
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 rounded-xl w-full text-red-400 hover:bg-red-400/10 transition-colors">
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-semibold">Sign out</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] flex-shrink-0">
          <div>
            <h1 className="text-white font-bold text-base capitalize">
              {activeSection === "dispatch"
                ? "Customer Booking Operations Control Centre"
                : ADMIN_SIDEBAR.find(s => s.id === activeSection)?.label ?? activeSection}
            </h1>
            <p className="text-white/30 text-xs">ServeNow Admin Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors" title="Refresh">
              <RefreshCw size={14} color="rgba(255,255,255,0.5)" />
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotifDropdown}
                className="relative w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors"
                title="Notifications"
              >
                <Bell size={14} color="rgba(255,255,255,0.5)" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-11 w-80 max-h-[420px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl z-50 flex flex-col"
                  style={{ background: "#181a24" }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] flex-shrink-0">
                    <h4 className="text-white text-sm font-bold">Notifications</h4>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllNotifRead} className="text-[11px] font-semibold text-violet-400 hover:text-violet-300">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifLoading ? (
                      <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-violet-500" /></div>
                    ) : notifications.length === 0 ? (
                      <p className="text-white/30 text-xs py-8 text-center">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.isRead && handleMarkNotifRead(n.id)}
                          className="px-4 py-3 border-b border-white/[0.05] last:border-b-0 cursor-pointer hover:bg-white/[0.03] transition-colors flex gap-2 items-start"
                          style={{ background: n.isRead ? "transparent" : "rgba(91,62,245,0.06)" }}
                        >
                          {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold">{n.title}</p>
                            <p className="text-white/50 text-[11px] mt-0.5 leading-relaxed">{n.body}</p>
                            <p className="text-white/25 text-[10px] mt-1">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNotif(n.id); }}
                            className="p-1 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={32} className="animate-spin text-violet-500" />
            </div>
          ) : activeSection === "dashboard" ? (
            <DashboardView stats={stats} bookings={bookingList} pros={proList} />
          ) : activeSection === "bookings" ? (
            <BookingsView bookings={bookingList} onEdit={editBooking} onCancel={cancelBooking} onDelete={deleteBooking} />
          ) : activeSection === "pros" ? (
            <ProsView pros={proList} onEdit={editPro} onToggle={togglePro} onDelete={deletePro} categories={categoryList} accessToken={accessToken} onCreateNew={() => setActiveSection("create-pro")} />
          ) : activeSection === "create-pro" ? (
            <CreateProfessionalView categories={categoryList} accessToken={accessToken} onCreate={createPro} onCreated={() => setActiveSection("pros")} />
          ) : activeSection === "users" ? (
            <UsersView users={userList} onEdit={editUser} onDelete={deleteUser} onToggle={toggleUser} />
          ) : activeSection === "categories" ? (
            <CategoriesView categories={categoryList} onCreate={createCategory} onEdit={editCategory} onDelete={deleteCategory} accessToken={accessToken} onRefresh={load} />
          ) : activeSection === "dispatch" ? (
            <DispatchView requests={dispatchList} accessToken={accessToken} onAssigned={load} />
          ) : activeSection === "services" ? (
            <ServicesView services={serviceList} categories={categoryList} accessToken={accessToken} onCreate={createService} onEdit={editService} onDelete={deleteService} onRefresh={load} />
          ) : activeSection === "reels" ? (
            <ReelsView reels={reelList} onCreate={createReel} onEdit={editReel} onDelete={deleteReel} onRestore={restoreReel} accessToken={accessToken} onRefresh={load} />
          ) : activeSection === "offers" ? (
            <OffersView offers={offerList} onCreate={createOffer} onEdit={editOffer} onDelete={deleteOffer} onRestore={restoreOffer} onUploadImage={uploadBannerImage} accessToken={accessToken} />
          ) : activeSection === "reviews" ? (
            <ReviewsView reviews={reviewList} onDelete={deleteReview} onRestore={restoreReview} accessToken={accessToken} />
          ) : activeSection === "analytics" ? (
            <AnalyticsView stats={stats} />
          ) : activeSection === "audit-logs" ? (
            <AuditLogsView logs={auditLogs} />
          ) : activeSection === "privacy" ? (
            <PrivacySecurityView user={localUser} accessToken={accessToken} onUserUpdate={handleUserUpdate} />
          ) : activeSection === "support" ? (
            <HelpSupportView accessToken={accessToken} />
          ) : activeSection === "payment-config" ? (
            <PaymentConfigView accessToken={accessToken} />
          ) : activeSection === "email-config" ? (
            <EmailConfigView accessToken={accessToken} adminEmail={user.email} />
          ) : activeSection === "sms-config" ? (
            <SmsConfigView accessToken={accessToken} />
          ) : activeSection === "documents" ? (
            <DocumentVerificationView accessToken={accessToken} />
          ) : (
            <SettingsView user={user} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════════ */

function DashboardView({ stats, bookings, pros }: { stats: DashboardStats | null; bookings: BookingRow[]; pros: ProfessionalRow[] }) {
  const cards = [
    { label: "Total Bookings",    value: stats?.totalBookings   ?? 0, icon: BookOpen,   color: "#5B3EF5", money: false },
    { label: "Active Bookings",   value: stats?.activeBookings  ?? 0, icon: Clock,      color: "#F59E0B", money: false },
    { label: "Professionals",     value: stats?.totalProfessionals ?? 0, icon: Users,   color: "#16A34A", money: false },
    { label: "Total Customers",   value: stats?.totalCustomers  ?? 0, icon: UserCheck,  color: "#0EA5E9", money: false },
    { label: "Total Revenue",     value: stats?.totalRevenue    ?? 0, icon: DollarSign, color: "#DB2777", money: true  },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl p-4 border border-white/[0.07]" style={CARD}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs">{c.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: c.color + "20" }}>
                  <Icon size={14} color={c.color} />
                </div>
              </div>
              <p className="text-white font-bold text-2xl">
                {c.money ? fmt(c.value as number) : c.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <h3 className="text-white font-bold text-sm">Recent Bookings</h3>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {bookings.slice(0, 6).map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{b.serviceName}</p>
                  <p className="text-white/40 text-xs truncate">{b.customerName ?? "Customer"}</p>
                </div>
                <p className="text-white/60 text-xs flex-shrink-0">{fmt(b.price)}</p>
                <Badge label={b.status.replace("_", " ")} color={STATUS_COLOR[b.status] ?? "#6B7280"} />
              </div>
            ))}
            {bookings.length === 0 && <p className="px-5 py-6 text-white/30 text-sm text-center">No bookings yet</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <h3 className="text-white font-bold text-sm">Professionals</h3>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {pros.slice(0, 6).map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#5B3EF5" }}>
                    {p.name?.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-white/40 text-xs truncate">{p.categoryName ?? p.title}</p>
                </div>
                <Badge label={p.isActive ? "Active" : "Suspended"} color={p.isActive ? "#16A34A" : "#EF4444"} />
              </div>
            ))}
            {pros.length === 0 && <p className="px-5 py-6 text-white/30 text-sm text-center">No professionals yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BOOKINGS
═══════════════════════════════════════════════════════════════════ */

function PartnerStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    available:  { label: "Available",  color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    busy:       { label: "Busy",       color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    offline:    { label: "Offline",    color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  };
  const s = cfg[status] ?? cfg.offline;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: s.color, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function EligiblePartnersModal({
  booking,
  partners,
  loading,
  assigning,
  onAssign,
  onClose,
}: {
  booking: DispatchRequestRow;
  partners: EligiblePartner[] | null;
  loading: boolean;
  assigning: string | null;
  onAssign: (partnerId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] shadow-2xl" style={{ background: "#18181b" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.07]">
          <div>
            <h3 className="text-white font-bold text-base">Assign Partner</h3>
            <p className="text-white/40 text-xs mt-0.5">{booking.serviceName} · {booking.customerName}</p>
            <p className="text-white/30 text-xs">{new Date(booking.scheduledAt).toLocaleString("en-IN")}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg leading-none ml-4">✕</button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <span className="text-white/30 text-xs">Partner status:</span>
          {["available", "busy", "offline"].map((s) => <PartnerStatusBadge key={s} status={s} />)}
          <span className="text-white/25 text-xs ml-auto">All active partners shown</span>
        </div>

        {/* Partner list */}
        <div className="px-5 pb-5 max-h-[420px] overflow-y-auto space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <span className="text-white/40 text-sm">Loading partners…</span>
            </div>
          )}
          {!loading && partners && partners.length === 0 && (
            <div className="text-center py-10">
              <p className="text-white/40 text-sm">No active partners found for this service.</p>
              <p className="text-white/25 text-xs mt-1">Make sure partners have this service added to their profile.</p>
            </div>
          )}
          {!loading && partners && partners.map((partner) => (
            <div key={partner.id} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: "rgba(139,92,246,0.25)" }}>
                {partner.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-semibold truncate">{partner.name}</p>
                  <PartnerStatusBadge status={partner.availabilityStatus} />
                </div>
                <p className="text-white/40 text-xs mt-0.5">
                  ★ {partner.rating.toFixed(1)}
                  {partner.currentBookingStatus === "busy" && partner.availabilityStatus !== "offline" && (
                    <span className="ml-2 text-orange-400/70">· Currently on a job</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => onAssign(partner.id)}
                disabled={assigning === partner.id}
                className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 flex-shrink-0"
                style={{
                  background: partner.availabilityStatus === "available" ? "rgba(74,222,128,0.15)" : "rgba(139,92,246,0.15)",
                  color: partner.availabilityStatus === "available" ? "#4ade80" : "#a78bfa",
                }}
              >
                {assigning === partner.id ? "Assigning…" : partner.availabilityStatus === "available" ? "Assign" : "Force Assign"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DispatchView({
  requests,
  accessToken,
  onAssigned,
}: {
  requests: DispatchRequestRow[];
  accessToken: string;
  onAssigned: () => void;
}) {
  const [modalBooking, setModalBooking] = useState<DispatchRequestRow | null>(null);
  const [partners, setPartners] = useState<EligiblePartner[] | null>(null);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const openModal = async (request: DispatchRequestRow) => {
    setModalBooking(request);
    setPartners(null);
    setLoadingPartners(true);
    try {
      const list = await adminApi.getEligiblePartners(request.id, accessToken);
      setPartners(list);
    } catch {
      setPartners([]);
    } finally {
      setLoadingPartners(false);
    }
  };

  const closeModal = () => {
    setModalBooking(null);
    setPartners(null);
    setAssigning(null);
  };

  const assign = async (partnerId: string) => {
    if (!modalBooking) return;
    setAssigning(partnerId);
    try {
      await adminApi.assignPartner(modalBooking.id, partnerId, accessToken);
      setToast("Partner assigned successfully!");
      closeModal();
      onAssigned();
      setTimeout(() => setToast(null), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Assignment failed";
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setAssigning(null);
    }
  };

  const dispatchStatusColor = (s: string) =>
    s === "assigned" ? "#16A34A" : s === "waiting_operation" ? "#ef4444" : "#F59E0B";

  const q = search.toLowerCase();
  const filtered = requests.filter((r) => {
    const matchesSearch = !q ||
      r.customerName?.toLowerCase().includes(q) ||
      r.serviceName?.toLowerCase().includes(q) ||
      (r.proName ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.dispatchStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const STATUS_OPTIONS = [
    { value: "all",               label: "All" },
    { value: "searching_partner", label: "Searching" },
    { value: "waiting_operation", label: "Waiting" },
    { value: "assigned",          label: "Assigned" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-bold text-xl">Customer Booking Operations Control Centre</h2>
        <p className="text-white/40 text-sm mt-1">Monitor customer bookings and coordinate partner assignment.</p>
      </div>

      {/* Stats — clickable to filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          ["Searching",             "searching_partner", requests.filter((r) => r.dispatchStatus === "searching_partner").length],
          ["Waiting for operations","waiting_operation", requests.filter((r) => r.dispatchStatus === "waiting_operation").length],
          ["Assigned",              "assigned",          requests.filter((r) => r.dispatchStatus === "assigned").length],
        ] as [string, string, number][]).map(([label, val, count]) => (
          <button
            key={label}
            onClick={() => setStatusFilter(statusFilter === val ? "all" : val)}
            className="rounded-2xl border p-4 text-left transition-all"
            style={{
              ...CARD,
              borderColor: statusFilter === val ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.07)",
              background: statusFilter === val ? "rgba(139,92,246,0.08)" : undefined,
            }}
          >
            <p className="text-white/40 text-xs">{label}</p>
            <p className="text-white font-bold text-2xl mt-1">{count}</p>
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, service, or partner…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">✕</button>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
              style={{
                background: statusFilter === opt.value ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                color: statusFilter === opt.value ? "#a78bfa" : "rgba(255,255,255,0.4)",
                border: statusFilter === opt.value ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="text-white/25 text-xs -mt-2">
        Showing {filtered.length} of {requests.length} bookings
        {search && <span> matching "<span className="text-white/40">{search}</span>"</span>}
      </p>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Customer", "Service", "Scheduled", "Dispatch Status", "Current Partner", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((request) => (
                <tr key={request.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{request.customerName}</td>
                  <td className="px-4 py-3 text-white/70">{request.serviceName}</td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{new Date(request.scheduledAt).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={request.dispatchStatus.replace(/_/g, " ")}
                      color={dispatchStatusColor(request.dispatchStatus)}
                    />
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {request.dispatchStatus === "assigned" && request.proName
                      ? request.proName
                      : <span className="text-white/25 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openModal(request)}
                      className="rounded-lg bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/25 transition-colors whitespace-nowrap"
                    >
                      {request.dispatchStatus === "assigned" ? "Reassign Partner" : "Eligible Partners"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <EmptyRow cols={6} text={search || statusFilter !== "all" ? "No bookings match your filter" : "No active dispatch bookings"} />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalBooking && (
        <EligiblePartnersModal
          booking={modalBooking}
          partners={partners}
          loading={loadingPartners}
          assigning={assigning}
          onAssign={assign}
          onClose={closeModal}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg" style={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

type BookingPatch = { status: string; notes: string; price: number; scheduledAt: string };

function BookingsView({
  bookings, onEdit, onCancel, onDelete,
}: {
  bookings: BookingRow[];
  onEdit: (id: string, patch: { status?: string; notes?: string; price?: number; scheduledAt?: string }) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [search,      setSearch]      = useState("");
  const [editTarget,  setEditTarget]  = useState<BookingRow | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [form,        setForm]        = useState<BookingPatch>({ status: "", notes: "", price: 0, scheduledAt: "" });
  const [saving,      setSaving]      = useState(false);
  const [busyId,      setBusyId]      = useState<string | null>(null);

  const openEdit = (b: BookingRow) => {
    setForm({
      status: b.status,
      notes: b.notes ?? "",
      price: b.price,
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt).toISOString().slice(0, 16) : "",
    });
    setEditTarget(b);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await onEdit(editTarget.id, {
        status: form.status,
        notes: form.notes,
        price: Number(form.price),
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      });
      setEditTarget(null);
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    setBusyId(id);
    try { await onCancel(id); }
    catch (err: any) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const filtered = bookings.filter(b =>
    b.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
    b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    b.proName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {editTarget && (
        <Modal title="Edit Booking" onClose={() => setEditTarget(null)}>
          <div className="space-y-4">
            <Field label="Status">
              <SelectInput value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}>
                {["pending", "upcoming", "in_progress", "completed", "cancelled"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Scheduled At">
              <TextInput type="datetime-local" value={form.scheduledAt} onChange={v => setForm(f => ({ ...f, scheduledAt: v }))} />
            </Field>
            <Field label="Price (₹)">
              <TextInput type="number" value={String(form.price)} onChange={v => setForm(f => ({ ...f, price: Number(v) }))} />
            </Field>
            <Field label="Notes">
              <TextArea value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes…" />
            </Field>
          </div>
          <SaveCancelButtons onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Booking?"
          body="The booking will be permanently removed from the list."
          confirmLabel="Yes, delete"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search bookings…" />

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Service", "Customer", "Professional", "Amount", "Scheduled", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{b.serviceName}</td>
                  <td className="px-4 py-3 text-white/60 whitespace-nowrap">{b.customerName ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60 whitespace-nowrap">{b.proName}</td>
                  <td className="px-4 py-3 text-white/80 whitespace-nowrap">{fmt(b.price)}</td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                    {new Date(b.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                    {new Date(b.scheduledAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={b.status.replace("_", " ")} color={STATUS_COLOR[b.status] ?? "#6B7280"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ActionBtn variant="edit" onClick={() => openEdit(b)}>Edit</ActionBtn>
                      {b.status !== "cancelled" && b.status !== "completed" && (
                        <ActionBtn variant="warn" onClick={() => handleCancel(b.id)} disabled={busyId === b.id}>
                          Cancel
                        </ActionBtn>
                      )}
                      <ActionBtn variant="danger" onClick={() => setDeleteId(b.id)}>Delete</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyRow cols={7} text="No bookings found" />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROFESSIONALS
═══════════════════════════════════════════════════════════════════ */

type ProPatch = { name: string; title: string; bio: string; basePrice: number; priceUnit: string; badge: string; tags: string; categoryId: string; subCategoryId: string };

/* ═══════════════════════════════════════════════════════════════════
   CREATE PROFESSIONAL
═══════════════════════════════════════════════════════════════════ */
const EMPTY_PRO_FORM = {
  fullName: "", email: "", password: "", phone: "",
  title: "", bio: "", categoryId: "", subCategoryId: "",
  basePrice: 0, priceUnit: "/visit", badge: "", tags: "",
};

function CreateProfessionalView({
  categories, accessToken, onCreate, onCreated,
}: {
  categories: Category[];
  accessToken: string;
  onCreate: (data: { fullName: string; email: string; password: string; phone?: string; title: string; bio?: string; categoryId: string; subCategoryId?: string; basePrice: number; priceUnit?: string; badge?: string; tags?: string[] }) => Promise<string>;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(EMPTY_PRO_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [subCats, setSubCats] = useState<SubCategory[]>([]);
  const [subCatsLoading, setSubCatsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof EMPTY_PRO_FORM, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const loadSubCats = async (catId: string) => {
    setSubCats([]); set("subCategoryId", "");
    if (!catId) return;
    setSubCatsLoading(true);
    try {
      const res = await adminApi.getSubcategories(catId, accessToken);
      setSubCats((res.subcategories ?? []).filter(s => s.isActive));
    } catch { setSubCats([]); }
    finally { setSubCatsLoading(false); }
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.fullName.trim()) { setError("Full name is required."); return; }
    if (!form.email.trim())    { setError("Email is required."); return; }
    if (!form.password || form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!form.title.trim())    { setError("Title / role is required."); return; }
    if (!form.categoryId)      { setError("Please select a category."); return; }
    if (form.basePrice < 0)    { setError("Base price cannot be negative."); return; }

    setSaving(true);
    try {
      const proId = await onCreate({
        fullName:    form.fullName.trim(),
        email:       form.email.trim(),
        password:    form.password,
        phone:       form.phone.trim() || undefined,
        title:       form.title.trim(),
        bio:         form.bio.trim() || undefined,
        categoryId:  form.categoryId,
        subCategoryId: form.subCategoryId || undefined,
        basePrice:   Number(form.basePrice),
        priceUnit:   form.priceUnit,
        badge:       form.badge.trim() || undefined,
        tags:        form.tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      if (avatarFile && proId) {
        try { await adminApi.uploadProfessionalAvatar(proId, avatarFile, accessToken); } catch { /* non-fatal */ }
      }
      setSuccess(true);
      setForm(EMPTY_PRO_FORM);
      setSubCats([]);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to create professional.");
    } finally { setSaving(false); }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(22,163,74,0.15)" }}>
          <CheckCircle size={36} className="text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-1">Professional Created!</p>
          <p className="text-white/40 text-sm">The account and profile are ready. They can log in with their email and password.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSuccess(false)}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors">
            Create Another
          </button>
          <button onClick={onCreated}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            View Professionals
          </button>
        </div>
      </div>
    );
  }

  const activeCategories = categories.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-white text-xl font-bold">Create Professional</h2>
        <p className="text-white/40 text-sm mt-1">Creates a partner login account and professional profile in one step.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
          <XCircle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Account details */}
      <div className="rounded-2xl border border-white/[0.07] p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)" }}>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Account Details</p>

        {/* Avatar picker */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer border-2 border-dashed border-white/20 hover:border-white/40 transition-colors"
            style={{ background: avatarPreview ? "transparent" : "rgba(91,62,245,0.12)" }}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              : <span className="text-2xl text-white/30">📷</span>}
          </div>
          <div>
            <button type="button" onClick={() => avatarInputRef.current?.click()}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors">
              {avatarFile ? "Change Photo" : "Upload Photo"}
            </button>
            {avatarFile && (
              <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); if (avatarInputRef.current) avatarInputRef.current.value = ""; }}
                className="ml-2 text-sm text-white/30 hover:text-white/60 transition-colors">Remove</button>
            )}
            <p className="text-white/30 text-xs mt-1">PNG, JPG or WebP · max 5 MB · optional</p>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarPick} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name *">
            <TextInput value={form.fullName} onChange={v => set("fullName", v)} placeholder="e.g. Ravi Kumar" />
          </Field>
          <Field label="Phone (optional)">
            <TextInput value={form.phone} onChange={v => set("phone", v)} placeholder="+91 98765 43210" />
          </Field>
        </div>
        <Field label="Email *">
          <TextInput value={form.email} onChange={v => set("email", v)} type="email" placeholder="ravi@example.com" />
        </Field>
        <Field label="Password *">
          <div className="relative">
            <TextInput value={form.password} onChange={v => set("password", v)} type={showPass ? "text" : "password"} placeholder="Min. 6 characters" />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
      </div>

      {/* Professional profile */}
      <div className="rounded-2xl border border-white/[0.07] p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)" }}>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Professional Profile</p>
        <Field label="Title / Role *">
          <TextInput value={form.title} onChange={v => set("title", v)} placeholder="e.g. Expert Plumber, Senior Electrician" />
        </Field>
        <Field label="Bio">
          <TextArea value={form.bio} onChange={v => set("bio", v)} placeholder="Brief description of experience and expertise…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category *">
            <SelectInput value={form.categoryId} onChange={v => { set("categoryId", v); loadSubCats(v); }}>
              <option value="">— Select category —</option>
              {activeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Sub-category">
            <SelectInput value={form.subCategoryId} onChange={v => set("subCategoryId", v)} disabled={!form.categoryId || subCatsLoading}>
              <option value="">
                {!form.categoryId ? "Select category first" : subCatsLoading ? "Loading…" : subCats.length === 0 ? "None available" : "— None —"}
              </option>
              {subCats.sort((a, b) => a.sortOrder - b.sortOrder).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectInput>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Base Price (₹) *">
            <TextInput type="number" value={String(form.basePrice)} onChange={v => set("basePrice", Number(v))} placeholder="500" />
          </Field>
          <Field label="Price Unit">
            <SelectInput value={form.priceUnit} onChange={v => set("priceUnit", v)}>
              {["/visit", "/hr", "/day", "/session"].map(u => <option key={u} value={u}>{u}</option>)}
            </SelectInput>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Badge (optional)">
            <TextInput value={form.badge} onChange={v => set("badge", v)} placeholder="e.g. Top Rated" />
          </Field>
          <Field label="Tags (comma-separated)">
            <TextInput value={form.tags} onChange={v => set("tags", v)} placeholder="plumbing, pipes, repair" />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => { setForm(EMPTY_PRO_FORM); setSubCats([]); setError(""); }}
          className="px-5 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors">
          Reset
        </button>
        <button onClick={handleSubmit} disabled={saving}
          className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-opacity"
          style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Creating…" : "Create Professional"}
        </button>
      </div>
    </div>
  );
}

function ProsView({
  pros, onEdit, onToggle, onDelete, categories, accessToken, onCreateNew,
}: {
  pros: ProfessionalRow[];
  onEdit: (id: string, patch: { name?: string; title?: string; bio?: string; basePrice?: number; priceUnit?: string; badge?: string; tags?: string[]; categoryId?: string; subCategoryId?: string | null }) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  categories: Category[];
  accessToken: string;
  onCreateNew: () => void;
}) {
  const [search,      setSearch]      = useState("");
  const [editTarget,  setEditTarget]  = useState<ProfessionalRow | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [form,        setForm]        = useState<ProPatch>({ name: "", title: "", bio: "", basePrice: 0, priceUnit: "/visit", badge: "", tags: "", categoryId: "", subCategoryId: "" });
  const [saving,      setSaving]      = useState(false);
  const [busyId,      setBusyId]      = useState<string | null>(null);
  const [subCats,     setSubCats]     = useState<SubCategory[]>([]);
  const [subCatsLoading, setSubCatsLoading] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editAvatarUploading, setEditAvatarUploading] = useState(false);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  const loadSubCats = async (categoryId: string) => {
    if (!categoryId) { setSubCats([]); return; }
    setSubCatsLoading(true);
    try {
      const res = await adminApi.getSubcategories(categoryId, accessToken);
      setSubCats((res.subcategories ?? []).filter(s => s.isActive));
    } catch { setSubCats([]); }
    finally { setSubCatsLoading(false); }
  };

  const openEdit = (p: ProfessionalRow) => {
    const catId = p.categoryId ?? "";
    setForm({
      name: p.name, title: p.title, bio: p.bio ?? "",
      basePrice: p.basePrice, priceUnit: p.priceUnit,
      badge: p.badge ?? "", tags: (p.tags ?? []).join(", "),
      categoryId: catId, subCategoryId: p.subCategoryId ?? "",
    });
    setSubCats([]);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    if (catId) loadSubCats(catId);
    setEditTarget(p);
  };

  const handleEditAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  };

  const handleEditAvatarUpload = async () => {
    if (!editAvatarFile || !editTarget) return;
    setEditAvatarUploading(true);
    try {
      await adminApi.uploadProfessionalAvatar(editTarget.id, editAvatarFile, accessToken);
      setEditAvatarFile(null);
      setEditAvatarPreview(null);
    } catch (err: any) { alert(err.message); }
    finally { setEditAvatarUploading(false); }
  };

  const handleCategoryChange = (catId: string) => {
    setForm(f => ({ ...f, categoryId: catId, subCategoryId: "" }));
    loadSubCats(catId);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      if (editAvatarFile) await handleEditAvatarUpload();
      await onEdit(editTarget.id, {
        name: form.name, title: form.title, bio: form.bio,
        basePrice: Number(form.basePrice), priceUnit: form.priceUnit,
        badge: form.badge,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        categoryId: form.categoryId || undefined,
        subCategoryId: form.subCategoryId || null,
      });
      setEditTarget(null);
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (p: ProfessionalRow) => {
    setBusyId(p.id);
    try { await onToggle(p.id, p.isActive); }
    catch (err: any) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const filtered = pros.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoryName?.toLowerCase().includes(search.toLowerCase()) ||
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {editTarget && (
        <Modal title="Edit Professional" onClose={() => setEditTarget(null)}>
          <div className="space-y-4">
            {/* Avatar upload */}
            <div className="flex items-center gap-4 pb-2 border-b border-white/[0.07]">
              <div
                className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 border-dashed border-white/20 hover:border-white/40 transition-colors flex items-center justify-center"
                style={{ background: "rgba(91,62,245,0.12)" }}
                onClick={() => editAvatarInputRef.current?.click()}
              >
                {editAvatarPreview
                  ? <img src={editAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  : editTarget.avatarUrl
                    ? <img src={editTarget.avatarUrl} alt={editTarget.name} className="w-full h-full object-cover" />
                    : <span className="text-xl text-white/30">📷</span>}
              </div>
              <div>
                <button type="button" onClick={() => editAvatarInputRef.current?.click()}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors">
                  {editAvatarFile ? "Change Photo" : editTarget.avatarUrl ? "Replace Photo" : "Upload Photo"}
                </button>
                {editAvatarFile && (
                  <button type="button" onClick={() => { setEditAvatarFile(null); setEditAvatarPreview(null); if (editAvatarInputRef.current) editAvatarInputRef.current.value = ""; }}
                    className="ml-2 text-xs text-white/30 hover:text-white/60 transition-colors">Remove</button>
                )}
                <p className="text-white/30 text-xs mt-1">PNG, JPG, WebP · max 5 MB</p>
              </div>
              <input ref={editAvatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleEditAvatarPick} />
            </div>
            <Field label="Name"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} /></Field>
            <Field label="Title"><TextInput value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} /></Field>
            <Field label="Bio"><TextArea value={form.bio} onChange={v => setForm(f => ({ ...f, bio: v }))} placeholder="Professional bio…" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Base Price (₹)"><TextInput type="number" value={String(form.basePrice)} onChange={v => setForm(f => ({ ...f, basePrice: Number(v) }))} /></Field>
              <Field label="Price Unit">
                <SelectInput value={form.priceUnit} onChange={v => setForm(f => ({ ...f, priceUnit: v }))}>
                  {["/visit", "/hr", "/day", "/session"].map(u => <option key={u} value={u}>{u}</option>)}
                </SelectInput>
              </Field>
            </div>
            <Field label="Category">
              <SelectInput value={form.categoryId} onChange={handleCategoryChange}>
                <option value="">— Select category —</option>
                {categories.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Sub-category">
              <SelectInput
                value={form.subCategoryId}
                onChange={v => setForm(f => ({ ...f, subCategoryId: v }))}
                disabled={!form.categoryId || subCatsLoading}
              >
                <option value="">{!form.categoryId ? "Select a category first" : subCatsLoading ? "Loading…" : subCats.length === 0 ? "No sub-categories available" : "— None —"}</option>
                {subCats.sort((a, b) => a.sortOrder - b.sortOrder).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Badge (optional)"><TextInput value={form.badge} onChange={v => setForm(f => ({ ...f, badge: v }))} placeholder="e.g. Top Rated" /></Field>
            <Field label="Tags (comma-separated)"><TextInput value={form.tags} onChange={v => setForm(f => ({ ...f, tags: v }))} placeholder="cleaning, deep clean, …" /></Field>
          </div>
          <SaveCancelButtons onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Professional?"
          body="The professional profile will be soft-deleted and hidden from the Customer App."
          confirmLabel="Yes, delete"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search professionals…" />
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white whitespace-nowrap"
          style={{ background: "#5B3EF5" }}
        >
          <UserPlus size={15} />
          Create Professional
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Professional", "Category", "Sub-category", "Rating", "Price", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#5B3EF5" }}>
                          {p.name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-semibold text-sm whitespace-nowrap">{p.name}</p>
                        <p className="text-white/40 text-xs whitespace-nowrap">{p.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60 whitespace-nowrap">{p.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{p.subCategoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-white/80 whitespace-nowrap">⭐ {p.rating?.toFixed(1) ?? "—"}</td>
                  <td className="px-4 py-3 text-white/80 whitespace-nowrap">{fmt(p.basePrice)}{p.priceUnit}</td>
                  <td className="px-4 py-3">
                    <Badge label={p.isActive ? "Active" : "Suspended"} color={p.isActive ? "#16A34A" : "#EF4444"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ActionBtn variant="edit" onClick={() => openEdit(p)}>Edit</ActionBtn>
                      <ActionBtn
                        variant={p.isActive ? "warn" : "green"}
                        onClick={() => handleToggle(p)}
                        disabled={busyId === p.id}
                      >
                        {p.isActive ? "Suspend" : "Activate"}
                      </ActionBtn>
                      <ActionBtn variant="danger" onClick={() => setDeleteId(p.id)}>Delete</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyRow cols={7} text="No professionals found" />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   USERS
═══════════════════════════════════════════════════════════════════ */

const ROLE_COLOR: Record<string, string> = {
  customer: "#0EA5E9", partner: "#F59E0B", admin: "#5B3EF5",
};

function UsersView({
  users, onEdit, onDelete, onToggle,
}: {
  users: CustomerUser[];
  onEdit: (u: CustomerUser, patch: { fullName: string; email: string; phone: string; role: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
}) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<CustomerUser | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState({ fullName: "", email: "", phone: "", role: "" });
  const [saving,     setSaving]     = useState(false);
  const [busyId,     setBusyId]     = useState<string | null>(null);

  const openEdit = (u: CustomerUser) => {
    setForm({ fullName: u.fullName, email: u.email, phone: u.phone ?? "", role: u.role });
    setEditTarget(u);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try { await onEdit(editTarget, form); setEditTarget(null); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (u: CustomerUser) => {
    setBusyId(u.id);
    try { await onToggle(u.id, u.isActive); }
    catch (err: any) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const filtered = users.filter(u =>
    (roleFilter === "all" || u.role === roleFilter) &&
    (u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()) ||
     u.role?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {editTarget && (
        <Modal title="Edit User" onClose={() => setEditTarget(null)}>
          <div className="space-y-4">
            <Field label="Full Name"><TextInput value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} /></Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} /></Field>
            <Field label="Phone"><TextInput type="tel" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} /></Field>
            <Field label="Role">
              <SelectInput value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))}>
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
              </SelectInput>
            </Field>
          </div>
          <SaveCancelButtons onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete User?"
          body="The user account will be permanently deactivated. This cannot be undone."
          confirmLabel="Yes, delete"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users…" />
        </div>
        <select
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <option value="all">All roles</option>
          <option value="customer">Customers</option>
          <option value="partner">Partners</option>
        </select>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Name", "Email", "Phone", "Role", "Status", "Joined", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.fullName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: ROLE_COLOR[u.role] ?? "#5B3EF5" }}>
                          {u.fullName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white font-semibold whitespace-nowrap">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60 whitespace-nowrap">{u.email}</td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge label={u.role} color={ROLE_COLOR[u.role] ?? "#5B3EF5"} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={u.isActive ? "Active" : "Inactive"} color={u.isActive ? "#16A34A" : "#EF4444"} />
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ActionBtn variant="edit" onClick={() => openEdit(u)}>Edit</ActionBtn>
                      <ActionBtn
                        variant={u.isActive ? "warn" : "green"}
                        onClick={() => handleToggle(u)}
                        disabled={busyId === u.id}
                      >
                        {u.isActive ? "Suspend" : "Activate"}
                      </ActionBtn>
                      <ActionBtn variant="danger" onClick={() => setDeleteId(u.id)}>Delete</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyRow cols={7} text="No users found" />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CATEGORIES
═══════════════════════════════════════════════════════════════════ */

type CatForm = { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; isActive: boolean; featured: boolean };
const EMPTY_CAT: CatForm = { name: "", description: "", iconName: "Grid", color: "#F3F4F6", iconColor: "#6B7280", sortOrder: 0, isActive: true, featured: false };

const IMAGE_ACCEPT = "image/svg+xml,image/webp,image/png";
const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function ImageUploadButton({ label, onUpload, currentUrl, disabled }: { label: string; onUpload: (f: File) => Promise<void>; currentUrl?: string | null; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [sizeErr, setSizeErr] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSizeErr(false);
    if (f.size > IMAGE_MAX_BYTES) {
      setSizeErr(true);
      if (ref.current) ref.current.value = "";
      return;
    }
    setBusy(true);
    try { await onUpload(f); } catch (err: any) { alert(err.message); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {currentUrl && (
          <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src={currentUrl} alt="preview" className="w-full h-full object-contain" />
          </div>
        )}
        <button
          type="button" onClick={() => { setSizeErr(false); ref.current?.click(); }} disabled={disabled || busy}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white/70 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {busy ? "Uploading…" : label}
        </button>
      </div>

      {/* Format hint */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wide">Accepted formats</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/20">
            ★ SVG
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-white/40 border border-white/10">
            WebP
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-white/40 border border-white/10">
            PNG
          </span>
          <span className="text-white/20 text-[10px]">·</span>
          <span className="text-[10px] text-white/30">Max 5 MB</span>
        </div>
        <p className="text-[10px] text-white/25 leading-snug">
          SVG recommended — stays crisp at any size and resolution.
        </p>
        {sizeErr && (
          <p className="text-[10px] text-red-400 font-semibold mt-0.5">
            File exceeds 5 MB. Please choose a smaller image.
          </p>
        )}
      </div>

      <input ref={ref} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handle} />
    </div>
  );
}

function CatFormFields({ form, setForm }: { form: CatForm; setForm: React.Dispatch<React.SetStateAction<CatForm>> }) {
  return (
    <div className="space-y-4">
      <Field label="Name *"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Home Cleaning" /></Field>
      <Field label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Short description…" rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Icon Name"><TextInput value={form.iconName} onChange={v => setForm(f => ({ ...f, iconName: v }))} placeholder="Grid" /></Field>
        <Field label="Sort Order"><TextInput type="number" value={String(form.sortOrder)} onChange={v => setForm(f => ({ ...f, sortOrder: Number(v) }))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Card Color">
          <div className="flex gap-2 items-center">
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            <TextInput value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} />
          </div>
        </Field>
        <Field label="Icon Color">
          <div className="flex gap-2 items-center">
            <input type="color" value={form.iconColor} onChange={e => setForm(f => ({ ...f, iconColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            <TextInput value={form.iconColor} onChange={v => setForm(f => ({ ...f, iconColor: v }))} />
          </div>
        </Field>
      </div>
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
      >
        <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.featured ? "bg-violet-600" : "bg-white/10"}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.featured ? "translate-x-5" : ""}`} />
        </div>
        <span className="text-white/60 text-xs">Mark as featured category</span>
      </div>
    </div>
  );
}

function CategoriesView({
  categories, onCreate, onEdit, onDelete, accessToken, onRefresh,
}: {
  categories: Category[];
  onCreate: (data: { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; featured: boolean }) => Promise<void>;
  onEdit: (id: string, data: { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; isActive: boolean; featured: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  accessToken: string;
  onRefresh: () => void;
}) {
  const [search,       setSearch]       = useState("");
  const [editTarget,   setEditTarget]   = useState<Category | null>(null);
  const [creating,     setCreating]     = useState(false);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [form,         setForm]         = useState<CatForm>(EMPTY_CAT);
  const [saving,       setSaving]       = useState(false);
  const [busyId,       setBusyId]       = useState<string | null>(null);
  const [subCatTarget, setSubCatTarget] = useState<Category | null>(null);
  const [subCounts,    setSubCounts]    = useState<Record<string, number>>({});

  /* Fetch subcategory counts in parallel for all real categories */
  useEffect(() => {
    if (!categories.length) return;
    Promise.allSettled(
      categories.map(c =>
        adminApi.getSubcategories(c.id, accessToken)
          .then(r => ({ id: c.id, count: r.total ?? r.subcategories.length }))
      )
    ).then(results => {
      const map: Record<string, number> = {};
      results.forEach(r => { if (r.status === "fulfilled") map[r.value.id] = r.value.count; });
      setSubCounts(map);
    });
  }, [categories, accessToken]);

  const openCreate = () => { setForm(EMPTY_CAT); setCreating(true); };
  const openEdit   = (c: Category) => {
    setForm({ name: c.name, description: c.description ?? "", iconName: c.iconName, color: c.color, iconColor: c.iconColor, sortOrder: c.sortOrder, isActive: c.isActive, featured: c.featured ?? false });
    setEditTarget(c);
  };

  const handleCreate = async () => {
    setSaving(true);
    try { await onCreate({ name: form.name, description: form.description, iconName: form.iconName, color: form.color, iconColor: form.iconColor, sortOrder: form.sortOrder, featured: form.featured }); setCreating(false); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try { await onEdit(editTarget.id, form); setEditTarget(null); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (c: Category) => {
    setBusyId(c.id);
    try { await onEdit(c.id, { name: c.name, description: c.description ?? "", iconName: c.iconName, color: c.color, iconColor: c.iconColor, sortOrder: c.sortOrder, isActive: !c.isActive, featured: c.featured ?? false }); }
    catch (err: any) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (subCatTarget) {
    return (
      <SubCategoriesView
        category={subCatTarget}
        accessToken={accessToken}
        onBack={() => { setSubCatTarget(null); onRefresh(); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Modals */}
      {creating && (
        <Modal title="New Category" onClose={() => setCreating(false)}>
          <CatFormFields form={form} setForm={setForm} />
          <SaveCancelButtons onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} saveLabel="Create category" />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit Category" onClose={() => setEditTarget(null)}>
          <CatFormFields form={form} setForm={setForm} />
          {editTarget.id && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs mb-2">Category image</p>
              <ImageUploadButton
                label="Upload image"
                currentUrl={editTarget.imageUrl}
                onUpload={async (f) => {
                  const updated = await adminApi.uploadCategoryImage(editTarget.id, f, accessToken);
                  setEditTarget(updated);
                  onRefresh();
                }}
              />
            </div>
          )}
          <SaveCancelButtons onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmDialog
          title="Delete Category?"
          body="This will remove the category. Existing professionals and bookings are not affected."
          confirmLabel="Delete"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-white/60 font-semibold">Services</span>
        </div>
        {/* Title row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-white font-bold text-xl">Service Categories</h2>
            <p className="text-white/35 text-xs mt-0.5">{filtered.length} {filtered.length === 1 ? "category" : "categories"}</p>
          </div>
          <div className="flex-1 min-w-0" />
          <div className="w-60 flex-shrink-0">
            <SearchBar value={search} onChange={setSearch} placeholder="Search categories…" />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white whitespace-nowrap flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
          >
            <Plus size={14} /> Add Category
          </button>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/20">
          <Grid size={44} className="mb-3" />
          <p className="text-sm">No categories found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col group hover:border-violet-500/30 transition-all duration-200"
              style={CARD}
            >
              {/* Clickable card body → drill into sub-categories */}
              <button
                className="flex-1 p-5 text-left w-full hover:bg-white/[0.02] transition-colors"
                onClick={() => setSubCatTarget(c)}
              >
                {/* Icon + badges */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: c.color }}>
                    {c.imageUrl
                      ? <img src={c.imageUrl} alt={c.name} className="w-12 h-12 object-cover" />
                      : <Grid size={20} color={c.iconColor} />}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-2">
                    {c.featured && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "#F59E0B22", color: "#F59E0B" }}>
                        <Star size={9} fill="currentColor" /> Featured
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: c.isActive ? "#16A34A22" : "#EF444422", color: c.isActive ? "#16A34A" : "#EF4444" }}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Name + description */}
                <h3 className="text-white font-bold text-sm leading-snug group-hover:text-violet-300 transition-colors mb-1">{c.name}</h3>
                {c.description
                  ? <p className="text-white/35 text-xs leading-relaxed line-clamp-2">{c.description}</p>
                  : <p className="text-white/20 text-xs italic">No description</p>}

                {/* Stats + arrow */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                  <div>
                    <p className="text-white font-bold text-sm leading-none">
                      {subCounts[c.id] !== undefined ? subCounts[c.id] : <span className="text-white/30">—</span>}
                    </p>
                    <p className="text-white/30 text-[10px] mt-0.5">Sub-cats</p>
                  </div>
                  <div className="w-px h-7 bg-white/[0.08]" />
                  <div>
                    <p className="text-white font-bold text-sm leading-none">{c.serviceCount}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">Partners</p>
                  </div>
                  <div className="flex-1" />
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-violet-400/50 group-hover:text-violet-400 transition-colors whitespace-nowrap">
                    Manage <ChevronRight size={11} />
                  </span>
                </div>
              </button>

              {/* Action footer */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.05]" style={{ background: "rgba(255,255,255,0.015)" }}>
                <ActionBtn variant="edit" onClick={() => openEdit(c)}>Edit</ActionBtn>
                <ActionBtn
                  variant={c.isActive ? "warn" : "green"}
                  onClick={() => handleToggleActive(c)}
                  disabled={busyId === c.id}
                >
                  {busyId === c.id ? "…" : c.isActive ? "Deactivate" : "Activate"}
                </ActionBtn>
                <div className="flex-1" />
                <ActionBtn variant="danger" onClick={() => setDeleteId(c.id)}>Delete</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-CATEGORIES
═══════════════════════════════════════════════════════════════════ */

type SubCatForm = { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; isActive: boolean; featured: boolean };
const EMPTY_SUB: SubCatForm = { name: "", description: "", iconName: "tag-outline", color: "#5B3EF5", iconColor: "#ffffff", sortOrder: 0, isActive: true, featured: false };

function SubForm({ form, setForm }: { form: SubCatForm; setForm: React.Dispatch<React.SetStateAction<SubCatForm>> }) {
  return (
    <div className="space-y-4">
      <Field label="Name *"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Bathroom Cleaning" /></Field>
      <Field label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Short description…" rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Icon Name"><TextInput value={form.iconName} onChange={v => setForm(f => ({ ...f, iconName: v }))} placeholder="tag-outline" /></Field>
        <Field label="Sort Order"><TextInput type="number" value={String(form.sortOrder)} onChange={v => setForm(f => ({ ...f, sortOrder: Number(v) }))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Card Color">
          <div className="flex gap-2 items-center">
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            <TextInput value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} />
          </div>
        </Field>
        <Field label="Icon Color">
          <div className="flex gap-2 items-center">
            <input type="color" value={form.iconColor} onChange={e => setForm(f => ({ ...f, iconColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            <TextInput value={form.iconColor} onChange={v => setForm(f => ({ ...f, iconColor: v }))} />
          </div>
        </Field>
      </div>
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
      >
        <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.featured ? "bg-violet-600" : "bg-white/10"}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.featured ? "translate-x-5" : ""}`} />
        </div>
        <span className="text-white/60 text-xs">Mark as featured sub-category</span>
      </div>
    </div>
  );
}

function SubCategoriesView({ category, accessToken, onBack }: { category: Category; accessToken: string; onBack: () => void }) {
  const [subs,       setSubs]       = useState<SubCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [editTarget, setEditTarget] = useState<SubCategory | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState<SubCatForm>(EMPTY_SUB);
  const [saving,     setSaving]     = useState(false);
  const [busyId,     setBusyId]     = useState<string | null>(null);
  const [search,     setSearch]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await adminApi.getSubcategories(category.id, accessToken); setSubs(d.subcategories); }
    catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }, [category.id, accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try { await adminApi.createSubcategory(category.id, { name: form.name, description: form.description, iconName: form.iconName, color: form.color, iconColor: form.iconColor, sortOrder: form.sortOrder }, accessToken); load(); setCreating(false); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try { await adminApi.updateSubcategory(editTarget.id, form, accessToken); load(); setEditTarget(null); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await adminApi.deleteSubcategory(deleteId, accessToken); load(); setDeleteId(null); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s: SubCategory) => {
    setBusyId(s.id);
    try { await adminApi.updateSubcategory(s.id, { isActive: !s.isActive }, accessToken); load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusyId(null); }
  };

  const filtered = subs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* Modals */}
      {creating && (
        <Modal title={`New Sub-category — ${category.name}`} onClose={() => setCreating(false)}>
          <SubForm form={form} setForm={setForm} />
          <SaveCancelButtons onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} saveLabel="Create sub-category" />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit Sub-category" onClose={() => setEditTarget(null)}>
          <SubForm form={form} setForm={setForm} />
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs mb-2">Sub-category image</p>
            <ImageUploadButton
              label="Upload image"
              currentUrl={editTarget.imageUrl}
              onUpload={async (f) => {
                const updated = await adminApi.uploadSubcategoryImage(editTarget.id, f, accessToken);
                setEditTarget(updated);
                load();
              }}
            />
          </div>
          <SaveCancelButtons onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmDialog
          title="Delete Sub-category?"
          body="This sub-category will be moved to trash. You can restore it later."
          confirmLabel="Delete"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Header + Breadcrumb */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <button onClick={onBack} className="hover:text-white/60 transition-colors">Services</button>
          <ChevronRight size={12} />
          <span className="text-white/60 font-semibold">{category.name}</span>
        </div>
        {/* Title row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/25 transition-colors text-sm"
              title="Back to categories"
            >
              ←
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: category.color }}>
              {category.imageUrl
                ? <img src={category.imageUrl} alt={category.name} className="w-10 h-10 object-cover" />
                : <Grid size={18} color={category.iconColor} />}
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">{category.name}</h2>
              <p className="text-white/35 text-xs mt-0.5">
                {loading ? "Loading…" : `${filtered.length} sub-${filtered.length === 1 ? "category" : "categories"}`}
              </p>
            </div>
          </div>
          <div className="flex-1 min-w-0" />
          <div className="w-60 flex-shrink-0">
            <SearchBar value={search} onChange={setSearch} placeholder={`Search in ${category.name}…`} />
          </div>
          <button
            onClick={() => { setForm(EMPTY_SUB); setCreating(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white whitespace-nowrap flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
          >
            <Plus size={14} /> Add Sub-category
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-28">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/20">
          <Tag size={44} className="mb-3" />
          <p className="text-sm">
            {search ? `No sub-categories match "${search}"` : `No sub-categories yet — add the first one`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col hover:border-violet-500/20 transition-all duration-200"
              style={CARD}
            >
              {/* Image banner or icon placeholder */}
              <div
                className="h-[88px] w-full flex items-center justify-center flex-shrink-0 overflow-hidden relative"
                style={{ background: s.imageUrl ? undefined : (s.color ?? category.color) + "33" }}
              >
                {s.imageUrl
                  ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                  : (
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: s.color ?? category.color }}>
                      <Grid size={22} color={s.iconColor ?? category.iconColor} />
                    </div>
                  )}
                {s.featured && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "#F59E0B22", color: "#F59E0B" }}>Featured</span>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-white font-bold text-sm leading-snug">{s.name}</h3>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
                    style={{ background: s.isActive ? "#16A34A22" : "#EF444422", color: s.isActive ? "#16A34A" : "#EF4444" }}
                  >
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {s.description
                  ? <p className="text-white/35 text-xs leading-relaxed line-clamp-2">{s.description}</p>
                  : <p className="text-white/20 text-xs italic">No description</p>}
                <p className="text-white/20 text-[10px] mt-3">Order: {s.sortOrder}</p>
              </div>

              {/* Action footer */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.05]" style={{ background: "rgba(255,255,255,0.015)" }}>
                <ActionBtn
                  variant="edit"
                  onClick={() => { setForm({ name: s.name, description: s.description ?? "", iconName: s.iconName ?? "tag-outline", color: s.color ?? "#5B3EF5", iconColor: s.iconColor ?? "#ffffff", sortOrder: s.sortOrder, isActive: s.isActive, featured: s.featured ?? false }); setEditTarget(s); }}
                >
                  Edit
                </ActionBtn>
                <ActionBtn
                  variant={s.isActive ? "warn" : "green"}
                  onClick={() => handleToggle(s)}
                  disabled={busyId === s.id}
                >
                  {busyId === s.id ? "…" : s.isActive ? "Deactivate" : "Activate"}
                </ActionBtn>
                <div className="flex-1" />
                <ActionBtn variant="danger" onClick={() => setDeleteId(s.id)}>Delete</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   REVIEWS
═══════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════
   OFFERS / BANNERS
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   REELS
═══════════════════════════════════════════════════════════════════ */

type ReelForm = { title: string; description: string; videoUrl: string; thumbnailUrl: string; sortOrder: number; isActive: boolean };
const EMPTY_REEL: ReelForm = { title: "", description: "", videoUrl: "", thumbnailUrl: "", sortOrder: 0, isActive: true };

function ReelFormFields({
  form, setForm, reel, onVideoUpload, onThumbUpload, uploadingId,
}: {
  form: ReelForm;
  setForm: React.Dispatch<React.SetStateAction<ReelForm>>;
  reel: ReelRow | null;
  onVideoUpload: (id: string, file: File) => Promise<void>;
  onThumbUpload: (reel: ReelRow, file: File) => Promise<void>;
  uploadingId: string | null;
}) {
  return (
    <div className="space-y-4">
      <Field label="Title *"><TextInput value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Quick Kitchen Cleaning" /></Field>
      <Field label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={2} /></Field>
      <Field label="Video URL *">
        <TextInput value={form.videoUrl} onChange={v => setForm(f => ({ ...f, videoUrl: v }))} placeholder="https://…" />
        {reel && (
          <div className="mt-2">
            <ImageUploadButton
              label="Or upload video file (MP4/MOV/WebM, max 100MB)"
              currentUrl={undefined}
              onUpload={(file) => onVideoUpload(reel.id, file)}
              disabled={uploadingId === reel.id}
            />
          </div>
        )}
      </Field>
      <Field label="Thumbnail URL">
        <TextInput value={form.thumbnailUrl} onChange={v => setForm(f => ({ ...f, thumbnailUrl: v }))} placeholder="https://… (or upload below)" />
        {reel && (
          <div className="mt-2">
            <ImageUploadButton
              label="Upload thumbnail"
              currentUrl={reel.thumbnailUrl}
              onUpload={(file) => onThumbUpload(reel, file)}
              disabled={uploadingId === reel.id + '-thumb'}
            />
          </div>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort Order"><TextInput type="number" value={String(form.sortOrder)} onChange={v => setForm(f => ({ ...f, sortOrder: Number(v) }))} /></Field>
      </div>
    </div>
  );
}

function ReelsView({
  reels, onCreate, onEdit, onDelete, onRestore, accessToken, onRefresh,
}: {
  reels: ReelRow[];
  onCreate: (d: { title: string; description?: string; videoUrl: string; thumbnailUrl?: string; sortOrder?: number }) => Promise<void>;
  onEdit: (id: string, d: Partial<{ title: string; description: string; videoUrl: string; thumbnailUrl: string; sortOrder: number; isActive: boolean }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  accessToken: string;
  onRefresh: () => void;
}) {
  const [creating,   setCreating]   = useState(false);
  const [editTarget, setEditTarget] = useState<ReelRow | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState<ReelForm>(EMPTY_REEL);
  const [saving,     setSaving]     = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletedReels, setDeletedReels] = useState<ReelRow[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const loadDeleted = async () => {
    try { setDeletedReels(await adminApi.getDeletedReels(accessToken)); } catch {}
  };
  const handleToggleTrash = () => { if (!showTrash) loadDeleted(); setShowTrash(v => !v); };

  const handleCreate = async () => {
    setSaving(true);
    try { await onCreate({ title: form.title, description: form.description, videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl || undefined, sortOrder: form.sortOrder }); setCreating(false); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try { await onEdit(editTarget.id, form); setEditTarget(null); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleVideoUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try { await adminApi.uploadReelVideo(id, file, accessToken); onRefresh(); }
    catch (e: any) { alert(e.message); }
    finally { setUploadingId(null); }
  };

  const handleThumbUpload = async (reel: ReelRow, file: File) => {
    setUploadingId(reel.id + '-thumb');
    try {
      const updated = await adminApi.uploadReelThumbnail(reel.id, file, accessToken);
      if (editTarget?.id === reel.id) setEditTarget(updated);
      onRefresh();
    }
    catch (e: any) { alert(e.message); }
    finally { setUploadingId(null); }
  };

  return (
    <div className="space-y-4">
      {creating && (
        <Modal title="New Reel" onClose={() => setCreating(false)}>
          <ReelFormFields form={form} setForm={setForm} reel={null} onVideoUpload={handleVideoUpload} onThumbUpload={handleThumbUpload} uploadingId={uploadingId} />
          <SaveCancelButtons onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} saveLabel="Create Reel" />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit Reel" onClose={() => setEditTarget(null)}>
          <ReelFormFields form={form} setForm={setForm} reel={editTarget} onVideoUpload={handleVideoUpload} onThumbUpload={handleThumbUpload} uploadingId={uploadingId} />
          <SaveCancelButtons onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmDialog title="Move to Trash?" body="This reel will be soft-deleted and can be restored later." confirmLabel="Delete" saving={saving} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-white font-bold text-lg">Reels</h3>
          <p className="text-white/40 text-sm">Short video clips shown on the customer home screen</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_REEL); setCreating(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
        >
          <Plus size={14} /> New Reel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reels.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
            <div className="relative aspect-video bg-black/40">
              {r.thumbnailUrl
                ? <img src={r.thumbnailUrl} alt={r.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Film size={36} className="text-white/20" /></div>
              }
              <div className="absolute top-2 right-2">
                <Badge label={r.isActive ? "Active" : "Inactive"} color={r.isActive ? "#16A34A" : "#EF4444"} />
              </div>
            </div>
            <div className="p-4">
              <p className="text-white font-semibold mb-1">{r.title}</p>
              {r.description && <p className="text-white/40 text-xs mb-2 line-clamp-2">{r.description}</p>}
              <p className="text-white/30 text-[10px] mb-3 truncate">{r.videoUrl}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <ActionBtn variant="edit" onClick={() => { setForm({ title: r.title, description: r.description ?? "", videoUrl: r.videoUrl, thumbnailUrl: r.thumbnailUrl ?? "", sortOrder: r.sortOrder, isActive: r.isActive }); setEditTarget(r); }}>Edit</ActionBtn>
                <ActionBtn variant={r.isActive ? "warn" : "green"} onClick={async () => { await onEdit(r.id, { isActive: !r.isActive }); }}>
                  {r.isActive ? "Deactivate" : "Activate"}
                </ActionBtn>
                <ActionBtn variant="danger" onClick={() => setDeleteId(r.id)}>Delete</ActionBtn>
              </div>
            </div>
          </div>
        ))}
        {reels.length === 0 && (
          <div className="col-span-3 py-16 flex flex-col items-center gap-3 text-white/30">
            <Film size={40} />
            <p className="text-sm">No reels yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* Trash section */}
      {showTrash && (
        <div className="rounded-2xl border border-red-500/20 overflow-hidden" style={{ background: "rgba(239,68,68,0.04)" }}>
          <div className="px-4 py-3 border-b border-red-500/10">
            <p className="text-red-400 text-sm font-semibold">🗑 Deleted Reels</p>
          </div>
          {deletedReels.length === 0
            ? <p className="px-4 py-6 text-white/30 text-sm text-center">Trash is empty</p>
            : <div className="divide-y divide-white/[0.04]">
                {deletedReels.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-white/60 font-medium text-sm truncate">{r.title}</p>
                      <p className="text-white/30 text-[10px] truncate">{r.videoUrl}</p>
                    </div>
                    <ActionBtn variant="green" onClick={async () => { await onRestore(r.id); loadDeleted(); }}>Restore</ActionBtn>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

const BLANK_OFFER: OfferInput = {
  title: "", subtitle: "", description: "", tag: "LIMITED OFFER", discountText: "",
  bgColor: "#5B3EF5", imageUrl: null, altText: "",
  ctaText: "Book Now", ctaRoute: "/(tabs)/services",
  textPosition: "bottom-left", overlayColor: "#000000", overlayOpacity: 0.3,
  animation: "slide", priority: 0, status: "active",
  isActive: true, sortOrder: 0, startDate: null, endDate: null, expiresAt: null,
};

const POSITIONS_GRID = [
  ["top-left", "top-center", "top-right"],
  ["center-left", "center", "center-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
];

function BannerPreview({ form }: { form: OfferInput }) {
  const posMap: Record<string, { jc: string; ai: string }> = {
    "top-left":      { jc: "flex-start", ai: "flex-start" },
    "top-center":    { jc: "flex-start", ai: "center"     },
    "top-right":     { jc: "flex-start", ai: "flex-end"   },
    "center-left":   { jc: "center",     ai: "flex-start" },
    "center":        { jc: "center",     ai: "center"     },
    "center-right":  { jc: "center",     ai: "flex-end"   },
    "bottom-left":   { jc: "flex-end",   ai: "flex-start" },
    "bottom-center": { jc: "flex-end",   ai: "center"     },
    "bottom-right":  { jc: "flex-end",   ai: "flex-end"   },
  };
  const pos = posMap[form.textPosition ?? "bottom-left"] ?? posMap["bottom-left"];
  return (
    <div className="relative rounded-2xl overflow-hidden w-full" style={{ height: 168, background: form.bgColor ?? "#5B3EF5" }}>
      {form.imageUrl && <img src={form.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      {form.imageUrl && (
        <div className="absolute inset-0" style={{ background: form.overlayColor ?? "#000", opacity: form.overlayOpacity ?? 0.3 }} />
      )}
      <div className="absolute inset-0 p-4 flex flex-col gap-1" style={{ justifyContent: pos.jc, alignItems: pos.ai }}>
        {form.tag && <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.8)" }}>{form.tag}</span>}
        <p className="font-bold text-sm leading-tight text-white">{form.title || "Banner Title"}</p>
        {form.subtitle && <p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.7)" }}>{form.subtitle}</p>}
        <span className="inline-block mt-1 text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: "white", color: form.bgColor ?? "#5B3EF5" }}>
          {form.ctaText || "Book Now"}
        </span>
      </div>
    </div>
  );
}

function OffersView({
  offers, onCreate, onEdit, onDelete, onRestore, onUploadImage, accessToken,
}: {
  offers: OfferRow[];
  onCreate: (d: OfferInput) => Promise<void>;
  onEdit: (id: string, d: Partial<OfferInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  accessToken: string;
}) {
  const [showForm,  setShowForm]  = useState(false);
  const [editRow,   setEditRow]   = useState<OfferRow | null>(null);
  const [form,      setForm]      = useState<OfferInput>(BLANK_OFFER);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const [formErr,   setFormErr]   = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "visual" | "schedule">("content");
  const [dragOver,  setDragOver]  = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [deletedOffers, setDeletedOffers] = useState<OfferRow[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const loadDeleted = async () => {
    try { const data = await adminApi.getDeletedOffers(accessToken); setDeletedOffers(data.offers); } catch {}
  };
  const handleToggleTrash = () => { if (!showTrash) loadDeleted(); setShowTrash(v => !v); };

  function openCreate() {
    setForm(BLANK_OFFER); setEditRow(null); setFormErr(""); setActiveTab("content"); setShowForm(true);
  }
  function openEdit(r: OfferRow) {
    setForm({
      title: r.title, subtitle: r.subtitle, description: r.description ?? "",
      tag: r.tag, discountText: r.discountText,
      bgColor: r.bgColor, imageUrl: r.imageUrl ?? null, altText: r.altText ?? "",
      ctaText: r.ctaText, ctaRoute: r.ctaRoute,
      textPosition: r.textPosition ?? "bottom-left",
      overlayColor: r.overlayColor ?? "#000000", overlayOpacity: r.overlayOpacity ?? 0.3,
      animation: r.animation ?? "slide", priority: r.priority ?? 0, status: r.status ?? "active",
      isActive: r.isActive, sortOrder: r.sortOrder,
      startDate: r.startDate ?? null, endDate: r.endDate ?? null, expiresAt: r.expiresAt,
    });
    setEditRow(r); setFormErr(""); setActiveTab("content"); setShowForm(true);
  }

  const setF = (k: keyof OfferInput) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  async function handleImageFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setFormErr("Image must be < 5 MB."); return; }
    setUploading(true); setFormErr("");
    try { setF("imageUrl")(await onUploadImage(file)); }
    catch (e: any) { setFormErr(e.message ?? "Upload failed."); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormErr("Title is required."); setActiveTab("content"); return; }
    setSaving(true); setFormErr("");
    try {
      if (editRow) await onEdit(editRow.id, form);
      else         await onCreate(form);
      setShowForm(false);
    } catch (e: any) { setFormErr(e.message ?? "Failed to save."); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  const statusColor: Record<string, string> = { active: "#16A34A", inactive: "#6B7280", draft: "#D97706" };

  return (
    <div className="space-y-4">
      {deleteId && (
        <ConfirmDialog title="Delete Banner?" body="This banner will be moved to trash and can be restored later."
          confirmLabel="Yes, delete" saving={saving} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      {showForm && (
        <Modal title={editRow ? "Edit Banner" : "Create Banner"} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <BannerPreview form={form} />

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              {(["content", "visual", "schedule"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                  style={{ background: activeTab === tab ? "rgba(91,62,245,0.5)" : "transparent", color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.5)" }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Content tab */}
            {activeTab === "content" && (
              <div className="space-y-3">
                {([
                  { key: "title"       as const, label: "Title *",      ph: "e.g. 40% Off Your First Booking!" },
                  { key: "subtitle"    as const, label: "Subtitle",     ph: "e.g. Exclusive for new users" },
                  { key: "description" as const, label: "Description",  ph: "Optional extra details" },
                  { key: "tag"         as const, label: "Tag Label",    ph: "e.g. LIMITED OFFER" },
                  { key: "ctaText"     as const, label: "Button Text",  ph: "e.g. Book Now" },
                  { key: "ctaRoute"    as const, label: "Button Route", ph: "e.g. /(tabs)/services or https://…" },
                ]).map(({ key, label, ph }) => (
                  <Field key={key} label={label}>
                    <TextInput value={String(form[key] ?? "")} onChange={v => setF(key)(v)} placeholder={ph} />
                  </Field>
                ))}
              </div>
            )}

            {/* Visual tab */}
            {activeTab === "visual" && (
              <div className="space-y-4">
                <Field label="Banner Image">
                  <div
                    className="relative border-2 border-dashed rounded-xl transition-all cursor-pointer"
                    style={{ borderColor: dragOver ? "#7c5bf8" : "rgba(255,255,255,0.15)", background: dragOver ? "rgba(91,62,245,0.1)" : "rgba(255,255,255,0.03)" }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f); }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }} />
                    {form.imageUrl ? (
                      <div className="relative">
                        <img src={form.imageUrl} alt="" className="w-full h-36 object-cover rounded-xl" />
                        <button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}
                          onClick={e => { e.stopPropagation(); setF("imageUrl")(null); }}>
                          <XCircle size={14} color="white" />
                        </button>
                        <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">Click to replace</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        {uploading ? <Loader2 size={24} className="animate-spin text-white/40" /> : <Upload size={24} color="rgba(255,255,255,0.3)" />}
                        <p className="text-white/40 text-xs">{uploading ? "Uploading…" : "Drop image or click to upload"}</p>
                        <p className="text-white/20 text-[10px]">PNG, JPEG, WebP · max 5 MB</p>
                      </div>
                    )}
                  </div>
                </Field>

                <Field label="Alt Text (accessibility)">
                  <TextInput value={form.altText ?? ""} onChange={v => setF("altText")(v)} placeholder="Describe the image…" />
                </Field>

                <Field label="Background Color (fallback / tint)">
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.bgColor} onChange={e => setF("bgColor")(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                    <TextInput value={form.bgColor} onChange={v => setF("bgColor")(v)} placeholder="#5B3EF5" />
                  </div>
                </Field>

                <Field label="Text Position">
                  <div className="space-y-1">
                    <div className="grid grid-cols-3 gap-1.5" style={{ width: 120 }}>
                      {POSITIONS_GRID.map(row => row.map(pos => (
                        <button key={pos} onClick={() => setF("textPosition")(pos)} title={pos}
                          className="w-9 h-9 rounded-lg border transition-all flex items-center justify-center"
                          style={{ background: form.textPosition === pos ? "#5B3EF5" : "rgba(255,255,255,0.05)", borderColor: form.textPosition === pos ? "#7c5bf8" : "rgba(255,255,255,0.1)" }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-white" style={{ opacity: form.textPosition === pos ? 1 : 0.3 }} />
                        </button>
                      )))}
                    </div>
                    <p className="text-white/30 text-[10px]">{form.textPosition}</p>
                  </div>
                </Field>

                <div className={`space-y-3 rounded-xl p-3 border border-white/[0.07] ${form.imageUrl ? "" : "opacity-40"}`}>
                  <p className="text-white/50 text-xs font-semibold">Image Overlay {!form.imageUrl && "(requires image)"}</p>
                  <div className="flex gap-3 items-center">
                    <div>
                      <p className="text-white/40 text-[10px] mb-1">Color</p>
                      <input type="color" value={form.overlayColor ?? "#000000"} onChange={e => setF("overlayColor")(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/40 text-[10px] mb-1">Opacity — {Math.round((form.overlayOpacity ?? 0.3) * 100)}%</p>
                      <input type="range" min="0" max="1" step="0.05" value={form.overlayOpacity ?? 0.3}
                        onChange={e => setF("overlayOpacity")(parseFloat(e.target.value))} className="w-full accent-violet-500" />
                    </div>
                  </div>
                </div>

                <Field label="Slide Animation">
                  <div className="flex gap-2">
                    {["slide", "fade", "none"].map(a => (
                      <button key={a} onClick={() => setF("animation")(a)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border"
                        style={{ background: form.animation === a ? "rgba(91,62,245,0.4)" : "rgba(255,255,255,0.05)", color: form.animation === a ? "#fff" : "rgba(255,255,255,0.5)", borderColor: form.animation === a ? "#7c5bf8" : "rgba(255,255,255,0.1)" }}>
                        {a}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {/* Schedule tab */}
            {activeTab === "schedule" && (
              <div className="space-y-3">
                <Field label="Status">
                  <div className="flex gap-2">
                    {(["active", "draft", "inactive"] as const).map(s => (
                      <button key={s} onClick={() => { setF("status")(s); setF("isActive")(s === "active"); }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                        style={{ background: form.status === s ? statusColor[s] : "rgba(255,255,255,0.05)", color: form.status === s ? "#fff" : "rgba(255,255,255,0.4)" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priority (higher = first)">
                    <TextInput value={String(form.priority ?? 0)} onChange={v => setF("priority")(Number(v) || 0)} placeholder="0" />
                  </Field>
                  <Field label="Sort Order">
                    <TextInput value={String(form.sortOrder ?? 0)} onChange={v => setF("sortOrder")(Number(v) || 0)} placeholder="0" />
                  </Field>
                </div>
                {[
                  { key: "startDate" as const, label: "Start Date (optional)" },
                  { key: "endDate"   as const, label: "End Date (optional)"   },
                  { key: "expiresAt" as const, label: "Expires At (legacy)"   },
                ].map(({ key, label }) => (
                  <Field key={key} label={label}>
                    <input type="datetime-local"
                      value={form[key] ? new Date(form[key] as string).toISOString().slice(0, 16) : ""}
                      onChange={e => setF(key)(e.target.value ? new Date(e.target.value).toISOString() : null)}
                      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60"
                      style={{ background: "rgba(255,255,255,0.05)" }} />
                  </Field>
                ))}
              </div>
            )}

            {formErr && <p className="text-red-400 text-xs">{formErr}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={handleSave} disabled={saving || uploading}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
                {saving ? "Saving…" : editRow ? "Update Banner" : "Create Banner"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:bg-white/5">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">{offers.length} banner{offers.length !== 1 ? "s" : ""} total</p>
        <div className="flex gap-2">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            <Plus size={15} /> Create Banner
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex gap-2">
          <button onClick={handleToggleTrash} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border" style={{ borderColor: "rgba(255,255,255,0.1)", color: showTrash ? "#f87171" : "rgba(255,255,255,0.4)", background: "transparent" }}>
            🗑 {showTrash ? "Hide Trash" : "Trash"}
          </button>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] p-12 text-center" style={CARD}>
          <Tag size={32} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" />
          <p className="text-white/30 text-sm">No banners yet. Create one to show in the customer app.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {offers.map(r => (
            <div key={r.id} className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
              <div className="flex gap-4 p-4 items-center">
                <div className="relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden" style={{ background: r.bgColor ?? "#5B3EF5" }}>
                  {r.imageUrl && <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-white font-semibold text-sm">{r.title}</p>
                    <Badge label={r.status ?? (r.isActive ? "active" : "inactive")} color={statusColor[r.status ?? (r.isActive ? "active" : "inactive")] ?? "#6B7280"} />
                    {(r.priority ?? 0) > 0 && <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">P{r.priority}</span>}
                  </div>
                  {r.subtitle && <p className="text-white/50 text-xs truncate">{r.subtitle}</p>}
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-white/30">{r.tag}</span>
                    {r.startDate && <span className="text-[10px] text-white/30">From {new Date(r.startDate).toLocaleDateString("en-IN")}</span>}
                    {r.endDate && <span className="text-[10px] text-white/30">Until {new Date(r.endDate).toLocaleDateString("en-IN")}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <ActionBtn variant="edit" onClick={() => openEdit(r)}>Edit</ActionBtn>
                  <ActionBtn variant={r.isActive ? "warn" : "green"} onClick={() => onEdit(r.id, { isActive: !r.isActive, status: r.isActive ? "inactive" : "active" })}>
                    {r.isActive ? "Off" : "On"}
                  </ActionBtn>
                  <ActionBtn variant="danger" onClick={() => setDeleteId(r.id)}>Del</ActionBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trash section */}
      {showTrash && (
        <div className="rounded-2xl border border-red-500/20 overflow-hidden" style={{ background: "rgba(239,68,68,0.04)" }}>
          <div className="px-4 py-3 border-b border-red-500/10">
            <p className="text-red-400 text-sm font-semibold">🗑 Deleted Banners</p>
          </div>
          {deletedOffers.length === 0
            ? <p className="px-4 py-6 text-white/30 text-sm text-center">Trash is empty</p>
            : <div className="divide-y divide-white/[0.04]">
                {deletedOffers.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-white/60 font-medium text-sm truncate">{r.title}</p>
                      {r.subtitle && <p className="text-white/30 text-xs truncate">{r.subtitle}</p>}
                    </div>
                    <ActionBtn variant="green" onClick={async () => { await onRestore(r.id); loadDeleted(); }}>Restore</ActionBtn>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

function ReviewsView({ reviews, onDelete, onRestore, accessToken }: { reviews: ReviewRow[]; onDelete: (id: string) => Promise<void>; onRestore: (id: string) => Promise<void>; accessToken: string }) {
  const [search,   setSearch]   = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const filtered = reviews.filter(r =>
    r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    r.proName?.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  );

  const stars = (n: number) => "★".repeat(Math.max(0, Math.min(5, n))) + "☆".repeat(Math.max(0, 5 - Math.min(5, n)));

  return (
    <div className="space-y-4">
      {deleteId && (
        <ConfirmDialog
          title="Delete Review?"
          body="This review will be moved to trash. The professional's rating will be recalculated. You can restore it later."
          confirmLabel="Yes, delete"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search reviews…" />

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Customer", "Professional", "Rating", "Comment", "Date", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium whitespace-nowrap">{r.customerName ?? "—"}</p>
                    <p className="text-white/40 text-[10px] truncate">{r.customerEmail ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-white/60 whitespace-nowrap">{r.proName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-yellow-400 text-xs whitespace-nowrap">{stars(r.rating)}</span>
                    <span className="text-white/40 text-[10px] ml-1">{r.rating}/5</span>
                  </td>
                  <td className="px-4 py-3 text-white/60 text-xs max-w-[240px]">
                    <p className="truncate">{r.comment ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <ActionBtn variant="danger" onClick={() => setDeleteId(r.id)}>Delete</ActionBtn>
                      <ActionBtn variant="green" onClick={async () => { try { await onRestore(r.id); } catch(e: any) { alert(e.message); } }}>Restore</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyRow cols={6} text="No reviews found" />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AUDIT LOGS
═══════════════════════════════════════════════════════════════════ */

function AuditLogsView({ logs }: { logs: AuditLogRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.targetType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search actions or entity type…" />

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Action", "Target Type", "Target ID", "Details", "Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{l.action}</td>
                  <td className="px-4 py-3 text-white/60 whitespace-nowrap capitalize">{l.targetType}</td>
                  <td className="px-4 py-3 text-white/40 text-[11px] font-mono whitespace-nowrap">{l.targetId ? l.targetId.slice(0, 8) : "—"}</td>
                  <td className="px-4 py-3 text-white/40 text-xs max-w-[280px]">
                    <p className="truncate">{Object.keys(l.metadata ?? {}).length > 0 ? JSON.stringify(l.metadata) : "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyRow cols={5} text="No audit log entries yet" />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS
═══════════════════════════════════════════════════════════════════ */

function AnalyticsView({ stats }: { stats: DashboardStats | null }) {
  const items = [
    { label: "Total Revenue",       value: stats ? fmt(stats.totalRevenue)      : "—", icon: DollarSign, color: "#5B3EF5" },
    { label: "Total Bookings",      value: String(stats?.totalBookings    ?? 0),        icon: BookOpen,   color: "#F59E0B" },
    { label: "Active Bookings",     value: String(stats?.activeBookings   ?? 0),        icon: Activity,   color: "#16A34A" },
    { label: "Total Professionals", value: String(stats?.totalProfessionals ?? 0),      icon: Users,      color: "#DB2777" },
    { label: "Total Customers",     value: String(stats?.totalCustomers   ?? 0),        icon: UserCheck,  color: "#0EA5E9" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((i) => {
        const Icon = i.icon;
        return (
          <div key={i.label} className="rounded-2xl p-5 border border-white/[0.07]" style={CARD}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: i.color + "20" }}>
              <Icon size={18} color={i.color} />
            </div>
            <p className="text-white/40 text-xs mb-1">{i.label}</p>
            <p className="text-white font-bold text-2xl">{i.value}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED CONFIG HELPERS
═══════════════════════════════════════════════════════════════════ */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${checked ? "bg-violet-500" : "bg-white/[0.12]"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 pr-10 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors"
        style={INPUT_STYLE}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAYMENT CONFIG
═══════════════════════════════════════════════════════════════════ */

interface PaymentCfg {
  cod:      { enabled: boolean };
  upi:      { enabled: boolean; vpa: string };
  razorpay: { enabled: boolean; keyId: string; keySecret: string; webhookSecret: string };
  stripe:   { enabled: boolean; publishableKey: string; secretKey: string };
}

const DEFAULT_PAYMENT_CFG: PaymentCfg = {
  cod:      { enabled: true },
  upi:      { enabled: false, vpa: "" },
  razorpay: { enabled: false, keyId: "", keySecret: "", webhookSecret: "" },
  stripe:   { enabled: false, publishableKey: "", secretKey: "" },
};

function PaymentConfigView({ accessToken }: { accessToken: string }) {
  const [cfg, setCfg]     = useState<PaymentCfg>(DEFAULT_PAYMENT_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi.getSettings("payment_config", accessToken)
      .then(res => setCfg(prev => ({ ...prev, ...(res.value as Partial<PaymentCfg>) })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.saveSettings("payment_config", cfg, accessToken);
      setMsg({ text: "Payment configuration saved successfully.", type: "success" });
    } catch {
      setMsg({ text: "Failed to save. Please try again.", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const setMethod = <K extends keyof PaymentCfg>(method: K, patch: Partial<PaymentCfg[K]>) =>
    setCfg(c => ({ ...c, [method]: { ...c[method], ...patch } }));

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin text-violet-500" />
    </div>
  );

  const methods: Array<{
    key: keyof PaymentCfg;
    icon: React.ReactNode;
    label: string;
    badge?: string;
    color: string;
    description: string;
    fields: React.ReactNode;
  }> = [
    {
      key: "cod",
      icon: <Wallet size={20} />,
      label: "Cash on Delivery",
      color: "#16A34A",
      description: "Accept cash payments when the service is completed. No gateway fees.",
      fields: null,
    },
    {
      key: "upi",
      icon: <Smartphone size={20} />,
      label: "UPI",
      badge: "India",
      color: "#F59E0B",
      description: "Accept instant UPI payments via PhonePe, GPay, Paytm, BHIM, and all UPI apps.",
      fields: (
        <Field label="UPI VPA / Payment Address">
          <TextInput
            value={cfg.upi.vpa}
            onChange={v => setMethod("upi", { vpa: v })}
            placeholder="e.g. merchant@oksbi or 9876543210@upi"
          />
        </Field>
      ),
    },
    {
      key: "razorpay",
      icon: <Zap size={20} />,
      label: "Razorpay",
      badge: "India",
      color: "#3B82F6",
      description: "Full-stack payment gateway — cards, UPI, wallets, EMI, netbanking, and more.",
      fields: (
        <div className="space-y-3">
          <Field label="Key ID (Publishable)">
            <TextInput
              value={cfg.razorpay.keyId}
              onChange={v => setMethod("razorpay", { keyId: v })}
              placeholder="rzp_live_xxxxxxxxxxxx"
            />
          </Field>
          <Field label="Key Secret">
            <SecretInput
              value={cfg.razorpay.keySecret}
              onChange={v => setMethod("razorpay", { keySecret: v })}
              placeholder="Your Razorpay secret key"
            />
          </Field>
          <Field label="Webhook Secret (optional)">
            <SecretInput
              value={cfg.razorpay.webhookSecret}
              onChange={v => setMethod("razorpay", { webhookSecret: v })}
              placeholder="Webhook signing secret from Razorpay dashboard"
            />
          </Field>
        </div>
      ),
    },
    {
      key: "stripe",
      icon: <CreditCard size={20} />,
      label: "Stripe",
      badge: "International",
      color: "#6366F1",
      description: "Accept international card payments. Supports 135+ currencies.",
      fields: (
        <div className="space-y-3">
          <Field label="Publishable Key">
            <TextInput
              value={cfg.stripe.publishableKey}
              onChange={v => setMethod("stripe", { publishableKey: v })}
              placeholder="pk_live_xxxxxxxxxxxx"
            />
          </Field>
          <Field label="Secret Key">
            <SecretInput
              value={cfg.stripe.secretKey}
              onChange={v => setMethod("stripe", { secretKey: v })}
              placeholder="sk_live_xxxxxxxxxxxx"
            />
          </Field>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-xl space-y-4">
      <div className="mb-1">
        <h2 className="text-white font-bold text-base">Payment Methods</h2>
        <p className="text-white/40 text-xs mt-0.5">
          Enable or disable payment options customers see at checkout. Keys are stored securely.
        </p>
      </div>

      {methods.map(m => {
        const enabled = (cfg[m.key] as { enabled: boolean }).enabled;
        return (
          <div key={String(m.key)} className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
            <div className="flex items-center gap-3 px-5 py-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: m.color + "22", color: m.color }}
              >
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-semibold">{m.label}</p>
                  {m.badge && (
                    <span className="text-white/40 text-xs border border-white/10 px-1.5 py-0.5 rounded-md">
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="text-white/40 text-xs mt-0.5 leading-snug">{m.description}</p>
              </div>
              <ToggleSwitch
                checked={enabled}
                onChange={v => setMethod(m.key, { enabled: v } as Partial<PaymentCfg[typeof m.key]>)}
              />
            </div>
            {enabled && m.fields && (
              <div className="px-5 pb-5 pt-2 border-t border-white/[0.05] space-y-3">
                {m.fields}
              </div>
            )}
          </div>
        );
      })}

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === "success" ? "text-green-400 bg-green-500/10 border border-green-500/20" : "text-red-400 bg-red-500/10 border border-red-500/20"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EMAIL CONFIG
═══════════════════════════════════════════════════════════════════ */

interface EmailCfg {
  provider: "smtp" | "sendgrid";
  smtp:     { host: string; port: number; user: string; password: string; secure: boolean };
  sendgrid: { apiKey: string };
  from:     { name: string; email: string };
  notifications: {
    bookingConfirmation: boolean;
    bookingCancellation: boolean;
    paymentReceipt: boolean;
    otp: boolean;
  };
}

const DEFAULT_EMAIL_CFG: EmailCfg = {
  provider: "smtp",
  smtp:     { host: "", port: 587, user: "", password: "", secure: false },
  sendgrid: { apiKey: "" },
  from:     { name: "ServeNow", email: "noreply@servenow.in" },
  notifications: { bookingConfirmation: true, bookingCancellation: true, paymentReceipt: true, otp: true },
};

function EmailConfigView({ accessToken, adminEmail }: { accessToken: string; adminEmail: string }) {
  const [cfg, setCfg]       = useState<EmailCfg>(DEFAULT_EMAIL_CFG);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testAddr, setTestAddr] = useState(adminEmail);
  const [msg, setMsg]           = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi.getSettings("email_config", accessToken)
      .then(res => setCfg(prev => ({ ...prev, ...(res.value as Partial<EmailCfg>) })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const showMsg = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.saveSettings("email_config", cfg, accessToken);
      showMsg("Email configuration saved successfully.", "success");
    } catch {
      showMsg("Failed to save. Please try again.", "error");
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    if (!testAddr) return;
    setTesting(true);
    try {
      const res = await adminApi.sendTestEmail(testAddr, accessToken);
      showMsg(res.message, "success");
    } catch (e: unknown) {
      showMsg((e as Error).message || "Failed to send test email.", "error");
    } finally { setTesting(false); }
  };

  const setSmtp  = (patch: Partial<EmailCfg["smtp"]>) =>
    setCfg(c => ({ ...c, smtp: { ...c.smtp, ...patch } }));
  const setNotif = (key: keyof EmailCfg["notifications"], val: boolean) =>
    setCfg(c => ({ ...c, notifications: { ...c.notifications, [key]: val } }));

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin text-violet-500" />
    </div>
  );

  const notifItems: { key: keyof EmailCfg["notifications"]; label: string; desc: string }[] = [
    { key: "bookingConfirmation", label: "Booking Confirmation", desc: "Sent to customer when a new booking is placed." },
    { key: "bookingCancellation", label: "Booking Cancellation", desc: "Sent when a booking is cancelled by any party." },
    { key: "paymentReceipt",      label: "Payment Receipt",      desc: "Sent after a successful payment transaction." },
    { key: "otp",                 label: "OTP / Verification",   desc: "OTP codes for login and account verification." },
  ];

  return (
    <div className="max-w-xl space-y-5">
      <div className="mb-1">
        <h2 className="text-white font-bold text-base">Email Configuration</h2>
        <p className="text-white/40 text-xs mt-0.5">
          Configure how ServeNow sends transactional and notification emails.
        </p>
      </div>

      {/* ── Provider ── */}
      <div className="rounded-2xl border border-white/[0.07] p-5 space-y-4" style={CARD}>
        <h3 className="text-white text-sm font-semibold flex items-center gap-2">
          <Mail size={15} className="text-violet-400" /> Email Provider
        </h3>
        <div className="flex gap-3">
          {(["smtp", "sendgrid"] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setCfg(c => ({ ...c, provider: p }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${cfg.provider === p ? "border-violet-500 text-violet-400 bg-violet-500/10" : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"}`}
            >
              {p === "smtp" ? "SMTP" : "SendGrid"}
            </button>
          ))}
        </div>

        {cfg.provider === "smtp" ? (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="SMTP Host">
                  <TextInput value={cfg.smtp.host} onChange={v => setSmtp({ host: v })} placeholder="smtp.gmail.com" />
                </Field>
              </div>
              <Field label="Port">
                <TextInput type="number" value={String(cfg.smtp.port)} onChange={v => setSmtp({ port: Number(v) || 587 })} placeholder="587" />
              </Field>
            </div>
            <Field label="Username / Email">
              <TextInput value={cfg.smtp.user} onChange={v => setSmtp({ user: v })} placeholder="you@gmail.com" />
            </Field>
            <Field label="Password / App Password">
              <SecretInput value={cfg.smtp.password} onChange={v => setSmtp({ password: v })} placeholder="Gmail app password or SMTP password" />
            </Field>
            <div
              className="flex items-center justify-between py-3 px-4 rounded-xl border border-white/[0.06]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div>
                <p className="text-white/80 text-xs font-medium">Use SSL / TLS</p>
                <p className="text-white/40 text-xs">Enable for port 465. Disable for STARTTLS on port 587.</p>
              </div>
              <ToggleSwitch checked={cfg.smtp.secure} onChange={v => setSmtp({ secure: v })} />
            </div>
          </div>
        ) : (
          <Field label="SendGrid API Key">
            <SecretInput
              value={cfg.sendgrid.apiKey}
              onChange={v => setCfg(c => ({ ...c, sendgrid: { apiKey: v } }))}
              placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </Field>
        )}
      </div>

      {/* ── Sender ── */}
      <div className="rounded-2xl border border-white/[0.07] p-5 space-y-3" style={CARD}>
        <h3 className="text-white text-sm font-semibold">Sender Details</h3>
        <Field label="From Name">
          <TextInput
            value={cfg.from.name}
            onChange={v => setCfg(c => ({ ...c, from: { ...c.from, name: v } }))}
            placeholder="ServeNow"
          />
        </Field>
        <Field label="From Email">
          <TextInput
            type="email"
            value={cfg.from.email}
            onChange={v => setCfg(c => ({ ...c, from: { ...c.from, email: v } }))}
            placeholder="noreply@servenow.in"
          />
        </Field>
      </div>

      {/* ── Notification types ── */}
      <div className="rounded-2xl border border-white/[0.07] p-5" style={CARD}>
        <h3 className="text-white text-sm font-semibold mb-3">Notification Triggers</h3>
        <div className="space-y-0">
          {notifItems.map((n, i) => (
            <div
              key={n.key}
              className={`flex items-center justify-between py-3 ${i < notifItems.length - 1 ? "border-b border-white/[0.05]" : ""}`}
            >
              <div>
                <p className="text-white/80 text-xs font-medium">{n.label}</p>
                <p className="text-white/40 text-xs">{n.desc}</p>
              </div>
              <ToggleSwitch checked={cfg.notifications[n.key]} onChange={v => setNotif(n.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Test email ── */}
      <div className="rounded-2xl border border-white/[0.07] p-5 space-y-3" style={CARD}>
        <h3 className="text-white text-sm font-semibold">Send Test Email</h3>
        <p className="text-white/40 text-xs">
          Verify your configuration is working. Save first, then send a test.
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <TextInput
              type="email"
              value={testAddr}
              onChange={setTestAddr}
              placeholder="recipient@example.com"
            />
          </div>
          <button
            type="button"
            onClick={sendTest}
            disabled={testing || !testAddr}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-white text-sm font-medium border border-white/10 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send Test
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${msg.type === "success" ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SMS CONFIG
═══════════════════════════════════════════════════════════════════ */

interface SmsCfg {
  enabled: boolean;
  provider: "fast2sms";
  fast2sms: { apiKey: string };
}

const DEFAULT_SMS_CFG: SmsCfg = {
  enabled: false,
  provider: "fast2sms",
  fast2sms: { apiKey: "" },
};

function SmsConfigView({ accessToken }: { accessToken: string }) {
  const [cfg, setCfg]     = useState<SmsCfg>(DEFAULT_SMS_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi.getSettings("sms_config", accessToken)
      .then(res => setCfg(prev => ({ ...prev, ...(res.value as Partial<SmsCfg>) })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const showMsg = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.saveSettings("sms_config", cfg, accessToken);
      showMsg("SMS configuration saved successfully.", "success");
    } catch {
      showMsg("Failed to save. Please try again.", "error");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin text-violet-500" />
    </div>
  );

  return (
    <div className="max-w-xl space-y-5">
      <div className="mb-1">
        <h2 className="text-white font-bold text-base">SMS Configuration</h2>
        <p className="text-white/40 text-xs mt-0.5">
          Configure Fast2SMS to send OTP codes to customers' mobile numbers.
          OTPs are always sent via email; SMS is an additional delivery channel.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="rounded-2xl border border-white/[0.07] p-5" style={CARD}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">Enable SMS OTP</p>
            <p className="text-white/40 text-xs mt-0.5">
              Send OTP codes via SMS in addition to email.
            </p>
          </div>
          <ToggleSwitch checked={cfg.enabled} onChange={v => setCfg(c => ({ ...c, enabled: v }))} />
        </div>
      </div>

      {/* Provider */}
      <div className="rounded-2xl border border-white/[0.07] p-5 space-y-4" style={CARD}>
        <h3 className="text-white text-sm font-semibold flex items-center gap-2">
          <Smartphone size={15} className="text-violet-400" /> SMS Provider
        </h3>
        <p className="text-white/40 text-xs -mt-2">
          Fast2SMS is a popular Indian bulk SMS gateway. Get your API key from{" "}
          <a href="https://www.fast2sms.com" target="_blank" rel="noreferrer" className="text-violet-400 underline">fast2sms.com</a>.
        </p>
        <Field label="Fast2SMS API Key">
          <SecretInput
            value={cfg.fast2sms.apiKey}
            onChange={v => setCfg(c => ({ ...c, fast2sms: { apiKey: v } }))}
            placeholder="Your Fast2SMS API key"
          />
        </Field>
      </div>

      {/* Info box */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-xs text-violet-300 space-y-1">
        <p className="font-semibold text-violet-400">How it works</p>
        <p>• OTP is always sent to the user's email first.</p>
        <p>• If a phone number was provided at signup and this is enabled, the same OTP is also sent via SMS.</p>
        <p>• SMS delivery failures are silently ignored — the email OTP still works.</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${msg.type === "success" ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DOCUMENT VERIFICATION
═══════════════════════════════════════════════════════════════════ */

const DOC_STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending:            { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Pending'          },
  under_review:       { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  label: 'Under Review'     },
  approved:           { color: '#16A34A', bg: 'rgba(22,163,74,0.12)',   label: 'Approved'         },
  rejected:           { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Rejected'         },
  re_upload_required: { color: '#F97316', bg: 'rgba(249,115,22,0.12)',  label: 'Re-upload Needed' },
  expired:            { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Expired'          },
};

function DocumentVerificationView({ accessToken }: { accessToken: string }) {
  const [tab, setTab] = useState<'review' | 'types'>('review');

  // ─── Review tab state
  const [docs,         setDocs]         = useState<PartnerDocumentRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [partnerSearch,setPartnerSearch]= useState('');
  const [previewDoc,   setPreviewDoc]   = useState<PartnerDocumentRow | null>(null);
  const [actionDoc,    setActionDoc]    = useState<PartnerDocumentRow | null>(null);
  const [actionStatus, setActionStatus] = useState<DocumentStatus | ''>('');
  const [actionReason, setActionReason] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [historyDoc,   setHistoryDoc]   = useState<PartnerDocumentRow | null>(null);
  const [history,      setHistory]      = useState<PartnerDocumentHistoryRow[]>([]);
  const [histLoading,  setHistLoading]  = useState(false);
  const [msg,          setMsg]          = useState('');
  const [msgOk,        setMsgOk]        = useState(true);

  // ─── Types tab state
  const [docTypes,     setDocTypes]     = useState<DocumentTypeConfigRow[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typeModal,    setTypeModal]    = useState(false);
  const [editType,     setEditType]     = useState<DocumentTypeConfigRow | null>(null);
  const [typeKey,      setTypeKey]      = useState('');
  const [typeLabel,    setTypeLabel]    = useState('');
  const [typeDesc,     setTypeDesc]     = useState('');
  const [typeEmoji,    setTypeEmoji]    = useState('📄');
  const [typeMandatory,setTypeMandatory]= useState(false);
  const [typeSaving,   setTypeSaving]   = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try { setDocs(await adminApi.getDocuments(accessToken)); }
    finally { setLoading(false); }
  }, [accessToken]);

  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try { setDocTypes(await adminApi.getDocumentTypes(accessToken)); }
    finally { setTypesLoading(false); }
  }, [accessToken]);

  useEffect(() => {
    if (tab === 'review') loadDocs();
    else loadTypes();
  }, [tab, loadDocs, loadTypes]);

  const filtered = docs.filter(d => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (partnerSearch) {
      const q = partnerSearch.toLowerCase();
      if (!d.partner_name?.toLowerCase().includes(q) && !d.partner_email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function handleAction() {
    if (!actionDoc || !actionStatus) return;
    if (['rejected', 're_upload_required'].includes(actionStatus) && !actionReason.trim()) {
      setMsg('Please provide a reason for the decision.'); setMsgOk(false); return;
    }
    setSaving(true);
    try {
      await adminApi.updateDocumentStatus(actionDoc.id, actionStatus, actionReason.trim() || null, accessToken);
      setDocs(prev => prev.map(d => d.id === actionDoc.id ? { ...d, status: actionStatus as DocumentStatus } : d));
      setActionDoc(null); setActionReason(''); setActionStatus('');
      setMsg('Document status updated successfully.'); setMsgOk(true);
    } catch (e: any) { setMsg(e.message ?? 'Update failed'); setMsgOk(false); }
    finally { setSaving(false); }
  }

  async function openHistory(doc: PartnerDocumentRow) {
    setHistoryDoc(doc); setHistory([]); setHistLoading(true);
    try { setHistory(await adminApi.getDocumentHistory(doc.id, accessToken)); }
    catch { setHistory([]); }
    finally { setHistLoading(false); }
  }

  function openTypeModal(t?: DocumentTypeConfigRow) {
    if (t) {
      setEditType(t); setTypeKey(t.type_key); setTypeLabel(t.label);
      setTypeDesc(t.description ?? ''); setTypeEmoji(t.emoji); setTypeMandatory(t.is_mandatory);
    } else {
      setEditType(null); setTypeKey(''); setTypeLabel(''); setTypeDesc(''); setTypeEmoji('📄'); setTypeMandatory(false);
    }
    setTypeModal(true);
  }

  async function saveType() {
    setTypeSaving(true);
    try {
      if (editType) {
        const updated = await adminApi.updateDocumentType(editType.id, {
          label: typeLabel, description: typeDesc, emoji: typeEmoji, isMandatory: typeMandatory,
        }, accessToken);
        setDocTypes(prev => prev.map(t => t.id === editType.id ? updated : t));
      } else {
        const created = await adminApi.createDocumentType({
          typeKey, label: typeLabel, description: typeDesc, emoji: typeEmoji, isMandatory: typeMandatory,
        }, accessToken);
        setDocTypes(prev => [...prev, created]);
      }
      setTypeModal(false);
    } catch (e: any) { setMsg(e.message ?? 'Save failed'); setMsgOk(false); }
    finally { setTypeSaving(false); }
  }

  async function toggleTypeActive(t: DocumentTypeConfigRow) {
    try {
      const updated = await adminApi.updateDocumentType(t.id, { isActive: !t.is_active }, accessToken);
      setDocTypes(prev => prev.map(x => x.id === t.id ? updated : x));
    } catch (e: any) { setMsg(e.message ?? 'Failed'); setMsgOk(false); }
  }

  async function deleteType(t: DocumentTypeConfigRow) {
    if (!confirm(`Delete document type "${t.label}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteDocumentType(t.id, accessToken);
      setDocTypes(prev => prev.filter(x => x.id !== t.id));
    } catch (e: any) { setMsg(e.message ?? 'Delete failed'); setMsgOk(false); }
  }

  function isImageUrl(url: string) {
    return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
  }

  return (
    <div>
      {/* Banner */}
      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${msgOk ? 'text-green-400 border-green-400/20' : 'text-red-400 border-red-400/20'}`}
          style={{ background: msgOk ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)' }}>
          {msgOk ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
          <span className="flex-1">{msg}</span>
          <button onClick={() => setMsg('')} className="opacity-50 hover:opacity-100 transition-opacity"><X size={13}/></button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {(['review', 'types'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
            style={tab === t ? { background: 'linear-gradient(135deg,#5b3ef5,#7c5bf8)' } : { background: 'rgba(255,255,255,0.04)' }}>
            {t === 'review' ? '📋 Review Documents' : '⚙️ Document Types'}
          </button>
        ))}
      </div>

      {tab === 'review' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <input value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)}
              placeholder="Search partner name or email…"
              className="flex-1 min-w-48 px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
              style={INPUT_STYLE}/>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
              style={INPUT_STYLE as React.CSSProperties}>
              <option value="">All statuses</option>
              {Object.entries(DOC_STATUS_STYLES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button onClick={loadDocs} title="Refresh"
              className="px-3 py-2 rounded-xl text-white/40 hover:text-white border border-white/10 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <RefreshCw size={14}/>
            </button>
          </div>

          <p className="text-white/30 text-xs mb-4">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin" style={{ color: '#5B3EF5' }}/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/20">
              <ShieldCheck size={32} className="mb-3"/>
              <p className="text-sm">No documents found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(doc => {
                const st = DOC_STATUS_STYLES[doc.status] ?? DOC_STATUS_STYLES['pending'];
                return (
                  <div key={doc.id} className="rounded-2xl border border-white/[0.07] p-4 flex flex-wrap gap-4 items-start" style={CARD}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white font-semibold text-sm">{doc.partner_name}</span>
                        {doc.partner_email && <span className="text-white/30 text-xs">{doc.partner_email}</span>}
                      </div>
                      <p className="text-white/50 text-xs mb-2 capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold"
                          style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                        <span className="text-white/25 text-[10px]">v{doc.version}</span>
                        <span className="text-white/25 text-[10px]">
                          {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {doc.reviewer_name && (
                          <span className="text-white/25 text-[10px]">· reviewed by {doc.reviewer_name}</span>
                        )}
                      </div>
                      {doc.rejection_reason && (
                        <p className="mt-2 text-xs text-red-300 border border-red-400/15 px-2 py-1.5 rounded-lg"
                          style={{ background: 'rgba(239,68,68,0.06)' }}>
                          <AlertCircle size={10} className="inline mr-1"/>{doc.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {doc.document_url && (
                        <button onClick={() => setPreviewDoc(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-violet-400/25 text-violet-400 hover:bg-violet-500/10 transition-colors">
                          <Eye size={12}/> Preview
                        </button>
                      )}
                      <button onClick={() => openHistory(doc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                        <HistoryIcon size={12}/> History
                      </button>
                      <button onClick={() => { setActionDoc(doc); setActionStatus(doc.status); setActionReason(doc.rejection_reason ?? ''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-white/10 text-white/70 hover:bg-white/5 transition-colors">
                        <Pencil size={12}/> Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-5">
            <p className="text-white/40 text-sm">Configure which documents partners must upload to accept bookings</p>
            <button onClick={() => openTypeModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#5b3ef5,#7c5bf8)' }}>
              <Plus size={14}/> Add Type
            </button>
          </div>
          {typesLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin" style={{ color: '#5B3EF5' }}/>
            </div>
          ) : docTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/20">
              <Shield size={32} className="mb-3"/>
              <p className="text-sm">No document types configured yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {docTypes.sort((a, b) => a.sort_order - b.sort_order).map(t => (
                <div key={t.id} className="rounded-2xl border border-white/[0.07] p-4 flex items-center gap-4" style={CARD}>
                  <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-white font-semibold text-sm">{t.label}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.is_mandatory ? 'text-amber-400 bg-amber-400/10' : 'text-white/30 bg-white/5'}`}>
                        {t.is_mandatory ? 'REQUIRED' : 'OPTIONAL'}
                      </span>
                      {!t.is_active && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-red-400 bg-red-400/10">INACTIVE</span>
                      )}
                    </div>
                    <p className="text-white/30 text-[11px]">{t.type_key}</p>
                    {t.description && <p className="text-white/40 text-xs mt-0.5">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleTypeActive(t)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openTypeModal(t)}
                      className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/10 transition-colors">
                      <Pencil size={13}/>
                    </button>
                    <button onClick={() => deleteType(t)}
                      className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] transition-colors">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden flex flex-col" style={{ ...MODAL_BG, maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
              <div>
                <p className="text-white font-bold text-sm">
                  {previewDoc.partner_name} — <span className="capitalize font-normal text-white/60">{previewDoc.document_type.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  v{previewDoc.version} · uploaded {new Date(previewDoc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewDoc.document_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-violet-400/25 text-violet-400 hover:bg-violet-500/10 transition-colors">
                  <ExternalLink size={11}/> Open
                </a>
                <button onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                  <X size={16}/>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style={{ minHeight: '300px' }}>
              {isImageUrl(previewDoc.document_url)
                ? <img src={previewDoc.document_url} alt="document preview" className="max-w-full max-h-[55vh] rounded-xl object-contain"/>
                : <iframe src={previewDoc.document_url} className="w-full rounded-xl border-0" style={{ height: '55vh' }} title="document preview"/>
              }
            </div>
          </div>
        </div>
      )}

      {/* Action (Review) Modal */}
      {actionDoc && (
        <Modal title={`Review Document — ${actionDoc.partner_name}`} onClose={() => setActionDoc(null)}>
          <p className="text-white/40 text-sm mb-4 capitalize">{actionDoc.document_type.replace(/_/g, ' ')} · v{actionDoc.version}</p>
          <p className="text-white/50 text-xs mb-3 font-semibold uppercase tracking-wide">Set Status</p>
          <div className="space-y-2 mb-5">
            {(['approved', 'under_review', 'rejected', 're_upload_required', 'expired'] as const).map(s => {
              const st = DOC_STATUS_STYLES[s];
              return (
                <label key={s}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${actionStatus === s ? 'border-violet-500/50' : 'border-white/[0.07] hover:border-white/15'}`}
                  style={{ background: actionStatus === s ? 'rgba(91,62,245,0.1)' : 'rgba(255,255,255,0.03)' }}>
                  <input type="radio" className="hidden" checked={actionStatus === s} onChange={() => setActionStatus(s)}/>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: actionStatus === s ? '#7C5BF8' : 'rgba(255,255,255,0.15)' }}/>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </label>
              );
            })}
          </div>
          {['rejected', 're_upload_required'].includes(actionStatus) && (
            <div className="mb-5">
              <label className="text-white/50 text-xs block mb-1.5">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea value={actionReason} onChange={e => setActionReason(e.target.value)}
                rows={3} placeholder="Explain why the document was rejected or needs re-upload…"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50 resize-none"
                style={{ background: 'rgba(255,255,255,0.05)' }}/>
            </div>
          )}
          {actionStatus === 'approved' && (
            <div className="mb-5 px-3 py-2.5 rounded-xl border border-green-400/20 text-green-400 text-xs flex items-center gap-2"
              style={{ background: 'rgba(22,163,74,0.08)' }}>
              <CheckCircle size={12}/>Partner will be notified that this document is approved.
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setActionDoc(null)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 border border-white/10 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button onClick={handleAction} disabled={saving || !actionStatus}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#5b3ef5,#7c5bf8)' }}>
              {saving ? <Loader2 size={14} className="animate-spin"/> : 'Save Decision'}
            </button>
          </div>
        </Modal>
      )}

      {/* History Modal */}
      {historyDoc && (
        <Modal title={`Document History — ${historyDoc.partner_name}`} onClose={() => setHistoryDoc(null)}>
          <p className="text-white/40 text-sm mb-4 capitalize">{historyDoc.document_type.replace(/_/g, ' ')}</p>
          {histLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 size={20} className="animate-spin" style={{ color: '#5B3EF5' }}/>
            </div>
          ) : history.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No previous versions found</p>
          ) : (
            <div className="space-y-3">
              {history.map(h => {
                const st = DOC_STATUS_STYLES[h.status] ?? DOC_STATUS_STYLES['pending'];
                return (
                  <div key={h.id} className="p-3 rounded-xl border border-white/[0.07]" style={CARD}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold"
                        style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <span className="text-white/25 text-[10px]">v{h.version}</span>
                    </div>
                    <p className="text-white/30 text-xs">
                      Uploaded: {new Date(h.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {h.reviewed_at && (
                      <p className="text-white/20 text-xs">
                        Reviewed: {new Date(h.reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {h.archived_at && (
                      <p className="text-white/20 text-xs">
                        Archived: {new Date(h.archived_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {h.rejection_reason && (
                      <p className="text-red-300 text-xs mt-1.5 border border-red-400/15 px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.06)' }}>
                        {h.rejection_reason}
                      </p>
                    )}
                    {h.document_url && (
                      <a href={h.document_url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-violet-400 text-xs hover:underline">
                        <ExternalLink size={10}/> View file
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {/* Document Type Modal */}
      {typeModal && (
        <Modal title={editType ? 'Edit Document Type' : 'Add Document Type'} onClose={() => setTypeModal(false)}>
          <div className="space-y-4 mb-5">
            {!editType && (
              <div>
                <label className="text-white/50 text-xs block mb-1.5">
                  Type Key <span className="text-white/25 font-normal">(snake_case, e.g. gst_certificate)</span>
                </label>
                <input value={typeKey} onChange={e => setTypeKey(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
                  style={{ background: 'rgba(255,255,255,0.05)' }} placeholder="gst_certificate"/>
              </div>
            )}
            <div>
              <label className="text-white/50 text-xs block mb-1.5">Label</label>
              <input value={typeLabel} onChange={e => setTypeLabel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
                style={{ background: 'rgba(255,255,255,0.05)' }} placeholder="GST Certificate"/>
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1.5">Emoji</label>
              <input value={typeEmoji} onChange={e => setTypeEmoji(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
                style={{ background: 'rgba(255,255,255,0.05)' }} placeholder="📄" maxLength={2}/>
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1.5">Description <span className="font-normal text-white/25">(optional)</span></label>
              <input value={typeDesc} onChange={e => setTypeDesc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none focus:border-violet-500/50"
                style={{ background: 'rgba(255,255,255,0.05)' }} placeholder="Short description shown to partners"/>
            </div>
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => setTypeMandatory(m => !m)}>
              <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${typeMandatory ? 'bg-violet-600' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${typeMandatory ? 'translate-x-5' : 'translate-x-0.5'}`}/>
              </div>
              <span className="text-sm text-white/70">Required for all partners</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setTypeModal(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 border border-white/10 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button onClick={saveType} disabled={typeSaving || !typeLabel.trim() || (!editType && !typeKey.trim())}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#5b3ef5,#7c5bf8)' }}>
              {typeSaving ? <Loader2 size={14} className="animate-spin"/> : editType ? 'Save Changes' : 'Add Type'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════════════ */

function SettingsView({ user }: { user: AdminUser }) {
  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={CARD}>
        <h3 className="text-white font-bold text-sm mb-4">Account Info</h3>
        <div className="space-y-4">
          <div><p className="text-white/40 text-xs mb-0.5">Full Name</p><p className="text-white text-sm">{user.fullName}</p></div>
          <div><p className="text-white/40 text-xs mb-0.5">Email</p><p className="text-white text-sm">{user.email}</p></div>
          <div>
            <p className="text-white/40 text-xs mb-0.5">Role</p>
            <Badge label={user.role?.toUpperCase()} color="#5B3EF5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PRIVACY & SECURITY
═══════════════════════════════════════════════════════════════════ */

function PrivacySecurityView({ user, accessToken, onUserUpdate }: { user: AdminUser; accessToken: string; onUserUpdate?: (u: AdminUser) => void }) {
  const [profileForm, setProfileForm] = useState({ fullName: user.fullName ?? "", phone: user.phone ?? "" });

  // Keep form in sync whenever the parent updates the user object
  useEffect(() => {
    setProfileForm({ fullName: user.fullName ?? "", phone: user.phone ?? "" });
  }, [user.id, user.fullName, user.phone]);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!profileForm.fullName.trim()) { setProfileMsg({ text: "Full name is required.", type: "error" }); return; }
    setProfileLoading(true);
    try {
      const updated = await adminApi.updateProfile(
        { fullName: profileForm.fullName.trim(), ...(profileForm.phone ? { phone: profileForm.phone.trim() } : {}) },
        accessToken,
      );
      adminAuth.patchUser(updated as AdminUser);
      onUserUpdate?.(updated as AdminUser);
      setProfileMsg({ text: "Profile updated successfully.", type: "success" });
    } catch (e: any) {
      setProfileMsg({ text: e.message ?? "Failed to update profile.", type: "error" });
    } finally {
      setProfileLoading(false);
      setTimeout(() => setProfileMsg(null), 4000);
    }
  };

  const [changePw, setChangePw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Platform Policies state
  const [policies,    setPolicies]    = useState<PlatformPolicyRow[]>([]);
  const [polLoading,  setPolLoading]  = useState(true);
  const [polEdits,    setPolEdits]    = useState<Record<string, { title: string; content: string }>>({});
  const [savingSlug,  setSavingSlug]  = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [polMsg,      setPolMsg]      = useState<{ slug: string; text: string; type: "success" | "error" } | null>(null);

  // New policy (create) form
  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ title: "", content: "" });
  const [creatingPolicy, setCreatingPolicy] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadPolicies = () => {
    setPolLoading(true);
    return adminApi.getPlatformPolicies(accessToken)
      .then(rows => setPolicies(rows))
      .catch(() => {})
      .finally(() => setPolLoading(false));
  };

  useEffect(() => {
    loadPolicies();
  }, [accessToken]);

  const handleSavePolicy = async (slug: string) => {
    const edit = polEdits[slug];
    if (!edit) return;
    setSavingSlug(slug);
    try {
      await adminApi.updatePlatformPolicy(slug, { title: edit.title, content: edit.content }, accessToken);
      setPolicies(prev => prev.map(p => p.slug === slug ? { ...p, ...edit, updatedAt: new Date().toISOString() } : p));
      setPolMsg({ slug, text: "Saved successfully.", type: "success" });
    } catch (e: any) {
      setPolMsg({ slug, text: e.message ?? "Failed to save.", type: "error" });
    } finally {
      setSavingSlug(null);
      setTimeout(() => setPolMsg(m => m?.slug === slug ? null : m), 4000);
    }
  };

  const handleCreatePolicy = async () => {
    if (!newPolicy.title.trim()) { setCreateMsg({ text: "Title is required.", type: "error" }); return; }
    setCreatingPolicy(true);
    try {
      const created = await adminApi.createPlatformPolicy({ title: newPolicy.title.trim(), content: newPolicy.content }, accessToken);
      setPolicies(prev => [...prev, created].sort((a, b) => a.slug.localeCompare(b.slug)));
      setNewPolicy({ title: "", content: "" });
      setShowNewPolicy(false);
      setCreateMsg(null);
    } catch (e: any) {
      setCreateMsg({ text: e.message ?? "Failed to create policy.", type: "error" });
    } finally {
      setCreatingPolicy(false);
    }
  };

  const handleDeletePolicy = async (slug: string) => {
    if (!window.confirm("Move this policy to trash? It can be restored later.")) return;
    setDeletingSlug(slug);
    try {
      await adminApi.deletePlatformPolicy(slug, accessToken);
      setPolicies(prev => prev.filter(p => p.slug !== slug));
    } catch (e: any) {
      setPolMsg({ slug, text: e.message ?? "Failed to delete.", type: "error" });
      setTimeout(() => setPolMsg(m => m?.slug === slug ? null : m), 4000);
    } finally {
      setDeletingSlug(null);
    }
  };

  const handleChangePw = async () => {
    if (!changePw.current || !changePw.next || !changePw.confirm) { setPwMsg({ text: "All fields are required.", type: "error" }); return; }
    if (changePw.next !== changePw.confirm) { setPwMsg({ text: "New passwords do not match.", type: "error" }); return; }
    if (changePw.next.length < 8) { setPwMsg({ text: "Password must be at least 8 characters.", type: "error" }); return; }
    setPwLoading(true);
    try {
      await adminApi.changePassword(changePw.current, changePw.next, accessToken);
      setPwMsg({ text: "Password changed successfully.", type: "success" });
      setChangePw({ current: "", next: "", confirm: "" });
    } catch (e: any) {
      setPwMsg({ text: e.message ?? "Failed to change password.", type: "error" });
    } finally {
      setPwLoading(false);
      setTimeout(() => setPwMsg(null), 4000);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Update Profile */}
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={CARD}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,62,245,0.15)" }}>
            <Shield size={16} color="#7C5BF8" />
          </div>
          <h3 className="text-white font-bold text-sm">Update Profile</h3>
        </div>
        {profileMsg && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs font-medium border" style={{ background: profileMsg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(22,163,74,0.1)", borderColor: profileMsg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(22,163,74,0.3)", color: profileMsg.type === "error" ? "#f87171" : "#4ade80" }}>
            {profileMsg.text}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-white/40 text-xs mb-1 block">Full Name</label>
            <input
              type="text"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="Your full name"
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-violet-500 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Phone (optional)</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-violet-500 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Email</label>
            <p className="px-3 py-2 rounded-xl text-sm text-white/50 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>{user.email}</p>
            <p className="text-white/30 text-[10px] mt-1">Email cannot be changed here. Contact system administrator.</p>
          </div>
          <button
            onClick={handleUpdateProfile}
            disabled={profileLoading}
            className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
          >
            {profileLoading ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={CARD}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,62,245,0.15)" }}>
            <Lock size={16} color="#7C5BF8" />
          </div>
          <h3 className="text-white font-bold text-sm">Change Password</h3>
        </div>
        {pwMsg && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs font-medium border" style={{ background: pwMsg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(22,163,74,0.1)", borderColor: pwMsg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(22,163,74,0.3)", color: pwMsg.type === "error" ? "#f87171" : "#4ade80" }}>
            {pwMsg.text}
          </div>
        )}
        <div className="space-y-3">
          {[
            { label: "Current Password", key: "current" as const },
            { label: "New Password",     key: "next"    as const },
            { label: "Confirm New Password", key: "confirm" as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-white/40 text-xs mb-1 block">{label}</label>
              <input
                type="password"
                value={changePw[key]}
                onChange={(e) => setChangePw((p) => ({ ...p, [key]: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-violet-500 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>
          ))}
          <button
            onClick={handleChangePw}
            disabled={pwLoading}
            className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
          >
            {pwLoading ? "Changing…" : "Update Password"}
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,62,245,0.15)" }}>
            <Shield size={16} color="#7C5BF8" />
          </div>
          <h3 className="text-white font-bold text-sm">Account Security</h3>
        </div>
        <div className="space-y-3">
          <div><p className="text-white/40 text-xs mb-0.5">Admin Email</p><p className="text-white text-sm">{user.email}</p></div>
          <div><p className="text-white/40 text-xs mb-0.5">Role</p><Badge label="ADMIN" color="#5B3EF5" /></div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-500/20" style={{ background: "rgba(22,163,74,0.08)" }}>
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-green-400 text-xs font-semibold">Session Active · JWT Auth</span>
          </div>
        </div>
      </div>

      {/* Platform Policies — editable, synced to DB */}
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={CARD}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,62,245,0.15)" }}>
            <ExternalLink size={16} color="#7C5BF8" />
          </div>
          <h3 className="text-white font-bold text-sm">Platform Policies</h3>
          <span className="ml-auto text-white/30 text-[10px] mr-3">Visible to customers in the mobile app</span>
          <button
            onClick={() => setShowNewPolicy(v => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
          >
            <Plus size={13} /> New Policy
          </button>
        </div>

        {showNewPolicy && (
          <div className="mb-5 p-4 rounded-xl border border-dashed border-violet-500/30 space-y-2" style={{ background: "rgba(91,62,245,0.06)" }}>
            {createMsg && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ background: createMsg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(22,163,74,0.1)", borderColor: createMsg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(22,163,74,0.3)", color: createMsg.type === "error" ? "#f87171" : "#4ade80" }}>
                {createMsg.text}
              </div>
            )}
            <input
              type="text"
              value={newPolicy.title}
              onChange={(e) => setNewPolicy(p => ({ ...p, title: e.target.value }))}
              placeholder="Policy title (e.g. Refund Policy)"
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-violet-500 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
            <textarea
              rows={4}
              value={newPolicy.content}
              onChange={(e) => setNewPolicy(p => ({ ...p, content: e.target.value }))}
              placeholder="Policy content…"
              className="w-full px-3 py-2 rounded-xl text-sm text-white/80 outline-none border border-white/10 focus:border-violet-500 transition-colors resize-y leading-relaxed"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowNewPolicy(false); setCreateMsg(null); setNewPolicy({ title: "", content: "" }); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePolicy}
                disabled={creatingPolicy}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
              >
                {creatingPolicy ? "Creating…" : "Create Policy"}
              </button>
            </div>
          </div>
        )}

        {polLoading ? (
          <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
        ) : policies.length === 0 ? (
          <p className="text-white/30 text-xs py-4 text-center">No policies yet. Click "New Policy" to add one.</p>
        ) : (
          <div className="space-y-5">
            {policies.map((p) => {
              const edit = polEdits[p.slug] ?? { title: p.title, content: p.content };
              const isSaving = savingSlug === p.slug;
              const isDeleting = deletingSlug === p.slug;
              const msg = polMsg?.slug === p.slug ? polMsg : null;
              return (
                <div key={p.slug} className="space-y-2 pb-4 border-b border-white/[0.05] last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-wide">{p.title}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-white/20 text-[10px]">
                        Last saved {new Date(p.updatedAt).toLocaleDateString("en-IN")}
                      </span>
                      <button
                        onClick={() => handleDeletePolicy(p.slug)}
                        disabled={isDeleting}
                        title="Delete policy"
                        className="p-1 rounded-md text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {msg && (
                    <div className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ background: msg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(22,163,74,0.1)", borderColor: msg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(22,163,74,0.3)", color: msg.type === "error" ? "#f87171" : "#4ade80" }}>
                      {msg.text}
                    </div>
                  )}

                  <textarea
                    rows={6}
                    value={edit.content}
                    onChange={(e) => setPolEdits(prev => ({ ...prev, [p.slug]: { ...edit, content: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white/80 outline-none border border-white/10 focus:border-violet-500 transition-colors resize-y leading-relaxed"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                    placeholder="Enter policy content…"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSavePolicy(p.slug)}
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
                    >
                      {isSaving ? "Saving…" : `Save ${p.title}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HELP & SUPPORT
═══════════════════════════════════════════════════════════════════ */

interface ContactConfig { email: string; phone: string; hours: string; docsUrl: string; }
const CONTACT_DEFAULTS: ContactConfig = { email: "support@servenow.in", phone: "+91 98765 43210", hours: "Mon–Sat, 9am–6pm IST", docsUrl: "docs.servenow.in" };

function HelpSupportView({ accessToken }: { accessToken: string }) {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Contact config state
  const [contactEdit, setContactEdit] = useState(false);
  const [contactForm, setContactForm] = useState<ContactConfig>(CONTACT_DEFAULTS);
  const [contactSaved, setContactSaved] = useState<ContactConfig>(CONTACT_DEFAULTS);
  const [contactSaving, setContactSaving] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSupportTickets(accessToken);
      setTickets(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { loadTickets(); }, []);

  const showMsg = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleUpdate = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await adminApi.updateSupportTicket(id, { status, response: responseText[id] || undefined }, accessToken);
      showMsg("Ticket updated.", "success");
      loadTickets();
      setExpandedId(null);
    } catch (e: any) {
      showMsg(e.message ?? "Failed to update ticket.", "error");
    } finally { setUpdatingId(null); }
  };

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    open:        { bg: "rgba(239,68,68,0.12)",  color: "#f87171", label: "Open" },
    in_progress: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", label: "In Progress" },
    closed:      { bg: "rgba(22,163,74,0.12)",  color: "#4ade80", label: "Closed" },
  };

  return (
    <div className="max-w-3xl space-y-5">
      {msg && (
        <div className="px-3 py-2 rounded-xl text-xs font-medium border" style={{ background: msg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(22,163,74,0.1)", borderColor: msg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(22,163,74,0.3)", color: msg.type === "error" ? "#f87171" : "#4ade80" }}>
          {msg.text}
        </div>
      )}

      {/* Contact */}
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,62,245,0.15)" }}>
            <MessageSquare size={16} color="#7C5BF8" />
          </div>
          <h3 className="text-white font-bold text-sm">Contact & Resources</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: "📧", label: "Email Support", value: "support@servenow.in" },
            { icon: "📞", label: "Phone",         value: "+91 98765 43210" },
            { icon: "🕐", label: "Hours",         value: "Mon–Sat, 9am–6pm IST" },
            { icon: "📖", label: "Docs",          value: "docs.servenow.in" },
          ].map(({ icon, label, value }) => (
            <div key={label} className="px-4 py-3 rounded-xl border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-white/40 text-xs mb-0.5">{icon} {label}</p>
              <p className="text-white text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tickets */}
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={CARD}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,62,245,0.15)" }}>
              <HelpCircle size={16} color="#7C5BF8" />
            </div>
            <h3 className="text-white font-bold text-sm">Support Tickets</h3>
          </div>
          <button onClick={loadTickets} className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
            <RefreshCw size={13} color="rgba(255,255,255,0.4)" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-violet-500" /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10">
            <HelpCircle size={32} color="rgba(255,255,255,0.15)" className="mx-auto mb-2" />
            <p className="text-white/30 text-sm">No support tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.open;
              const expanded = expandedId === t.id;
              return (
                <div key={t.id} className="rounded-xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : t.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white text-sm font-semibold truncate">{t.subject}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                      <p className="text-white/40 text-xs truncate">{t.name} · {t.email}</p>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">{expanded ? <ChevronUp size={15} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={15} color="rgba(255,255,255,0.3)" />}</div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-white/[0.07] pt-3 space-y-3">
                      <p className="text-white/70 text-sm leading-relaxed">{t.message}</p>
                      {t.response && (
                        <div className="px-3 py-2 rounded-xl border border-violet-500/20" style={{ background: "rgba(91,62,245,0.08)" }}>
                          <p className="text-white/40 text-xs mb-1">Previous Response</p>
                          <p className="text-white/80 text-sm">{t.response}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-white/40 text-xs mb-1 block">Response (optional)</label>
                        <textarea
                          value={responseText[t.id] ?? ""}
                          onChange={(e) => setResponseText((p) => ({ ...p, [t.id]: e.target.value }))}
                          placeholder="Type a response to the user…"
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-violet-500 transition-colors resize-none"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {["in_progress", "closed"].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleUpdate(t.id, st)}
                            disabled={updatingId === t.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            style={st === "closed"
                              ? { background: "rgba(22,163,74,0.15)", color: "#4ade80" }
                              : { background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}
                          >
                            {updatingId === t.id ? "Saving…" : st === "closed" ? "Mark Closed" : "Mark In Progress"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SERVICES VIEW
═══════════════════════════════════════════════════════════════════ */

type SvcForm = {
  name: string; categoryId: string; subCategoryId: string;
  description: string; customerPrice: string; partnerPayout: string;
  duration: string; requiredSkill: string; isActive: boolean;
};
const EMPTY_SVC: SvcForm = {
  name: "", categoryId: "", subCategoryId: "", description: "",
  customerPrice: "", partnerPayout: "", duration: "60", requiredSkill: "", isActive: true,
};

function ServicesView({
  services, categories, accessToken, onCreate, onEdit, onDelete, onRefresh,
}: {
  services: ServiceRow[];
  categories: Category[];
  accessToken: string;
  onCreate: (d: ServiceInput) => Promise<void>;
  onEdit: (id: string, d: Partial<ServiceInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [search,       setSearch]       = useState("");
  const [filterCat,    setFilterCat]    = useState("");
  const [creating,     setCreating]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<ServiceRow | null>(null);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [form,         setForm]         = useState<SvcForm>(EMPTY_SVC);
  const [saving,       setSaving]       = useState(false);
  const [subCats,      setSubCats]      = useState<SubCategory[]>([]);
  const [subCatsLoading, setSubCatsLoading] = useState(false);

  // Load sub-categories when category changes in the form
  useEffect(() => {
    if (!form.categoryId) { setSubCats([]); return; }
    setSubCatsLoading(true);
    adminApi.getSubcategories(form.categoryId, accessToken)
      .then(r => setSubCats(r.subcategories ?? []))
      .catch(() => setSubCats([]))
      .finally(() => setSubCatsLoading(false));
  }, [form.categoryId, accessToken]);

  const openCreate = () => { setForm(EMPTY_SVC); setCreating(true); };
  const openEdit   = (s: ServiceRow) => {
    setForm({
      name: s.name, categoryId: s.categoryId, subCategoryId: s.subCategoryId ?? "",
      description: s.description ?? "", customerPrice: String(s.customerPrice),
      partnerPayout: String(s.partnerPayout), duration: String(s.duration),
      requiredSkill: s.requiredSkill ?? "", isActive: s.isActive,
    });
    setEditTarget(s);
  };

  const toInput = (f: SvcForm): ServiceInput => ({
    name: f.name.trim(), categoryId: f.categoryId,
    subCategoryId: f.subCategoryId || null,
    description: f.description || undefined,
    customerPrice: Number(f.customerPrice) || 0,
    partnerPayout: Number(f.partnerPayout) || 0,
    duration: Number(f.duration) || 60,
    requiredSkill: f.requiredSkill || undefined,
    isActive: f.isActive,
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return alert("Name is required");
    if (!form.categoryId) return alert("Category is required");
    setSaving(true);
    try { await onCreate(toInput(form)); setCreating(false); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try { await onEdit(editTarget.id, toInput(form)); setEditTarget(null); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const commission = (Number(form.customerPrice) || 0) - (Number(form.partnerPayout) || 0);

  const filtered = services.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = !filterCat || s.categoryId === filterCat;
    return matchSearch && matchCat;
  });

  const ServiceForm = () => (
    <div className="space-y-4">
      <Field label="Service Name *">
        <TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Deep Floor Cleaning" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category *">
          <SelectInput value={form.categoryId} onChange={v => setForm(f => ({ ...f, categoryId: v, subCategoryId: "" }))} >
            <option value="">— select —</option>
            {categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Sub-category">
          <SelectInput value={form.subCategoryId} onChange={v => setForm(f => ({ ...f, subCategoryId: v }))} disabled={!form.categoryId || subCatsLoading}>
            <option value="">— none —</option>
            {subCats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SelectInput>
        </Field>
      </div>
      <Field label="Description">
        <TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="What's included in this service…" rows={2} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Customer Price (₹) *">
          <TextInput type="number" value={form.customerPrice} onChange={v => setForm(f => ({ ...f, customerPrice: v }))} placeholder="999" />
        </Field>
        <Field label="Partner Payout (₹) *">
          <TextInput type="number" value={form.partnerPayout} onChange={v => setForm(f => ({ ...f, partnerPayout: v }))} placeholder="600" />
        </Field>
      </div>
      {/* Auto-calculated commission */}
      <div className="rounded-xl px-4 py-3 border border-white/10 flex items-center justify-between" style={{ background: "rgba(91,62,245,0.07)" }}>
        <span className="text-white/50 text-xs">Platform Commission</span>
        <span className={`font-bold text-sm ${commission >= 0 ? "text-violet-400" : "text-red-400"}`}>
          ₹{commission.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (minutes)">
          <TextInput type="number" value={form.duration} onChange={v => setForm(f => ({ ...f, duration: v }))} placeholder="60" />
        </Field>
        <Field label="Required Skill">
          <TextInput value={form.requiredSkill} onChange={v => setForm(f => ({ ...f, requiredSkill: v }))} placeholder="e.g. Floor Cleaning" />
        </Field>
      </div>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
        <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.isActive ? "bg-violet-600" : "bg-white/10"}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? "translate-x-5" : ""}`} />
        </div>
        <span className="text-white/60 text-xs">{form.isActive ? "Active" : "Inactive"} — customers can book this service</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Modals */}
      {creating && (
        <Modal title="New Service" onClose={() => setCreating(false)}>
          <ServiceForm />
          <SaveCancelButtons onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} saveLabel="Create service" />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit Service" onClose={() => setEditTarget(null)}>
          <ServiceForm />
          <SaveCancelButtons onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmDialog
          title="Delete Service?"
          body="This service will be deactivated. Existing bookings are not affected."
          confirmLabel="Delete"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <span>Dashboard</span><ChevronRight size={12} /><span className="text-white/60 font-semibold">Services</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-white font-bold text-xl">Service Catalogue</h2>
            <p className="text-white/35 text-xs mt-0.5">{filtered.length} service{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 min-w-0" />
          <div className="w-48 flex-shrink-0">
            <SelectInput value={filterCat} onChange={setFilterCat}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectInput>
          </div>
          <div className="w-52 flex-shrink-0">
            <SearchBar value={search} onChange={setSearch} placeholder="Search services…" />
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white whitespace-nowrap flex-shrink-0" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            <Plus size={14} /> Add Service
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/20">
          <Package size={44} className="mb-3" />
          <p className="text-sm">No services yet. Create your first service above.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Service", "Category", "Price", "Payout", "Commission", "Duration", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors last:border-b-0">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-semibold text-sm leading-snug">{s.name}</p>
                      {s.requiredSkill && <p className="text-white/35 text-xs mt-0.5">Skill: {s.requiredSkill}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white/70 text-xs">{s.categoryName ?? "—"}</p>
                      {s.subCategoryName && <p className="text-white/40 text-[11px]">{s.subCategoryName}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-bold">₹{s.customerPrice.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">₹{s.partnerPayout.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-violet-400 font-semibold">₹{s.commission.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-white/50">{s.duration} min</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: s.isActive ? "#16A34A22" : "#EF444422", color: s.isActive ? "#16A34A" : "#EF4444" }}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <ActionBtn variant="edit" onClick={() => openEdit(s)}>Edit</ActionBtn>
                      <ActionBtn variant={s.isActive ? "warn" : "green"} onClick={() => onEdit(s.id, { isActive: !s.isActive }).then(onRefresh)}>
                        {s.isActive ? "Deactivate" : "Activate"}
                      </ActionBtn>
                      <ActionBtn variant="danger" onClick={() => setDeleteId(s.id)}>Delete</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════ */

export default function App() {
  const [user,         setUser]         = useState<AdminUser | null>(null);
  const [accessToken,  setAccessToken]  = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [checking,     setChecking]     = useState(true);

  useEffect(() => {
    (async () => {
      const storedRefresh = adminAuth.getRefreshToken();
      if (storedRefresh) {
        try {
          const data = await authApi.refresh(storedRefresh);
          adminAuth.store(data.accessToken, data.refreshToken, data.user);
          setUser(data.user); setAccessToken(data.accessToken); setRefreshToken(data.refreshToken);
        } catch { adminAuth.clear(); }
      }
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    const forceLogout = () => {
      setUser(null); setAccessToken(null); setRefreshToken(null);
    };
    const onTokenRefreshed = (e: Event) => {
      const { accessToken: a, refreshToken: r, user: u } = (e as CustomEvent).detail;
      setAccessToken(a); setRefreshToken(r); setUser(u);
    };
    window.addEventListener('admin:unauthorized', forceLogout);
    window.addEventListener('admin:token-refreshed', onTokenRefreshed);
    return () => {
      window.removeEventListener('admin:unauthorized', forceLogout);
      window.removeEventListener('admin:token-refreshed', onTokenRefreshed);
    };
  }, []);

  const handleLogin = (u: AdminUser, access: string, refresh: string) => {
    setUser(u); setAccessToken(access); setRefreshToken(refresh);
  };

  const handleLogout = async () => {
    if (refreshToken && accessToken) await authApi.logout(refreshToken, accessToken);
    adminAuth.clear(); setUser(null); setAccessToken(null); setRefreshToken(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f1117" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "#5B3EF5" }} />
      </div>
    );
  }

  if (!user || !accessToken) return <LoginPage onLogin={handleLogin} />;
  return <AdminPanel user={user} accessToken={accessToken} onLogout={handleLogout} />;
}
