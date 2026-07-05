import { useState } from "react";
import {
  MapPin, Star, ChevronRight, Bell, Home, BookOpen,
  Sparkles, TrendingUp, DollarSign, Search, Clock, MessageSquare,
  BarChart2, Users, Settings, ChevronDown, Package, Filter,
  CheckCircle, XCircle, Wallet, Award, FileText, Eye, Ban, RefreshCw,
  PlusCircle, Percent, Activity, ArrowUpRight, ArrowDownRight,
  AlertCircle, Phone, Navigation,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   ADMIN PANEL  (tablet-wide layout)
═══════════════════════════════════════════════════════════════════ */

const ALL_BOOKINGS = [
  { id: "UC91030", customer: "Rohan Gupta",  service: "Cleaning",   pro: "Priya Sharma", date: "Jul 3, 3:00 PM",  amount: "₹399", status: "Upcoming"   },
  { id: "UC91029", customer: "Anita Desai",  service: "Electrical", pro: "Rajan Verma",  date: "Jul 3, 11:00 AM", amount: "₹249", status: "Ongoing"    },
  { id: "UC91028", customer: "Vikram Nair",  service: "Salon",      pro: "Meena Pillai", date: "Jul 2, 5:00 PM",  amount: "₹599", status: "Completed"  },
  { id: "UC91027", customer: "Sunita Reddy", service: "Plumbing",   pro: "Arun Pillai",  date: "Jul 2, 2:00 PM",  amount: "₹350", status: "Cancelled"  },
  { id: "UC91026", customer: "Deepa Iyer",   service: "AC Repair",  pro: "Suresh Kumar", date: "Jul 1, 10:00 AM", amount: "₹450", status: "Completed"  },
];

const ALL_PROS = [
  { name: "Priya Sharma", service: "Cleaning",   rating: 4.9, jobs: 312, status: "Active",   earnings: "₹62,400", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&auto=format" },
  { name: "Rajan Verma",  service: "Electrical", rating: 4.8, jobs: 189, status: "Active",   earnings: "₹47,250", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&auto=format" },
  { name: "Meena Pillai", service: "Salon",      rating: 4.9, jobs: 447, status: "Active",   earnings: "₹89,300", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&auto=format" },
  { name: "Arun Pillai",  service: "Plumbing",   rating: 4.5, jobs: 98,  status: "Suspended",earnings: "₹24,500", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&auto=format" },
];

const ADMIN_SIDEBAR = [
  { id: "dashboard", icon: Home,      label: "Dashboard"     },
  { id: "bookings",  icon: BookOpen,  label: "Bookings"      },
  { id: "pros",      icon: Users,     label: "Professionals" },
  { id: "analytics", icon: BarChart2, label: "Analytics"     },
  { id: "settings",  icon: Settings,  label: "Settings"      },
];

function AdminPanel() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen]     = useState(true);

  return (
    <div
      className="flex overflow-hidden rounded-3xl shadow-2xl border border-white/10"
      style={{ width: 900, height: 680, background: "#0f1117" }}
    >
      {/* Sidebar */}
      <div
        className="flex flex-col border-r border-white/[0.08] transition-all"
        style={{ width: sidebarOpen ? 200 : 64, background: "#161B27" }}
      >
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3 border-b border-white/[0.08]">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            <Sparkles size={16} color="white" />
          </div>
          {sidebarOpen && <span className="text-white font-bold text-sm whitespace-nowrap">UrbanClap</span>}
        </div>

        {/* Nav */}
        <div className="flex-1 py-3 flex flex-col gap-1 px-2">
          {ADMIN_SIDEBAR.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                style={{ background: active ? "rgba(91,62,245,0.2)" : "transparent", color: active ? "#7C5BF8" : "rgba(255,255,255,0.45)" }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {sidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Bottom */}
        <div className="p-3 border-t border-white/[0.08]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <ChevronRight size={18} style={{ transform: sidebarOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            {sidebarOpen && <span className="text-xs font-medium">Collapse</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0f1117" }}>
        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div>
            <h1 className="text-white font-bold text-base capitalize">{activeSection === "pros" ? "Professionals" : activeSection}</h1>
            <p className="text-white/40 text-xs">Urban Company Admin · July 3, 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <Bell size={16} color="rgba(255,255,255,0.6)" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "#FF6B35" }} />
            </button>
            <div className="flex items-center gap-2">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format" alt="Admin" className="w-8 h-8 rounded-xl object-cover" />
              <div className="hidden sm:block"><p className="text-white text-xs font-bold">Vikash Singh</p><p className="text-white/40 text-[10px]">Super Admin</p></div>
            </div>
          </div>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "none" }}>
          {activeSection === "dashboard" && <AdminDashboard />}
          {activeSection === "bookings"  && <AdminBookings />}
          {activeSection === "pros"      && <AdminPros />}
          {activeSection === "analytics" && <AdminAnalytics />}
          {activeSection === "settings"  && <AdminSettings />}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const kpis = [
    { label: "Total Bookings", val: "12,847", delta: "+8.2%", up: true,  icon: BookOpen,  color: "#5B3EF5", bg: "rgba(91,62,245,0.15)" },
    { label: "Gross Revenue",  val: "₹51.4L", delta: "+12.4%",up: true,  icon: DollarSign,color: "#16A34A", bg: "rgba(22,163,74,0.15)"  },
    { label: "Active Pros",    val: "2,341",  delta: "+3.1%", up: true,  icon: Users,     color: "#E65100", bg: "rgba(230,81,0,0.15)"   },
    { label: "Cancellation",   val: "4.2%",   delta: "-0.8%", up: false, icon: XCircle,   color: "#DB2777", bg: "rgba(219,39,119,0.15)" },
  ];
  return (
    <div className="flex flex-col gap-5">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl p-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.bg }}><Icon size={16} color={k.color} /></div>
                <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: k.up ? "#4ADE80" : "#F87171" }}>
                  {k.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{k.delta}
                </span>
              </div>
              <p className="text-white text-xl font-bold">{k.val}</p>
              <p className="text-white/40 text-xs mt-0.5">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Revenue chart */}
        <div className="col-span-3 rounded-2xl p-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">Revenue Trend</h3>
            <select className="text-xs font-semibold rounded-lg px-2 py-1 border border-white/10 outline-none" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              <option>Last 7 days</option><option>Last 30 days</option>
            </select>
          </div>
          <div className="flex gap-1.5 items-end h-28">
            {[35,60,45,75,55,90,70,85,65,80,50,95,75,100].map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 13 ? "#5B3EF5" : "rgba(91,62,245,0.3)", minWidth: 0 }} />
            ))}
          </div>
        </div>

        {/* Service breakdown */}
        <div className="col-span-2 rounded-2xl p-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
          <h3 className="text-white font-bold text-sm mb-4">Top Services</h3>
          <div className="flex flex-col gap-3">
            {[{ label: "Cleaning", pct: 34, color: "#5B3EF5" }, { label: "Salon", pct: 28, color: "#DB2777" }, { label: "Electrical", pct: 18, color: "#16A34A" }, { label: "Plumbing", pct: 12, color: "#D97706" }, { label: "Other", pct: 8, color: "#6B7280" }].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1"><span className="text-white/70 text-xs">{s.label}</span><span className="text-white text-xs font-bold">{s.pct}%</span></div>
                <div className="h-1.5 bg-white/10 rounded-full"><div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07]">
          <h3 className="text-white font-bold text-sm">Recent Bookings</h3>
          <button className="text-xs font-semibold" style={{ color: "#7C5BF8" }}>View all</button>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-white/[0.06]">
            {["ID","Customer","Service","Professional","Date","Amount","Status"].map((h) => <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {ALL_BOOKINGS.map((b) => {
              const sc: Record<string, [string,string]> = { Upcoming: ["#EDE9FD","#7C5BF8"], Ongoing: ["rgba(255,143,0,0.2)","#FF8F00"], Completed: ["rgba(22,163,74,0.2)","#4ADE80"], Cancelled: ["rgba(239,68,68,0.2)","#F87171"] };
              const [bg, fg] = sc[b.status] || ["#F3F4F6","#6B7280"];
              return (
                <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "#7C5BF8" }}>{b.id}</td>
                  <td className="px-4 py-2.5 text-xs text-white/80 font-medium">{b.customer}</td>
                  <td className="px-4 py-2.5 text-xs text-white/60">{b.service}</td>
                  <td className="px-4 py-2.5 text-xs text-white/60">{b.pro}</td>
                  <td className="px-4 py-2.5 text-xs text-white/50">{b.date}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-white">{b.amount}</td>
                  <td className="px-4 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color: fg }}>{b.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminBookings() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const statuses = ["All","Upcoming","Ongoing","Completed","Cancelled"];
  const filtered = ALL_BOOKINGS.filter((b) =>
    (statusFilter === "All" || b.status === statusFilter) &&
    (b.customer.toLowerCase().includes(search.toLowerCase()) || b.service.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 border border-white/10" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Search size={15} color="rgba(255,255,255,0.3)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bookings..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30" />
        </div>
        <div className="flex gap-1.5">
          {statuses.map((s) => <button key={s} onClick={() => setStatusFilter(s)} className="px-3 py-2 rounded-lg text-xs font-bold transition-all" style={{ background: statusFilter === s ? "#5B3EF5" : "rgba(255,255,255,0.06)", color: statusFilter === s ? "#fff" : "rgba(255,255,255,0.4)" }}>{s}</button>)}
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <table className="w-full">
          <thead><tr className="border-b border-white/[0.07]">
            {["ID","Customer","Service","Professional","Date","Amount","Status","Actions"].map((h) => <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((b) => {
              const sc: Record<string, [string,string]> = { Upcoming: ["rgba(91,62,245,0.2)","#7C5BF8"], Ongoing: ["rgba(255,143,0,0.2)","#FF8F00"], Completed: ["rgba(22,163,74,0.2)","#4ADE80"], Cancelled: ["rgba(239,68,68,0.2)","#F87171"] };
              const [bg, fg] = sc[b.status] || ["rgba(107,114,128,0.2)","#9CA3AF"];
              return (
                <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "#7C5BF8" }}>{b.id}</td>
                  <td className="px-4 py-3 text-xs text-white/80 font-medium">{b.customer}</td>
                  <td className="px-4 py-3 text-xs text-white/60">{b.service}</td>
                  <td className="px-4 py-3 text-xs text-white/60">{b.pro}</td>
                  <td className="px-4 py-3 text-xs text-white/50">{b.date}</td>
                  <td className="px-4 py-3 text-xs font-bold text-white">{b.amount}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color: fg }}>{b.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button title="View"><Eye size={13} color="rgba(255,255,255,0.4)" /></button>
                      <button title="Reassign"><RefreshCw size={13} color="rgba(255,255,255,0.4)" /></button>
                      {b.status !== "Cancelled" && <button title="Cancel"><Ban size={13} color="#F87171" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-white/30 text-sm">No bookings found</div>}
      </div>
    </div>
  );
}

function AdminPros() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border border-white/10" style={{ background: "rgba(255,255,255,0.06)", width: 260 }}>
          <Search size={15} color="rgba(255,255,255,0.3)" />
          <input placeholder="Search professionals..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: "#5B3EF5" }}><PlusCircle size={14} />Add Professional</button>
      </div>
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <table className="w-full">
          <thead><tr className="border-b border-white/[0.07]">
            {["Professional","Service","Rating","Jobs","Earnings","Status","Actions"].map((h) => <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {ALL_PROS.map((p) => (
              <tr key={p.name} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <img src={p.img} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-white/60">{p.service}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1"><Star size={11} fill="#FBBF24" color="#FBBF24" /><span className="text-xs font-bold text-white">{p.rating}</span></div></td>
                <td className="px-4 py-3 text-xs text-white/60">{p.jobs}</td>
                <td className="px-4 py-3 text-xs font-bold text-white">{p.earnings}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.status === "Active" ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.15)", color: p.status === "Active" ? "#4ADE80" : "#F87171" }}>{p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button title="View"><Eye size={13} color="rgba(255,255,255,0.4)" /></button>
                    <button title="Suspend/Activate">{p.status === "Active" ? <Ban size={13} color="#F87171" /> : <CheckCircle size={13} color="#4ADE80" />}</button>
                    <button title="Message"><MessageSquare size={13} color="rgba(255,255,255,0.4)" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAnalytics() {
  const metrics = [
    { label: "Avg Booking Value",  val: "₹412",   delta: "+5.2%",  up: true  },
    { label: "Customer Retention", val: "68.4%",   delta: "+2.1%",  up: true  },
    { label: "Pro Utilisation",    val: "74.2%",   delta: "-1.4%",  up: false },
    { label: "Avg Rating",         val: "4.78",    delta: "+0.03",  up: true  },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl p-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-white/40 text-xs mb-2">{m.label}</p>
            <p className="text-white text-2xl font-bold">{m.val}</p>
            <span className="text-xs font-bold flex items-center gap-0.5 mt-1" style={{ color: m.up ? "#4ADE80" : "#F87171" }}>
              {m.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{m.delta} vs last month
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
          <h3 className="text-white font-bold text-sm mb-4">Bookings by City</h3>
          {[{ city: "Mumbai", pct: 38 }, { city: "Delhi", pct: 25 }, { city: "Bangalore", pct: 18 }, { city: "Hyderabad", pct: 11 }, { city: "Chennai", pct: 8 }].map((c) => (
            <div key={c.city} className="mb-3">
              <div className="flex justify-between mb-1"><span className="text-white/60 text-xs">{c.city}</span><span className="text-white text-xs font-bold">{c.pct}%</span></div>
              <div className="h-1.5 bg-white/10 rounded-full"><div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: "linear-gradient(90deg,#5B3EF5,#7C5BF8)" }} /></div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
          <h3 className="text-white font-bold text-sm mb-4">Monthly Revenue</h3>
          <div className="flex gap-1 items-end h-32">
            {[65,70,55,80,60,90,75,85,70,95,80,100].map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 11 ? "#5B3EF5" : "rgba(91,62,245,0.3)" }} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {["J","F","M","A","M","J","J","A","S","O","N","D"].map((m) => <span key={m} className="flex-1 text-center text-[9px] text-white/30">{m}</span>)}
          </div>
        </div>
      </div>
      <div className="rounded-2xl p-4 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
        <h3 className="text-white font-bold text-sm mb-3">Platform Health</h3>
        <div className="grid grid-cols-4 gap-4">
          {[{ label: "New Customers/day", val: "284", icon: Users, color: "#5B3EF5" }, { label: "New Pros/week", val: "42", icon: Award, color: "#E65100" }, { label: "Avg Response Time", val: "4.2 min", icon: Clock, color: "#16A34A" }, { label: "Dispute Rate", val: "1.8%", icon: AlertCircle, color: "#DB2777" }].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color + "22" }}><Icon size={16} color={s.color} /></div>
                <div><p className="text-white font-bold text-sm">{s.val}</p><p className="text-white/40 text-[10px]">{s.label}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminSettings() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: "Commission Rate", desc: "Set platform commission percentage", icon: Percent, val: "18%",  color: "#5B3EF5" },
          { title: "Promo Codes",     desc: "Active discount campaigns",          icon: Activity,val: "3 active", color: "#E65100" },
          { title: "Service Areas",   desc: "Manage operational cities",          icon: MapPin,  val: "12 cities", color: "#16A34A" },
          { title: "Notifications",   desc: "Push & email alert settings",        icon: Bell,    val: "Enabled",color: "#DB2777" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="rounded-2xl p-4 border border-white/[0.07] flex items-start gap-4 cursor-pointer hover:bg-white/[0.03] transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color + "20" }}><Icon size={18} color={s.color} /></div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">{s.title}</h4>
                <p className="text-white/40 text-xs mt-0.5">{s.desc}</p>
                <p className="text-xs font-bold mt-2" style={{ color: s.color }}>{s.val}</p>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl p-5 border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.04)" }}>
        <h3 className="text-white font-bold text-sm mb-4">Admin Users</h3>
        {[
          { name: "Vikash Singh", role: "Super Admin", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format" },
          { name: "Kavita Rao",   role: "Operations",  img: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=60&h=60&fit=crop&auto=format" },
          { name: "Amit Sharma",  role: "Finance",     img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&auto=format" },
        ].map((u) => (
          <div key={u.name} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
            <div className="flex items-center gap-3">
              <img src={u.img} alt={u.name} className="w-8 h-8 rounded-lg object-cover" />
              <div><p className="text-white text-sm font-semibold">{u.name}</p><p className="text-white/40 text-xs">{u.role}</p></div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-white/50">Edit</button>
              {u.role !== "Super Admin" && <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-400/20">Remove</button>}
            </div>
          </div>
        ))}
        <button className="mt-3 flex items-center gap-2 text-xs font-bold" style={{ color: "#5B3EF5" }}><PlusCircle size={14} />Add Admin User</button>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0f1117" }}>
      <AdminPanel />
    </div>
  );
}
