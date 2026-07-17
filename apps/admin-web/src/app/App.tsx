import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell, Home, BookOpen, Sparkles, DollarSign, Search, Clock,
  BarChart2, Users, Settings, RefreshCw, Activity, LogOut,
  Loader2, UserCheck, XCircle, Pencil, Trash2, ShieldOff,
  ShieldCheck, Star, Grid, Plus, ChevronDown, ChevronUp,
  Shield, HelpCircle, Lock, MessageSquare, ExternalLink, Tag,
  Film, ChevronRight, Image, Upload,
} from "lucide-react";
import { adminAuth, authApi, adminApi } from "@/lib/api";
import type {
  AdminUser, BookingRow, ProfessionalRow, CustomerUser,
  Category, SubCategory, ReelRow, ReviewRow, DashboardStats, AuditLogRow, SupportTicketRow,
  PlatformPolicyRow, OfferRow, OfferInput, NotificationRow,
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto" style={MODAL_BG}>
        <h3 className="text-white font-bold text-base mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
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

function SelectInput({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors"
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
  { id: "reels",      icon: Film,       label: "Reels"              },
  { id: "offers",     icon: Tag,        label: "Offers / Banners"   },
  { id: "reviews",    icon: Star,       label: "Reviews"            },
  { id: "analytics",  icon: BarChart2,  label: "Analytics"          },
  { id: "audit-logs", icon: Activity,   label: "Audit Logs"         },
  { id: "privacy",    icon: Shield,     label: "Privacy & Security" },
  { id: "support",    icon: HelpCircle, label: "Help & Support"     },
  { id: "settings",   icon: Settings,   label: "Settings"           },
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
  const [loading,      setLoading]      = useState(true);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, p, u, c, r, a, o, rl] = await Promise.all([
        adminApi.getStats(accessToken),
        adminApi.getBookings(accessToken),
        adminApi.getProfessionals(accessToken),
        adminApi.getUsers(accessToken),
        adminApi.getCategories(accessToken),
        adminApi.getReviews(accessToken),
        adminApi.getAuditLogs(accessToken),
        adminApi.getOffers(accessToken),
        adminApi.getReels(accessToken),
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
  const editPro = async (id: string, patch: { name?: string; title?: string; bio?: string; basePrice?: number; priceUnit?: string; badge?: string; tags?: string[] }) => {
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
  const createCategory = async (data: { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number }) => {
    await adminApi.createCategory(data, accessToken);
    showMsg("Category created"); load();
  };
  const editCategory = async (id: string, data: { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; isActive: boolean }) => {
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
    showMsg("Review deleted"); load();
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
    showMsg("Offer deleted"); load();
  };

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
    showMsg("Reel deleted"); load();
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
              {ADMIN_SIDEBAR.find(s => s.id === activeSection)?.label ?? activeSection}
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
            <ProsView pros={proList} onEdit={editPro} onToggle={togglePro} onDelete={deletePro} />
          ) : activeSection === "users" ? (
            <UsersView users={userList} onEdit={editUser} onDelete={deleteUser} onToggle={toggleUser} />
          ) : activeSection === "categories" ? (
            <CategoriesView categories={categoryList} onCreate={createCategory} onEdit={editCategory} onDelete={deleteCategory} accessToken={accessToken} onRefresh={load} />
          ) : activeSection === "reels" ? (
            <ReelsView reels={reelList} onCreate={createReel} onEdit={editReel} onDelete={deleteReel} accessToken={accessToken} onRefresh={load} />
          ) : activeSection === "offers" ? (
            <OffersView offers={offerList} onCreate={createOffer} onEdit={editOffer} onDelete={deleteOffer} />
          ) : activeSection === "reviews" ? (
            <ReviewsView reviews={reviewList} onDelete={deleteReview} />
          ) : activeSection === "analytics" ? (
            <AnalyticsView stats={stats} />
          ) : activeSection === "audit-logs" ? (
            <AuditLogsView logs={auditLogs} />
          ) : activeSection === "privacy" ? (
            <PrivacySecurityView user={localUser} accessToken={accessToken} onUserUpdate={handleUserUpdate} />
          ) : activeSection === "support" ? (
            <HelpSupportView accessToken={accessToken} />
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

type ProPatch = { name: string; title: string; bio: string; basePrice: number; priceUnit: string; badge: string; tags: string };

function ProsView({
  pros, onEdit, onToggle, onDelete,
}: {
  pros: ProfessionalRow[];
  onEdit: (id: string, patch: { name?: string; title?: string; bio?: string; basePrice?: number; priceUnit?: string; badge?: string; tags?: string[] }) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [search,     setSearch]     = useState("");
  const [editTarget, setEditTarget] = useState<ProfessionalRow | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState<ProPatch>({ name: "", title: "", bio: "", basePrice: 0, priceUnit: "/visit", badge: "", tags: "" });
  const [saving,     setSaving]     = useState(false);
  const [busyId,     setBusyId]     = useState<string | null>(null);

  const openEdit = (p: ProfessionalRow) => {
    setForm({
      name: p.name, title: p.title, bio: p.bio ?? "",
      basePrice: p.basePrice, priceUnit: p.priceUnit,
      badge: p.badge ?? "", tags: (p.tags ?? []).join(", "),
    });
    setEditTarget(p);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await onEdit(editTarget.id, {
        name: form.name, title: form.title, bio: form.bio,
        basePrice: Number(form.basePrice), priceUnit: form.priceUnit,
        badge: form.badge,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
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

      <SearchBar value={search} onChange={setSearch} placeholder="Search professionals…" />

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Professional", "Category", "Rating", "Price", "Status", "Actions"].map(h => (
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
              {filtered.length === 0 && <EmptyRow cols={6} text="No professionals found" />}
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

type CatForm = { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; isActive: boolean };
const EMPTY_CAT: CatForm = { name: "", description: "", iconName: "Grid", color: "#F3F4F6", iconColor: "#6B7280", sortOrder: 0, isActive: true };

function ImageUploadButton({ label, onUpload, currentUrl, disabled }: { label: string; onUpload: (f: File) => Promise<void>; currentUrl?: string | null; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { await onUpload(f); } catch (err: any) { alert(err.message); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div className="flex items-center gap-3">
      {currentUrl && <img src={currentUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-white/10" />}
      <button
        type="button" onClick={() => ref.current?.click()} disabled={disabled || busy}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white/70 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {busy ? "Uploading…" : label}
      </button>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handle} />
    </div>
  );
}

function CategoriesView({
  categories, onCreate, onEdit, onDelete, accessToken, onRefresh,
}: {
  categories: Category[];
  onCreate: (data: { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number }) => Promise<void>;
  onEdit: (id: string, data: { name: string; description: string; iconName: string; color: string; iconColor: string; sortOrder: number; isActive: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  accessToken: string;
  onRefresh: () => void;
}) {
  const [search,        setSearch]        = useState("");
  const [editTarget,    setEditTarget]    = useState<Category | null>(null);
  const [creating,      setCreating]      = useState(false);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [form,          setForm]          = useState<CatForm>(EMPTY_CAT);
  const [saving,        setSaving]        = useState(false);
  const [busyId,        setBusyId]        = useState<string | null>(null);
  const [subCatTarget,  setSubCatTarget]  = useState<Category | null>(null);

  const openCreate = () => { setForm(EMPTY_CAT); setCreating(true); };
  const openEdit   = (c: Category) => {
    setForm({ name: c.name, description: c.description ?? "", iconName: c.iconName, color: c.color, iconColor: c.iconColor, sortOrder: c.sortOrder, isActive: c.isActive });
    setEditTarget(c);
  };

  const handleCreate = async () => {
    setSaving(true);
    try { await onCreate({ name: form.name, description: form.description, iconName: form.iconName, color: form.color, iconColor: form.iconColor, sortOrder: form.sortOrder }); setCreating(false); }
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
    try { await onEdit(c.id, { name: c.name, description: c.description ?? "", iconName: c.iconName, color: c.color, iconColor: c.iconColor, sortOrder: c.sortOrder, isActive: !c.isActive }); }
    catch (err: any) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const CatFormFields = () => (
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
    </div>
  );

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
    <div className="space-y-4">
      {creating && (
        <Modal title="New Category" onClose={() => setCreating(false)}>
          <CatFormFields />
          <SaveCancelButtons onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} saveLabel="Create category" />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Category" onClose={() => setEditTarget(null)}>
          <CatFormFields />
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
          title="Deactivate Category?"
          body="This will hide the category from the Customer App. Existing professionals and bookings are not affected."
          confirmLabel="Deactivate"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search categories…" />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white whitespace-nowrap"
          style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
        >
          <Plus size={14} /> New Category
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Category", "Image", "Description", "Colors", "Order", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.color }}>
                        <Grid size={14} color={c.iconColor} />
                      </div>
                      <span className="text-white font-semibold whitespace-nowrap">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.imageUrl
                      ? <img src={c.imageUrl} alt={c.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                      : <span className="text-white/30 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs max-w-[160px] truncate">{c.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-sm border border-white/20 flex-shrink-0" style={{ background: c.color }} />
                      <span className="w-4 h-4 rounded-sm border border-white/20 flex-shrink-0" style={{ background: c.iconColor }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <Badge label={c.isActive ? "Active" : "Inactive"} color={c.isActive ? "#16A34A" : "#EF4444"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ActionBtn variant="edit" onClick={() => openEdit(c)}>Edit</ActionBtn>
                      <button
                        onClick={() => setSubCatTarget(c)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-300 border border-violet-500/30 hover:bg-violet-500/10 transition-colors"
                      >
                        Sub-cats <ChevronRight size={11} />
                      </button>
                      <ActionBtn
                        variant={c.isActive ? "warn" : "green"}
                        onClick={() => handleToggleActive(c)}
                        disabled={busyId === c.id}
                      >
                        {c.isActive ? "Deactivate" : "Activate"}
                      </ActionBtn>
                      <ActionBtn variant="danger" onClick={() => setDeleteId(c.id)}>Delete</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyRow cols={7} text="No categories found" />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-CATEGORIES
═══════════════════════════════════════════════════════════════════ */

type SubCatForm = { name: string; description: string; sortOrder: number; isActive: boolean };
const EMPTY_SUB: SubCatForm = { name: "", description: "", sortOrder: 0, isActive: true };

function SubCategoriesView({ category, accessToken, onBack }: { category: Category; accessToken: string; onBack: () => void }) {
  const [subs,       setSubs]       = useState<SubCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [editTarget, setEditTarget] = useState<SubCategory | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState<SubCatForm>(EMPTY_SUB);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await adminApi.getSubcategories(category.id, accessToken); setSubs(d.subcategories); }
    catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }, [category.id, accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try { await adminApi.createSubcategory(category.id, { name: form.name, description: form.description, sortOrder: form.sortOrder }, accessToken); load(); setCreating(false); }
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

  const SubForm = () => (
    <div className="space-y-4">
      <Field label="Name *"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Bathroom Cleaning" /></Field>
      <Field label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Short description…" rows={2} /></Field>
      <Field label="Sort Order"><TextInput type="number" value={String(form.sortOrder)} onChange={v => setForm(f => ({ ...f, sortOrder: Number(v) }))} /></Field>
    </div>
  );

  return (
    <div className="space-y-4">
      {creating && (
        <Modal title={`New Sub-category under "${category.name}"`} onClose={() => setCreating(false)}>
          <SubForm />
          <SaveCancelButtons onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} saveLabel="Create" />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit Sub-category" onClose={() => setEditTarget(null)}>
          <SubForm />
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
        <ConfirmDialog title="Delete Sub-category?" body="This sub-category will be permanently deleted." confirmLabel="Delete" saving={saving} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-semibold transition-colors">
          ← Back
        </button>
        <div className="w-px h-4 bg-white/10" />
        <span className="text-white font-bold">{category.name}</span>
        <span className="text-white/30 text-sm">/ Sub-categories</span>
        <div className="flex-1" />
        <button
          onClick={() => { setForm(EMPTY_SUB); setCreating(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
        >
          <Plus size={14} /> Add Sub-category
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-violet-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {["Sub-category", "Image", "Description", "Order", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3">
                      {s.imageUrl
                        ? <img src={s.imageUrl} alt={s.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                        : <span className="text-white/30 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs max-w-[200px] truncate">{s.description ?? "—"}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{s.sortOrder}</td>
                    <td className="px-4 py-3"><Badge label={s.isActive ? "Active" : "Inactive"} color={s.isActive ? "#16A34A" : "#EF4444"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActionBtn variant="edit" onClick={() => { setForm({ name: s.name, description: s.description ?? "", sortOrder: s.sortOrder, isActive: s.isActive }); setEditTarget(s); }}>Edit</ActionBtn>
                        <ActionBtn variant={s.isActive ? "warn" : "green"} onClick={async () => { await adminApi.updateSubcategory(s.id, { isActive: !s.isActive }, accessToken); load(); }}>
                          {s.isActive ? "Deactivate" : "Activate"}
                        </ActionBtn>
                        <ActionBtn variant="danger" onClick={() => setDeleteId(s.id)}>Delete</ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
                {subs.length === 0 && <EmptyRow cols={6} text="No sub-categories yet" />}
              </tbody>
            </table>
          </div>
        )}
      </div>
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

function ReelsView({
  reels, onCreate, onEdit, onDelete, accessToken, onRefresh,
}: {
  reels: ReelRow[];
  onCreate: (d: { title: string; description?: string; videoUrl: string; thumbnailUrl?: string; sortOrder?: number }) => Promise<void>;
  onEdit: (id: string, d: Partial<{ title: string; description: string; videoUrl: string; thumbnailUrl: string; sortOrder: number; isActive: boolean }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  accessToken: string;
  onRefresh: () => void;
}) {
  const [creating,   setCreating]   = useState(false);
  const [editTarget, setEditTarget] = useState<ReelRow | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState<ReelForm>(EMPTY_REEL);
  const [saving,     setSaving]     = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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

  const ReelFormFields = (r: ReelRow | null) => (
    <div className="space-y-4">
      <Field label="Title *"><TextInput value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Quick Kitchen Cleaning" /></Field>
      <Field label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={2} /></Field>
      <Field label="Video URL *">
        <TextInput value={form.videoUrl} onChange={v => setForm(f => ({ ...f, videoUrl: v }))} placeholder="https://…" />
        {r && (
          <div className="mt-2">
            <ImageUploadButton
              label="Or upload video file (MP4/MOV/WebM, max 100MB)"
              currentUrl={undefined}
              onUpload={(file) => handleVideoUpload(r.id, file)}
              disabled={uploadingId === r.id}
            />
          </div>
        )}
      </Field>
      <Field label="Thumbnail URL">
        <TextInput value={form.thumbnailUrl} onChange={v => setForm(f => ({ ...f, thumbnailUrl: v }))} placeholder="https://… (or upload below)" />
        {r && (
          <div className="mt-2">
            <ImageUploadButton
              label="Upload thumbnail"
              currentUrl={r.thumbnailUrl}
              onUpload={(file) => handleThumbUpload(r, file)}
              disabled={uploadingId === r.id + '-thumb'}
            />
          </div>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort Order"><TextInput type="number" value={String(form.sortOrder)} onChange={v => setForm(f => ({ ...f, sortOrder: Number(v) }))} /></Field>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {creating && (
        <Modal title="New Reel" onClose={() => setCreating(false)}>
          {ReelFormFields(null)}
          <SaveCancelButtons onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} saveLabel="Create Reel" />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit Reel" onClose={() => setEditTarget(null)}>
          {ReelFormFields(editTarget)}
          <SaveCancelButtons onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmDialog title="Delete Reel?" body="This reel will be removed from the Customer App." confirmLabel="Delete" saving={saving} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
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
    </div>
  );
}

const BLANK_OFFER: OfferInput = {
  title: "", subtitle: "", tag: "LIMITED OFFER", discountText: "",
  bgColor: "#ff6b35", ctaText: "Book Now", ctaRoute: "/(tabs)/services",
  isActive: true, sortOrder: 0, expiresAt: null,
};

function OffersView({
  offers, onCreate, onEdit, onDelete,
}: {
  offers: OfferRow[];
  onCreate: (d: OfferInput) => Promise<void>;
  onEdit: (id: string, d: Partial<OfferInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm]   = useState(false);
  const [editRow,  setEditRow]    = useState<OfferRow | null>(null);
  const [form,     setForm]       = useState<OfferInput>(BLANK_OFFER);
  const [saving,   setSaving]     = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [formErr,  setFormErr]    = useState("");

  function openCreate() { setForm(BLANK_OFFER); setEditRow(null); setFormErr(""); setShowForm(true); }
  function openEdit(r: OfferRow) {
    setForm({
      title: r.title, subtitle: r.subtitle, tag: r.tag, discountText: r.discountText,
      bgColor: r.bgColor, ctaText: r.ctaText, ctaRoute: r.ctaRoute,
      isActive: r.isActive, sortOrder: r.sortOrder, expiresAt: r.expiresAt,
    });
    setEditRow(r); setFormErr(""); setShowForm(true);
  }

  const setF = (k: keyof OfferInput) => (v: string | boolean | number | null) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) { setFormErr("Title is required."); return; }
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

  return (
    <div className="space-y-4">
      {deleteId && (
        <ConfirmDialog
          title="Delete Offer?"
          body="This offer banner will be permanently removed from the app."
          confirmLabel="Yes, delete"
          saving={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {showForm && (
        <Modal title={editRow ? "Edit Offer" : "Create Offer"} onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            {/* Preview */}
            <div className="rounded-xl p-4 mb-2" style={{ background: form.bgColor || "#ff6b35" }}>
              <p className="text-white/80 text-xs font-bold mb-0.5">{form.tag || "TAG"}</p>
              <p className="text-white font-bold text-sm">{form.title || "Title"}</p>
              {form.discountText && <p className="text-white/90 text-xs">{form.discountText}</p>}
              {form.subtitle && <p className="text-white/70 text-xs mt-0.5">{form.subtitle}</p>}
              <span className="inline-block mt-2 bg-white text-xs font-bold px-3 py-1 rounded-lg" style={{ color: form.bgColor || "#ff6b35" }}>{form.ctaText || "Book Now"}</span>
            </div>

            {[
              { key: "title" as const,        label: "Title *",         ph: "e.g. Get 40% off your first booking!" },
              { key: "subtitle" as const,     label: "Subtitle",        ph: "e.g. Valid for new users" },
              { key: "tag" as const,          label: "Tag Label",       ph: "e.g. LIMITED OFFER" },
              { key: "discountText" as const, label: "Discount Text",   ph: "e.g. 40% OFF" },
              { key: "ctaText" as const,      label: "Button Text",     ph: "e.g. Claim Now" },
              { key: "ctaRoute" as const,     label: "Button Route",    ph: "e.g. /(tabs)/services" },
            ].map(({ key, label, ph }) => (
              <Field key={key} label={label}>
                <TextInput value={String(form[key] ?? "")} onChange={v => setF(key)(v)} placeholder={ph} />
              </Field>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Background Color">
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.bgColor} onChange={e => setF("bgColor")(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                  <TextInput value={form.bgColor} onChange={v => setF("bgColor")(v)} placeholder="#ff6b35" />
                </div>
              </Field>
              <Field label="Sort Order">
                <TextInput value={String(form.sortOrder ?? 0)} onChange={v => setF("sortOrder")(Number(v) || 0)} placeholder="0" />
              </Field>
            </div>

            <Field label="Expires At (optional)">
              <input type="datetime-local"
                value={form.expiresAt ? new Date(form.expiresAt).toISOString().slice(0,16) : ""}
                onChange={e => setF("expiresAt")(e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </Field>

            <button onClick={() => setF("isActive")(!form.isActive)}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
              <div className="w-8 h-4 rounded-full transition-all relative" style={{ background: form.isActive ? "#16A34A" : "rgba(255,255,255,0.15)" }}>
                <div className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 12, height: 12, left: form.isActive ? "calc(100% - 14px)" : 2 }} />
              </div>
              Active (visible in app)
            </button>

            {formErr && <p className="text-red-400 text-xs">{formErr}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
                {saving ? "Saving…" : editRow ? "Update Offer" : "Create Offer"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:bg-white/5">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">{offers.length} offer{offers.length !== 1 ? "s" : ""} total</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
          <Plus size={15} /> Create Offer
        </button>
      </div>

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] p-12 text-center" style={CARD}>
          <Tag size={32} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" />
          <p className="text-white/30 text-sm">No offers yet. Create one to show banners in the customer app.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {["Preview", "Title / Tag", "Discount", "Status", "Sort", "Expires", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {offers.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: r.bgColor }} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{r.title}</p>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide">{r.tag}</p>
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">{r.discountText || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge label={r.isActive ? "Active" : "Inactive"} color={r.isActive ? "#16A34A" : "#6B7280"} />
                    </td>
                    <td className="px-4 py-3 text-white/60">{r.sortOrder}</td>
                    <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                      {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("en-IN") : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <ActionBtn variant="edit"   onClick={() => openEdit(r)}>Edit</ActionBtn>
                        <ActionBtn variant={r.isActive ? "warn" : "green"} onClick={() => onEdit(r.id, { isActive: !r.isActive })}>
                          {r.isActive ? "Deactivate" : "Activate"}
                        </ActionBtn>
                        <ActionBtn variant="danger" onClick={() => setDeleteId(r.id)}>Delete</ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewsView({ reviews, onDelete }: { reviews: ReviewRow[]; onDelete: (id: string) => Promise<void> }) {
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
          body="This review will be permanently removed. The professional's rating may be affected."
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
                    <ActionBtn variant="danger" onClick={() => setDeleteId(r.id)}>Delete</ActionBtn>
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
    if (!window.confirm("Delete this policy? This cannot be undone.")) return;
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

function HelpSupportView({ accessToken }: { accessToken: string }) {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
