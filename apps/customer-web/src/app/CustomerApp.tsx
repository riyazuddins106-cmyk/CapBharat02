import { useState, useEffect, useCallback } from "react";
import {
  Search, MapPin, Star, ChevronRight, Bell, Heart, Home, Grid, BookOpen,
  User, Clock, Shield, Sparkles, Wrench, Scissors, Zap, Droplets, Paintbrush,
  Wind, ChevronLeft, X, Calendar, ArrowRight,
} from "lucide-react";
import {
  auth, authApi, categoriesApi, professionalsApi, bookingsApi, favoritesApi,
  type ApiUser, type ApiCategory, type ApiProfessional, type ApiBooking,
} from "../lib/api";

/* ─────────────────────────── Icon map ──────────────────────────── */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Sparkles, Wrench, Zap, Scissors, Paintbrush, Wind, Droplets, Grid,
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

// Defined OUTSIDE LoginScreen so the component reference is stable across
// re-renders. If defined inside, React sees a new component type on every
// keystroke, unmounts the old <input>, and mounts a fresh one — losing focus
// and making the field appear uneditable.
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
      await authApi.register(fullName, email, password, phone || undefined);
      setOtpPurpose("signup");
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
      await authApi.forgotPassword(email);
      setOtpPurpose("password_reset");
      setSuccess("Reset code sent to your email.");
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
          <h2 className="text-xl font-bold mb-1">Welcome back 👋</h2>
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
          {success && <p className="text-green-600 text-xs mb-3">{success}</p>}
          <AuthInput placeholder="Enter 6-digit OTP" value={otp} onChange={setOtp} />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="mt-5"><AuthBtn label="Verify OTP" onClick={handleVerifyOtp} loading={loading} /></div>
          <button onClick={async () => { setError(""); await authApi.resendOtp(email, otpPurpose); setSuccess("Code resent!"); }} className="text-xs font-semibold mt-4 text-center w-full text-gray-400">
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
function BookingModal({ pro, onClose, onBooked }: {
  pro: ApiProfessional;
  onClose: () => void;
  onBooked: (booking: ApiBooking) => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("Today");
  const [selectedTime, setSelectedTime] = useState("3:00 PM");
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
  const times = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM"];

  async function confirmBooking() {
    setError(""); setLoading(true);
    try {
      const scheduledAt = buildScheduledAt(selectedDate, selectedTime);
      const booking = await bookingsApi.create(pro.id, scheduledAt, notes || undefined);
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
                <button key={d} onClick={() => setSelectedDate(d)}
                  className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={{ background: selectedDate === d ? "#5B3EF5" : "#fff", color: selectedDate === d ? "#fff" : "#6B7280", borderColor: selectedDate === d ? "#5B3EF5" : "rgba(0,0,0,0.1)" }}>
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold mb-2.5">Select Time</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {times.map((t) => (
                <button key={t} onClick={() => setSelectedTime(t)}
                  className="py-2.5 rounded-xl text-xs font-bold border transition-all"
                  style={{ background: selectedTime === t ? "#5B3EF5" : "#fff", color: selectedTime === t ? "#fff" : "#6B7280", borderColor: selectedTime === t ? "#5B3EF5" : "rgba(0,0,0,0.1)" }}>
                  {t}
                </button>
              ))}
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
   HOME TAB
═══════════════════════════════════════════════════════════════ */
function CustHome({
  user, categories, professionals, favoriteIds, onToggleFavorite, onBook, onCategoryFilter,
}: {
  user: ApiUser | null;
  categories: ApiCategory[];
  professionals: ApiProfessional[];
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onBook: (pro: ApiProfessional) => void;
  onCategoryFilter: (name: string) => void;
}) {
  const featured = professionals.slice(0, 3);
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-2 pb-4" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-medium mb-0.5">Good morning 👋</p>
            <h1 className="text-white text-xl font-bold">{user?.fullName ?? "Guest"}</h1>
          </div>
          <button className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bell size={18} color="white" />
          </button>
        </div>
        <div className="flex items-center gap-1 mb-4">
          <MapPin size={14} color="rgba(255,255,255,0.8)" />
          <span className="text-white/80 text-xs font-medium">Mumbai, India</span>
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
                <button key={cat.id} onClick={() => onCategoryFilter(cat.name)} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: cat.color }}>
                    <Icon size={22} color={cat.iconColor} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Featured Professionals</h2>
        </div>
        {featured.length === 0 ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {featured.map((pro) => (
              <ProCard key={pro.id} pro={pro} wishlisted={favoriteIds.has(pro.id)} onWishlist={() => onToggleFavorite(pro.id)} onBook={() => onBook(pro)} />
            ))}
          </div>
        )}
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

/* ═══════════════════════════════════════════════════════════════
   SERVICES TAB
═══════════════════════════════════════════════════════════════ */
function CustServices({
  categories, professionals, favoriteIds, onToggleFavorite, onBook,
}: {
  categories: ApiCategory[];
  professionals: ApiProfessional[];
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onBook: (pro: ApiProfessional) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = professionals.filter((p) => {
    const matchesCat = !selected || categories.find((c) => c.id === p.categoryId)?.name === selected;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.title.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-4 bg-white border-b border-black/[0.08]">
        <h2 className="text-lg font-bold mb-3">All Services</h2>
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

      <div className="px-5 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setSelected(null)}
            className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{ background: !selected ? "#5B3EF5" : "#fff", color: !selected ? "#fff" : "#6B7280", borderColor: !selected ? "#5B3EF5" : "rgba(0,0,0,0.1)" }}>
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelected(selected === cat.name ? null : cat.name)}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all"
              style={{ background: selected === cat.name ? "#5B3EF5" : "#fff", color: selected === cat.name ? "#fff" : "#6B7280", borderColor: selected === cat.name ? "#5B3EF5" : "rgba(0,0,0,0.1)" }}>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-3 mt-4">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] ?? Grid;
            return (
              <button key={cat.id} onClick={() => setSelected(selected === cat.name ? null : cat.name)} className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: selected === cat.name ? "#5B3EF5" : cat.color }}>
                  <Icon size={22} color={selected === cat.name ? "#fff" : cat.iconColor} />
                </div>
                <span className="text-[11px] font-semibold text-center leading-tight">{cat.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-bold mb-3">
            {selected ? `${selected} Professionals` : "All Professionals"}
            <span className="text-gray-400 font-normal ml-1">({filtered.length})</span>
          </h3>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-bold">No professionals found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((pro) => (
                <ProCard key={pro.id} pro={pro} wishlisted={favoriteIds.has(pro.id)} onWishlist={() => onToggleFavorite(pro.id)} onBook={() => onBook(pro)} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="h-6" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOOKINGS TAB
═══════════════════════════════════════════════════════════════ */
function CustBookings({ bookings, onCancel, onRefresh }: {
  bookings: ApiBooking[];
  onCancel: (id: string) => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);

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
                  <button className="flex-1 py-2 rounded-xl text-xs font-bold border border-black/[0.08]">Rate Service</button>
                )}
                {["pending", "upcoming"].includes(b.status) && (
                  <button className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "#5B3EF5" }}>Track</button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-bold">No {tab} bookings</p>
            <p className="text-xs text-gray-400 mt-1">{tab === "upcoming" ? "Book a service to get started" : "Completed bookings will appear here"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE TAB
═══════════════════════════════════════════════════════════════ */
function CustProfile({ user, onLogout }: { user: ApiUser; onLogout: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-6" style={{ background: "linear-gradient(135deg,#5b3ef5,#7c5bf8)" }}>
        <div className="flex items-center gap-4">
          <img
            src={user.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&size=64&background=ffffff&color=5b3ef5`}
            alt={user.fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40"
          />
          <div>
            <h2 className="text-white text-lg font-bold">{user.fullName}</h2>
            {user.phone && <p className="text-white/70 text-xs">{user.phone}</p>}
            <p className="text-white/70 text-xs">{user.email}</p>
          </div>
        </div>
      </div>
      <div className="px-5 mt-4 flex flex-col gap-2">
        {[
          { icon: MapPin, label: "Saved Addresses" },
          { icon: Heart, label: "Wishlist" },
          { icon: Shield, label: "Privacy & Security" },
          { icon: Bell, label: "Notifications" },
          { icon: Star, label: "Rate the App" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.label} className="flex items-center justify-between bg-white rounded-2xl border border-black/[0.08] px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EDE9FD" }}><Icon size={15} color="#5B3EF5" /></div>
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

export default function CustomerApp() {
  // Auth state
  const [user, setUser] = useState<ApiUser | null>(() => auth.getUser());
  const [isLoggedIn, setIsLoggedIn] = useState(() => auth.isLoggedIn());

  // Navigation
  const [activeTab, setActiveTab] = useState("home");

  // Data
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [professionals, setProfessionals] = useState<ApiProfessional[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Booking modal
  const [bookingPro, setBookingPro] = useState<ApiProfessional | null>(null);

  // Load public data on mount
  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(console.error);
    professionalsApi.list().then((data) => {
      setProfessionals(data);
      setFavoriteIds(new Set(data.filter((p) => p.isFavorite).map((p) => p.id)));
    }).catch(console.error);
  }, []);

  // Load auth-required data when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    bookingsApi.list().then(setBookings).catch(console.error);
    // Refresh professionals with isFavorite set
    professionalsApi.list().then((data) => {
      setProfessionals(data);
      setFavoriteIds(new Set(data.filter((p) => p.isFavorite).map((p) => p.id)));
    }).catch(console.error);
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
    setActiveTab("home");
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
    } catch { /* revert optimistic update */
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
    if (bookingPro) {
      // After a short delay, close modal (step 3 is shown inside BookingModal)
      setTimeout(() => setBookingPro(null), 3000);
    }
  }, [bookingPro]);

  const handleCancelBooking = useCallback((id: string) => {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" as const } : b));
  }, []);

  const handleCategoryFilter = useCallback((_name: string) => {
    setActiveTab("services");
  }, []);

  const refreshBookings = useCallback(() => {
    if (!isLoggedIn) return;
    bookingsApi.list().then(setBookings).catch(console.error);
  }, [isLoggedIn]);

  // Show login screen when accessing auth-required tabs while logged out
  if (!isLoggedIn && (activeTab === "bookings" || activeTab === "profile")) {
    return (
      <div className="flex flex-col items-center">
        <LoginScreen onLogin={handleLogin} />
        <button onClick={() => setActiveTab("home")} className="mt-3 text-white/60 text-xs font-semibold">← Back to home</button>
      </div>
    );
  }

  return (
    <PhoneFrame statusDark>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {activeTab === "home" && (
          <CustHome
            user={user}
            categories={categories}
            professionals={professionals}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onBook={handleBook}
            onCategoryFilter={handleCategoryFilter}
          />
        )}
        {activeTab === "services" && (
          <CustServices
            categories={categories}
            professionals={professionals}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onBook={handleBook}
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
          <CustProfile user={user} onLogout={handleLogout} />
        )}
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t border-black/[0.08] flex items-center justify-around px-2 pb-4 pt-2 z-20">
        {CUST_TABS.map((tab) => {
          const Icon = tab.icon;
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

      {/* Booking modal */}
      {bookingPro && (
        <BookingModal
          pro={bookingPro}
          onClose={() => setBookingPro(null)}
          onBooked={(booking) => {
            handleBooked(booking);
            // show success step then auto-close
            setTimeout(() => setBookingPro(null), 4000);
          }}
        />
      )}
    </PhoneFrame>
  );
}
