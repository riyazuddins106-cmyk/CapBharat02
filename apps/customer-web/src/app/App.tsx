import { useState } from "react";
import {
  Search, MapPin, Star, ChevronRight, Bell, Heart, Home, Grid, BookOpen,
  User, Clock, Shield, Sparkles, Wrench, Scissors, Zap, Droplets, Paintbrush,
  Wind, ChevronLeft, X, Check, Calendar, ArrowRight, TrendingUp, DollarSign,
  ToggleLeft, ToggleRight, Navigation, Phone, MessageSquare, AlertCircle,
  BarChart2, Users, Settings, LogOut, ChevronDown, Package, Filter,
  CheckCircle, XCircle, Wallet, Award, FileText, Eye, Ban, RefreshCw,
  PlusCircle, Percent, Activity, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

/* ─────────────────────────── Shared Data ─────────────────────────── */

const SERVICES = [
  { icon: Sparkles, label: "Cleaning",   color: "#EDE9FD", iconColor: "#5B3EF5", count: "120+" },
  { icon: Wrench,   label: "Plumbing",   color: "#FEF3C7", iconColor: "#D97706", count: "85+"  },
  { icon: Zap,      label: "Electrical", color: "#DCFCE7", iconColor: "#16A34A", count: "94+"  },
  { icon: Scissors, label: "Salon",      color: "#FCE7F3", iconColor: "#DB2777", count: "200+" },
  { icon: Paintbrush,label:"Painting",   color: "#DBEAFE", iconColor: "#2563EB", count: "62+"  },
  { icon: Wind,     label: "AC Repair",  color: "#FFF7ED", iconColor: "#EA580C", count: "78+"  },
  { icon: Droplets, label: "Laundry",    color: "#F0FDF4", iconColor: "#15803D", count: "55+"  },
  { icon: Grid,     label: "More",       color: "#F3F4F6", iconColor: "#6B7280", count: "500+" },
];

const FEATURED = [
  { id: 1, name: "Priya Sharma",  role: "Home Cleaning Expert", rating: 4.9, reviews: 312, price: "₹399", unit: "/visit",   badge: "Top Rated", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&auto=format", tags: ["Deep Clean","Sanitize"] },
  { id: 2, name: "Rajan Verma",   role: "Certified Electrician",  rating: 4.8, reviews: 189, price: "₹249", unit: "/hr",      badge: "Verified",  img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&auto=format", tags: ["Wiring","Fixtures"] },
  { id: 3, name: "Meena Pillai",  role: "Beauty & Salon Pro",    rating: 4.9, reviews: 447, price: "₹599", unit: "/session", badge: "Top Rated", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&auto=format", tags: ["Hair","Facial"] },
];

const CUSTOMER_BOOKINGS = [
  { service: "Home Cleaning", pro: "Priya Sharma", date: "Today, 3:00 PM",       status: "Upcoming"  },
  { service: "AC Repair",     pro: "Suresh Kumar", date: "Yesterday, 11:00 AM",  status: "Completed" },
];

/* ─────────────────────────── Root App ─────────────────────────── */

type AppMode = "customer" | "partner" | "admin";

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>("customer");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-8 gap-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#0f1117" }}
    >
      {/* App switcher */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 bg-white/10 rounded-2xl p-1">
          {([
            { id: "customer", label: "Customer App",  emoji: "🧑‍💼" },
            { id: "partner",  label: "Partner App",   emoji: "🔧" },
            { id: "admin",    label: "Admin Panel",   emoji: "⚙️" },
          ] as { id: AppMode; label: string; emoji: string }[]).map((m) => (
            <button
              key={m.id}
              onClick={() => setAppMode(m.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: appMode === m.id ? "#5B3EF5" : "transparent",
                color: appMode === m.id ? "#fff" : "rgba(255,255,255,0.5)",
              }}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <p className="text-white/30 text-xs">Tap to switch between app views</p>
      </div>

      {/* Rendered view */}
      {appMode === "customer" && <CustomerApp />}
      {appMode === "partner"  && <PartnerApp />}
      {appMode === "admin"    && <AdminPanel />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER APP
═══════════════════════════════════════════════════════════════════ */

const CUST_TABS = [
  { id: "home",     icon: Home,     label: "Home"     },
  { id: "services", icon: Grid,     label: "Services" },
  { id: "bookings", icon: BookOpen, label: "Bookings" },
  { id: "profile",  icon: User,     label: "Profile"  },
];

function CustomerApp() {
  const [activeTab, setActiveTab]           = useState("home");
  const [wishlist, setWishlist]             = useState<number[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen]       = useState(false);
  const [bookingPro, setBookingPro]         = useState<typeof FEATURED[0] | null>(null);
  const [bookingStep, setBookingStep]       = useState(1);
  const [selectedDate, setSelectedDate]     = useState("Today");
  const [selectedTime, setSelectedTime]     = useState("3:00 PM");

  const toggleWishlist = (id: number) =>
    setWishlist((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const openBooking = (pro: typeof FEATURED[0]) => {
    setBookingPro(pro); setBookingStep(1); setBookingOpen(true);
  };

  return (
    <PhoneFrame statusDark>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {activeTab === "home"     && <CustHome wishlist={wishlist} toggleWishlist={toggleWishlist} openBooking={openBooking} />}
        {activeTab === "services" && <CustServices selected={selectedService} setSelected={setSelectedService} openBooking={openBooking} />}
        {activeTab === "bookings" && <CustBookings />}
        {activeTab === "profile"  && <CustProfile />}
      </div>
      <div className="bg-white border-t border-black/[0.08] flex items-center justify-around px-2 pb-4 pt-2 z-20">
        {CUST_TABS.map((tab) => {
          const Icon  = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex flex-col items-center gap-0.5 px-4 py-1">
              <div className="p-1.5 rounded-xl" style={{ background: active ? "#EDE9FD" : "transparent" }}>
                <Icon size={20} color={active ? "#5B3EF5" : "#9CA3AF"} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: active ? "#5B3EF5" : "#9CA3AF" }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {bookingOpen && bookingPro && (
        <BookingModal
          pro={bookingPro} step={bookingStep} setStep={setBookingStep}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          selectedTime={selectedTime} setSelectedTime={setSelectedTime}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </PhoneFrame>
  );
}

function CustHome({ wishlist, toggleWishlist, openBooking }: { wishlist: number[]; toggleWishlist: (id: number) => void; openBooking: (pro: typeof FEATURED[0]) => void }) {
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-2 pb-4" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-medium mb-0.5">Good morning 👋</p>
            <h1 className="text-white text-xl font-bold">Arjun Mehta</h1>
          </div>
          <button className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bell size={18} color="white" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-400 rounded-full border border-white" />
          </button>
        </div>
        <div className="flex items-center gap-1 mb-4">
          <MapPin size={14} color="rgba(255,255,255,0.8)" />
          <span className="text-white/80 text-xs font-medium">Bandra West, Mumbai</span>
          <ChevronRight size={14} color="rgba(255,255,255,0.6)" />
        </div>
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-3 shadow-lg">
          <Search size={18} color="#9CA3AF" />
          <span className="text-sm text-gray-400">Search for a service...</span>
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(120deg,#ff6b35,#f7931e)" }}>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-white/80 text-xs font-semibold mb-1">LIMITED OFFER</p>
            <h3 className="text-white font-bold text-base leading-tight">Get 40% off your<br />first booking!</h3>
            <button className="mt-2 bg-white rounded-lg px-3 py-1.5 text-xs font-bold" style={{ color: "#ff6b35" }}>Claim Now</button>
          </div>
          <div className="text-5xl">🛁</div>
        </div>
      </div>

      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Our Services</h2>
          <button className="text-xs font-semibold" style={{ color: "#5B3EF5" }}>See all</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {SERVICES.map((s) => { const Icon = s.icon; return (
            <button key={s.label} className="flex flex-col items-center gap-1.5 group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: s.color }}>
                <Icon size={22} color={s.iconColor} />
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{s.label}</span>
            </button>
          ); })}
        </div>
      </div>

      <div className="mt-5 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Top Professionals</h2>
          <button className="text-xs font-semibold" style={{ color: "#5B3EF5" }}>View all</button>
        </div>
        <div className="flex flex-col gap-4">
          {FEATURED.map((pro) => (
            <ProCard key={pro.id} pro={pro} wishlisted={wishlist.includes(pro.id)} onWishlist={() => toggleWishlist(pro.id)} onBook={() => openBooking(pro)} />
          ))}
        </div>
      </div>

      <div className="mx-5 mt-5 mb-6 rounded-2xl bg-white border border-black/[0.08] p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Why choose us?</h3>
        <div className="flex justify-between">
          {[{ icon: Shield, label: "Verified Pros", sub: "Background checked" }, { icon: Clock, label: "On Time", sub: "Punctual service" }, { icon: Star, label: "5-Star Rated", sub: "Avg 4.8 rating" }].map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="flex flex-col items-center text-center gap-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EDE9FD" }}><Icon size={16} color="#5B3EF5" /></div>
                <span className="text-[11px] font-bold text-foreground">{t.label}</span>
                <span className="text-[10px] text-gray-400">{t.sub}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProCard({ pro, wishlisted, onWishlist, onBook }: { pro: typeof FEATURED[0]; wishlisted: boolean; onWishlist: () => void; onBook: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="relative flex-shrink-0">
          <img src={pro.img} alt={pro.name} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
          <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: pro.badge === "Top Rated" ? "#5B3EF5" : "#16A34A" }}>{pro.badge}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div><h4 className="text-sm font-bold text-foreground">{pro.name}</h4><p className="text-xs text-gray-400">{pro.role}</p></div>
            <button onClick={onWishlist} className="p-1 -mt-0.5"><Heart size={16} fill={wishlisted ? "#EF4444" : "none"} color={wishlisted ? "#EF4444" : "#9CA3AF"} /></button>
          </div>
          <div className="flex items-center gap-1 mt-1"><Star size={12} fill="#FBBF24" color="#FBBF24" /><span className="text-xs font-bold">{pro.rating}</span><span className="text-xs text-gray-400">({pro.reviews})</span></div>
          <div className="flex items-center gap-1 mt-1.5">
            {pro.tags.map((t) => <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EDE9FD", color: "#5B3EF5" }}>{t}</span>)}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 pb-3">
        <div><span className="text-lg font-bold text-foreground">{pro.price}</span><span className="text-xs text-gray-400">{pro.unit}</span></div>
        <button onClick={onBook} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>Book Now</button>
      </div>
    </div>
  );
}

function CustServices({ selected, setSelected, openBooking }: { selected: string | null; setSelected: (s: string | null) => void; openBooking: (pro: typeof FEATURED[0]) => void }) {
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-4 bg-white border-b border-black/[0.08]">
        <h2 className="text-lg font-bold mb-3">All Services</h2>
        <div className="bg-gray-100 rounded-xl flex items-center gap-3 px-4 py-2.5"><Search size={16} color="#9CA3AF" /><span className="text-sm text-gray-400">Search services...</span></div>
      </div>
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.filter((s) => s.label !== "More").map((s) => {
            const Icon = s.icon; const active = selected === s.label;
            return (
              <button key={s.label} onClick={() => setSelected(active ? null : s.label)} className="flex items-center gap-3 p-3 rounded-2xl border transition-all" style={{ background: active ? s.color : "#fff", borderColor: active ? s.iconColor + "40" : "rgba(0,0,0,0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.color }}><Icon size={20} color={s.iconColor} /></div>
                <div className="text-left"><p className="text-sm font-bold">{s.label}</p><p className="text-[11px] text-gray-400">{s.count} pros</p></div>
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="mt-5">
            <h3 className="text-sm font-bold mb-3">{selected} Professionals</h3>
            <div className="flex flex-col gap-4">
              {FEATURED.slice(0, 2).map((pro) => <ProCard key={pro.id} pro={pro} wishlisted={false} onWishlist={() => {}} onBook={() => openBooking(pro)} />)}
            </div>
          </div>
        )}
      </div>
      <div className="h-6" />
    </div>
  );
}

function CustBookings() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const filtered = CUSTOMER_BOOKINGS.filter((b) => tab === "upcoming" ? b.status === "Upcoming" : b.status === "Completed");
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-4 bg-white border-b border-black/[0.08]"><h2 className="text-lg font-bold">My Bookings</h2></div>
      <div className="flex mx-5 mt-4 bg-gray-100 rounded-xl p-1">
        {(["upcoming","past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 rounded-lg text-sm font-bold capitalize" style={{ background: tab === t ? "#fff" : "transparent", color: tab === t ? "#5B3EF5" : "#9CA3AF", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{t}</button>
        ))}
      </div>
      <div className="px-5 mt-4 flex flex-col gap-4">
        {filtered.map((b, i) => (
          <div key={i} className="bg-white rounded-2xl border border-black/[0.08] p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div><h4 className="text-sm font-bold">{b.service}</h4><p className="text-xs text-gray-400 mt-0.5">{b.pro}</p></div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: b.status === "Upcoming" ? "#EDE9FD" : "#DCFCE7", color: b.status === "Upcoming" ? "#5B3EF5" : "#16A34A" }}>{b.status}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3"><Calendar size={13} /><span>{b.date}</span></div>
            <div className="flex gap-2">
              {b.status === "Upcoming"
                ? <><button className="flex-1 py-2 rounded-xl text-xs font-bold border border-black/[0.08]">Reschedule</button><button className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "#5B3EF5" }}>Track</button></>
                : <><button className="flex-1 py-2 rounded-xl text-xs font-bold border border-black/[0.08]">Rate Service</button><button className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "#5B3EF5" }}>Rebook</button></>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12"><div className="text-4xl mb-3">📋</div><p className="text-sm font-bold">No {tab} bookings</p></div>}
      </div>
    </div>
  );
}

function CustProfile() {
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-6" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
        <div className="flex items-center gap-4">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format" alt="Arjun" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40" />
          <div><h2 className="text-white text-lg font-bold">Arjun Mehta</h2><p className="text-white/70 text-xs">+91 98765 43210</p><p className="text-white/70 text-xs">arjun.mehta@email.com</p></div>
        </div>
        <div className="flex gap-3 mt-4">
          {[{ label: "Bookings", val: "12" }, { label: "Reviews", val: "8" }, { label: "Points", val: "240" }].map((s) => (
            <div key={s.label} className="flex-1 bg-white/15 rounded-xl py-2.5 text-center"><p className="text-white font-bold text-base">{s.val}</p><p className="text-white/70 text-[11px]">{s.label}</p></div>
          ))}
        </div>
      </div>
      <div className="px-5 mt-4 flex flex-col gap-2">
        {[{ icon: MapPin, label: "Saved Addresses" }, { icon: Heart, label: "Wishlist" }, { icon: Shield, label: "Privacy & Security" }, { icon: Bell, label: "Notifications" }, { icon: Star, label: "Rate the App" }].map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.label} className="flex items-center justify-between bg-white rounded-2xl border border-black/[0.08] px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EDE9FD" }}><Icon size={15} color="#5B3EF5" /></div><span className="text-sm font-semibold">{m.label}</span></div>
              <ChevronRight size={16} color="#9CA3AF" />
            </button>
          );
        })}
        <button className="mt-2 py-3.5 rounded-2xl text-sm font-bold text-red-500 border-2 border-red-100 bg-red-50">Sign Out</button>
      </div>
      <div className="h-6" />
    </div>
  );
}

function BookingModal({ pro, step, setStep, selectedDate, setSelectedDate, selectedTime, setSelectedTime, onClose }: {
  pro: typeof FEATURED[0]; step: number; setStep: (s: number) => void;
  selectedDate: string; setSelectedDate: (d: string) => void;
  selectedTime: string; setSelectedTime: (t: string) => void;
  onClose: () => void;
}) {
  const dates = ["Today","Tomorrow","Sat, 5 Jul","Sun, 6 Jul","Mon, 7 Jul"];
  const times = ["9:00 AM","11:00 AM","1:00 PM","3:00 PM","5:00 PM","7:00 PM"];
  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="flex-1" onClick={onClose} />
      <div className="bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: "80%" }}>
        <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        {step < 3 && (
          <div className="flex items-center justify-between px-5 pb-3">
            <div className="flex items-center gap-2">
              {step > 1 && <button onClick={() => setStep(step - 1)} className="p-1"><ChevronLeft size={20} /></button>}
              <h3 className="text-base font-bold">{step === 1 ? "Pick a Date & Time" : "Confirm Booking"}</h3>
            </div>
            <button onClick={onClose}><X size={20} color="#9CA3AF" /></button>
          </div>
        )}
        <div className="px-5 pb-6 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {step === 1 && (<>
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-5">
              <img src={pro.img} alt={pro.name} className="w-12 h-12 rounded-xl object-cover" />
              <div><p className="text-sm font-bold">{pro.name}</p><p className="text-xs text-gray-400">{pro.role}</p><div className="flex items-center gap-1 mt-0.5"><Star size={11} fill="#FBBF24" color="#FBBF24" /><span className="text-xs font-bold">{pro.rating}</span></div></div>
              <div className="ml-auto text-right"><p className="text-sm font-bold">{pro.price}</p><p className="text-xs text-gray-400">{pro.unit}</p></div>
            </div>
            <p className="text-xs font-bold mb-2.5">Select Date</p>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {dates.map((d) => <button key={d} onClick={() => setSelectedDate(d)} className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all" style={{ background: selectedDate === d ? "#5B3EF5" : "#fff", color: selectedDate === d ? "#fff" : "#6B7280", borderColor: selectedDate === d ? "#5B3EF5" : "rgba(0,0,0,0.1)" }}>{d}</button>)}
            </div>
            <p className="text-xs font-bold mb-2.5">Select Time</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {times.map((t) => <button key={t} onClick={() => setSelectedTime(t)} className="py-2.5 rounded-xl text-xs font-bold border transition-all" style={{ background: selectedTime === t ? "#5B3EF5" : "#fff", color: selectedTime === t ? "#fff" : "#6B7280", borderColor: selectedTime === t ? "#5B3EF5" : "rgba(0,0,0,0.1)" }}>{t}</button>)}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>Continue <ArrowRight size={16} /></button>
          </>)}
          {step === 2 && (<>
            <div className="flex flex-col gap-3 mb-5">
              {[{ label: "Professional", value: pro.name }, { label: "Service", value: pro.role }, { label: "Date", value: selectedDate }, { label: "Time", value: selectedTime }, { label: "Amount", value: pro.price + pro.unit }].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-black/[0.06]"><span className="text-xs text-gray-400">{r.label}</span><span className="text-sm font-bold">{r.value}</span></div>
              ))}
              <div className="flex items-center justify-between py-2.5"><span className="text-xs text-gray-400">Platform fee</span><span className="text-sm font-bold text-green-600">FREE</span></div>
            </div>
            <button onClick={() => setStep(3)} className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>Confirm Booking <Check size={16} /></button>
          </>)}
          {step === 3 && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "#DCFCE7" }}><Check size={36} color="#16A34A" strokeWidth={3} /></div>
              <h3 className="text-lg font-bold mb-1">Booking Confirmed!</h3>
              <p className="text-sm text-gray-400 mb-4">{pro.name} will arrive on {selectedDate} at {selectedTime}</p>
              <div className="bg-gray-50 rounded-2xl px-5 py-3 mb-5 w-full"><p className="text-xs text-gray-400 mb-1">Booking ID</p><p className="text-sm font-bold">#UC{Math.floor(Math.random() * 90000 + 10000)}</p></div>
              <button onClick={onClose} className="w-full py-3.5 rounded-2xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PARTNER / PROVIDER APP
═══════════════════════════════════════════════════════════════════ */

const PARTNER_JOBS = [
  { id: "UC91023", customer: "Rahul Joshi",    service: "Home Cleaning",  address: "Andheri West, Mumbai",  time: "Today, 11:00 AM", amount: "₹399", status: "New"       },
  { id: "UC91024", customer: "Sunita Reddy",   service: "Deep Cleaning",  address: "Juhu, Mumbai",          time: "Today, 3:00 PM",  amount: "₹699", status: "New"       },
  { id: "UC91020", customer: "Vikram Nair",    service: "Home Cleaning",  address: "Powai, Mumbai",         time: "Yesterday",       amount: "₹399", status: "Completed" },
  { id: "UC91018", customer: "Deepa Iyer",     service: "Sofa Cleaning",  address: "Bandra, Mumbai",        time: "2 days ago",      amount: "₹850", status: "Completed" },
];

const PARTNER_TABS = [
  { id: "dashboard", icon: Home,      label: "Home"     },
  { id: "jobs",      icon: Package,   label: "Jobs"     },
  { id: "earnings",  icon: Wallet,    label: "Earnings" },
  { id: "profile",   icon: User,      label: "Profile"  },
];

function PartnerApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isOnline, setIsOnline]   = useState(true);
  const [jobs, setJobs]           = useState(PARTNER_JOBS);

  const acceptJob  = (id: string) => setJobs((j) => j.map((x) => x.id === id ? { ...x, status: "Accepted" } : x));
  const rejectJob  = (id: string) => setJobs((j) => j.map((x) => x.id === id ? { ...x, status: "Rejected" } : x));

  return (
    <PhoneFrame statusDark={false}>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {activeTab === "dashboard" && <PartnerDashboard isOnline={isOnline} setIsOnline={setIsOnline} jobs={jobs} />}
        {activeTab === "jobs"      && <PartnerJobs jobs={jobs} acceptJob={acceptJob} rejectJob={rejectJob} />}
        {activeTab === "earnings"  && <PartnerEarnings />}
        {activeTab === "profile"   && <PartnerProfile />}
      </div>
      <div className="bg-white border-t border-black/[0.08] flex items-center justify-around px-2 pb-4 pt-2 z-20">
        {PARTNER_TABS.map((tab) => {
          const Icon  = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex flex-col items-center gap-0.5 px-4 py-1">
              <div className="p-1.5 rounded-xl" style={{ background: active ? "#FFF3E0" : "transparent" }}>
                <Icon size={20} color={active ? "#E65100" : "#9CA3AF"} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: active ? "#E65100" : "#9CA3AF" }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </PhoneFrame>
  );
}

function PartnerDashboard({ isOnline, setIsOnline, jobs }: { isOnline: boolean; setIsOnline: (v: boolean) => void; jobs: typeof PARTNER_JOBS }) {
  const newJobs = jobs.filter((j) => j.status === "New");
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-2 pb-5" style={{ background: "linear-gradient(135deg,#E65100,#FF8F00)" }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-white/70 text-xs font-medium mb-0.5">Welcome back 👷</p>
            <h1 className="text-white text-xl font-bold">Suresh Kumar</h1>
            <div className="flex items-center gap-1 mt-0.5"><Star size={12} fill="#FFF" color="#FFF" /><span className="text-white text-xs font-semibold">4.8 · 234 jobs</span></div>
          </div>
          <button className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bell size={18} color="white" />
            {newJobs.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-300 rounded-full border border-white" />}
          </button>
        </div>

        {/* Online toggle */}
        <button
          onClick={() => setIsOnline(!isOnline)}
          className="flex items-center justify-between w-full bg-white/15 rounded-2xl px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: isOnline ? "#4ADE80" : "#9CA3AF" }} />
            <span className="text-white font-bold text-sm">{isOnline ? "You're Online" : "You're Offline"}</span>
          </div>
          {isOnline
            ? <ToggleRight size={28} color="#4ADE80" />
            : <ToggleLeft  size={28} color="rgba(255,255,255,0.5)" />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-5 mt-4">
        {[{ label: "Today's Jobs", val: "3", icon: Package, color: "#FFF3E0", ic: "#E65100" }, { label: "Earnings", val: "₹1,247", icon: Wallet, color: "#DCFCE7", ic: "#16A34A" }, { label: "Rating", val: "4.8★", icon: Award, color: "#EDE9FD", ic: "#5B3EF5" }].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-black/[0.08] p-3 text-center shadow-sm">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5" style={{ background: s.color }}><Icon size={15} color={s.ic} /></div>
              <p className="text-sm font-bold text-foreground">{s.val}</p>
              <p className="text-[10px] text-gray-400">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* New job alerts */}
      {newJobs.length > 0 && (
        <div className="px-5 mt-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-base font-bold">New Job Requests ({newJobs.length})</h2>
          </div>
          <div className="flex flex-col gap-3">
            {newJobs.slice(0, 2).map((job) => (
              <PartnerJobCard key={job.id} job={job} onAccept={() => {}} onReject={() => {}} compact />
            ))}
          </div>
        </div>
      )}

      {/* Today's schedule */}
      <div className="px-5 mt-5">
        <h2 className="text-base font-bold mb-3">Today&apos;s Schedule</h2>
        <div className="flex flex-col gap-3">
          {[{ time: "9:00 AM",  label: "Start shift",                  done: true  },
            { time: "11:00 AM", label: "Home Cleaning – Rahul Joshi",  done: false },
            { time: "3:00 PM",  label: "Deep Cleaning – Sunita Reddy", done: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-col items-center"><div className="w-2.5 h-2.5 rounded-full" style={{ background: s.done ? "#16A34A" : "#E65100" }} />{i < 2 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}</div>
              <div className="flex-1 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: s.done ? "#6B7280" : "#0f1117" }}>{s.label}</p>
                <span className="text-xs text-gray-400">{s.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick earnings summary */}
      <div className="mx-5 mt-5 mb-6 rounded-2xl p-4 border border-black/[0.08] bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">This Week</h3>
          <span className="text-xs font-semibold text-green-600">+12% vs last week</span>
        </div>
        <div className="flex gap-1.5 items-end h-16">
          {[40, 70, 55, 80, 60, 90, 75].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%`, background: i === 5 ? "#E65100" : "#FFF3E0" }} />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {["M","T","W","T","F","S","S"].map((d, i) => <span key={i} className="flex-1 text-center text-[10px] text-gray-400">{d}</span>)}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.06]">
          <div><p className="text-xs text-gray-400">Total Earned</p><p className="text-base font-bold">₹8,420</p></div>
          <div className="text-right"><p className="text-xs text-gray-400">Jobs Done</p><p className="text-base font-bold">21</p></div>
        </div>
      </div>
    </div>
  );
}

function PartnerJobCard({ job, onAccept, onReject, compact }: { job: typeof PARTNER_JOBS[0]; onAccept: () => void; onReject: () => void; compact?: boolean }) {
  const statusColor: Record<string, string> = { New: "#E65100", Accepted: "#16A34A", Completed: "#5B3EF5", Rejected: "#9CA3AF" };
  const statusBg:    Record<string, string> = { New: "#FFF3E0", Accepted: "#DCFCE7", Completed: "#EDE9FD", Rejected: "#F3F4F6" };
  return (
    <div className="bg-white rounded-2xl border border-black/[0.08] p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-bold">{job.service}</h4>
          <p className="text-xs text-gray-400">{job.customer} · {job.id}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusBg[job.status] || "#F3F4F6", color: statusColor[job.status] || "#6B7280" }}>{job.status}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><MapPin size={11} />{job.address}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><Clock size={11} />{job.time}</span>
        <span className="flex items-center gap-1 ml-auto font-bold text-foreground text-sm">{job.amount}</span>
      </div>
      {job.status === "New" && !compact && (
        <div className="flex gap-2">
          <button onClick={onReject} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-red-200 text-red-500 bg-red-50 flex items-center justify-center gap-1"><XCircle size={13} />Reject</button>
          <button onClick={onAccept} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1" style={{ background: "#16A34A" }}><CheckCircle size={13} />Accept</button>
        </div>
      )}
      {job.status === "New" && compact && (
        <div className="flex gap-2">
          <button onClick={onReject} className="flex-1 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-500">Decline</button>
          <button onClick={onAccept} className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "#E65100" }}>Accept</button>
        </div>
      )}
      {job.status === "Accepted" && (
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-black/[0.08] flex items-center justify-center gap-1"><Navigation size={13} />Navigate</button>
          <button className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1" style={{ background: "#5B3EF5" }}><Check size={13} />Mark Done</button>
        </div>
      )}
    </div>
  );
}

function PartnerJobs({ jobs, acceptJob, rejectJob }: { jobs: typeof PARTNER_JOBS; acceptJob: (id: string) => void; rejectJob: (id: string) => void }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "New", "Accepted", "Completed"];
  const filtered = filter === "All" ? jobs : jobs.filter((j) => j.status === filter);
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-4 bg-white border-b border-black/[0.08]">
        <h2 className="text-lg font-bold mb-3">My Jobs</h2>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all" style={{ background: filter === f ? "#E65100" : "#fff", color: filter === f ? "#fff" : "#6B7280", borderColor: filter === f ? "#E65100" : "rgba(0,0,0,0.1)" }}>{f}</button>
          ))}
        </div>
      </div>
      <div className="px-5 pt-4 flex flex-col gap-4">
        {filtered.map((job) => (
          <PartnerJobCard key={job.id} job={job} onAccept={() => acceptJob(job.id)} onReject={() => rejectJob(job.id)} />
        ))}
        {filtered.length === 0 && <div className="text-center py-12"><div className="text-4xl mb-3">📦</div><p className="text-sm font-bold">No {filter.toLowerCase()} jobs</p></div>}
      </div>
      <div className="h-6" />
    </div>
  );
}

function PartnerEarnings() {
  const [period, setPeriod] = useState("Week");
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-5" style={{ background: "linear-gradient(135deg,#E65100,#FF8F00)" }}>
        <h2 className="text-white text-lg font-bold mb-4">My Earnings</h2>
        <div className="bg-white/15 rounded-2xl p-4 text-center">
          <p className="text-white/70 text-xs mb-1">Total Earnings (July 2026)</p>
          <p className="text-white text-3xl font-bold">₹24,850</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <ArrowUpRight size={14} color="#4ADE80" />
            <span className="text-green-300 text-xs font-semibold">+18% vs June</span>
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          {[{ label: "Jobs Done", val: "62" }, { label: "Avg/Job", val: "₹401" }, { label: "Pending", val: "₹1,200" }].map((s) => (
            <div key={s.label} className="flex-1 bg-white/15 rounded-xl py-2 text-center">
              <p className="text-white font-bold text-sm">{s.val}</p>
              <p className="text-white/60 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Earnings Overview</h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {["Week","Month"].map((p) => <button key={p} onClick={() => setPeriod(p)} className="px-3 py-1 rounded-md text-xs font-bold transition-all" style={{ background: period === p ? "#fff" : "transparent", color: period === p ? "#E65100" : "#9CA3AF" }}>{p}</button>)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-black/[0.08] p-4 shadow-sm mb-4">
          <div className="flex gap-1.5 items-end h-20">
            {(period === "Week" ? [40,70,55,80,60,90,75] : [55,70,45,80,60,90,75,50,85,60,70,80,65,90,55,70,80,60,75,90,50,65,80,70,85,55,60,75,80,65]).map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === (period === "Week" ? 5 : 25) ? "#E65100" : "#FFF3E0" }} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {(period === "Week" ? ["M","T","W","T","F","S","S"] : ["1","","","","5","","","","","10","","","","","15","","","","","20","","","","","25","","","","","30"]).map((d, i) => <span key={i} className="flex-1 text-center text-[9px] text-gray-400">{d}</span>)}
          </div>
        </div>

        {/* Transactions */}
        <h3 className="text-sm font-bold mb-3">Recent Payouts</h3>
        {[{ date: "Jul 3, 2026", amount: "₹3,210", jobs: 8, status: "Paid" }, { date: "Jun 26, 2026", amount: "₹4,050", jobs: 10, status: "Paid" }, { date: "Jun 19, 2026", amount: "₹2,800", jobs: 7, status: "Paid" }].map((t, i) => (
          <div key={i} className="flex items-center justify-between bg-white rounded-2xl border border-black/[0.08] px-4 py-3.5 mb-3 shadow-sm">
            <div><p className="text-sm font-bold">{t.amount}</p><p className="text-xs text-gray-400">{t.jobs} jobs · {t.date}</p></div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>{t.status}</span>
          </div>
        ))}
      </div>
      <div className="h-6" />
    </div>
  );
}

function PartnerProfile() {
  const skills = ["Home Cleaning","Deep Cleaning","Sofa Cleaning","Carpet Washing"];
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-6" style={{ background: "linear-gradient(135deg,#E65100,#FF8F00)" }}>
        <div className="flex items-center gap-4">
          <img src="https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=200&h=200&fit=crop&auto=format" alt="Suresh" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40" />
          <div>
            <h2 className="text-white text-lg font-bold">Suresh Kumar</h2>
            <p className="text-white/70 text-xs">Home Cleaning Expert</p>
            <div className="flex items-center gap-1 mt-1"><Star size={12} fill="#FFF" color="#FFF" /><span className="text-white text-xs font-semibold">4.8 · 234 reviews</span></div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          {[{ label: "Jobs", val: "234" }, { label: "On Time", val: "98%" }, { label: "Earned", val: "₹94k" }].map((s) => (
            <div key={s.label} className="flex-1 bg-white/15 rounded-xl py-2.5 text-center"><p className="text-white font-bold text-base">{s.val}</p><p className="text-white/70 text-[11px]">{s.label}</p></div>
          ))}
        </div>
      </div>
      <div className="px-5 mt-4">
        <h3 className="text-sm font-bold mb-3">My Skills</h3>
        <div className="flex flex-wrap gap-2 mb-5">
          {skills.map((s) => <span key={s} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "#FFF3E0", color: "#E65100" }}>{s}</span>)}
        </div>
        <div className="flex flex-col gap-2">
          {[{ icon: FileText, label: "My Documents" }, { icon: Award, label: "Certifications" }, { icon: Bell, label: "Notifications" }, { icon: Phone, label: "Support" }, { icon: Settings, label: "Settings" }].map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.label} className="flex items-center justify-between bg-white rounded-2xl border border-black/[0.08] px-4 py-3.5 shadow-sm">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FFF3E0" }}><Icon size={15} color="#E65100" /></div><span className="text-sm font-semibold">{m.label}</span></div>
                <ChevronRight size={16} color="#9CA3AF" />
              </button>
            );
          })}
          <button className="mt-2 py-3.5 rounded-2xl text-sm font-bold text-red-500 border-2 border-red-100 bg-red-50">Sign Out</button>
        </div>
      </div>
      <div className="h-6" />
    </div>
  );
}

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

/* ─────────────────────────── Shared PhoneFrame ─────────────────────────── */

function PhoneFrame({ children, statusDark }: { children: React.ReactNode; statusDark: boolean }) {
  const textColor = statusDark ? "#0f1117" : "#ffffff";
  return (
    <div
      className="relative flex flex-col overflow-hidden shadow-2xl"
      style={{ width: 390, height: 844, borderRadius: 44, border: "10px solid #1a1a2e", background: "#f7f8fa" }}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2 z-20" style={{ minHeight: 44, background: "transparent" }}>
        <span className="text-xs font-bold" style={{ color: textColor }}>9:41</span>
        <div className="absolute left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full" />
        <div className="flex items-center gap-1">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="3" width="3" height="9" rx="1" fill={textColor}/><rect x="4" y="2" width="3" height="10" rx="1" fill={textColor}/><rect x="8" y="0" width="3" height="12" rx="1" fill={textColor}/><rect x="12" y="0" width="3" height="12" rx="1" fill={textColor} opacity="0.3"/></svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 2.5C9.8 2.5 11.4 3.2 12.6 4.3L14 2.9C12.4 1.4 10.3 0.5 8 0.5C5.7 0.5 3.6 1.4 2 2.9L3.4 4.3C4.6 3.2 6.2 2.5 8 2.5Z" fill={textColor}/><path d="M8 5.5C9.1 5.5 10.1 5.9 10.8 6.7L12.2 5.3C11.1 4.2 9.6 3.5 8 3.5C6.4 3.5 4.9 4.2 3.8 5.3L5.2 6.7C5.9 5.9 6.9 5.5 8 5.5Z" fill={textColor}/><circle cx="8" cy="9" r="1.5" fill={textColor}/></svg>
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke={textColor} strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="8" rx="2" fill={textColor}/><path d="M23 4.5V7.5C23.8 7.2 24.5 6.5 24.5 6C24.5 5.5 23.8 4.8 23 4.5Z" fill={textColor} fillOpacity="0.4"/></svg>
        </div>
      </div>
      {children}
    </div>
  );
}
