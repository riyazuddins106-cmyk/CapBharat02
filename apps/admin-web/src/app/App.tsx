import { useState, useEffect, useCallback } from "react";
import {
  MapPin, Star, ChevronRight, Bell, Home, BookOpen,
  Sparkles, TrendingUp, DollarSign, Search, Clock,
  BarChart2, Users, Settings, ChevronDown, Package, Filter,
  CheckCircle, XCircle, Wallet, Award, FileText, Eye, Ban, RefreshCw,
  PlusCircle, Percent, Activity, ArrowUpRight, ArrowDownRight,
  AlertCircle, Phone, Navigation, LogOut, Loader2,
} from "lucide-react";
import { adminAuth, authApi, adminApi } from "@/lib/api";
import type { AdminUser, Booking, Professional, DashboardStats } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════════════════ */

function LoginPage({ onLogin }: { onLogin: (user: AdminUser, access: string, refresh: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      adminAuth.store(data.accessToken, data.refreshToken, data.user);
      onLogin(data.user, data.accessToken, data.refreshToken);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0f1117" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
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
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@servenow.in"
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
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
   ADMIN PANEL  (tablet-wide layout — now with live data)
═══════════════════════════════════════════════════════════════════ */

const ADMIN_SIDEBAR = [
  { id: "dashboard", icon: Home,      label: "Dashboard"     },
  { id: "bookings",  icon: BookOpen,  label: "Bookings"      },
  { id: "pros",      icon: Users,     label: "Professionals" },
  { id: "analytics", icon: BarChart2, label: "Analytics"     },
  { id: "settings",  icon: Settings,  label: "Settings"      },
];

const STATUS_COLOR: Record<string, string> = {
  upcoming:    "#5B3EF5",
  in_progress: "#F59E0B",
  completed:   "#16A34A",
  cancelled:   "#EF4444",
  pending:     "#6B7280",
};

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function AdminPanel({ user, accessToken, onLogout }: { user: AdminUser; accessToken: string; onLogout: () => void }) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const [proList, setProList]   = useState<Professional[]>([]);
  const [loading, setLoading]   = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, p] = await Promise.all([
        adminApi.getStats(accessToken),
        adminApi.getBookings(accessToken),
        adminApi.getProfessionals(accessToken),
      ]);
      setStats(s);
      setBookingList(b.bookings as any);
      setProList(p.professionals as any);
    } catch (err: any) {
      console.error("Admin load error:", err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const togglePro = async (id: string, active: boolean) => {
    try {
      if (active) await adminApi.suspendProfessional(id, accessToken);
      else await adminApi.activateProfessional(id, accessToken);
      setActionMsg(active ? "Professional suspended" : "Professional activated");
      setTimeout(() => setActionMsg(null), 3000);
      load();
    } catch (err: any) {
      setActionMsg(err.message);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0f1117" }}>
      {/* Toast */}
      {actionMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm text-white border border-white/10 shadow-xl" style={{ background: "#1e2535" }}>
          {actionMsg}
        </div>
      )}

      <div
        className="flex overflow-hidden rounded-3xl shadow-2xl border border-white/10"
        style={{ width: 940, minHeight: 680, background: "#0f1117" }}
      >
        {/* Sidebar */}
        <div
          className="flex flex-col border-r border-white/[0.08] transition-all flex-shrink-0"
          style={{ width: sidebarOpen ? 200 : 64, background: "#161B27" }}
        >
          <div className="px-4 py-5 flex items-center gap-3 border-b border-white/[0.08]">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
              onClick={() => setSidebarOpen(v => !v)}
            >
              <Sparkles size={16} color="white" />
            </div>
            {sidebarOpen && <span className="text-white font-bold text-sm whitespace-nowrap">ServeNow Admin</span>}
          </div>

          <div className="flex-1 py-3 flex flex-col gap-1 px-2">
            {ADMIN_SIDEBAR.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                  style={{
                    background: active ? "rgba(91,62,245,0.15)" : "transparent",
                    color: active ? "#7C5BF8" : "rgba(255,255,255,0.45)",
                  }}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-semibold">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* User + Logout */}
          <div className="p-3 border-t border-white/[0.08]">
            {sidebarOpen && (
              <div className="flex items-center gap-2 mb-2 px-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "#5B3EF5" }}>
                  {user.fullName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{user.fullName}</p>
                  <p className="text-white/30 text-[10px] truncate">{user.email}</p>
                </div>
              </div>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl w-full text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <LogOut size={16} className="flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-semibold">Sign out</span>}
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
            <div>
              <h1 className="text-white font-bold text-base capitalize">{activeSection}</h1>
              <p className="text-white/30 text-xs">ServeNow Admin Panel</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={load}
                className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors"
              >
                <RefreshCw size={14} color="rgba(255,255,255,0.5)" />
              </button>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors">
                <Bell size={14} color="rgba(255,255,255,0.5)" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 size={32} className="animate-spin text-violet-500" />
              </div>
            ) : activeSection === "dashboard" ? (
              <DashboardView stats={stats} bookings={bookingList} pros={proList} />
            ) : activeSection === "bookings" ? (
              <BookingsView bookings={bookingList} />
            ) : activeSection === "pros" ? (
              <ProsView pros={proList} onToggle={togglePro} />
            ) : activeSection === "analytics" ? (
              <AnalyticsView stats={stats} />
            ) : (
              <SettingsView user={user} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────────── */
function DashboardView({ stats, bookings, pros }: { stats: DashboardStats | null; bookings: Booking[]; pros: Professional[] }) {
  const cards = [
    { label: "Total Bookings",   value: stats?.totalBookings ?? 0,    icon: BookOpen,   color: "#5B3EF5", suffix: "" },
    { label: "Active Bookings",  value: stats?.activeBookings ?? 0,   icon: Clock,      color: "#F59E0B", suffix: "" },
    { label: "Professionals",    value: stats?.totalProfessionals ?? 0,icon: Users,      color: "#16A34A", suffix: "" },
    { label: "Total Revenue",    value: stats?.totalRevenue ?? 0,     icon: DollarSign, color: "#DB2777", suffix: "₹", money: true },
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl p-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs">{c.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: c.color + "20" }}>
                  <Icon size={14} color={c.color} />
                </div>
              </div>
              <p className="text-white font-bold text-2xl">
                {c.money ? `₹${(c.value as number).toLocaleString("en-IN")}` : c.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <h3 className="text-white font-bold text-sm">Recent Bookings</h3>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {bookings.slice(0, 5).map((b: any) => (
            <div key={b.id} className="px-5 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{b.serviceName}</p>
                <p className="text-white/40 text-xs">{b.customerName ?? "Customer"}</p>
              </div>
              <p className="text-white/60 text-xs">{b.proName}</p>
              <p className="text-white/60 text-xs">{fmt(b.price)}</p>
              <span
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize"
                style={{
                  background: (STATUS_COLOR[b.status] ?? "#6B7280") + "20",
                  color: STATUS_COLOR[b.status] ?? "#6B7280",
                }}
              >
                {b.status.replace("_", " ")}
              </span>
            </div>
          ))}
          {bookings.length === 0 && (
            <p className="px-5 py-6 text-white/30 text-sm text-center">No bookings yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Bookings ─────────────────────────────────────────────────── */
function BookingsView({ bookings }: { bookings: Booking[] }) {
  const [search, setSearch] = useState("");
  const filtered = (bookings as any[]).filter(b =>
    b.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
    b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    b.proName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search bookings…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {["Service", "Customer", "Professional", "Amount", "Scheduled", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map((b: any) => (
              <tr key={b.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white font-medium">{b.serviceName}</td>
                <td className="px-4 py-3 text-white/60">{b.customerName ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{b.proName}</td>
                <td className="px-4 py-3 text-white/80">{fmt(b.price)}</td>
                <td className="px-4 py-3 text-white/40 text-xs">{new Date(b.scheduledAt).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize"
                    style={{
                      background: (STATUS_COLOR[b.status] ?? "#6B7280") + "20",
                      color: STATUS_COLOR[b.status] ?? "#6B7280",
                    }}
                  >
                    {b.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-white/30 text-center">No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Professionals ────────────────────────────────────────────── */
function ProsView({ pros, onToggle }: { pros: Professional[]; onToggle: (id: string, active: boolean) => void }) {
  const [search, setSearch] = useState("");
  const filtered = (pros as any[]).filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoryName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search professionals…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {["Professional", "Category", "Rating", "Price", "Status", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map((p: any) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "#5B3EF5" }}>
                        {p.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-semibold text-sm">{p.name}</p>
                      <p className="text-white/40 text-xs">{p.title}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/60">{p.categoryName ?? "—"}</td>
                <td className="px-4 py-3 text-white/80">⭐ {p.rating?.toFixed(1)}</td>
                <td className="px-4 py-3 text-white/80">{fmt(p.basePrice)}</td>
                <td className="px-4 py-3">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={p.isActive
                      ? { background: "#16A34A20", color: "#16A34A" }
                      : { background: "#EF444420", color: "#EF4444" }}
                  >
                    {p.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggle(p.id, p.isActive)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors"
                    style={p.isActive
                      ? { borderColor: "rgba(239,68,68,0.3)", color: "#EF4444" }
                      : { borderColor: "rgba(22,163,74,0.3)", color: "#16A34A" }}
                  >
                    {p.isActive ? "Suspend" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-white/30 text-center">No professionals found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Analytics ────────────────────────────────────────────────── */
function AnalyticsView({ stats }: { stats: DashboardStats | null }) {
  const items = [
    { label: "Total Revenue",       value: stats ? fmt(stats.totalRevenue) : "—",   icon: DollarSign, color: "#5B3EF5" },
    { label: "Total Bookings",      value: String(stats?.totalBookings ?? 0),        icon: BookOpen,   color: "#F59E0B" },
    { label: "Active Bookings",     value: String(stats?.activeBookings ?? 0),       icon: Activity,   color: "#16A34A" },
    { label: "Total Professionals", value: String(stats?.totalProfessionals ?? 0),   icon: Users,      color: "#DB2777" },
    { label: "Total Customers",     value: String(stats?.totalCustomers ?? 0),       icon: Users,      color: "#0EA5E9" },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((i) => {
        const Icon = i.icon;
        return (
          <div key={i.label} className="rounded-2xl p-5 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
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

/* ── Settings ─────────────────────────────────────────────────── */
function SettingsView({ user }: { user: AdminUser }) {
  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
        <h3 className="text-white font-bold text-sm mb-4">Account Info</h3>
        <div className="space-y-3">
          <div>
            <p className="text-white/40 text-xs mb-0.5">Full Name</p>
            <p className="text-white text-sm">{user.fullName}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-0.5">Email</p>
            <p className="text-white text-sm">{user.email}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-0.5">Role</p>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: "#5B3EF520", color: "#5B3EF5" }}>
              {user.role?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT — handles auth session
═══════════════════════════════════════════════════════════════════ */

export default function App() {
  const [user, setUser]         = useState<AdminUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const stored = adminAuth.getUser();
      const storedAccess = adminAuth.getToken();
      const storedRefresh = adminAuth.getRefreshToken();

      if (storedRefresh) {
        try {
          const data = await authApi.refresh(storedRefresh);
          adminAuth.store(data.accessToken, data.refreshToken, data.user);
          setUser(data.user);
          setAccessToken(data.accessToken);
          setRefreshToken(data.refreshToken);
        } catch {
          adminAuth.clear();
        }
      }
      setChecking(false);
    })();
  }, []);

  const handleLogin = (u: AdminUser, access: string, refresh: string) => {
    setUser(u);
    setAccessToken(access);
    setRefreshToken(refresh);
  };

  const handleLogout = async () => {
    if (refreshToken && accessToken) {
      await authApi.logout(refreshToken, accessToken);
    }
    adminAuth.clear();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f1117" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "#5B3EF5" }} />
      </div>
    );
  }

  if (!user || !accessToken) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <AdminPanel user={user} accessToken={accessToken} onLogout={handleLogout} />;
}
