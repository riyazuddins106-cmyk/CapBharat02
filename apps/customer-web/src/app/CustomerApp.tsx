import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, MapPin, Star, ChevronRight, Bell, Heart, Home, Grid, BookOpen,
  User, Clock, Shield, Sparkles, Wrench, Scissors, Zap, Droplets, Paintbrush,
  Wind, ChevronLeft, X, Calendar, ArrowRight, Plus, Trash2, Pencil,
  Navigation, Check,
  // Sub-category icons
  Flame, Lightbulb, Battery, Camera, Truck, Thermometer, Building2,
  Sofa, Shirt, Package, WashingMachine, Tag, Waves, Banknote, Smartphone, CreditCard,
} from "lucide-react";
import {
  auth, authApi, categoriesApi, subcategoriesApi, professionalsApi, bookingsApi, favoritesApi,
  addressesApi, offersApi, profileApi, reelsApi, getPaymentConfig, servicesApi, cartApi,
  type ApiUser, type ApiCategory, type ApiSubCategory, type ApiProfessional, type ApiBooking,
  type ApiAddress, type ApiOffer, type ApiReel, type ApiPayment, type ApiService, type ApiCart,
} from "../lib/api";

/* ─────────────────────────── Category icon map ─────────────────── */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Sparkles, Wrench, Zap, Scissors, Paintbrush, Wind, Droplets, Grid,
};

/* ─────────────────────────── Sub-category icon map ─────────────── */
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/** Returns true only for real uploaded images — excludes auto-generated placeholder SVGs */
const hasRealImage = (url?: string | null) => !!url && !url.includes('placeholder');

const SUB_ICON_RULES: [string[], LucideIcon][] = [
  // ── Cleaning ──────────────────────────────────────────────────────
  [['home deep', 'full home', 'home clean', 'sanitiz'],          Sparkles    ],
  [['bathroom', 'toilet clean'],                                  Droplets    ],
  [['kitchen', 'chimney', 'stove'],                               Flame       ],
  [['sofa', 'carpet', 'upholstery'],                              Sofa        ],
  [['move-in', 'move-out', 'move in', 'move out', 'handover'],   Truck       ],
  [['office clean', 'commercial clean'],                          Building2   ],
  // ── Plumbing ──────────────────────────────────────────────────────
  [['pipe leak', 'burst pipe', 'pipe repair'],                    Wrench      ],
  [['tap', 'faucet', 'mixer'],                                    Droplets    ],
  [['toilet', 'flush', 'cistern'],                                Waves       ],
  [['geyser', 'water heater', 'boiler'],                          Flame       ],
  [['drain', 'blockage', 'clog', 'sewer'],                        Droplets    ],
  [['pipe install', 'pipeline'],                                  Package     ],
  // ── Electrical ────────────────────────────────────────────────────
  [['wiring', 'rewiring', 'short circuit'],                       Zap         ],
  [['fan', 'light', 'led', 'chandelier', 'fitting'],              Lightbulb   ],
  [['switch', 'socket', 'plug', 'switchboard', 'outlet'],         Zap         ],
  [['mcb', 'fuse', 'earthing'],                                   Shield      ],
  [['cctv', 'camera', 'dvr', 'surveillance'],                     Camera      ],
  [['inverter', 'battery', 'ups', 'backup power'],                Battery     ],
  // ── Salon ─────────────────────────────────────────────────────────
  [['haircut', 'hair cut', 'hair style', 'barber', 'blow-dry'],   Scissors    ],
  [['facial', 'skincare', 'skin care', 'clean-up', 'cleanup'],    Sparkles    ],
  [['nail', 'manicure', 'pedicure'],                              Tag         ],
  [['wax', 'threading', 'epilat'],                                Scissors    ],
  [['spa', 'massage', 'relax'],                                   Heart       ],
  [['bridal', 'makeup', 'bride'],                                 Star        ],
  // ── Painting ──────────────────────────────────────────────────────
  [['interior paint', 'interior painting', 'wall paint', 'room paint', 'indoor'], Paintbrush ],
  [['exterior paint', 'exterior painting', 'outside', 'facade', 'outdoor'],       Paintbrush ],
  [['texture', 'design paint', 'wall art', 'textured'],           Paintbrush  ],
  [['putty', 'primer', 'wall prep'],                              Paintbrush  ],
  [['waterproof', 'damp', 'seepage', 'leak proof'],               Droplets    ],
  [['wood polish', 'wood', 'metal polish', 'varnish', 'lacquer'], Sparkles    ],
  // ── AC Repair ─────────────────────────────────────────────────────
  [['ac service', 'ac clean', 'ac maintenance', 'split ac'],      Wind        ],
  [['ac repair', 'ac fix', 'ac gas', 'ac not'],                   Wrench      ],
  [['ac install'],                                                 Wind        ],
  [['refrigerator', 'fridge', 'freezer'],                         Thermometer ],
  [['washing machine', 'washer repair'],                          WashingMachine ],
  // ── Laundry ───────────────────────────────────────────────────────
  [['wash & fold', 'wash and fold', 'laundry', 'clothes wash'],   Shirt       ],
  [['dry clean', 'dryclean'],                                     Shirt       ],
  [['iron', 'ironing only', 'press cloth', 'pressing'],           Zap         ],
  [['stain', 'spot clean'],                                       Droplets    ],
  [['curtain', 'drape'],                                          Shirt       ],
  [['shoe', 'footwear'],                                          Package     ],
  // ── Salon extras ─────────────────────────────────────────────────
  [['hair spa', 'hair colour', 'hair color', 'hair spa & colour'], Heart      ],
];

function getSubIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [keywords, Icon] of SUB_ICON_RULES) {
    if (keywords.some(kw => lower.includes(kw))) return Icon;
  }
  return Grid; // fallback
}

/* ─────────────────────────── Address label config ───────────────── */
const ADDR_LABELS = ["Home", "Work", "Other"] as const;
type AddrLabel = typeof ADDR_LABELS[number];
const LABEL_COLORS: Record<AddrLabel, { bg: string; color: string }> = {
  Home:  { bg: "#EDE9FD", color: "#5B3EF5" },
  Work:  { bg: "#DCFCE7", color: "#16A34A" },
  Other: { bg: "#FEF3C7", color: "#D97706" },
};

/* ─────────────────────────── Helpers ───────────────────────────── */
function buildScheduledAt(dateLabel: string, timeLabel: string): string {
  const base = new Date();
  if (dateLabel === "Today") { /* keep today */ }
  else if (dateLabel === "Tomorrow") { base.setDate(base.getDate() + 1); }
  else {
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const parts = dateLabel.split(", ");
    if (parts.length >= 2) {
      const dayName = parts[0].trim();
      const dayIdx = days.indexOf(dayName);
      if (dayIdx !== -1) {
        const today = base.getDay() === 0 ? 7 : base.getDay();
        let diff = (dayIdx + 1) - today;
        if (diff <= 0) diff += 7;
        base.setDate(base.getDate() + diff);
      }
    }
  }
  const [time, ampm] = timeLabel.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (sameDay(d, today)) return `Today, ${timeStr}`;
  if (sameDay(d, yesterday)) return `Yesterday, ${timeStr}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${timeStr}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${timeStr}`;
}

function statusLabel(status: ApiBooking["status"]): string {
  return { pending: "Pending", upcoming: "Upcoming", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" }[status];
}

function statusColors(status: ApiBooking["status"]): { bg: string; color: string } {
  switch (status) {
    case "upcoming":    return { bg: "#EDE9FD", color: "#5B3EF5" };
    case "completed":   return { bg: "#DCFCE7", color: "#16A34A" };
    case "cancelled":   return { bg: "#FEE2E2", color: "#DC2626" };
    case "in_progress": return { bg: "#FEF3C7", color: "#D97706" };
    default:            return { bg: "#F3F4F6", color: "#6B7280" };
  }
}

function formatAddress(a: ApiAddress): string {
  return [a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(", ");
}

/* ─────────────────────────── PhoneFrame ───────────────────────── */
function PhoneFrame({ children, statusDark }: { children: React.ReactNode; statusDark: boolean }) {
  const textColor = statusDark ? "#0f1117" : "#ffffff";
  return (
    <div className="relative flex flex-col overflow-hidden shadow-2xl"
      style={{ width: 390, height: 844, borderRadius: 44, border: "10px solid #1a1a2e", background: "#f7f8fa" }}>
      <div className="flex items-center justify-between px-6 pt-4 pb-2 z-20" style={{ minHeight: 44 }}>
        <span className="text-xs font-bold" style={{ color: textColor }}>9:41</span>
        <div className="absolute left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full" />
        <div className="flex items-center gap-1">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="3" width="3" height="9" rx="1" fill={textColor}/><rect x="4" y="2" width="3" height="10" rx="1" fill={textColor}/><rect x="8" y="0" width="3" height="12" rx="1" fill={textColor}/><rect x="12" y="0" width="3" height="12" rx="1" fill={textColor} opacity="0.3"/></svg>
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke={textColor} strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="8" rx="2" fill={textColor}/><path d="M23 4.5V7.5C23.8 7.2 24.5 6.5 24.5 6C24.5 5.5 23.8 4.8 23 4.5Z" fill={textColor} fillOpacity="0.4"/></svg>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN / REGISTER SCREEN
═══════════════════════════════════════════════════════════════ */
function AuthInput({ placeholder, value, onChange, type = "text" }: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
    />
  );
}

function AuthBtn({ label, onClick, disabled, loading }: {
  label: string; onClick: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
      style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}
    >
      {loading ? "Please wait…" : label}
    </button>
  );
}

type AuthScreen = "login" | "register" | "verify-otp" | "forgot" | "reset";

interface LoginScreenProps {
  onLogin: (user: ApiUser, accessToken: string, refreshToken: string) => void;
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<"signup" | "password_reset">("signup");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);

  async function handleLogin() {
    setError(""); setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authApi.login(email, password);
      onLogin(user, accessToken, refreshToken);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Login failed.");
    } finally { setLoading(false); }
  }

  async function handleRegister() {
    setError(""); setLoading(true);
    try {
      const res = await authApi.register(fullName, email, password, phone || undefined);
      setOtpPurpose("signup");
      setDevCode(res.devCode);
      if (res.devCode) setOtp(res.devCode);
      setScreen("verify-otp");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Registration failed.");
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp() {
    setError(""); setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authApi.verifyOtp(email, otp, otpPurpose);
      if (otpPurpose === "signup") {
        onLogin(user, accessToken, refreshToken);
      } else {
        setScreen("reset");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "OTP verification failed.");
    } finally { setLoading(false); }
  }

  async function handleForgot() {
    setError(""); setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setOtpPurpose("password_reset");
      setDevCode(res?.devCode);
      if (res?.devCode) setOtp(res.devCode);
      setSuccess("Reset code sent.");
      setScreen("verify-otp");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Failed to send reset code.");
    } finally { setLoading(false); }
  }

  async function handleReset() {
    setError(""); setLoading(true);
    try {
      await authApi.resetPassword(email, otp, newPassword);
      setSuccess("Password reset! Please log in.");
      setScreen("login");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Reset failed.");
    } finally { setLoading(false); }
  }

  return (
    <PhoneFrame statusDark>
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8 flex flex-col" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center justify-center mt-4 mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            <Sparkles size={28} color="white" />
          </div>
        </div>

        {screen === "login" && <>
          <h2 className="text-xl font-bold mb-1">Welcome back </h2>
          <p className="text-gray-400 text-xs mb-5">Sign in to your ServeNow account</p>
          <div className="flex flex-col gap-3">
            <AuthInput placeholder="Email address" value={email} onChange={setEmail} type="email" />
            <AuthInput placeholder="Password" value={password} onChange={setPassword} type="password" />
          </div>
          <button onClick={() => { setScreen("forgot"); setError(""); }} className="text-xs font-semibold mt-2 text-right w-full" style={{ color: "#5B3EF5" }}>Forgot password?</button>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="mt-5"><AuthBtn label="Sign In" onClick={handleLogin} loading={loading} /></div>
          <button onClick={() => { setScreen("register"); setError(""); }} className="text-xs font-semibold mt-4 text-center w-full text-gray-400">
            Don't have an account? <span style={{ color: "#5B3EF5" }}>Sign up</span>
          </button>
        </>}

        {screen === "register" && <>
          <h2 className="text-xl font-bold mb-1">Create account</h2>
          <p className="text-gray-400 text-xs mb-5">Join ServeNow today</p>
          <div className="flex flex-col gap-3">
            <AuthInput placeholder="Full name" value={fullName} onChange={setFullName} />
            <AuthInput placeholder="Email address" value={email} onChange={setEmail} type="email" />
            <AuthInput placeholder="Phone (optional)" value={phone} onChange={setPhone} type="tel" />
            <AuthInput placeholder="Password (min 8 chars, uppercase + number)" value={password} onChange={setPassword} type="password" />
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="mt-5"><AuthBtn label="Create Account" onClick={handleRegister} loading={loading} /></div>
          <button onClick={() => { setScreen("login"); setError(""); }} className="text-xs font-semibold mt-4 text-center w-full text-gray-400">
            Already have an account? <span style={{ color: "#5B3EF5" }}>Sign in</span>
          </button>
        </>}

        {screen === "verify-otp" && <>
          <h2 className="text-xl font-bold mb-1">Verify your email</h2>
          <p className="text-gray-400 text-xs mb-5">Enter the 6-digit code sent to <span className="font-bold text-gray-600">{email}</span></p>
          {devCode && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-xs flex items-center gap-2 cursor-pointer select-none"
              style={{ background: "#f0edff", color: "#5b3ef5" }}
              onClick={() => setOtp(devCode)}
            >
              <span className="text-base">•</span>
              <span><strong>Dev mode:</strong> Code auto-filled — <strong>{devCode}</strong></span>
            </div>
          )}
          {success && <p className="text-green-600 text-xs mb-3">{success}</p>}
          <AuthInput placeholder="Enter 6-digit OTP" value={otp} onChange={setOtp} />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="mt-5"><AuthBtn label="Verify OTP" onClick={handleVerifyOtp} loading={loading} /></div>
          <button onClick={async () => {
            setError("");
            const res = await authApi.resendOtp(email, otpPurpose);
            setDevCode(res?.devCode);
            if (res?.devCode) setOtp(res.devCode);
            setSuccess("Code resent!");
          }} className="text-xs font-semibold mt-4 text-center w-full text-gray-400">
            Didn't receive it? <span style={{ color: "#5B3EF5" }}>Resend code</span>
          </button>
        </>}

        {screen === "forgot" && <>
          <h2 className="text-xl font-bold mb-1">Forgot password?</h2>
          <p className="text-gray-400 text-xs mb-5">Enter your email to receive a reset code</p>
          <AuthInput placeholder="Email address" value={email} onChange={setEmail} type="email" />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="mt-5"><AuthBtn label="Send Reset Code" onClick={handleForgot} loading={loading} /></div>
          <button onClick={() => { setScreen("login"); setError(""); }} className="text-xs font-semibold mt-4 text-center w-full text-gray-400">
            Back to <span style={{ color: "#5B3EF5" }}>Sign in</span>
          </button>
        </>}

        {screen === "reset" && <>
          <h2 className="text-xl font-bold mb-1">Reset password</h2>
          <p className="text-gray-400 text-xs mb-5">Enter the OTP and your new password</p>
          <div className="flex flex-col gap-3">
            <AuthInput placeholder="6-digit OTP" value={otp} onChange={setOtp} />
            <AuthInput placeholder="New password" value={newPassword} onChange={setNewPassword} type="password" />
          </div>
          {success && <p className="text-green-600 text-xs mt-2">{success}</p>}
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="mt-5"><AuthBtn label="Reset Password" onClick={handleReset} loading={loading} /></div>
        </>}
      </div>
    </PhoneFrame>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRO CARD
═══════════════════════════════════════════════════════════════ */
function ProCard({ pro, wishlisted, onWishlist, onBook }: {
  pro: ApiProfessional;
  wishlisted: boolean;
  onWishlist: () => void;
  onBook: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="relative flex-shrink-0">
          <img
            src={pro.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.name)}&size=64`}
            alt={pro.name}
            className="w-16 h-16 rounded-xl object-cover bg-gray-100"
          />
          {pro.badge && (
            <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: pro.badge === "Top Rated" ? "#5B3EF5" : "#16A34A" }}>{pro.badge}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground">{pro.name}</h4>
              <p className="text-xs text-gray-400">{pro.title}</p>
            </div>
            <button onClick={onWishlist} className="p-1 -mt-0.5">
              <Heart size={16} fill={wishlisted ? "#EF4444" : "none"} color={wishlisted ? "#EF4444" : "#9CA3AF"} />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Star size={12} fill="#FBBF24" color="#FBBF24" />
            <span className="text-xs font-bold">{pro.rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({pro.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {(pro.tags as string[]).map((t) => (
              <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EDE9FD", color: "#5B3EF5" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 pb-3">
        <div>
          <span className="text-lg font-bold text-foreground">₹{pro.basePrice}</span>
          <span className="text-xs text-gray-400">{pro.priceUnit}</span>
        </div>
        <button onClick={onBook} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
          Book Now
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOOKING MODAL
═══════════════════════════════════════════════════════════════ */
function isPastTimeSlot(timeLabel: string, dateLabel: string): boolean {
  if (dateLabel !== "Today") return false;
  const now = new Date();
  const [time, ampm] = timeLabel.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const slotMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= nowMinutes;
}

function BookingModal({ pro, onClose, onBooked }: {
  pro: ApiProfessional;
  onClose: () => void;
  onBooked: (booking: ApiBooking) => void;
}) {
  const times = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM"];

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("Today");
  const [selectedTime, setSelectedTime] = useState(
    () => times.find((t) => !isPastTimeSlot(t, "Today")) ?? times[0]
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (i === 0) return "Today";
    if (i === 1) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  });

  function handleDateChange(d: string) {
    setSelectedDate(d);
    // reset time to first available slot for the new date
    const first = times.find((t) => !isPastTimeSlot(t, d)) ?? times[0];
    setSelectedTime(first);
  }

  async function confirmBooking() {
    setError(""); setLoading(true);
    try {
      const scheduledAt = buildScheduledAt(selectedDate, selectedTime);
      const booking = await bookingsApi.create(pro.id, scheduledAt, notes || undefined);
      setStep(3);
      onBooked(booking);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Booking failed. Please try again.");
    } finally { setLoading(false); }
  }

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
          {step === 1 && <>
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-5">
              <img src={pro.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.name)}&size=48`} alt={pro.name} className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <p className="text-sm font-bold">{pro.name}</p>
                <p className="text-xs text-gray-400">{pro.title}</p>
                <div className="flex items-center gap-1 mt-0.5"><Star size={11} fill="#FBBF24" color="#FBBF24" /><span className="text-xs font-bold">{pro.rating.toFixed(1)}</span></div>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm font-bold">₹{pro.basePrice}</p>
                <p className="text-xs text-gray-400">{pro.priceUnit}</p>
              </div>
            </div>
            <p className="text-xs font-bold mb-2.5">Select Date</p>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {dates.map((d) => (
                <button key={d} onClick={() => handleDateChange(d)}
                  className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={{ background: selectedDate === d ? "#5B3EF5" : "#fff", color: selectedDate === d ? "#fff" : "#6B7280", borderColor: selectedDate === d ? "#5B3EF5" : "rgba(0,0,0,0.1)" }}>
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold mb-2.5">Select Time</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {times.map((t) => {
                const past = isPastTimeSlot(t, selectedDate);
                const sel = selectedTime === t;
                return (
                  <button key={t}
                    onClick={() => { if (!past) setSelectedTime(t); }}
                    disabled={past}
                    className="py-2.5 rounded-xl text-xs font-bold border transition-all"
                    style={{
                      background: past ? "#F3F4F6" : sel ? "#5B3EF5" : "#fff",
                      color: past ? "#D1D5DB" : sel ? "#fff" : "#6B7280",
                      borderColor: past ? "#E5E7EB" : sel ? "#5B3EF5" : "rgba(0,0,0,0.1)",
                      cursor: past ? "not-allowed" : "pointer",
                      opacity: past ? 0.6 : 1,
                    }}>
                    {t}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
              Continue <ArrowRight size={16} />
            </button>
          </>}

          {step === 2 && <>
            <div className="flex flex-col gap-3 mb-5">
              {[
                { label: "Professional", value: pro.name },
                { label: "Service", value: pro.title },
                { label: "Date", value: selectedDate },
                { label: "Time", value: selectedTime },
                { label: "Amount", value: `₹${pro.basePrice}${pro.priceUnit}` },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-xs text-gray-400">{r.label}</span>
                  <span className="text-xs font-bold">{r.value}</span>
                </div>
              ))}
            </div>
            <textarea
              placeholder="Add notes for the professional (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4"
              rows={2}
            />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button
              onClick={confirmBooking}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
              {loading ? "Booking…" : "Confirm Booking"}
            </button>
          </>}

          {step === 3 && (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "#DCFCE7" }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M6 16L13 23L26 9" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 className="text-lg font-bold mb-1">Booking Confirmed!</h3>
              <p className="text-xs text-gray-400 text-center mb-6">{pro.name} has been booked for {selectedDate} at {selectedTime}.</p>
              <button onClick={onClose} className="w-full py-3.5 rounded-2xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOCATION PICKER MODAL
═══════════════════════════════════════════════════════════════ */
function LocationPickerModal({
  current, addresses, onSelect, onClose,
}: {
  current: string;
  addresses: ApiAddress[];
  onSelect: (loc: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(current === "Set your location" ? "" : current);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  function detectLocation() {
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    setDetecting(true); setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const json = await resp.json();
          const addr = json.address ?? {};
          const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
          const state = addr.state ?? "";
          const loc = [city, state].filter(Boolean).join(", ") || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
          setText(loc);
        } catch {
          setError("Could not fetch location name.");
        } finally { setDetecting(false); }
      },
      () => { setError("Location access denied."); setDetecting(false); }
    );
  }

  function handleSave() {
    const val = text.trim();
    if (!val) return;
    onSelect(val);
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="flex-1" onClick={onClose} />
      <div className="bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: "75%" }}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-black/[0.06]">
          <h3 className="text-base font-bold">Set your location</h3>
          <button onClick={onClose}><X size={20} color="#9CA3AF" /></button>
        </div>

        <div className="px-5 pt-4 pb-6 overflow-y-auto flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
          {/* Detect GPS */}
          <button
            onClick={detectLocation}
            disabled={detecting}
            className="flex items-center gap-3 w-full rounded-2xl border-2 px-4 py-3 transition-all"
            style={{ borderColor: "#5B3EF5", background: "#EDE9FD" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#5B3EF5" }}>
              <Navigation size={16} color="white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold" style={{ color: "#5B3EF5" }}>{detecting ? "Detecting…" : "Use my current location"}</p>
              <p className="text-xs text-gray-400">Automatically detect via GPS</p>
            </div>
          </button>

          {/* Manual input */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Or enter manually</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-100 rounded-xl flex items-center gap-2 px-3 py-3">
                <Search size={15} color="#9CA3AF" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="City, State (e.g. Mumbai, Maharashtra)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs -mt-2">{error}</p>}

          {/* Saved addresses as quick picks */}
          {addresses.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Your saved addresses</p>
              <div className="flex flex-col gap-2">
                {addresses.map((a) => {
                  const lbl = (a.label ?? "Other") as AddrLabel;
                  const lc = LABEL_COLORS[lbl] ?? LABEL_COLORS.Other;
                  return (
                    <button key={a.id} onClick={() => onSelect([a.city, a.state].filter(Boolean).join(", ") || formatAddress(a))}
                      className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-black/[0.06] text-left">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: lc.bg }}>
                        <MapPin size={14} color={lc.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">{a.label ?? "Other"}</p>
                        <p className="text-[11px] text-gray-400 truncate">{formatAddress(a)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 mt-1"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADDRESS FORM MODAL
═══════════════════════════════════════════════════════════════ */
const BLANK_FORM = { label: "Home" as AddrLabel, line1: "", line2: "", city: "", state: "", postalCode: "", country: "India", isDefault: false };

function AddressFormModal({
  initial, onSave, onClose, saving,
}: {
  initial?: Partial<typeof BLANK_FORM>;
  onSave: (data: typeof BLANK_FORM) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<typeof BLANK_FORM>({ ...BLANK_FORM, ...initial });
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!form.line1.trim()) { setError("Street address is required."); return; }
    if (!form.city.trim()) { setError("City is required."); return; }
    if (!form.state.trim()) { setError("State is required."); return; }
    if (!form.postalCode.trim()) { setError("Pincode is required."); return; }
    setError("");
    onSave(form);
  }

  const set = (k: keyof typeof BLANK_FORM) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="flex-1" onClick={onClose} />
      <div className="bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: "85%" }}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-black/[0.06]">
          <h3 className="text-base font-bold">{initial?.line1 ? "Edit Address" : "Add New Address"}</h3>
          <button onClick={onClose}><X size={20} color="#9CA3AF" /></button>
        </div>
        <div className="px-5 pt-4 pb-6 overflow-y-auto flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
          {/* Label picker */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Address Type</p>
            <div className="flex gap-2">
              {ADDR_LABELS.map((lbl) => {
                const lc = LABEL_COLORS[lbl];
                const active = form.label === lbl;
                return (
                  <button key={lbl} onClick={() => set("label")(lbl)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                    style={{
                      borderColor: active ? lc.color : "rgba(0,0,0,0.08)",
                      background: active ? lc.bg : "#fff",
                      color: active ? lc.color : "#6B7280",
                    }}>
                    {lbl === "Home" ? "" : lbl === "Work" ? "" : ""}{lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fields */}
          {[
            { key: "line1" as const, label: "Street / Flat No *", placeholder: "e.g. Flat 4B, Sunrise Apartments" },
            { key: "line2" as const, label: "Area / Landmark", placeholder: "e.g. Near City Mall" },
            { key: "city"  as const, label: "City *", placeholder: "e.g. Mumbai" },
            { key: "state" as const, label: "State *", placeholder: "e.g. Maharashtra" },
            { key: "postalCode" as const, label: "Pincode *", placeholder: "e.g. 400001" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <p className="text-xs font-bold text-gray-500 mb-1.5">{label}</p>
              <input
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key)(e.target.value)}
              />
            </div>
          ))}

          {/* Set as default */}
          <button onClick={() => set("isDefault")(!form.isDefault)} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all"
              style={{ borderColor: form.isDefault ? "#5B3EF5" : "rgba(0,0,0,0.2)", background: form.isDefault ? "#5B3EF5" : "#fff" }}>
              {form.isDefault && <Check size={12} color="white" />}
            </div>
            <span className="text-sm font-semibold text-gray-700">Set as default address</span>
          </button>

          {error && <p className="text-red-500 text-xs -mt-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 mt-1"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            {saving ? "Saving…" : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SAVED ADDRESSES SCREEN (Urban Clap style)
═══════════════════════════════════════════════════════════════ */
function SavedAddressesScreen({
  addresses, onBack, onChange,
}: {
  addresses: ApiAddress[];
  onBack: () => void;
  onChange: (addrs: ApiAddress[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editAddr, setEditAddr] = useState<ApiAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const MAX = 4;

  async function handleSave(data: typeof BLANK_FORM) {
    setSaving(true);
    try {
      if (editAddr) {
        const updated = await addressesApi.update(editAddr.id, data);
        onChange(addresses.map((a) => a.id === editAddr.id ? updated : a));
      } else {
        const created = await addressesApi.create(data);
        onChange([...addresses, created]);
      }
      setShowForm(false); setEditAddr(null);
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? "Failed to save address.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await addressesApi.delete(id);
      onChange(addresses.filter((a) => a.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? "Failed to delete.");
    } finally { setDeletingId(null); }
  }

  async function handleSetDefault(id: string) {
    try {
      const updated = await addressesApi.update(id, { isDefault: true });
      // reload all to reflect server-side default toggle
      const all = await addressesApi.list();
      onChange(all);
    } catch { /* ignore */ }
  }

  const canAdd = addresses.length < MAX;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06] bg-white">
        <button onClick={onBack} className="p-1.5 rounded-xl" style={{ background: "#f3f4f6" }}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base font-bold">Saved Addresses</h2>
        <span className="ml-auto text-xs text-gray-400">{addresses.length}/{MAX}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24" style={{ scrollbarWidth: "none" }}>
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#EDE9FD" }}>
              <MapPin size={24} color="#5B3EF5" />
            </div>
            <p className="text-sm font-bold text-gray-700">No addresses saved yet</p>
            <p className="text-xs text-gray-400 text-center">Add your home, work or other addresses for faster booking</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {addresses.map((a) => {
              const lbl = (a.label ?? "Other") as AddrLabel;
              const lc = LABEL_COLORS[lbl] ?? LABEL_COLORS.Other;
              const isDeleting = deletingId === a.id;
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-black/[0.08] shadow-sm overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: lc.bg }}>
                      <MapPin size={17} color={lc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: lc.bg, color: lc.color }}>{a.label ?? "Other"}</span>
                        {a.isDefault && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>Default</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 leading-snug mt-1">{a.line1}</p>
                      {a.line2 && <p className="text-xs text-gray-400">{a.line2}</p>}
                      <p className="text-xs text-gray-500">{[a.city, a.state, a.postalCode].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex border-t border-black/[0.06] divide-x divide-black/[0.06]">
                    {!a.isDefault && (
                      <button onClick={() => handleSetDefault(a.id)} className="flex-1 py-2.5 text-[11px] font-bold text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                        <Check size={11} /> Set Default
                      </button>
                    )}
                    <button onClick={() => { setEditAddr(a); setShowForm(true); }} className="flex-1 py-2.5 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors" style={{ color: "#5B3EF5" }}>
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={() => handleDelete(a.id)} disabled={isDeleting}
                      className="flex-1 py-2.5 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1 disabled:opacity-40">
                      <Trash2 size={11} /> {isDeleting ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-black/[0.06]">
        {canAdd ? (
          <button onClick={() => { setEditAddr(null); setShowForm(true); }}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            <Plus size={16} /> Add New Address
          </button>
        ) : (
          <div className="w-full py-3.5 rounded-2xl text-sm font-bold text-center text-gray-400 border-2 border-dashed border-gray-200">
            Maximum {MAX} addresses reached
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <AddressFormModal
          initial={editAddr ? { ...editAddr, label: (editAddr.label ?? "Other") as AddrLabel } : undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditAddr(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE EDIT MODAL
═══════════════════════════════════════════════════════════════ */
function ProfileEditModal({ user, onSave, onClose }: {
  user: ApiUser;
  onSave: (u: ApiUser) => void;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!fullName.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      const updated = await profileApi.update({ fullName: fullName.trim(), phone: phone.trim() || undefined });
      onSave(updated);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Update failed.");
    } finally { setSaving(false); }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="flex-1" onClick={onClose} />
      <div className="bg-white rounded-t-3xl">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-black/[0.06]">
          <h3 className="text-base font-bold">Edit Profile</h3>
          <button onClick={onClose}><X size={20} color="#9CA3AF" /></button>
        </div>
        <div className="px-5 pt-4 pb-6 flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Full Name</p>
            <input className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Phone</p>
            <input className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Email</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400">{user.email}</div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button onClick={handleSave} disabled={saving} className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME TAB
═══════════════════════════════════════════════════════════════ */
function CustHome({
  user, categories, professionals, featuredServices, favoriteIds, offers, reels, location,
  onToggleFavorite, onBook, onCategorySelect, onLocationPress,
}: {
  user: ApiUser | null;
  categories: ApiCategory[];
  professionals: ApiProfessional[];
  featuredServices: ApiService[];
  favoriteIds: Set<string>;
  offers: ApiOffer[];
  reels: ApiReel[];
  location: string;
  onToggleFavorite: (id: string) => void;
  onBook: (pro: ApiProfessional) => void;
  onCategorySelect: (id: string) => void;
  onLocationPress: () => void;
}) {
  const [offerIdx, setOfferIdx] = useState(0);
  const [activeReel, setActiveReel] = useState<ApiReel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function getYouTubeEmbedUrl(url: string): string {
    try {
      const u = new URL(url);
      let id = '';
      if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1].split('/')[0];
      else id = u.searchParams.get('v') ?? '';
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : url;
    } catch { return url; }
  }

  // Greet based on hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning " : hour < 17 ? "Good afternoon " : "Good evening ";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-2 pb-4" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-medium mb-0.5">{greeting}</p>
            <h1 className="text-white text-xl font-bold">{user?.fullName ?? "Guest"}</h1>
          </div>
          <button className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bell size={18} color="white" />
          </button>
        </div>

        {/* Location bar — clickable */}
        <button onClick={onLocationPress} className="flex items-center gap-1.5 mb-4 group">
          <MapPin size={14} color="rgba(255,255,255,0.9)" />
          <span className="text-white text-xs font-semibold max-w-[220px] truncate">{location}</span>
          <Pencil size={11} color="rgba(255,255,255,0.6)" className="ml-0.5" />
        </button>

        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-3 shadow-lg">
          <Search size={18} color="#9CA3AF" />
          <span className="text-sm text-gray-400">Search for a service...</span>
        </div>
      </div>

      {/* Offers carousel — only if offers exist */}
      {offers.length > 0 && (
        <div className="mt-4 px-5">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-3"
            style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollLeft / el.clientWidth);
              setOfferIdx(idx);
            }}
          >
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="flex-none rounded-2xl overflow-hidden"
                style={{ width: "100%", height: 160, background: offer.bgColor || "#5B3EF5", scrollSnapAlign: "start" }}
              >
                <div className="flex items-center justify-between h-full px-5 py-5">
                  <div className="flex flex-col gap-1.5">
                    {offer.tag && (
                      <p className="text-white/80 text-[10px] font-bold tracking-widest uppercase">{offer.tag}</p>
                    )}
                    <h3 className="text-white font-extrabold text-lg leading-tight">
                      {offer.title}
                    </h3>
                    {offer.subtitle && (
                      <p className="text-white/75 text-xs leading-snug">{offer.subtitle}</p>
                    )}
                    <button
                      className="mt-1 bg-white text-xs font-bold px-4 py-2 rounded-full self-start"
                      style={{ color: offer.bgColor || "#5B3EF5" }}
                    >
                      {offer.ctaText || "Book Now"}
                    </button>
                  </div>
                  <div className="text-6xl opacity-20 select-none"></div>
                </div>
              </div>
            ))}
          </div>
          {/* Dots */}
          {offers.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2.5">
              {offers.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-200"
                  style={{ width: i === offerIdx ? 18 : 6, height: 6, background: i === offerIdx ? "#5B3EF5" : "#d1d5db" }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Services */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Our Services</h2>
          <button className="text-xs font-semibold" style={{ color: "#5B3EF5" }}>See all</button>
        </div>
        {categories.length === 0 ? (
          <div className="grid grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-2xl bg-gray-200" />
                <div className="h-2 w-10 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat) => {
              const Icon = ICON_MAP[cat.iconName] ?? Grid;
              return (
                <button key={cat.id} onClick={() => onCategorySelect(cat.id)} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden" style={{ background: hasRealImage(cat.imageUrl) ? 'transparent' : cat.color }}>
                    {hasRealImage(cat.imageUrl)
                      ? <img src={cat.imageUrl!} alt={cat.name} className="w-full h-full object-cover rounded-2xl" />
                      : <Icon size={22} color={cat.iconColor} />
                    }
                  </div>
                  <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reels */}
      {reels.length > 0 && (
        <div className="px-5 mt-6">
          <h2 className="text-base font-bold text-foreground mb-3">Reels</h2>
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {reels.map((r) => (
              <button
                key={r.id}
                className="relative flex-shrink-0 rounded-xl overflow-hidden"
                style={{ width: 120, height: 176 }}
                onClick={() => setActiveReel(r)}
              >
                {r.thumbnailUrl ? (
                  <img src={r.thumbnailUrl} alt={r.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "#1a1a2e" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.22)" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#222" style={{ marginLeft: 2 }}><path d="M5 3l14 9-14 9V3z"/></svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reel player modal */}
      {activeReel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setActiveReel(null)}
        >
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
            style={{ aspectRatio: "9/16", background: "#000" }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={getYouTubeEmbedUrl(activeReel.videoUrl)}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ border: "none" }}
            />
            <button
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setActiveReel(null)}
            >
              <X size={16} color="#fff" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
              <p className="text-white text-sm font-semibold">{activeReel.title}</p>
            </div>
          </div>
        </div>
      )}

      {/* Featured products */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Featured Services</h2>
        </div>
        {featuredServices.length === 0 ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {featuredServices.slice(0, 4).map((service) => (
              <div key={service.id} className="relative rounded-2xl bg-white border border-black/[0.05] p-3 flex gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(91,62,245,0.08)] transition-all">
                <div className="w-28 h-28 rounded-xl bg-[#F5F3FF] overflow-hidden flex-shrink-0 relative">
                  {service.images?.[0] ? (
                    <img src={service.images[0]} alt={service.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EDE9FD] to-[#F5F3FF]">
                      <Sparkles size={24} color="#C4B5FD" />
                    </div>
                  )}
                  {service.badge && (
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-[#5B3EF5] to-[#7C5BF8] px-2 py-1 rounded-br-xl text-[10px] font-bold text-white shadow-sm">
                      {service.badge}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-bold text-base text-gray-900 leading-tight mb-1 line-clamp-2">{service.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{service.description || "Expert service"}</p>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-sm font-black text-gray-900">₹{service.customerPrice.toLocaleString("en-IN")}</p>
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {service.duration} min
                      </p>
                    </div>
                    <button 
                      onClick={() => onCategorySelect(service.categoryId)} 
                      className="h-8 px-3 rounded-lg text-xs font-bold text-[#5B3EF5] bg-[#F5F3FF] hover:bg-[#EDE9FD] transition-colors"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Why us */}
      <div className="mx-5 mt-5 mb-6 rounded-2xl bg-white border border-black/[0.08] p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Why choose us?</h3>
        <div className="flex justify-between">
          {[
            { icon: Shield, label: "Verified Pros", sub: "Background checked" },
            { icon: Clock,  label: "On Time",       sub: "Punctual service"  },
            { icon: Star,   label: "5-Star Rated",  sub: "Avg 4.8 rating"   },
          ].map((t) => {
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

/* ═══════════════════════════════════════════════════════════════
   SERVICES TAB
═══════════════════════════════════════════════════════════════ */
function CustServices({
  categories, favoriteIds, onToggleFavorite, onBook, initialCategoryId, isLoggedIn, onCartChange,
}: {
  categories: ApiCategory[];
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onBook: (pro: ApiProfessional) => void;
  initialCategoryId?: string | null;
  isLoggedIn: boolean;
  onCartChange: (cart: ApiCart) => void;
}) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(initialCategoryId ?? null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [subs, setSubs] = useState<ApiSubCategory[]>([]);
  const [pros, setPros] = useState<ApiProfessional[]>([]);
  const [prosLoading, setProsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [catalogue, setCatalogue] = useState<ApiService[]>([]);
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  // Sync when home tab navigates here with a category pre-selected
  useEffect(() => {
    setSelectedCatId(initialCategoryId ?? null);
    setSelectedSubId(null);
  }, [initialCategoryId]);

  // Fetch subcategories when selected category changes
  useEffect(() => {
    if (!selectedCatId) { setSubs([]); return; }
    subcategoriesApi.listByCategory(selectedCatId).then(setSubs).catch(() => setSubs([]));
  }, [selectedCatId]);

  // Fetch professionals when filters change
  useEffect(() => {
    setProsLoading(true);
    const params: { categoryId?: string; subCategoryId?: string } = {};
    if (selectedCatId) params.categoryId = selectedCatId;
    if (selectedSubId) params.subCategoryId = selectedSubId;
    professionalsApi.list(params)
      .then(setPros)
      .catch(() => setPros([]))
      .finally(() => setProsLoading(false));
  }, [selectedCatId, selectedSubId]);

  useEffect(() => {
    servicesApi.list({ categoryId: selectedCatId ?? undefined, subCategoryId: selectedSubId ?? undefined, q: search || undefined })
      .then((result) => setCatalogue(result.services))
      .catch(() => setCatalogue([]));
  }, [selectedCatId, selectedSubId, search]);

  useEffect(() => {
    if (isLoggedIn) cartApi.get().then((value) => { setCart(value); onCartChange(value); }).catch(() => undefined);
    else { setCart(null); onCartChange({ id: "", items: [], total: 0 }); }
  }, [isLoggedIn, onCartChange]);

  const addToCart = async (serviceId: string) => {
    if (!isLoggedIn) return;
    const next = await cartApi.add(serviceId);
    setCart(next); onCartChange(next);
  };

  const selectedCat = selectedCatId ? categories.find((c) => c.id === selectedCatId) : null;
  const selectedSub = selectedSubId ? subs.find((s) => s.id === selectedSubId) : null;

  // Never gate the list — show professionals immediately; subcategory is just a filter
  const awaitingSubSelection = false;

  return (
    <div className="flex flex-col">
      {/* Header + search */}
      <div className="px-5 pt-3 pb-4 bg-white border-b border-black/[0.08]">
        <div className="flex items-center gap-3 mb-3">
          {selectedCat && (
            <button
              onClick={() => { setSelectedCatId(null); setSelectedSubId(null); setSubs([]); }}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-black/10"
            >
              <ChevronLeft size={16} color="#6B7280" />
            </button>
          )}
          <h2 className="text-lg font-bold">
            {selectedCat
              ? selectedSub ? `${selectedSub.name}` : `${selectedCat.name}`
              : "All Services"}
          </h2>
        </div>
        <div className="bg-gray-100 rounded-xl flex items-center gap-3 px-4 py-2.5">
          <Search size={16} color="#9CA3AF" />
          <input
            className="text-sm bg-transparent outline-none flex-1 text-gray-700"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-5 mt-5">
        {catalogue.length > 0 && (
          <section className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Book a service</h3>
              <button onClick={() => setCartOpen(true)} className="text-xs font-bold text-violet-600">
                Cart{cart?.items.length ? ` (${cart.items.reduce((n, item) => n + item.quantity, 0)})` : ""}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {catalogue.map((service) => (
                <div key={service.id} className="group relative rounded-2xl bg-white border border-black/[0.05] p-3 flex gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(91,62,245,0.08)] transition-all">
                  <div className="w-28 h-28 rounded-xl bg-[#F5F3FF] overflow-hidden flex-shrink-0 relative">
                    {service.images?.[0] ? (
                      <img src={service.images[0]} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EDE9FD] to-[#F5F3FF]">
                        <Sparkles size={24} color="#C4B5FD" />
                      </div>
                    )}
                    {service.badge && (
                      <div className="absolute top-0 left-0 bg-gradient-to-r from-[#5B3EF5] to-[#7C5BF8] px-2 py-1 rounded-br-xl text-[10px] font-bold text-white shadow-sm">
                        {service.badge}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-bold text-base text-gray-900 leading-tight mb-1 line-clamp-2">{service.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{service.description || "Professional service"}</p>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="text-sm font-black text-gray-900">₹{service.customerPrice.toLocaleString("en-IN")}</p>
                        <p className="text-[10px] font-semibold text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {service.duration} min
                        </p>
                      </div>
                      <button
                        onClick={() => addToCart(service.id)}
                        disabled={!isLoggedIn}
                        className="h-8 px-4 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#5B3EF5] to-[#7C5BF8] disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-400 shadow-sm"
                      >
                        {isLoggedIn ? "+ Add" : "Sign in"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── No category selected: show category icon grid ── */}
        {!selectedCatId && (
          <>
            <h3 className="text-sm font-bold mb-3">Browse by Category</h3>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((cat) => {
                const Icon = ICON_MAP[cat.iconName] ?? Grid;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCatId(cat.id); setSelectedSubId(null); }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden" style={{ background: hasRealImage(cat.imageUrl) ? 'transparent' : cat.color }}>
                      {hasRealImage(cat.imageUrl)
                        ? <img src={cat.imageUrl!} alt={cat.name} className="w-full h-full object-cover rounded-2xl" />
                        : <Icon size={22} color={cat.iconColor} />
                      }
                    </div>
                    <span className="text-[11px] font-semibold text-center leading-tight">{cat.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-5">Choose a category to browse available services.</p>
          </>
        )}

        {/* ── Category selected: show subcategory grid ── */}
        {selectedCatId && subs.length > 0 && (
          <>
            <h3 className="text-sm font-bold mb-3">
              {selectedCat?.name} — Pick a Service Type
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {/* ── All tile ── */}
              <button
                className="flex flex-col items-center gap-1.5"
                onClick={() => setSelectedSubId(null)}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all"
                  style={{ background: "#5B3EF5" }}
                >
                  <Grid size={22} color="#fff" />
                </div>
                <span
                  className="text-[11px] font-semibold text-center leading-tight"
                  style={{ color: selectedSubId === null ? "#5B3EF5" : undefined }}
                >All</span>
              </button>

              {subs.map((s) => {
                const isSelected = selectedSubId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubId(isSelected ? null : s.id)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all overflow-hidden"
                      style={{ background: hasRealImage(s.imageUrl) ? "transparent" : (isSelected ? "#5B3EF5" : (s.color || "#5B3EF5")) }}
                    >
                      {hasRealImage(s.imageUrl)
                        ? <img src={s.imageUrl!} alt={s.name} className="w-full h-full object-cover rounded-2xl" />
                        : (() => { const SubIcon = getSubIcon(s.name); return <SubIcon size={22} color={s.iconColor || "#fff"} />; })()
                      }
                    </div>
                    <span
                      className="text-[11px] font-semibold text-center leading-tight"
                      style={{ color: isSelected ? "#5B3EF5" : undefined }}
                    >{s.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Category selected, no subcategories: skip the grid ── */}

      </div>
      <div className="h-6" />
      {cartOpen && cart && (
        <CartSheet
          cart={cart}
          onClose={() => setCartOpen(false)}
          onChange={(next) => { setCart(next); onCartChange(next); }}
        />
      )}
    </div>
  );
}

function CartSheet({ cart, onClose, onChange }: { cart: ApiCart; onClose: () => void; onChange: (cart: ApiCart) => void }) {
  const [saving, setSaving] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const checkout = async () => {
    if (!scheduledAt || !cart.items.length) return;
    setSaving(true);
    try {
      await cartApi.checkout({ scheduledAt: new Date(scheduledAt).toISOString() });
      onChange({ ...cart, items: [], total: 0 });
      onClose();
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-[390px] bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Your cart</h3>
          <button onClick={onClose}><X size={20} color="#6B7280" /></button>
        </div>
        {cart.items.length === 0 ? <p className="text-sm text-gray-400 py-8 text-center">Your cart is empty.</p> : (
          <>
            <div className="flex flex-col gap-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 border-b border-black/5 pb-3">
                  <div className="flex-1"><p className="font-semibold text-sm">{item.name}</p><p className="text-xs text-gray-400">₹{item.unitPrice} each</p></div>
                  <button onClick={async () => onChange(await cartApi.update(item.id, Math.max(1, item.quantity - 1)))} className="w-7 h-7 rounded-lg bg-gray-100">−</button>
                  <span className="text-sm font-bold">{item.quantity}</span>
                  <button onClick={async () => onChange(await cartApi.update(item.id, item.quantity + 1))} className="w-7 h-7 rounded-lg bg-violet-50 text-violet-700">+</button>
                  <button onClick={async () => onChange(await cartApi.remove(item.id))} className="ml-1"><Trash2 size={15} color="#EF4444" /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold mt-4"><span>Total</span><span>₹{cart.total.toLocaleString("en-IN")}</span></div>
            <label className="block text-xs font-semibold text-gray-500 mt-4 mb-1">Preferred date and time</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
            <button disabled={!scheduledAt || saving} onClick={checkout} className="w-full mt-4 rounded-xl bg-violet-600 py-3 text-white font-bold text-sm disabled:opacity-50">
              {saving ? "Confirming…" : "Confirm booking"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOOKINGS TAB
═══════════════════════════════════════════════════════════════ */
/* ── Payment Modal ──────────────────────────────────────────────────── */
function PaymentModal({ booking, onClose, onPaid }: {
  booking: ApiBooking;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [config, setConfig] = useState<{ methods: string[]; upiVpa: string | null } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);
  const [existingPayment, setExistingPayment] = useState<ApiPayment | null>(null);

  useEffect(() => {
    getPaymentConfig().then(cfg => {
      setConfig(cfg);
      if (cfg.methods.length > 0) setSelectedMethod(cfg.methods[0]);
    }).catch(console.error);
    bookingsApi.getPayment(booking.id).then(p => {
      if (p?.status === 'paid') setPaid(true);
      setExistingPayment(p);
    }).catch(() => {});
  }, [booking.id]);

  const handlePay = async () => {
    if (!selectedMethod) return;
    setSubmitting(true);
    try {
      await bookingsApi.submitPayment(booking.id, selectedMethod, notes || undefined);
      setPaid(true);
      setTimeout(() => { onPaid(); onClose(); }, 1500);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message ?? 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const METHOD_LABELS: Record<string, { icon: React.ReactNode; label: string; desc: string }> = {
    cash:       { icon: <Banknote size={20} color="#10B981" />, label: "Cash on Delivery", desc: "Pay the professional in cash" },
    upi_manual: { icon: <Smartphone size={20} color="#3B82F6" />, label: "UPI Payment",      desc: config?.upiVpa ? `Pay to ${config.upiVpa}` : "Pay via UPI" },
    razorpay:   { icon: <CreditCard size={20} color="#6366F1" />, label: "Card / Net Banking / UPI", desc: "Secure online payment" },
  };

  if (paid) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="w-full max-w-sm bg-white rounded-t-3xl p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"><Check size={32} color="#10B981" /></div>
          <h3 className="text-lg font-bold text-gray-900">Payment Successful!</h3>
          <p className="text-sm text-gray-500 text-center">Thank you for using ServeNow. Your payment has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-sm bg-white rounded-t-3xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-gray-900">Complete Payment</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 leading-none"><X size={20} /></button>
          </div>
          <p className="text-xs text-gray-500">{booking.serviceName} · {booking.proName}</p>
          <div className="mt-3 bg-violet-50 rounded-xl px-4 py-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-violet-700">₹{booking.price}</span>
            <span className="text-xs text-violet-400 font-medium">total</span>
          </div>
        </div>

        {/* Payment methods */}
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Choose payment method</p>
          {!config ? (
            <div className="text-center py-4 text-gray-400 text-sm">Loading…</div>
          ) : config.methods.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">No payment methods configured.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {config.methods.map(method => {
                const info = METHOD_LABELS[method] ?? { icon: <CreditCard size={20} />, label: method, desc: "" };
                const selected = selectedMethod === method;
                return (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    className="flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left"
                    style={{ borderColor: selected ? "#5B3EF5" : "#F3F4F6", background: selected ? "#F5F3FF" : "#FAFAFA" }}
                  >
                    <span className="text-xl w-8 text-center flex-shrink-0">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{info.label}</p>
                      <p className="text-xs text-gray-500 truncate">{info.desc}</p>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: selected ? "#5B3EF5" : "#D1D5DB", background: selected ? "#5B3EF5" : "transparent" }}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* UPI VPA display */}
          {selectedMethod === 'upi_manual' && config?.upiVpa && (
            <div className="mt-3 bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">UPI ID to pay</p>
              <p className="text-base font-bold text-blue-900 font-mono select-all">{config.upiVpa}</p>
              <p className="text-xs text-blue-500 mt-1">After paying, enter transaction ID below</p>
            </div>
          )}

          {/* Notes / transaction ref */}
          {(selectedMethod === 'upi_manual') && (
            <div className="mt-3">
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="UPI transaction ID (optional)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400"
              />
            </div>
          )}
        </div>

        {/* Pay button */}
        <div className="px-5 pb-8">
          <button
            onClick={handlePay}
            disabled={!selectedMethod || submitting || !config}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg,#5B3EF5,#7C5BF8)" }}
          >
            {submitting ? "Processing…" : selectedMethod === 'cash' ? "Confirm Cash Payment" : selectedMethod === 'upi_manual' ? "Confirm UPI Payment" : `Pay ₹${booking.price}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustBookings({ bookings, onCancel, onRefresh }: {
  bookings: ApiBooking[];
  onCancel: (id: string) => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [payBooking, setPayBooking] = useState<ApiBooking | null>(null);

  const upcoming = bookings.filter((b) => ["pending", "upcoming", "in_progress"].includes(b.status));
  const past = bookings.filter((b) => ["completed", "cancelled"].includes(b.status));
  const filtered = tab === "upcoming" ? upcoming : past;

  async function handleCancel(id: string) {
    setCancelling(id);
    try {
      await bookingsApi.cancel(id);
      onCancel(id);
    } finally {
      setCancelling(null);
    }
  }

  return (
    <>
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-4 bg-white border-b border-black/[0.08] flex items-center justify-between">
        <h2 className="text-lg font-bold">My Bookings</h2>
        <button onClick={onRefresh} className="text-xs font-semibold" style={{ color: "#5B3EF5" }}>Refresh</button>
      </div>
      <div className="flex mx-5 mt-4 bg-gray-100 rounded-xl p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 rounded-lg text-sm font-bold capitalize"
            style={{ background: tab === t ? "#fff" : "transparent", color: tab === t ? "#5B3EF5" : "#9CA3AF", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {t} {t === "upcoming" ? `(${upcoming.length})` : `(${past.length})`}
          </button>
        ))}
      </div>
      <div className="px-5 mt-4 flex flex-col gap-4">
        {filtered.map((b) => {
          const sc = statusColors(b.status);
          return (
            <div key={b.id} className="bg-white rounded-2xl border border-black/[0.08] p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold">{b.serviceName}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{b.proName}</p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>{statusLabel(b.status)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Calendar size={13} /><span>{formatScheduledAt(b.scheduledAt)}</span></div>
              <div className="text-xs font-semibold text-gray-600 mb-3">₹{b.price}</div>
              {b.notes && <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-3">{b.notes}</p>}
              <div className="flex gap-2">
                {["pending", "upcoming"].includes(b.status) && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={cancelling === b.id}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-500 disabled:opacity-50">
                    {cancelling === b.id ? "Cancelling…" : "Cancel"}
                  </button>
                )}
                {b.status === "completed" && (
                  <button
                    onClick={() => setPayBooking(b)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#5B3EF5,#7C5BF8)" }}>
                    Pay Now
                  </button>
                )}
                {b.status === "completed" && (
                  <button className="flex-1 py-2 rounded-xl text-xs font-bold border border-black/[0.08]">Rate Service</button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3"></div>
            <p className="text-sm font-bold">No {tab} bookings</p>
            <p className="text-xs text-gray-400 mt-1">{tab === "upcoming" ? "Book a service to get started" : "Completed bookings will appear here"}</p>
          </div>
        )}
      </div>
    </div>

    {payBooking && (
      <PaymentModal
        booking={payBooking}
        onClose={() => setPayBooking(null)}
        onPaid={() => { setPayBooking(null); onRefresh(); }}
      />
    )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE TAB
═══════════════════════════════════════════════════════════════ */
function CustProfile({
  user, onLogout, onShowAddresses, onEditProfile,
}: {
  user: ApiUser;
  onLogout: () => void;
  onShowAddresses: () => void;
  onEditProfile: (u: ApiUser) => void;
}) {
  const [showEdit, setShowEdit] = useState(false);

  const menuItems = [
    { icon: MapPin,  label: "Saved Addresses",    action: onShowAddresses },
    { icon: Heart,   label: "Wishlist",            action: () => {} },
    { icon: Shield,  label: "Privacy & Security",  action: () => {} },
    { icon: Bell,    label: "Notifications",       action: () => {} },
    { icon: Star,    label: "Rate the App",        action: () => {} },
  ];

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-6 relative" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
        <div className="flex items-center gap-4">
          <img
            src={user.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&size=64&background=ffffff&color=5b3ef5`}
            alt={user.fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-lg font-bold truncate">{user.fullName}</h2>
            {user.phone && <p className="text-white/70 text-xs">{user.phone}</p>}
            <p className="text-white/70 text-xs truncate">{user.email}</p>
          </div>
          <button onClick={() => setShowEdit(true)} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Pencil size={14} color="white" />
          </button>
        </div>
      </div>

      <div className="px-5 mt-4 flex flex-col gap-2">
        {menuItems.map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.label} onClick={m.action} className="flex items-center justify-between bg-white rounded-2xl border border-black/[0.08] px-4 py-3.5 shadow-sm active:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EDE9FD" }}>
                  <Icon size={15} color="#5B3EF5" />
                </div>
                <span className="text-sm font-semibold">{m.label}</span>
              </div>
              <ChevronRight size={16} color="#9CA3AF" />
            </button>
          );
        })}

        <button onClick={onLogout} className="mt-2 py-3.5 rounded-2xl text-sm font-bold text-red-500 border-2 border-red-100 bg-red-50">
          Sign Out
        </button>
      </div>

      <div className="h-6" />

      {showEdit && (
        <ProfileEditModal
          user={user}
          onSave={(updated) => { onEditProfile(updated); setShowEdit(false); }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER APP (root)
═══════════════════════════════════════════════════════════════ */
const CUST_TABS = [
  { id: "home",     icon: Home,     label: "Home"     },
  { id: "services", icon: Grid,     label: "Services" },
  { id: "bookings", icon: BookOpen, label: "Bookings" },
  { id: "profile",  icon: User,     label: "Profile"  },
];

const LOC_KEY = "sn_location";

export default function CustomerApp() {
  // Auth
  const [user, setUser] = useState<ApiUser | null>(() => auth.getUser());
  const [isLoggedIn, setIsLoggedIn] = useState(() => auth.isLoggedIn());

  // Navigation
  const [activeTab, setActiveTab] = useState("home");
  const [profileScreen, setProfileScreen] = useState<"main" | "addresses">("main");

  // Data
  const [categories, setCategories]       = useState<ApiCategory[]>([]);
  const [servicesInitCatId, setServicesInitCatId] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<ApiProfessional[]>([]);
  const [featuredServices, setFeaturedServices] = useState<ApiService[]>([]);
  const [bookings, setBookings]           = useState<ApiBooking[]>([]);
  const [favoriteIds, setFavoriteIds]     = useState<Set<string>>(new Set());
  const [offers, setOffers]               = useState<ApiOffer[]>([]);
  const [reels, setReels]                 = useState<ApiReel[]>([]);
  const [addresses, setAddresses]         = useState<ApiAddress[]>([]);
  const [cart, setCart]                   = useState<ApiCart>({ id: "", items: [], total: 0 });

  // Location
  const [location, setLocation] = useState<string>(() => localStorage.getItem(LOC_KEY) ?? "Set your location");
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Booking modal
  const [bookingPro, setBookingPro] = useState<ApiProfessional | null>(null);

  // Load public data on mount
  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(console.error);
    professionalsApi.list().then((data) => {
      setProfessionals(data);
      setFavoriteIds(new Set(data.filter((p) => p.isFavorite).map((p) => p.id)));
    }).catch(console.error);
    servicesApi.featured().then((data) => setFeaturedServices(data.services)).catch(console.error);
    offersApi.list().then(setOffers).catch(console.error);
    reelsApi.listActive().then(setReels).catch(console.error);
  }, []);

  // Load auth-required data when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    bookingsApi.list().then(setBookings).catch(console.error);
    professionalsApi.list().then((data) => {
      setProfessionals(data);
      setFavoriteIds(new Set(data.filter((p) => p.isFavorite).map((p) => p.id)));
    }).catch(console.error);
    addressesApi.list().then(setAddresses).catch(console.error);
  }, [isLoggedIn]);

  const handleLogin = useCallback((u: ApiUser, accessToken: string, refreshToken: string) => {
    auth.store(accessToken, refreshToken, u);
    setUser(u);
    setIsLoggedIn(true);
  }, []);

  const handleLogout = useCallback(async () => {
    const rt = auth.getRefreshToken();
    if (rt) { try { await authApi.logout(rt); } catch { /* ignore */ } }
    auth.clear();
    setUser(null);
    setIsLoggedIn(false);
    setBookings([]);
    setFavoriteIds(new Set());
    setAddresses([]);
    setCart({ id: "", items: [], total: 0 });
    setActiveTab("home");
    setProfileScreen("main");
  }, []);

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!isLoggedIn) { setActiveTab("profile"); return; }
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      const { isFavorite } = await favoritesApi.toggle(id);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFavorite ? next.add(id) : next.delete(id);
        return next;
      });
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  }, [isLoggedIn]);

  const handleBook = useCallback((pro: ApiProfessional) => {
    if (!isLoggedIn) { setActiveTab("profile"); return; }
    setBookingPro(pro);
  }, [isLoggedIn]);

  const handleBooked = useCallback((booking: ApiBooking) => {
    setBookings((prev) => [booking, ...prev]);
    setTimeout(() => setBookingPro(null), 4000);
  }, []);

  const handleCancelBooking = useCallback((id: string) => {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" as const } : b));
  }, []);

  const handleCategorySelect = useCallback((id: string) => {
    setServicesInitCatId(id);
    setActiveTab("services");
  }, []);

  const refreshBookings = useCallback(() => {
    if (!isLoggedIn) return;
    bookingsApi.list().then(setBookings).catch(console.error);
  }, [isLoggedIn]);

  const handleSelectLocation = useCallback((loc: string) => {
    setLocation(loc);
    localStorage.setItem(LOC_KEY, loc);
    setShowLocationPicker(false);
  }, []);

  // Show login when accessing auth-required tabs while logged out
  if (!isLoggedIn && (activeTab === "bookings" || activeTab === "profile")) {
    return (
      <div className="flex flex-col items-center">
        <LoginScreen onLogin={handleLogin} />
        <button onClick={() => setActiveTab("home")} className="mt-3 text-white/60 text-xs font-semibold">← Back to home</button>
      </div>
    );
  }

  // Profile: addresses sub-screen
  if (activeTab === "profile" && profileScreen === "addresses" && user) {
    return (
      <PhoneFrame statusDark>
        <div className="flex-1 overflow-y-auto relative" style={{ scrollbarWidth: "none" }}>
          <SavedAddressesScreen
            addresses={addresses}
            onBack={() => setProfileScreen("main")}
            onChange={setAddresses}
          />
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame statusDark>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {activeTab === "home" && (
          <CustHome
            featuredServices={featuredServices}
            user={user}
            categories={categories}
            professionals={professionals}
            favoriteIds={favoriteIds}
            offers={offers}
            reels={reels}
            location={location}
            onToggleFavorite={handleToggleFavorite}
            onBook={handleBook}
            onCategorySelect={handleCategorySelect}
            onLocationPress={() => setShowLocationPicker(true)}
          />
        )}
        {activeTab === "services" && (
          <CustServices
            categories={categories}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onBook={handleBook}
            initialCategoryId={servicesInitCatId}
            isLoggedIn={isLoggedIn}
            onCartChange={setCart}
          />
        )}
        {activeTab === "bookings" && (
          <CustBookings
            bookings={bookings}
            onCancel={handleCancelBooking}
            onRefresh={refreshBookings}
          />
        )}
        {activeTab === "profile" && user && (
          <CustProfile
            user={user}
            onLogout={handleLogout}
            onShowAddresses={() => setProfileScreen("addresses")}
            onEditProfile={(updated) => {
              setUser(updated);
              auth.store(auth.getToken()!, auth.getRefreshToken()!, updated);
            }}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t border-black/[0.08] flex items-center justify-around px-2 pb-4 pt-2 z-20">
        {CUST_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setProfileScreen("main"); }} className="flex flex-col items-center gap-0.5 px-4 py-1">
              <div className="p-1.5 rounded-xl" style={{ background: active ? "#EDE9FD" : "transparent" }}>
                <Icon size={20} color={active ? "#5B3EF5" : "#9CA3AF"} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: active ? "#5B3EF5" : "#9CA3AF" }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Location picker modal */}
      {showLocationPicker && (
        <LocationPickerModal
          current={location}
          addresses={addresses}
          onSelect={handleSelectLocation}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Booking modal */}
      {bookingPro && (
        <BookingModal
          pro={bookingPro}
          onClose={() => setBookingPro(null)}
          onBooked={handleBooked}
        />
      )}
    </PhoneFrame>
  );
}
