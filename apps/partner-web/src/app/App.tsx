import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Briefcase, DollarSign, User, Bell,
  LogOut, CheckCircle, Clock, XCircle, Loader2, TrendingUp,
  Star, RefreshCw, X, Check, AlertCircle, Pencil, Lock,
  Calendar, ChevronDown, ChevronLeft, ChevronRight, Phone, FileText, Menu, BarChart2, Zap,
  Upload, Shield, ArrowLeft, Eye, Trash2, History as HistoryIcon,
  QrCode, Wrench, MapPin, MessageCircle, Navigation, CircleDot,
} from 'lucide-react';
import {
  authApi, partnerApi, notificationsApi, categoriesApi, payoutsApi, documentsApi, setRefreshHandler,
  type Job, type JobStatus, type Earnings, type PartnerProfile, type Category,
  type OrderItemJob,
  type AppNotification, type AuthTokens, type Payout, type PartnerDocument,
  type DocumentTypeConfig, type PartnerDocumentHistory,
  type PartnerScheduleJob, type PartnerPerformance, type PartnerEvidence,
} from '@/lib/api';
import { QRScannerModal } from '@/components/QRScannerModal';

/* ─── Design tokens (exact match to admin panel) ──────────────────── */
const CARD      = { background: 'rgba(255,255,255,0.04)' } as const;
const MODAL_BG  = { background: '#1a2035' } as const;
const INPUT_STY = { background: 'rgba(255,255,255,0.05)', WebkitAppearance: 'none' } as const;
const ACCENT    = 'linear-gradient(135deg,#5b3ef5,#7c5bf8)';

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function fmtDate(s: string) {
  return new Date(s).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type PayoutStatusFilter = 'all' | 'pending' | 'processing' | 'paid' | 'rejected';

const PAYOUT_STATUS_FILTERS: { key: PayoutStatusFilter; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Rejected' },
];

function payoutStatusKey(status: string): Exclude<PayoutStatusFilter, 'all'> {
  if (status === 'paid') return 'paid';
  if (status === 'rejected') return 'rejected';
  if (status === 'approved' || status === 'processing') return 'processing';
  return 'pending';
}

function payoutDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPayoutFilterDate(date: Date) {
  const today = new Date();
  if (payoutDateKey(date) === payoutDateKey(today)) return 'Today';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPayoutRange(start: Date, end: Date | null) {
  if (!end || payoutDateKey(start) === payoutDateKey(end)) return formatPayoutFilterDate(start);
  return `${formatPayoutFilterDate(start)} – ${formatPayoutFilterDate(end)}`;
}

function payoutCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
  ];
}

function Schedule({ token }: { token: string }) {
  const [days, setDays] = useState<PartnerScheduleJob[]>([]);
  const [performance, setPerformance] = useState<PartnerPerformance | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  const dateKey = (date: Date) => date.toISOString().slice(0, 10);
  const dateOptions = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return { key: dateKey(date), date };
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = dateKey(new Date());
      const end = new Date();
      end.setDate(end.getDate() + 6);
      const [schedule, stats] = await Promise.all([
        partnerApi.getSchedule(from, dateKey(end), token),
        partnerApi.getPerformance(token),
      ]);
      setDays(schedule);
      setPerformance(stats);
    } catch {
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const selectedJobs = days.filter(job => dateKey(new Date(job.scheduledAt)) === selectedDate);
  const openMaps = (job: PartnerScheduleJob) => {
    if (!job.address) return;
    const address = `${job.address.line1}, ${job.address.city}, ${job.address.state} ${job.address.postalCode}`;
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-bold text-lg">Your schedule</h2>
          <p className="text-white/40 text-sm mt-1">Plan visits and track your service performance.</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/5"><RefreshCw size={15}/></button>
      </div>
      {performance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            ['Completed', performance.jobsCompleted],
            ['Completion', `${performance.completionRate}%`],
            ['Acceptance', `${performance.acceptanceRate}%`],
            ['Rating', performance.rating.toFixed(1)],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl p-4 border border-white/[0.07]" style={CARD}>
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-white/40 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {dateOptions.map(({ key, date }) => (
          <button key={key} onClick={() => setSelectedDate(key)}
            className="min-w-[76px] rounded-xl border px-3 py-2.5 text-center transition-colors"
            style={key === selectedDate ? { background: 'rgba(91,62,245,0.2)', borderColor: '#5B3EF5' } : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-white/40 text-[11px]">{date.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
            <p className="text-white font-bold text-lg">{date.getDate()}</p>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="text-white font-bold text-sm">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        {loading ? <div className="py-12 text-center text-white/30"><Loader2 size={22} className="animate-spin mx-auto"/></div>
          : selectedJobs.length === 0 ? <div className="rounded-2xl border border-white/[0.07] p-10 text-center text-white/30 text-sm" style={CARD}>No jobs scheduled for this day.</div>
            : selectedJobs.map(job => {
              const address = job.address ? `${job.address.line1}, ${job.address.city}, ${job.address.state} ${job.address.postalCode}` : null;
              return <div key={`${job.jobType}-${job.id}`} className="rounded-2xl border border-white/[0.07] p-4" style={CARD}>
                <div className="flex items-start gap-3">
                  <div className="rounded-xl px-2.5 py-2 text-center min-w-[72px]" style={{ background: 'rgba(91,62,245,0.15)' }}>
                    <p className="text-violet-300 font-bold text-xs">{new Date(job.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-white/40 text-[10px] mt-1">{job.durationMinutes} min</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{job.serviceName}</p>
                    <p className="text-white/50 text-xs mt-1">{job.customerName ?? 'Customer'} · <span className="text-emerald-400 font-semibold">₹{job.payout} payout</span></p>
                    {address && <p className="text-white/35 text-xs mt-2 flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0"/>{address}</p>}
                  </div>
                  {job.customerPhone && <a href={`tel:${job.customerPhone}`} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5"><Phone size={15}/></a>}
                </div>
                {address && <button onClick={() => openMaps(job)} className="mt-3 text-xs font-bold text-violet-300 flex items-center gap-1 hover:text-violet-200"><Navigation size={12}/> Open in Maps</button>}
              </div>;
            })}
      </div>
    </div>
  );
}

const STATUS_COLOR: Record<JobStatus, string> = {
  pending:     '#6B7280',
  upcoming:    '#5B3EF5',
  in_progress: '#F59E0B',
  completed:   '#16A34A',
  cancelled:   '#EF4444',
};
const STATUS_ICON: Record<JobStatus, React.ReactNode> = {
  pending:     <Clock size={11}/>,
  upcoming:    <Calendar size={11}/>,
  in_progress: <TrendingUp size={11}/>,
  completed:   <CheckCircle size={11}/>,
  cancelled:   <XCircle size={11}/>,
};

/* ─── Shared UI primitives ────────────────────────────────────────── */
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
        style={MODAL_BG}>
        <div className="flex items-start justify-between mb-5">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 ml-4 flex-shrink-0">
            <X size={18}/>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/50 text-xs mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, type = 'text', placeholder, disabled }: {
  value: string; onChange: (v: string) => void; type?: string;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors disabled:opacity-40"
      style={INPUT_STY}/>
  );
}

function SelectInput({ value, onChange, disabled, children }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors disabled:opacity-40"
      style={{ background: '#1a2035' }}>
      {children}
    </select>
  );
}

function PrimaryBtn({ onClick, disabled, loading, children, className = '' }: {
  onClick?: () => void; disabled?: boolean; loading?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-60 ${className}`}
      style={{ background: ACCENT }}>
      {loading && <Loader2 size={14} className="animate-spin"/>}
      {children}
    </button>
  );
}

function GhostBtn({ onClick, disabled, children, className = '' }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border border-white/10 text-white/60 hover:bg-white/5 transition-colors ${className}`}>
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
      style={{ background: color + '20', color }}>
      {STATUS_ICON[status]}
      {status.replace('_', ' ')}
    </span>
  );
}

function PageHeader({ title, subtitle, onRefresh }: {
  title: string; subtitle?: string; onRefresh?: () => void;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-white font-bold text-xl">{title}</h1>
        {subtitle && <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {onRefresh && (
        <button onClick={onRefresh}
          className="text-white/30 hover:text-white/70 transition-colors p-1 mt-0.5">
          <RefreshCw size={16}/>
        </button>
      )}
    </div>
  );
}

function ServiceRequestCard({ item, pending, busy, onAccept, onReject, onCheckIn, onComplete }: {
  item: OrderItemJob;
  pending?: boolean;
  busy?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onCheckIn?: () => void;
  onComplete?: () => void;
}) {
  const tx = (source: string) => source;
  const canCheckIn = !pending && item.status === 'partner_accepted';
  const canComplete = !pending && ['payment_completed', 'service_started'].includes(item.status ?? '');

  return (
    <div className="rounded-xl border border-white/[0.08] p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: pending ? 'rgba(245,158,11,0.15)' : 'rgba(91,62,245,0.15)' }}>
          <Wrench size={16} style={{ color: pending ? '#F59E0B' : '#A78BFA' }}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold truncate">{item.serviceName ?? tx('Service booking')}</p>
          <p className="text-white/45 text-xs mt-0.5 truncate">
            {item.customerName ?? tx('Customer')} · Order {item.orderId.slice(0, 8)}
          </p>
        </div>
        <span className="px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
          style={{
            background: pending ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
            color: pending ? '#FBBF24' : '#60A5FA',
          }}>
          {pending ? tx('New request') : tx('In progress')}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-white/45">
        <span className="flex items-center gap-1"><Calendar size={12}/>{fmtDate(item.scheduledAt)}</span>
        <span className="flex items-center gap-1"><Clock size={12}/>{item.durationMinutes} min</span>
        <span className="ml-auto text-white font-bold">{fmt(item.partnerPayout)}</span>
      </div>
      {pending && onAccept && onReject && (
        <div className="flex gap-2 mt-3">
          <button onClick={onReject} disabled={busy}
            className="flex-1 py-2 rounded-lg text-xs font-bold border border-red-400/30 text-red-400 disabled:opacity-50">
            {busy ? tx('Updating…') : tx('Reject')}
          </button>
          <button onClick={onAccept} disabled={busy}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
            style={{ background: ACCENT }}>
            {busy ? tx('Updating…') : tx('Accept')}
          </button>
        </div>
      )}
      {!pending && (onCheckIn || onComplete) && (
        <div className="flex gap-2 mt-3">
          {canCheckIn && onCheckIn && (
            <button onClick={onCheckIn} disabled={busy}
              className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ background: ACCENT }}>
              <span className="inline-flex items-center gap-1.5"><QrCode size={13}/> {tx('Scan customer QR')}</span>
            </button>
          )}
          {canComplete && onComplete && (
            <button onClick={onComplete} disabled={busy}
              className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ background: '#16A34A' }}>
              <span className="inline-flex items-center gap-1.5"><Check size={13}/> {tx('Mark completed')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Auth Screen (Login + Register + OTP) ────────────────────────── */
type AuthMode = 'login' | 'register' | 'otp' | 'docs' | 'forgot' | 'reset';

function Logo() {
  return (
    <div className="flex items-center gap-3 mb-8 justify-center">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ACCENT }}>
        <Briefcase size={20} color="white"/>
      </div>
      <span className="text-white font-bold text-xl">ServeNow Partner</span>
    </div>
  );
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 p-6" style={{ background: '#161B27' }}>
      {children}
    </div>
  );
}

function ErrBanner({ err }: { err: string }) {
  if (!err) return null;
  return (
    <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-400/20"
      style={{ background: 'rgba(239,68,68,0.08)' }}>
      <AlertCircle size={14} className="inline mr-2"/>{err}
    </div>
  );
}

function SubmitBtn({ label, loadingLabel, loading }: { label: string; loadingLabel: string; loading: boolean }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full mt-6 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
      style={{ background: ACCENT }}>
      {loading && <Loader2 size={16} className="animate-spin"/>}
      {loading ? loadingLabel : label}
    </button>
  );
}

function AuthScreen({ onLogin }: { onLogin: (t: AuthTokens) => void }) {
  const tx = (source: string) => source;
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState(1); // register steps: 1=basic info, 2=professional details
  const [docsToken, setDocsToken] = useState<AuthTokens | null>(null);

  // ── Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPwd,   setLoginPwd]   = useState('');

  // ── Register step 1
  const [regName,    setRegName]    = useState('');
  const [regEmail,   setRegEmail]   = useState('');
  const [regPhone,   setRegPhone]   = useState('');
  const [regPwd,     setRegPwd]     = useState('');
  const [regPwdConf, setRegPwdConf] = useState('');

  // ── Register step 2
  const [regCatId,   setRegCatId]   = useState('');
  const [regTitle,   setRegTitle]   = useState('');
  const [regCity,    setRegCity]    = useState('');
  const [regArea,    setRegArea]    = useState('');
  const [regPincode, setRegPincode] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => { categoriesApi.list().then(c => setCategories(c.filter((x: Category) => x.isActive))).catch(() => {}); }, []);

  // ── OTP state
  const [otpEmail,   setOtpEmail]   = useState('');
  const [otpCode,    setOtpCode]    = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'login' | 'password_reset'>('signup');
  const [resending,  setResending]  = useState(false);

  // ── Forgot / reset password state
  const [forgotEmail,  setForgotEmail]  = useState('');
  const [resetCode,    setResetCode]    = useState('');
  const [resetNewPwd,  setResetNewPwd]  = useState('');

  // ── Shared
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const tokens = await authApi.login(loginEmail, loginPwd);
      if (tokens.user.role !== 'partner') { setErr('This portal is for partners only.'); return; }
      onLogin(tokens);
    } catch (e: any) { setErr(e.message ?? 'Login failed'); }
    finally { setLoading(false); }
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (regPwd !== regPwdConf) { setErr('Passwords do not match.'); return; }
    if (regPwd.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setStep(2);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (!regCatId) { setErr('Please select a service category.'); return; }
      await authApi.registerPartner({ fullName: regName, email: regEmail, phone: regPhone || undefined, password: regPwd, categoryId: regCatId, title: regTitle, city: regCity, area: regArea || undefined, pincode: regPincode || undefined });
      setOtpEmail(regEmail); setOtpPurpose('signup');
      setMode('otp');
    } catch (e: any) { setErr(e.message ?? 'Registration failed'); }
    finally { setLoading(false); }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const tokens = await authApi.verifyOtp(otpEmail, otpCode, otpPurpose);
      setDocsToken(tokens);
      setMode('docs');
    } catch (e: any) { setErr(e.message ?? 'OTP verification failed'); }
    finally { setLoading(false); }
  }

  async function resendOtp() {
    setResending(true); setErr('');
    try { await authApi.resendOtp(otpEmail, otpPurpose); } catch (e: any) { setErr(e.message); }
    finally { setResending(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      setOtpEmail(forgotEmail);
      setMode('reset');
    } catch (e: any) { setErr(e.message ?? 'Failed to send reset code'); }
    finally { setLoading(false); }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      await authApi.resetPassword(forgotEmail, resetCode, resetNewPwd);
      setErr('');
      setMode('login');
      setForgotEmail(''); setResetCode(''); setResetNewPwd('');
    } catch (e: any) { setErr(e.message ?? 'Password reset failed'); }
    finally { setLoading(false); }
  }

  if (mode === 'otp') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f1117' }}>
      <div className="w-full max-w-sm">
        <Logo/>
        <AuthCard>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(91,62,245,0.15)' }}>
              <Shield size={24} style={{ color: '#7C5BF8' }}/>
            </div>
            <h2 className="text-white font-bold text-lg mb-1">Verify your email</h2>
            <p className="text-white/40 text-sm">We sent a 6-digit code to<br/>
              <span className="text-white/70 font-semibold">{otpEmail}</span>
            </p>
          </div>
          <ErrBanner err={err}/>
          <form onSubmit={handleOtp} className="space-y-4">
            <Field label="Verification Code">
              <TextInput value={otpCode} onChange={setOtpCode} placeholder="123456"
                type="text"/>
            </Field>
            <SubmitBtn label="Verify & Sign in" loadingLabel="Verifying…" loading={loading}/>
          </form>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-white/30 text-xs">Didn't receive it?</span>
            <button onClick={resendOtp} disabled={resending}
              className="text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors disabled:opacity-50">
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </AuthCard>
      </div>
    </div>
  );

  if (mode === 'docs') return (
    <div className="min-h-screen p-6" style={{ background: '#0f1117' }}>
      <div className="max-w-2xl mx-auto">
        <Logo/>
        <div className="rounded-2xl border border-white/10 p-6 mb-4" style={{ background: '#161B27' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white font-bold text-lg mb-1">Upload Verification Documents</h2>
              <p className="text-white/40 text-sm">Upload your KYC documents to start accepting bookings. You can skip and do this from your profile later.</p>
            </div>
            <button onClick={() => docsToken && onLogin(docsToken)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap"
              style={{ background: ACCENT }}>
              Skip <ChevronRight size={14}/>
            </button>
          </div>
        </div>
        {docsToken && <Documents token={docsToken.accessToken}/>}
        <div className="mt-6 text-center">
          <button onClick={() => docsToken && onLogin(docsToken)}
            className="px-8 py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: ACCENT }}>
            Continue to Dashboard →
          </button>
          <p className="text-white/25 text-xs mt-3">Documents can be managed anytime from Profile → Documents</p>
        </div>
      </div>
    </div>
  );

  if (mode === 'register') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f1117' }}>
      <div className="w-full max-w-sm">
        <Logo/>
        <AuthCard>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {[1,2].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? '' : 'bg-white/10'}`}
                style={step >= s ? { background: ACCENT } : {}}/>
            ))}
          </div>

          {step === 1 ? (
            <>
              <h2 className="text-white font-bold text-lg mb-1">Create your account</h2>
              <p className="text-white/40 text-sm mb-5">Step 1 of 2 — Basic information</p>
              <ErrBanner err={err}/>
              <form onSubmit={handleStep1} className="space-y-4">
                <Field label="Full Name">
                  <TextInput value={regName} onChange={setRegName} placeholder="Your full name"/>
                </Field>
                <Field label="Email">
                  <TextInput type="email" value={regEmail} onChange={setRegEmail} placeholder="you@example.com"/>
                </Field>
                <Field label="Phone (optional)">
                  <TextInput type="tel" value={regPhone} onChange={setRegPhone} placeholder="+91 98765 43210"/>
                </Field>
                <Field label="Password">
                  <TextInput type="password" value={regPwd} onChange={setRegPwd} placeholder="Min 8 chars, upper, lower, digit"/>
                </Field>
                <Field label="Confirm Password">
                  <TextInput type="password" value={regPwdConf} onChange={setRegPwdConf} placeholder="Re-enter password"/>
                </Field>
                <button type="submit"
                  className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: ACCENT }}>
                  Next <ChevronRight size={15}/>
                </button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => { setStep(1); setErr(''); }}
                className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs mb-5 transition-colors">
                <ArrowLeft size={13}/> Back
              </button>
              <h2 className="text-white font-bold text-lg mb-1">Professional details</h2>
              <p className="text-white/40 text-sm mb-5">Step 2 of 2 — Your service expertise</p>
              <ErrBanner err={err}/>
              <form onSubmit={handleRegister} className="space-y-4">
                <Field label="Service Category">
                  <SelectInput value={regCatId} onChange={setRegCatId}>
                    <option value="">— Select your category —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Your Title / Specialisation">
                  <TextInput value={regTitle} onChange={setRegTitle} placeholder="e.g. Expert Plumber, Senior Electrician"/>
                </Field>

                {/* ── Service address (Urban Company style) ── */}
                <div className="pt-1">
                  <p className="text-white/40 text-xs mb-3 font-medium uppercase tracking-wide">Service Location</p>
                  <div className="space-y-3">
                    <Field label="City *">
                      <TextInput value={regCity} onChange={setRegCity} placeholder="e.g. Mumbai, Delhi, Bangalore"/>
                    </Field>
                    <Field label="Area / Locality">
                      <TextInput value={regArea} onChange={setRegArea} placeholder="e.g. Andheri West, Koramangala"/>
                    </Field>
                    <Field label="Pincode">
                      <TextInput value={regPincode} onChange={v => setRegPincode(v.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pincode" type="text"/>
                    </Field>
                  </div>
                </div>

                <SubmitBtn label="Create Account" loadingLabel="Creating account…" loading={loading}/>
              </form>
            </>
          )}

          <div className="flex items-center justify-center gap-1.5 mt-5">
            <span className="text-white/30 text-xs">Already have an account?</span>
            <button onClick={() => { setMode('login'); setErr(''); }}
              className="text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors">
              Sign in
            </button>
          </div>
        </AuthCard>
      </div>
    </div>
  );

  if (mode === 'forgot') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f1117' }}>
      <div className="w-full max-w-sm">
        <Logo/>
        <AuthCard>
          <button onClick={() => { setMode('login'); setErr(''); }}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs mb-5 transition-colors">
            <ArrowLeft size={13}/> Back to login
          </button>
          <h2 className="text-white font-bold text-lg mb-1">Reset your password</h2>
          <p className="text-white/40 text-sm mb-5">Enter your email and we'll send a reset code</p>
          <ErrBanner err={err}/>
          <form onSubmit={handleForgot} className="space-y-4">
            <Field label="Email">
              <TextInput type="email" value={forgotEmail} onChange={setForgotEmail} placeholder="partner@servenow.in"/>
            </Field>
            <SubmitBtn label="Send reset code" loadingLabel="Sending…" loading={loading}/>
          </form>
        </AuthCard>
      </div>
    </div>
  );

  if (mode === 'reset') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f1117' }}>
      <div className="w-full max-w-sm">
        <Logo/>
        <AuthCard>
          <button onClick={() => { setMode('forgot'); setErr(''); }}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs mb-5 transition-colors">
            <ArrowLeft size={13}/> Back
          </button>
          <h2 className="text-white font-bold text-lg mb-1">Enter new password</h2>
          <p className="text-white/40 text-sm mb-5">We sent a code to <span className="text-white/70">{forgotEmail}</span></p>
          <ErrBanner err={err}/>
          <form onSubmit={handleReset} className="space-y-4">
            <Field label="Reset Code">
              <TextInput value={resetCode} onChange={setResetCode} placeholder="6-digit code"/>
            </Field>
            <Field label="New Password">
              <TextInput type="password" value={resetNewPwd} onChange={setResetNewPwd} placeholder="Min 8 chars"/>
            </Field>
            <SubmitBtn label="Reset password" loadingLabel="Resetting…" loading={loading}/>
          </form>
        </AuthCard>
      </div>
    </div>
  );

  // Default: login
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f1117' }}>
      <div className="w-full max-w-sm">
        <Logo/>
        <AuthCard>
            <h2 className="text-white font-bold text-lg mb-1">{tx('Welcome back')}</h2>
            <p className="text-white/40 text-sm mb-6">{tx('Sign in to your partner portal')}</p>
          <ErrBanner err={err}/>
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email">
              <TextInput type="email" value={loginEmail} onChange={setLoginEmail} placeholder="partner@servenow.in"/>
            </Field>
            <Field label="Password">
              <TextInput type="password" value={loginPwd} onChange={setLoginPwd} placeholder="••••••••"/>
            </Field>
            <SubmitBtn label="Sign in" loadingLabel="Signing in…" loading={loading}/>
          </form>
          <div className="flex items-center justify-between mt-5">
            <div className="flex items-center gap-1.5">
              <span className="text-white/30 text-xs">{tx('New partner?')}</span>
              <button onClick={() => { setMode('register'); setStep(1); setErr(''); }}
                className="text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors">
                {tx('Register here')}
              </button>
            </div>
            <button onClick={() => { setForgotEmail(loginEmail); setMode('forgot'); setErr(''); }}
              className="text-white/40 text-xs hover:text-violet-300 transition-colors">
              {tx('Forgot password?')}
            </button>
          </div>
        </AuthCard>
      </div>
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────────── */
function Dashboard({ token, profile }: { token: string; profile: PartnerProfile | null }) {
  const tx = (source: string) => source;
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [jobs,     setJobs]     = useState<Job[]>([]);
  const [serviceJobs, setServiceJobs] = useState<{ pendingRequests: OrderItemJob[]; activeJobs: OrderItemJob[]; completedJobs: OrderItemJob[] }>({ pendingRequests: [], activeJobs: [], completedJobs: [] });
  const [loading,  setLoading]  = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [serviceCheckinItem, setServiceCheckinItem] = useState<OrderItemJob | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, j, sj] = await Promise.all([
        partnerApi.getEarnings(token),
        partnerApi.listJobs(token),
        partnerApi.listOrderItemJobs(token),
      ]);
      setEarnings(e); setJobs(j); setServiceJobs(sj);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const upcoming = jobs.filter(j => j.status === 'upcoming' || j.status === 'in_progress').slice(0, 8);

  async function updateRequest(action: 'accept' | 'reject', item: OrderItemJob) {
    if (!item.requestId) return;
    setActionKey(`${action}:${item.requestId}`);
    try {
      if (action === 'accept') await partnerApi.acceptOrderItemJob(item.requestId, token);
      else await partnerApi.rejectOrderItemJob(item.requestId, token);
      await load();
    } catch (error: any) {
      alert(error?.message ?? tx('Could not update this request.'));
    } finally { setActionKey(null); }
  }

  async function handleServiceCheckin(qrToken: string) {
    if (!serviceCheckinItem) return;
    setActionKey(`checkin:${serviceCheckinItem.orderItemId}`);
    try {
      await partnerApi.checkInOrderItem(serviceCheckinItem.orderItemId, qrToken, token);
      setServiceCheckinItem(null);
      await load();
    } catch (error: any) {
      alert(error?.message ?? tx('Check-in failed. Make sure this is the customer QR for this service.'));
    } finally { setActionKey(null); }
  }

  async function completeService(item: OrderItemJob) {
    setActionKey(`complete:${item.orderItemId}`);
    try {
      await partnerApi.completeOrderItem(item.orderItemId, token);
      await load();
    } catch (error: any) {
      alert(error?.message ?? tx('Could not complete this service.'));
    } finally { setActionKey(null); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin" style={{ color: '#5B3EF5' }}/>
    </div>
  );

  const stats = [

    { label: tx('Total Earnings'), value: fmt(earnings?.total ?? 0),     color: '#16A34A', icon: DollarSign },
    { label: tx('This Month'),     value: fmt(earnings?.thisMonth ?? 0), color: '#5B3EF5', icon: TrendingUp },
    { label: tx('Today'),          value: fmt(earnings?.today ?? 0),     color: '#F59E0B', icon: Zap        },
    { label: tx('Rating'),         value: profile ? profile.rating.toFixed(1) : '—', color: '#F59E0B', icon: Star },
  ];

  return (
    <div>
      {serviceJobs.pendingRequests.length > 0 && (
        <div className="rounded-2xl border border-amber-400/20 p-5 mb-6" style={{ background: 'rgba(245,158,11,0.05)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">{tx('New requests')}</h3>
            <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
              style={{ background: '#F59E0B' }}>{serviceJobs.pendingRequests.length}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {serviceJobs.pendingRequests.slice(0, 4).map(item => (
              <ServiceRequestCard
                key={item.requestId ?? item.orderItemId}
                item={item}
                pending
                busy={actionKey?.endsWith(`:${item.requestId}`)}
                onAccept={() => updateRequest('accept', item)}
                onReject={() => updateRequest('reject', item)}
              />
            ))}
          </div>
          {serviceJobs.pendingRequests.length > 4 && (
            <p className="text-xs text-amber-300/70 mt-3">Open My Jobs to view all {serviceJobs.pendingRequests.length} requests.</p>
          )}
        </div>
      )}
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl p-4 border border-white/[0.07]" style={CARD}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/40 text-xs">{s.label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: s.color + '20' }}>
                <s.icon size={14} style={{ color: s.color }}/>
              </div>
            </div>
            <p className="text-white font-bold text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Profile + Active work */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile snapshot */}
        {profile && (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
            <div className="px-5 py-4 border-b border-white/[0.07]">
            <h3 className="text-white font-bold text-sm">{tx('My Profile')}</h3>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: ACCENT }}>
                  {profile.name?.[0]?.toUpperCase() ?? 'P'}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{profile.name}</p>
                  <p className="text-white/40 text-xs">{profile.title}</p>
                </div>
                <span className="ml-auto px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{ background: profile.isActive ? '#16A34A20' : '#EF444420', color: profile.isActive ? '#16A34A' : '#EF4444' }}>
                  {profile.isActive ? tx('Active') : tx('Inactive')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: tx('Rating'),  value: profile.rating.toFixed(1) },
                  { label: tx('Reviews'), value: String(profile.reviewCount) },
                  { label: tx('Rate'),    value: `${fmt(profile.basePrice)}/${profile.priceUnit}` },
                ].map(s => (
                  <div key={s.label} className="rounded-xl py-3 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-white font-bold text-sm">{s.value}</p>
                    <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {profile.bio && (
                <p className="text-white/40 text-xs mt-4 leading-relaxed border-t border-white/[0.06] pt-4">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Active jobs */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <h3 className="text-white font-bold text-sm">{tx('Active Jobs')}</h3>
          </div>
          {serviceJobs.activeJobs.length === 0 && upcoming.length === 0
            ? <p className="px-5 py-8 text-white/30 text-sm text-center">{tx('No active jobs')}</p>
            : (
              <>
              {serviceJobs.activeJobs.slice(0, 4).map(item => (
                <div key={item.orderItemId} className="px-5 py-3 border-b border-white/[0.04]">
                  <ServiceRequestCard
                    item={item}
                    busy={actionKey?.endsWith(`:${item.orderItemId}`)}
                    onCheckIn={() => setServiceCheckinItem(item)}
                    onComplete={() => completeService(item)}
                  />
                </div>
              ))}
              {upcoming.map(j => (
                <div key={j.id} className="px-5 py-3 flex items-center gap-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{j.serviceName}</p>
                    <p className="text-white/40 text-xs truncate">{j.customerName ?? tx('Customer')}</p>
                  </div>
                  <p className="text-white/60 text-xs flex-shrink-0">{fmt(j.price)}</p>
                  <StatusBadge status={j.status}/>
                </div>
              ))}
              </>
            )
          }
        </div>
      </div>
      {serviceCheckinItem && (
        <QRScannerModal
          onScanned={handleServiceCheckin}
          onClose={() => setServiceCheckinItem(null)}
        />
      )}
    </div>
  );
}

/* ─── Jobs ────────────────────────────────────────────────────────── */
function Jobs({ token }: { token: string }) {
  const [jobs,        setJobs]        = useState<Job[]>([]);
  const [serviceJobs, setServiceJobs] = useState<{ pendingRequests: OrderItemJob[]; activeJobs: OrderItemJob[]; completedJobs: OrderItemJob[] }>({ pendingRequests: [], activeJobs: [], completedJobs: [] });
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [completing,  setCompleting]  = useState(false);
  const [accepting,   setAccepting]   = useState(false);
  const [rejecting,   setRejecting]   = useState(false);
  const [checkingIn,  setCheckingIn]  = useState(false);
  const [showQR,      setShowQR]      = useState(false);
  const [filter,      setFilter]      = useState<JobStatus | 'all'>('all');
  const [serviceActionKey, setServiceActionKey] = useState<string | null>(null);
  const [serviceCheckinItem, setServiceCheckinItem] = useState<OrderItemJob | null>(null);
  const [evidence, setEvidence] = useState<PartnerEvidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [uploadingPhase, setUploadingPhase] = useState<'before' | 'after' | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueType, setIssueType] = useState('Customer unavailable');
  const [issueMessage, setIssueMessage] = useState('');
  const [issueSending, setIssueSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [legacy, service] = await Promise.all([
        partnerApi.listJobs(token),
        partnerApi.listOrderItemJobs(token),
      ]);
      setJobs(legacy);
      setServiceJobs(service);
    } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) {
      setEvidence([]);
      return;
    }
    let active = true;
    setEvidenceLoading(true);
    partnerApi.listEvidence('booking', selected.id, token)
      .then(rows => { if (active) setEvidence(rows); })
      .catch(() => { if (active) setEvidence([]); })
      .finally(() => { if (active) setEvidenceLoading(false); });
    return () => { active = false; };
  }, [selected, token]);

  // Auto-refresh every 30 s so new dispatched jobs appear without manual reload
  useEffect(() => {
    const t = setInterval(() => {
      Promise.all([partnerApi.listJobs(token), partnerApi.listOrderItemJobs(token)])
        .then(([legacy, service]) => { setJobs(legacy); setServiceJobs(service); })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, [token]);

  async function complete(id: string) {
    setCompleting(true);
    try {
      const j = await partnerApi.completeJob(id, token);
      setJobs(prev => prev.map(x => x.id === id ? j : x)); setSelected(j);
    } finally { setCompleting(false); }
  }

  async function accept(id: string) {
    setAccepting(true);
    try {
      const j = await partnerApi.acceptJob(id, token);
      setJobs(prev => prev.map(x => x.id === id ? j : x)); setSelected(j);
    } finally { setAccepting(false); }
  }

  async function reject(id: string) {
    setRejecting(true);
    try {
      const j = await partnerApi.rejectJob(id, token);
      setJobs(prev => prev.map(x => x.id === id ? j : x)); setSelected(j);
    } finally { setRejecting(false); }
  }

  async function updateServiceRequest(action: 'accept' | 'reject', item: OrderItemJob) {
    if (!item.requestId) return;
    setServiceActionKey(`${action}:${item.requestId}`);
    try {
      if (action === 'accept') await partnerApi.acceptOrderItemJob(item.requestId, token);
      else await partnerApi.rejectOrderItemJob(item.requestId, token);
      await load();
    } catch (error: any) {
      alert(error?.message ?? 'Could not update this request.');
    } finally { setServiceActionKey(null); }
  }

  async function handleServiceCheckin(qrToken: string) {
    if (!serviceCheckinItem) return;
    setServiceActionKey(`checkin:${serviceCheckinItem.orderItemId}`);
    try {
      await partnerApi.checkInOrderItem(serviceCheckinItem.orderItemId, qrToken, token);
      setServiceCheckinItem(null);
      await load();
    } catch (error: any) {
      alert(error?.message ?? 'Check-in failed. Make sure this is the customer QR for this service.');
    } finally { setServiceActionKey(null); }
  }

  async function completeService(item: OrderItemJob) {
    setServiceActionKey(`complete:${item.orderItemId}`);
    try {
      await partnerApi.completeOrderItem(item.orderItemId, token);
      await load();
    } catch (error: any) {
      alert(error?.message ?? 'Could not complete this service.');
    } finally { setServiceActionKey(null); }
  }

  // Open job modal — fetch full detail (includes services breakdown) in the background
  async function openJob(j: Job) {
    setSelected(j);
    setDetailLoading(true);
    try {
      const full = await partnerApi.getJob(j.id, token);
      setSelected(full);
    } catch { /* keep the list-level data already shown */ }
    finally { setDetailLoading(false); }
  }

  // Check-in: open QR scanner; actual API call happens after a valid scan
  function startCheckin() { setShowQR(true); }

  async function handleQRScanned(qrToken: string) {
    setShowQR(false);
    if (!selected) return;
    setCheckingIn(true);
    try {
      const j = await partnerApi.checkinJob(selected.id, token, qrToken);
      setJobs(prev => prev.map(x => x.id === j.id ? j : x));
      setSelected(j);
    } catch (e: any) {
      alert(e?.message ?? 'Check-in failed. Make sure the QR code belongs to this booking.');
    } finally { setCheckingIn(false); }
  }

  async function uploadJobEvidence(phase: 'before' | 'after', file: File) {
    if (!selected) return;
    setUploadingPhase(phase);
    try {
      const uploaded = await partnerApi.uploadEvidence('booking', selected.id, phase, file, token);
      setEvidence(prev => [uploaded, ...prev]);
    } catch (error: any) {
      alert(error?.message ?? 'Evidence upload failed.');
    } finally {
      setUploadingPhase(null);
    }
  }

  async function submitIssue() {
    if (!selected || !issueMessage.trim()) {
      alert('Add details before submitting the issue.');
      return;
    }
    setIssueSending(true);
    try {
      await partnerApi.reportIssue({
        jobType: 'booking',
        jobId: selected.id,
        issueType,
        message: issueMessage.trim(),
        priority: issueType === 'Unsafe location' ? 'urgent' : 'high',
      }, token);
      setIssueOpen(false);
      setIssueMessage('');
      alert('Issue reported to Operations.');
    } catch (error: any) {
      alert(error?.message ?? 'Could not report this issue.');
    } finally {
      setIssueSending(false);
    }
  }

  const statuses: (JobStatus | 'all')[] = ['all', 'upcoming', 'in_progress', 'pending', 'completed', 'cancelled'];
  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);
  const counts: Record<string, number> = { all: jobs.length };
  statuses.slice(1).forEach(s => { counts[s] = jobs.filter(j => j.status === s).length; });

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === s ? 'text-white' : 'border border-white/10 text-white/50 hover:bg-white/5'
            }`}
            style={filter === s ? { background: ACCENT } : {}}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            <span className={`ml-1.5 ${filter === s ? 'text-white/70' : 'text-white/30'}`}>
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filter === 'all' || filter === 'pending' ? (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-white font-bold text-sm">New service requests</h2>
            {serviceJobs.pendingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: '#F59E0B' }}>
                {serviceJobs.pendingRequests.length}
              </span>
            )}
          </div>
          {serviceJobs.pendingRequests.length === 0
            ? <p className="text-white/25 text-xs">No new service requests.</p>
            : <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {serviceJobs.pendingRequests.map(item => (
                  <ServiceRequestCard
                    key={item.requestId ?? item.orderItemId}
                    item={item}
                    pending
                    busy={serviceActionKey?.endsWith(`:${item.requestId}`)}
                    onAccept={() => updateServiceRequest('accept', item)}
                    onReject={() => updateServiceRequest('reject', item)}
                  />
                ))}
              </div>
          }
        </section>
      ) : null}

      {filter === 'all' || filter === 'upcoming' || filter === 'in_progress' ? (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-white font-bold text-sm">In progress services</h2>
            {serviceJobs.activeJobs.length > 0 && (
              <span className="text-white/30 text-xs">{serviceJobs.activeJobs.length}</span>
            )}
          </div>
          {serviceJobs.activeJobs.length === 0
            ? <p className="text-white/25 text-xs">No active service jobs.</p>
            : <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {serviceJobs.activeJobs.map(item => (
                  <ServiceRequestCard
                    key={item.orderItemId}
                    item={item}
                    busy={serviceActionKey?.endsWith(`:${item.orderItemId}`)}
                    onCheckIn={() => setServiceCheckinItem(item)}
                    onComplete={() => completeService(item)}
                  />
                ))}
              </div>
          }
        </section>
      ) : null}

      {loading
        ? <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin" style={{ color: '#5B3EF5' }}/></div>
        : filtered.length === 0
          ? <div className="flex flex-col items-center justify-center py-24 text-white/20">
              <Briefcase size={40} className="mb-3"/>
              <p className="text-sm">No jobs found</p>
            </div>
          : (
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10" style={{ background: 'rgba(20,20,30,1)' }}>
                  <tr className="border-b border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Service', 'Customer', 'Scheduled', 'Status', 'Payment', 'Price', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(j => (
                    <tr key={j.id}
                      className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openJob(j)}>
                      <td className="px-4 py-3">
                        <p className="text-white font-semibold leading-snug">{j.serviceName}</p>
                        {j.notes && <p className="text-white/35 text-xs mt-0.5 truncate max-w-[180px]">{j.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-white/70">{j.customerName ?? '—'}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">{fmtDate(j.scheduledAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={j.status}/></td>
                      <td className="px-4 py-3">
                        {j.paymentStatus === 'paid'
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(22,163,74,0.15)', color: '#16A34A' }}>✓ Paid</span>
                          : j.paymentStatus === 'created'
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(251,191,36,0.15)', color: '#CA8A04' }}>⏳ Pending</span>
                          : <span className="text-white/25 text-[10px]">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-white font-bold">{fmt(j.price)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); openJob(j); }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors hover:bg-violet-500/10"
                          style={{ borderColor: 'rgba(91,62,245,0.3)', color: '#7C5BF8' }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      {serviceCheckinItem && (
        <QRScannerModal
          onScanned={handleServiceCheckin}
          onClose={() => setServiceCheckinItem(null)}
        />
      )}

      {/* Job detail modal */}
      {selected && (
        <Modal title="Job Details" onClose={() => setSelected(null)}>
          <div className="space-y-3">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Customer',  selected.customerName ?? '—'],
                ['Phone',     selected.customerPhone ?? '—'],
                ['Scheduled', fmtDate(selected.scheduledAt)],
                ['Price',     fmt(selected.price)],
                ['Status',    selected.status.replace('_', ' ')],
                ['Payment',   selected.paymentStatus === 'paid' ? '✅ Paid' : selected.paymentStatus === 'created' ? '⏳ Pending' : selected.paymentStatus ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-white/40 text-xs mb-1">{k}</p>
                  <p className="text-white font-semibold">{v}</p>
                </div>
              ))}
            </div>

            {/* Services to Complete */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
                <Wrench size={13} className="text-violet-400" />
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Services to Complete</p>
                {detailLoading && <Loader2 size={12} className="animate-spin text-white/30 ml-auto" />}
              </div>
              {selected.services && selected.services.length > 0 ? (
                selected.services.map((svc, idx) => (
                  <div key={idx} className={`px-3 py-2.5 flex items-center justify-between gap-3 ${idx > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Wrench size={12} className="text-violet-400 flex-shrink-0" />
                      <span className="text-white text-sm font-semibold truncate">{svc.name}</span>
                      {svc.quantity > 1 && (
                        <span className="text-white/40 text-xs flex-shrink-0">×{svc.quantity}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                      <span className="text-white/40 flex items-center gap-1">
                        <Clock size={11}/> {svc.duration} min
                      </span>
                      <span className="font-bold" style={{ color: '#7C5BF8' }}>₹{svc.unitPartnerPayout} payout</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2.5">
                  <p className="text-white font-semibold text-sm">{selected.serviceName}</p>
                </div>
              )}
            </div>

            {/* Notes */}
            {selected.notes && (
              <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-white/40 text-xs mb-1">Notes</p>
                <p className="text-white text-sm leading-relaxed">{selected.notes}</p>
              </div>
            )}

            {/* Evidence */}
            <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Job Evidence</p>
                {evidenceLoading && <Loader2 size={13} className="animate-spin text-white/30"/>}
              </div>
              {evidence.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {evidence.map(item => (
                    <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer"
                      className="rounded-lg overflow-hidden border border-white/[0.08] hover:border-violet-400/50 transition-colors">
                      <img src={item.fileUrl} alt={`${item.phase} service evidence`} className="w-full h-20 object-cover"/>
                      <p className="px-2 py-1.5 text-[10px] font-bold text-white/60 capitalize">{item.phase} service</p>
                    </a>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                {(['before', 'after'] as const).map(phase => (
                  <label key={phase}
                    className={`flex-1 cursor-pointer rounded-lg border border-white/10 px-2 py-2 text-center text-xs font-bold text-violet-300 hover:bg-violet-500/10 transition-colors ${uploadingPhase ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingPhase === phase ? <Loader2 size={13} className="animate-spin mx-auto"/> : `Add ${phase} photo`}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={event => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = '';
                        if (file) uploadJobEvidence(phase, file);
                      }}/>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={() => setIssueOpen(true)}
              className="w-full rounded-xl border border-red-400/30 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
              <AlertCircle size={14}/> Report a job issue or no-show
            </button>

            {/* Actions */}
            {selected.status === 'pending' && (
              <div className="flex gap-3 mt-2">
                <PrimaryBtn loading={accepting} onClick={() => accept(selected.id)} className="flex-1 justify-center">
                  <Check size={14}/> Accept Job
                </PrimaryBtn>
                <button onClick={() => reject(selected.id)} disabled={rejecting}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 hover:bg-red-500/5"
                  style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#EF4444' }}>
                  {rejecting ? <Loader2 size={14} className="animate-spin"/> : <XCircle size={14}/>} Reject
                </button>
              </div>
            )}
            {selected.status === 'upcoming' && (
              <div className="mt-2">
                <PrimaryBtn loading={checkingIn} onClick={startCheckin} className="w-full justify-center">
                  <QrCode size={14}/> Scan QR to Check In
                </PrimaryBtn>
                <p className="text-white/30 text-xs text-center mt-2">
                  Ask the customer to open their booking and show you the QR code
                </p>
              </div>
            )}
            {selected.status === 'in_progress' && (
              <div className="flex gap-3 mt-2">
                <PrimaryBtn loading={completing} onClick={() => complete(selected.id)} className="flex-1 justify-center">
                  <Check size={14}/> Mark as Completed
                </PrimaryBtn>
              </div>
            )}
          </div>
        </Modal>
      )}

      {issueOpen && selected && (
        <Modal title="Report Job Issue" onClose={() => setIssueOpen(false)}>
          <div className="space-y-4">
            <p className="text-white/50 text-xs leading-relaxed">Choose the closest issue and give Operations enough detail to act.</p>
            <div className="flex flex-wrap gap-2">
              {['Customer unavailable', 'Wrong address', 'Unsafe location', 'Extra work required', 'Payment refusal', 'Other'].map(type => (
                <button key={type} onClick={() => setIssueType(type)}
                  className="rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors"
                  style={issueType === type
                    ? { color: '#A78BFA', borderColor: 'rgba(124,91,248,0.7)', background: 'rgba(124,91,248,0.15)' }
                    : { color: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {type}
                </button>
              ))}
            </div>
            <textarea value={issueMessage} onChange={event => setIssueMessage(event.target.value)}
              rows={4} placeholder="What happened?"
              className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60 resize-none"
              style={INPUT_STY}/>
            <div className="flex gap-2">
              <button onClick={() => setIssueOpen(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-white/50 hover:bg-white/5">Cancel</button>
              <PrimaryBtn loading={issueSending} onClick={submitIssue} className="flex-1 justify-center">
                <AlertCircle size={14}/> Send report
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* QR scanner overlay */}
      {showQR && (
        <QRScannerModal
          onScanned={handleQRScanned}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}

/* ─── Earnings ────────────────────────────────────────────────────── */
function Earnings({ token }: { token: string }) {
  const [data,    setData]    = useState<import('@/lib/api').Earnings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return partnerApi.getEarnings(token).then(setData).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin" style={{ color: '#5B3EF5' }}/>
    </div>
  );

  const max = data ? Math.max(...data.weekly.map(w => w.amount), 1) : 1;

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Earnings', value: fmt(data?.total ?? 0),     color: '#16A34A', icon: DollarSign, sub: 'All time'  },
          { label: 'This Month',     value: fmt(data?.thisMonth ?? 0), color: '#5B3EF5', icon: TrendingUp, sub: undefined   },
          { label: 'Today',          value: fmt(data?.today ?? 0),     color: '#F59E0B', icon: Zap,        sub: undefined   },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 border border-white/[0.07]" style={CARD}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/40 text-xs">{s.label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.color + '20' }}>
                <s.icon size={14} style={{ color: s.color }}/>
              </div>
            </div>
            <p className="text-white font-bold text-2xl">{s.value}</p>
            {s.sub && <p className="text-white/30 text-xs mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <h3 className="text-white font-bold text-sm">Weekly Breakdown</h3>
          <p className="text-white/40 text-xs mt-0.5">Earnings for the past 7 days</p>
        </div>
        <div className="p-5">
          {!data || data.weekly.length === 0
            ? <div className="flex flex-col items-center justify-center py-16 text-white/20">
                <BarChart2 size={36} className="mb-3"/>
                <p className="text-sm">No earnings data yet</p>
              </div>
            : (
              <div className="flex items-end gap-3 h-40">
                {data.weekly.map(w => {
                  const h = Math.max((w.amount / max) * 140, 4);
                  return (
                    <div key={w.date} className="flex-1 flex flex-col items-center gap-2">
                      <p className="text-white/40 text-[10px] tabular-nums">{w.amount > 0 ? `₹${w.amount}` : ''}</p>
                      <div className="w-full flex flex-col justify-end" style={{ height: 100 }}>
                        <div className="w-full rounded-t-lg"
                          style={{ height: h, background: ACCENT, opacity: w.amount === max ? 1 : 0.55 }}/>
                      </div>
                      <span className="text-white/40 text-[10px]">
                        {new Date(w.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Profile ─────────────────────────────────────────────────────── */
type SubCategory = { id: string; name: string; isActive: boolean };

function Profile({ token, profile, setProfile }: {
  token: string; profile: PartnerProfile | null; setProfile: (p: PartnerProfile) => void;
}) {
  const [editProf,     setEditProf]     = useState(false);
  const [editPwd,      setEditPwd]      = useState(false);
  const [editAcc,      setEditAcc]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [availLoading, setAvailLoading] = useState(false);
  const [msg,          setMsg]          = useState('');
  const [msgOk,        setMsgOk]        = useState(true);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [subCats,      setSubCats]      = useState<SubCategory[]>([]);
  const [subLoading,   setSubLoading]   = useState(false);

  useEffect(() => {
    categoriesApi.list().then(c => setCategories(c.filter((x: Category) => x.isActive))).catch(() => {});
  }, []);

  const [title,        setTitle]       = useState(profile?.title ?? '');
  const [bio,          setBio]         = useState(profile?.bio ?? '');
  const [price,        setPrice]       = useState(String(profile?.basePrice ?? ''));
  const [priceUnit,    setPriceUnit]   = useState(profile?.priceUnit ?? 'visit');
  const [tags,         setTags]        = useState((profile?.tags ?? []).join(', '));
  const [payoutUpiId,  setPayoutUpiId] = useState(profile?.payoutUpiId ?? '');
  const [editCatId,    setEditCatId]   = useState(profile?.categoryId ?? '');
  const [editSubCatId, setEditSubCatId]= useState(profile?.subCategoryId ?? '');
  const [curPwd,       setCurPwd]      = useState('');
  const [newPwd,       setNewPwd]      = useState('');
  const [accName,      setAccName]     = useState(profile?.name ?? '');
  const [accPhone,     setAccPhone]    = useState('');

  const loadSubCats = async (catId: string) => {
    if (!catId) { setSubCats([]); return; }
    setSubLoading(true);
    try {
      const s = await categoriesApi.getSubcategories(catId);
      setSubCats(s.filter((x: SubCategory) => x.isActive));
    } catch { setSubCats([]); } finally { setSubLoading(false); }
  };

  async function saveProfile() {
    setSaving(true); setMsg('');
    try {
      const updated = await partnerApi.updateProfile({
        title, bio, basePrice: Number(price),
        priceUnit: priceUnit.trim() || 'visit',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        categoryId: editCatId || undefined,
        subCategoryId: editSubCatId || null,
        payoutUpiId: payoutUpiId.trim() || null,
      }, token);
      setProfile(updated); setMsgOk(true); setMsg('Profile updated'); setEditProf(false);
    } catch (e: any) { setMsgOk(false); setMsg(e.message); }
    finally { setSaving(false); }
  }

  async function savePassword() {
    setSaving(true); setMsg('');
    try {
      await partnerApi.changePassword(curPwd, newPwd, token);
      setMsgOk(true); setMsg('Password changed'); setEditPwd(false); setCurPwd(''); setNewPwd('');
    } catch (e: any) { setMsgOk(false); setMsg(e.message); }
    finally { setSaving(false); }
  }

  async function saveAccount() {
    setSaving(true); setMsg('');
    try {
      await partnerApi.updateAccount({ fullName: accName, phone: accPhone || undefined }, token);
      setMsgOk(true); setMsg('Account info updated'); setEditAcc(false);
      // refresh profile to show new name
      const updated = await partnerApi.getProfile(token);
      setProfile(updated);
    } catch (e: any) { setMsgOk(false); setMsg(e.message); }
    finally { setSaving(false); }
  }

  async function setAvailability(status: 'available' | 'busy' | 'offline') {
    if (!profile) return;
    setAvailLoading(true); setMsg('');
    try {
      const updated = await partnerApi.updateAvailability(status, token);
      setProfile(updated);
      setMsgOk(true); setMsg(`Availability set to ${status}`);
      // When going available, push current GPS to server so dispatch can find nearby partners
      if (status === 'available' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            partnerApi.updateLocation(coords.latitude, coords.longitude, token).catch(() => {});
          },
          () => { /* silently ignore if browser denies */ },
          { timeout: 8000, maximumAge: 60000 },
        );
      }
    } catch (e: any) { setMsgOk(false); setMsg(e.message); }
    finally { setAvailLoading(false); }
  }

  if (!profile) return (
    <div className="flex items-center justify-center h-64 text-white/30 text-sm">Profile not available</div>
  );

  return (
    <div>
      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm border ${
          msgOk ? 'text-green-400 border-green-400/20 bg-green-500/8' : 'text-red-400 border-red-400/20 bg-red-500/8'
        }`}>
          {msgOk ? <CheckCircle size={14} className="inline mr-2"/> : <AlertCircle size={14} className="inline mr-2"/>}
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: identity card */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <h3 className="text-white font-bold text-sm">Identity</h3>
          </div>
          <div className="px-5 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ background: ACCENT }}>
                {profile.name?.[0]?.toUpperCase() ?? 'P'}
              </div>
              <div>
                <p className="text-white font-bold">{profile.name}</p>
                <p className="text-white/40 text-xs">{profile.title || 'No title set'}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                { k: 'Status',    v: profile.isActive ? 'Active' : 'Inactive', color: profile.isActive ? '#16A34A' : '#EF4444' },
                { k: 'Rate',      v: `${fmt(profile.basePrice)} / ${profile.priceUnit}` },
                { k: 'Rating',    v: `⭐ ${profile.rating.toFixed(1)} (${profile.reviewCount} reviews)` },
              ].map(({ k, v, color }) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                  <span className="text-white/40 text-xs">{k}</span>
                  <span className="text-xs font-semibold" style={{ color: color ?? 'white' }}>{v}</span>
                </div>
              ))}
            </div>
            {profile.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-white/[0.05]">
                {profile.tags.map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: 'rgba(91,62,245,0.15)', color: '#7C5BF8' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="px-5 pb-5 flex flex-col gap-2">
            <div className="rounded-xl border border-white/[0.07] p-3">
              <p className="text-white/40 text-[11px] uppercase tracking-wide font-bold mb-2">Availability</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['available', 'Available', '#16A34A', CheckCircle],
                  ['busy', 'Busy', '#F59E0B', Clock],
                  ['offline', 'Offline', '#EF4444', XCircle],
                ] as const).map(([status, label, color, Icon]) => {
                  const active = (profile.availabilityStatus ?? (profile.isActive ? 'available' : 'offline')) === status;
                  return <button key={status} onClick={() => setAvailability(status)} disabled={availLoading}
                    className="py-2 rounded-lg text-[11px] font-bold flex flex-col items-center gap-1 border transition-all disabled:opacity-60"
                    style={{ borderColor: active ? `${color}80` : 'rgba(255,255,255,0.08)', color: active ? color : 'rgba(255,255,255,0.4)', background: active ? `${color}15` : 'transparent' }}>
                    {availLoading && active ? <Loader2 size={13} className="animate-spin"/> : <Icon size={13}/>}
                    {label}
                  </button>;
                })}
              </div>
            </div>
            <button onClick={() => {
              setTitle(profile.title); setBio(profile.bio);
              setPrice(String(profile.basePrice)); setPriceUnit(profile.priceUnit ?? 'visit');
              setTags(profile.tags.join(', '));
              const cid = profile.categoryId ?? '';
              setEditCatId(cid); setEditSubCatId(profile.subCategoryId ?? '');
              if (cid) loadSubCats(cid); setEditProf(true);
            }}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity"
              style={{ background: ACCENT }}>
              <Pencil size={13}/> Edit Profile
            </button>
            <button onClick={() => { setAccName(profile.name ?? ''); setAccPhone(''); setEditAcc(true); }}
              className="w-full py-2.5 rounded-xl font-bold text-sm border border-white/10 text-white/60 hover:bg-white/5 flex items-center justify-center gap-2 transition-colors">
              <User size={13}/> Edit Account Info
            </button>
            <button onClick={() => setEditPwd(true)}
              className="w-full py-2.5 rounded-xl font-bold text-sm border border-white/10 text-white/60 hover:bg-white/5 flex items-center justify-center gap-2 transition-colors">
              <Lock size={13}/> Change Password
            </button>
          </div>
        </div>

        {/* Right: bio + stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <h3 className="text-white font-bold text-sm">About</h3>
            </div>
            <div className="px-5 py-4">
              {profile.bio
                ? <p className="text-white/60 text-sm leading-relaxed">{profile.bio}</p>
                : <p className="text-white/25 text-sm italic">No bio added yet. Edit your profile to add one.</p>
              }
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <h3 className="text-white font-bold text-sm">Performance</h3>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              {[
                { label: 'Rating',   value: profile.rating.toFixed(1), sub: 'out of 5.0' },
                { label: 'Reviews',  value: String(profile.reviewCount), sub: 'total reviews' },
                { label: 'Active',   value: profile.isActive ? 'Yes' : 'No', sub: 'account status' },
              ].map(s => (
                <div key={s.label} className="px-5 py-5 text-center">
                  <p className="text-white font-bold text-2xl">{s.value}</p>
                  <p className="text-white/40 text-xs mt-1">{s.label}</p>
                  <p className="text-white/25 text-[10px] mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editProf && (
        <Modal title="Edit Profile" onClose={() => setEditProf(false)}>
          <div className="space-y-4">
            <Field label="Professional Title">
              <TextInput value={title} onChange={setTitle} placeholder="e.g. Expert Plumber"/>
            </Field>
            <Field label="Bio">
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder="Tell customers about yourself…"
                className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors resize-none"
                style={INPUT_STY}/>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Base Price (₹)">
                <TextInput value={price} onChange={setPrice} type="number" placeholder="500"/>
              </Field>
              <Field label="Price Unit">
                <TextInput value={priceUnit} onChange={setPriceUnit} placeholder="visit"/>
              </Field>
            </div>
            <Field label="Category">
              <SelectInput value={editCatId} onChange={v => { setEditCatId(v); setEditSubCatId(''); loadSubCats(v); }}>
                <option value="">— Select category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Sub-category">
              <SelectInput value={editSubCatId} onChange={setEditSubCatId} disabled={!editCatId || subLoading}>
                <option value="">
                  {!editCatId ? 'Select a category first' : subLoading ? 'Loading…' : subCats.length === 0 ? 'No sub-categories' : '— None —'}
                </option>
                {subCats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Skills / Tags (comma-separated)">
              <TextInput value={tags} onChange={setTags} placeholder="plumbing, repair, installation"/>
            </Field>
            <Field label="Payout UPI ID">
              <TextInput value={payoutUpiId} onChange={setPayoutUpiId} placeholder="yourname@upi"/>
              <p className="text-white/30 text-[10px] mt-1">Admin uses this UPI ID for RazorpayX partner payouts.</p>
            </Field>
            <div className="flex gap-3 mt-6">
              <button onClick={saveProfile} disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: ACCENT }}>
                {saving ? <><Loader2 size={14} className="animate-spin"/>Saving…</> : <><Check size={14}/>Save changes</>}
              </button>
              <GhostBtn onClick={() => setEditProf(false)}>Cancel</GhostBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* Change Password Modal */}
      {editPwd && (
        <Modal title="Change Password" onClose={() => setEditPwd(false)}>
          <div className="space-y-4">
            <Field label="Current Password">
              <TextInput value={curPwd} onChange={setCurPwd} type="password" placeholder="••••••••"/>
            </Field>
            <Field label="New Password">
              <TextInput value={newPwd} onChange={setNewPwd} type="password" placeholder="••••••••"/>
            </Field>
            <div className="flex gap-3 mt-6">
              <button onClick={savePassword} disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: ACCENT }}>
                {saving ? <><Loader2 size={14} className="animate-spin"/>Saving…</> : 'Update password'}
              </button>
              <GhostBtn onClick={() => setEditPwd(false)}>Cancel</GhostBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Account Info Modal */}
      {editAcc && (
        <Modal title="Edit Account Info" onClose={() => setEditAcc(false)}>
          <div className="space-y-4">
            <Field label="Full Name">
              <TextInput value={accName} onChange={setAccName} placeholder="Your full name"/>
            </Field>
            <Field label="Phone Number">
              <TextInput value={accPhone} onChange={setAccPhone} type="tel" placeholder="+91 99999 99999"/>
            </Field>
            <div className="flex gap-3 mt-6">
              <button onClick={saveAccount} disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: ACCENT }}>
                {saving ? <><Loader2 size={14} className="animate-spin"/>Saving…</> : <><Check size={14}/>Save changes</>}
              </button>
              <GhostBtn onClick={() => setEditAcc(false)}>Cancel</GhostBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Notifications ───────────────────────────────────────────────── */
function Notifications({ token }: { token: string }) {
  const [notifs,  setNotifs]  = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotifs(await notificationsApi.list(token)); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    setActing(id);
    try {
      await notificationsApi.markRead(id, token);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } finally { setActing(null); }
  }
  async function del(id: string) {
    setActing(id);
    try {
      await notificationsApi.delete(id, token);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } finally { setActing(null); }
  }
  async function markAll() {
    try {
      await notificationsApi.markAllRead(token);
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e: any) {
      // Surface error via the existing msg state if available, else console
      console.error('[notifications] markAll failed:', e.message);
    }
  }

  const unread = notifs.filter(n => !n.isRead).length;

  return (
    <div>
      {unread > 0 && (
        <div className="flex justify-end mb-4">
          <button onClick={markAll}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 transition-colors">
            Mark all read
          </button>
        </div>
      )}

      {loading
        ? <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin" style={{ color: '#5B3EF5' }}/></div>
        : notifs.length === 0
          ? <div className="flex flex-col items-center justify-center py-24 text-white/20">
              <Bell size={40} className="mb-3"/>
              <p className="text-sm">All caught up — no notifications</p>
            </div>
          : (
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
              {notifs.map((n, i) => (
                <div key={n.id}
                  className={`flex items-start gap-3 px-5 py-4 border-b border-white/[0.04] last:border-b-0 transition-colors ${!n.isRead ? 'bg-violet-500/[0.04]' : 'hover:bg-white/[0.01]'}`}>
                  <div className="w-5 flex-shrink-0 mt-1">
                    {!n.isRead && <span className="block w-1.5 h-1.5 rounded-full bg-violet-500 mx-auto"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold">{n.title}</p>
                    <p className="text-white/50 text-[11px] mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-white/25 text-[10px] mt-1">{fmtDate(n.createdAt)}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)} disabled={acting === n.id}
                        className="p-1.5 rounded-lg text-white/30 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                        title="Mark read">
                        {acting === n.id ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>}
                      </button>
                    )}
                    <button onClick={() => del(n.id)} disabled={acting === n.id}
                      className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete">
                      <X size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}

/* ─── Payouts ─────────────────────────────────────────────────────── */
function Payouts({ token }: { token: string }) {
  const [payouts,  setPayouts]  = useState<Payout[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg,      setMsg]      = useState('');
  const [msgOk,    setMsgOk]    = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [payoutStartDate, setPayoutStartDate] = useState(() => new Date());
  const [payoutEndDate, setPayoutEndDate] = useState<Date | null>(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarSelection, setCalendarSelection] = useState<'start' | 'end'>('start');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<PayoutStatusFilter>('all');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const PAYOUT_STATUS: Record<Exclude<PayoutStatusFilter, 'all'>, { color: string; label: string }> = {
    pending:    { color: '#F59E0B', label: 'Pending' },
    processing: { color: '#3B82F6', label: 'Processing' },
    paid:       { color: '#16A34A', label: 'Paid' },
    rejected:   { color: '#EF4444', label: 'Rejected' },
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payoutRows, earningsSummary] = await Promise.all([
        payoutsApi.list(token),
        partnerApi.getEarnings(token),
      ]);
      setPayouts(payoutRows);
      setEarnings(earningsSummary);
    } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function requestPayout() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setMsgOk(false); setMsg('Enter a valid amount'); return; }
    setSubmitting(true); setMsg('');
    try {
      const p = await payoutsApi.request(amt, note, token);
      setPayouts(prev => [p, ...prev]);
      setAmount(''); setNote('');
      setMsgOk(true); setMsg('Payout request submitted');
    } catch (e: any) { setMsgOk(false); setMsg(e.message); }
    finally { setSubmitting(false); }
  }

  const selectedStatusLabel = PAYOUT_STATUS_FILTERS.find(filter => filter.key === payoutStatusFilter)?.label ?? 'All statuses';
  const filteredPayouts = payouts.filter(payout => {
    const requestedDate = payoutDateKey(new Date(payout.requestedAt));
    const startDate = payoutDateKey(payoutStartDate);
    const endDate = payoutDateKey(payoutEndDate ?? payoutStartDate);
    const dateMatches = requestedDate >= startDate && requestedDate <= endDate;
    const statusMatches = payoutStatusFilter === 'all' || payoutStatusKey(payout.status) === payoutStatusFilter;
    return dateMatches && statusMatches;
  });

  function choosePayoutDate(date: Date) {
    if (calendarSelection === 'start') {
      setPayoutStartDate(date);
      setPayoutEndDate(null);
      setCalendarSelection('end');
      setCalendarMonth(date);
      return;
    }

    if (payoutDateKey(date) < payoutDateKey(payoutStartDate)) {
      setPayoutStartDate(date);
      setPayoutEndDate(payoutStartDate);
    } else {
      setPayoutEndDate(date);
    }
    setCalendarMonth(date);
    setShowCalendar(false);
  }

  function resetPayoutRangeToToday() {
    const today = new Date();
    setPayoutStartDate(today);
    setPayoutEndDate(today);
    setCalendarMonth(today);
  }

  return (
    <div>
      {earnings && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Available to withdraw', value: fmt(earnings.available), color: '#16A34A' },
            { label: 'Pending payouts', value: fmt(earnings.pendingPayout), color: '#F59E0B' },
            { label: 'Paid out', value: fmt(earnings.paidOut), color: '#5B3EF5' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 border border-white/[0.07]" style={CARD}>
              <p className="text-white/40 text-xs">{s.label}</p>
              <p className="text-white font-bold text-2xl mt-2" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm border ${
          msgOk ? 'text-green-400 border-green-400/20' : 'text-red-400 border-red-400/20'
        }`} style={{ background: msgOk ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)' }}>
          {msgOk ? <CheckCircle size={14} className="inline mr-2"/> : <AlertCircle size={14} className="inline mr-2"/>}
          {msg}
        </div>
      )}

      {/* Request form */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden mb-5" style={CARD}>
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <h3 className="text-white font-bold text-sm">Request a Payout</h3>
          <p className="text-white/40 text-xs mt-0.5">Withdraw confirmed earnings after service completion and payment</p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <Field label="Amount (₹)">
            <TextInput value={amount} onChange={setAmount} type="number" placeholder="e.g. 500"/>
          </Field>
          <Field label="Note (optional)">
            <TextInput value={note} onChange={setNote} placeholder="e.g. Weekly withdrawal"/>
          </Field>
          <p className="text-white/40 text-xs">Available: {fmt(earnings?.available ?? 0)} · Minimum withdrawal: ₹100</p>
          <PrimaryBtn onClick={requestPayout} loading={submitting} disabled={!amount || Number(amount) < 100 || Number(amount) > (earnings?.available ?? 0)}>
            <FileText size={14}/> Request Payout
          </PrimaryBtn>
        </div>
      </div>

      {/* Payout history */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-sm">Payout History</h3>
              <p className="text-white/40 text-xs mt-1">
                Showing {formatPayoutRange(payoutStartDate, payoutEndDate)} · {selectedStatusLabel}
              </p>
            </div>
            <DollarSign size={18} className="text-violet-400 flex-shrink-0 mt-0.5" />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              type="button"
              onClick={resetPayoutRangeToToday}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold transition-colors ${
                payoutDateKey(payoutStartDate) === payoutDateKey(new Date())
                  && payoutDateKey(payoutEndDate ?? payoutStartDate) === payoutDateKey(new Date())
                  ? 'bg-violet-500 text-white border-violet-400'
                  : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white'
              }`}
            >
              <Calendar size={13} /> Today
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarSelection('start');
                setCalendarMonth(payoutStartDate);
                setShowCalendar(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 hover:text-white text-xs font-semibold transition-colors"
            >
              <Calendar size={13} className="text-violet-400" />
              {formatPayoutRange(payoutStartDate, payoutEndDate)}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusMenu(current => !current)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold transition-colors ${
                  payoutStatusFilter !== 'all'
                    ? 'bg-violet-500 text-white border-violet-400'
                    : 'bg-white/[0.04] text-white/70 border-white/[0.08] hover:text-white'
                }`}
              >
                <span className={payoutStatusFilter === 'all' ? 'text-violet-400' : ''}>Filter</span>
                {selectedStatusLabel}
                <ChevronDown size={13} />
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-2 z-30 w-44 rounded-xl border border-white/[0.1] p-1.5 shadow-2xl" style={MODAL_BG}>
                  {PAYOUT_STATUS_FILTERS.map(filter => (
                    <button
                      type="button"
                      key={filter.key}
                      onClick={() => {
                        setPayoutStatusFilter(filter.key);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                        payoutStatusFilter === filter.key
                          ? 'bg-violet-500/15 text-violet-300'
                          : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      {filter.label}
                      {payoutStatusFilter === filter.key && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {loading
          ? <div className="flex items-center justify-center h-32"><Loader2 size={22} className="animate-spin" style={{ color: '#5B3EF5' }}/></div>
          : filteredPayouts.length === 0
            ? <div className="flex flex-col items-center justify-center py-16 text-white/20">
                <DollarSign size={36} className="mb-3"/>
                <p className="text-sm">
                  {payouts.length === 0
                    ? 'No payout requests yet'
                    : `No payout requests for ${formatPayoutRange(payoutStartDate, payoutEndDate)}`}
                </p>
              </div>
            : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10" style={{ background: 'rgba(20,20,30,1)' }}>
                  <tr className="border-b border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Amount', 'Note', 'Status', 'Requested'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.map(p => {
                    const s = PAYOUT_STATUS[payoutStatusKey(p.status)];
                    return (
                      <tr key={p.id} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-4 py-3 text-white font-bold">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 text-white/50 text-xs">{p.note ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                            style={{ background: s.color + '20', color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/40 text-xs">{fmtDate(p.requestedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
        }
      </div>

      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onMouseDown={event => {
          if (event.target === event.currentTarget) setShowCalendar(false);
        }}>
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] p-5 shadow-2xl" style={MODAL_BG}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-white font-bold">Filter payout history</h3>
                <p className="text-white/40 text-xs mt-1">
                  {calendarSelection === 'start' ? 'Choose start date' : 'Choose end date'}
                </p>
              </div>
              <button type="button" onClick={() => setShowCalendar(false)} className="p-1 text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { key: 'start' as const, label: 'Start date', value: formatPayoutFilterDate(payoutStartDate) },
                { key: 'end' as const, label: 'End date', value: payoutEndDate ? formatPayoutFilterDate(payoutEndDate) : 'Select date' },
              ].map(selection => (
                <button
                  type="button"
                  key={selection.key}
                  onClick={() => setCalendarSelection(selection.key)}
                  className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                    calendarSelection === selection.key
                      ? 'border-violet-400 bg-violet-500/15'
                      : 'border-white/[0.08] bg-white/[0.04]'
                  }`}
                >
                  <span className="block text-white/40 text-[10px] font-semibold">{selection.label}</span>
                  <span className="block text-white text-xs font-bold mt-1">{selection.value}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-5 mb-3">
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.05]"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="text-white text-sm font-bold">
                {calendarMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.05]"
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <span key={`${day}-${index}`} className="text-center text-white/35 text-[11px] font-bold py-1">{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {payoutCalendarDays(calendarMonth).map((day, index) => {
                if (!day) return <span key={`empty-${index}`} className="aspect-square" />;
                const dayKey = payoutDateKey(day);
                const isStart = dayKey === payoutDateKey(payoutStartDate);
                const isEnd = !!payoutEndDate && dayKey === payoutDateKey(payoutEndDate);
                const rangeEnd = payoutEndDate ?? payoutStartDate;
                const inRange = dayKey >= payoutDateKey(payoutStartDate) && dayKey <= payoutDateKey(rangeEnd);
                return (
                  <button
                    type="button"
                    key={dayKey}
                    onClick={() => choosePayoutDate(day)}
                    className={`aspect-square flex items-center justify-center text-xs font-semibold transition-colors ${
                      inRange ? 'bg-violet-500/15' : 'hover:bg-white/[0.06]'
                    } ${isStart || isEnd ? '!bg-violet-500 !text-white rounded-full' : 'text-white/80'}`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                resetPayoutRangeToToday();
                setCalendarSelection('start');
              }}
              className="w-full mt-4 py-2.5 rounded-xl bg-violet-500/15 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-colors"
            >
              <Calendar size={14} className="inline mr-1.5" /> Start over with today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Documents (KYC / Verification) ─────────────────────────────── */
const DOC_STATUS_STYLES: Record<string, { color: string; label: string; bg: string; icon: React.ReactNode }> = {
  pending:            { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Pending',           icon: <Clock size={11}/> },
  under_review:       { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: 'Under Review',       icon: <BarChart2 size={11}/> },
  approved:           { color: '#16A34A', bg: 'rgba(22,163,74,0.12)',  label: 'Approved',           icon: <CheckCircle size={11}/> },
  rejected:           { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Rejected',           icon: <XCircle size={11}/> },
  re_upload_required: { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'Re-upload Required', icon: <AlertCircle size={11}/> },
  expired:            { color: '#6B7280', bg: 'rgba(107,114,128,0.12)',label: 'Expired',            icon: <Clock size={11}/> },
};

function borderForStatus(status?: string) {
  if (status === 'approved') return 'rgba(22,163,74,0.3)';
  if (status === 'rejected' || status === 're_upload_required') return 'rgba(239,68,68,0.2)';
  if (status === 'expired') return 'rgba(107,114,128,0.2)';
  return 'rgba(255,255,255,0.07)';
}

interface DocCardProps {
  dt: DocumentTypeConfig;
  docByType: Record<string, PartnerDocument>;
  uploading: string | null;
  uploadProgress: Record<string, number>;
  dragOver: string | null;
  setDragOver: (v: string | null) => void;
  handleFile: (docType: string, file: File) => void;
  fileRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  deleting: string | null;
  handleDelete: (doc: PartnerDocument) => void;
  openHistory: (docType: string) => void;
}

function DocCard({ dt, docByType, uploading, uploadProgress, dragOver, setDragOver, handleFile, fileRefs, deleting, handleDelete, openHistory }: DocCardProps) {
  const existing = docByType[dt.type_key];
  const isUp = uploading === dt.type_key;
  const pct  = uploadProgress[dt.type_key] ?? 0;
  const isDrag = dragOver === dt.type_key;
  const st   = existing ? DOC_STATUS_STYLES[existing.status] ?? DOC_STATUS_STYLES['pending'] : null;

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(null);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(dt.type_key, f);
  }

  return (
    <div className="rounded-2xl border overflow-hidden transition-all"
      style={{ background: CARD.background, borderColor: isDrag ? '#7C5BF8' : borderForStatus(existing?.status) }}
      onDragOver={e => { e.preventDefault(); setDragOver(dt.type_key); }}
      onDragLeave={() => setDragOver(null)}
      onDrop={onDrop}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">{dt.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold text-sm">{dt.label}</p>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${dt.is_mandatory ? 'text-amber-400 bg-amber-400/10' : 'text-white/30 bg-white/5'}`}>
                {dt.is_mandatory ? 'REQUIRED' : 'OPTIONAL'}
              </span>
            </div>
            {dt.description && <p className="text-white/40 text-xs mt-0.5 leading-snug">{dt.description}</p>}
          </div>
          {existing && (
            <button onClick={() => openHistory(dt.type_key)} title="View history"
              className="flex-shrink-0 p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors">
              <HistoryIcon size={13}/>
            </button>
          )}
        </div>

        {isUp && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/40 text-[10px]">Uploading…</span>
              <span className="text-white/40 text-[10px]">{pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: ACCENT }}/>
            </div>
          </div>
        )}

        {existing && !isUp ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: st!.bg, color: st!.color }}>
                {st!.icon}{st!.label}
              </span>
              <span className="text-white/25 text-[10px]">
                {new Date(existing.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {existing.version > 1 && <> · v{existing.version}</>}
              </span>
            </div>

            {(existing.status === 'rejected' || existing.status === 're_upload_required') && existing.rejection_reason && (
              <div className="mb-3 px-3 py-2 rounded-xl text-xs text-red-300 border border-red-400/15" style={{ background: 'rgba(239,68,68,0.06)' }}>
                <AlertCircle size={11} className="inline mr-1.5"/>{existing.rejection_reason}
              </div>
            )}
            {existing.status === 'expired' && (
              <div className="mb-3 px-3 py-2 rounded-xl text-xs text-gray-400 border border-gray-400/15" style={{ background: 'rgba(107,114,128,0.08)' }}>
                <Clock size={11} className="inline mr-1.5"/>This document has expired. Please upload a new one.
              </div>
            )}

            <div className="flex items-center gap-2">
              {existing.document_url && (
                <a href={existing.document_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] text-violet-400 hover:bg-violet-500/10 border border-violet-400/20 transition-colors truncate">
                  <Eye size={11}/><span className="truncate">{existing.file_name ?? 'View file'}</span>
                </a>
              )}
              <button onClick={() => fileRefs.current[dt.type_key]?.click()} disabled={isUp}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-bold border border-white/10 text-white/50 hover:bg-white/5 transition-colors disabled:opacity-50">
                <Upload size={11}/>Re-upload
              </button>
              {existing.status !== 'approved' && (
                <button onClick={() => handleDelete(existing)} disabled={deleting === existing.id}
                  className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-white/[0.06] disabled:opacity-50">
                  {deleting === existing.id ? <Loader2 size={11} className="animate-spin"/> : <Trash2 size={11}/>}
                </button>
              )}
            </div>
          </>
        ) : !isUp ? (
          <button onClick={() => fileRefs.current[dt.type_key]?.click()}
            className="w-full py-4 rounded-xl border-2 border-dashed text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            style={{ borderColor: isDrag ? '#7C5BF8' : 'rgba(255,255,255,0.12)', color: isDrag ? '#7C5BF8' : 'rgba(255,255,255,0.35)', background: isDrag ? 'rgba(124,91,248,0.06)' : undefined }}>
            <Upload size={18}/>
            <span>Click to upload or drag & drop</span>
            <span className="text-[10px] opacity-60">PNG, JPG, WEBP, PDF · max 10 MB</span>
          </button>
        ) : null}

        <input ref={el => { fileRefs.current[dt.type_key] = el; }}
          type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(dt.type_key, f); e.target.value = ''; }}/>
      </div>
    </div>
  );
}

function Documents({ token }: { token: string }) {
  const [docTypes, setDocTypes] = useState<DocumentTypeConfig[]>([]);
  const [docs,     setDocs]     = useState<PartnerDocument[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [msg,     setMsg]     = useState('');
  const [msgOk,   setMsgOk]   = useState(true);
  const [dragOver, setDragOver] = useState<string | null>(null);
  // History modal
  const [histType,    setHistType]    = useState<string | null>(null);
  const [histItems,   setHistItems]   = useState<PartnerDocumentHistory[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [types, userDocs] = await Promise.all([
        documentsApi.listTypes(token),
        documentsApi.list(token),
      ]);
      setDocTypes(types);
      setDocs(userDocs);
    } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const docByType = Object.fromEntries(docs.map(d => [d.document_type, d]));
  const required  = docTypes.filter(t => t.is_mandatory);
  const optional  = docTypes.filter(t => !t.is_mandatory);
  const approvedCount  = docs.filter(d => required.some(r => r.type_key === d.document_type) && d.status === 'approved').length;
  const requiredCount  = required.length;
  const progress = requiredCount > 0 ? Math.round((approvedCount / requiredCount) * 100) : 0;

  async function handleFile(docType: string, file: File) {
    const LIMIT = 10 * 1024 * 1024;
    if (file.size > LIMIT) { setMsgOk(false); setMsg('File too large — max 10 MB.'); return; }
    setUploading(docType); setMsg(''); setUploadProgress(p => ({ ...p, [docType]: 0 }));
    try {
      const updated = await documentsApi.upload(docType, file, token, pct => {
        setUploadProgress(p => ({ ...p, [docType]: pct }));
      });
      setDocs(prev => [...prev.filter(d => d.document_type !== docType), updated]);
      const label = docTypes.find(t => t.type_key === docType)?.label ?? docType;
      setMsgOk(true); setMsg(`${label} uploaded successfully ✓`);
    } catch (e: any) { setMsgOk(false); setMsg(e.message ?? 'Upload failed'); }
    finally { setUploading(null); setUploadProgress(p => { const n = { ...p }; delete n[docType]; return n; }); }
  }

  async function handleDelete(doc: PartnerDocument) {
    setDeleting(doc.id); setMsg('');
    try {
      await documentsApi.delete(doc.id, token);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      setMsgOk(true); setMsg('Document removed');
    } catch (e: any) { setMsgOk(false); setMsg(e.message ?? 'Delete failed'); }
    finally { setDeleting(null); }
  }

  async function openHistory(docType: string) {
    setHistType(docType); setHistItems([]); setHistLoading(true);
    try { setHistItems(await documentsApi.getHistory(docType, token)); }
    catch { setHistItems([]); }
    finally { setHistLoading(false); }
  }

  // History modal
  const histLabel = docTypes.find(t => t.type_key === histType)?.label ?? histType ?? '';

  return (
    <div>
      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${msgOk ? 'text-green-400 border-green-400/20' : 'text-red-400 border-red-400/20'}`}
          style={{ background: msgOk ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)' }}>
          {msgOk ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
          <span className="flex-1">{msg}</span>
          <button onClick={() => setMsg('')} className="opacity-50 hover:opacity-100"><X size={13}/></button>
        </div>
      )}

      {/* Verification progress */}
      {!loading && requiredCount > 0 && (
        <div className="rounded-2xl p-4 border border-white/[0.07] mb-6" style={CARD}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-bold text-sm">Verification Progress</p>
              <p className="text-white/40 text-xs mt-0.5">{approvedCount} of {requiredCount} required documents approved</p>
            </div>
            <span className="text-white font-bold text-lg">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: ACCENT }}/>
          </div>
          {approvedCount === requiredCount && (
            <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
              <CheckCircle size={12}/> All required documents verified — you're ready to accept bookings!
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin" style={{ color: '#5B3EF5' }}/></div>
      ) : (
        <>
          {required.length > 0 && (
            <>
              <div className="mb-4">
                <p className="text-white font-bold text-sm mb-1">Required Documents</p>
                <p className="text-white/40 text-xs">These are needed before you can accept bookings</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {required.map(dt => <DocCard key={dt.type_key} dt={dt} docByType={docByType} uploading={uploading} uploadProgress={uploadProgress} dragOver={dragOver} setDragOver={setDragOver} handleFile={handleFile} fileRefs={fileRefs} deleting={deleting} handleDelete={handleDelete} openHistory={openHistory}/>)}
              </div>
            </>
          )}
          {optional.length > 0 && (
            <>
              <div className="mb-4">
                <p className="text-white font-bold text-sm mb-1">Optional Documents</p>
                <p className="text-white/40 text-xs">These improve your profile and trust score</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {optional.map(dt => <DocCard key={dt.type_key} dt={dt} docByType={docByType} uploading={uploading} uploadProgress={uploadProgress} dragOver={dragOver} setDragOver={setDragOver} handleFile={handleFile} fileRefs={fileRefs} deleting={deleting} handleDelete={handleDelete} openHistory={openHistory}/>)}
              </div>
            </>
          )}
        </>
      )}

      {/* History modal */}
      {histType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 max-h-[80vh] flex flex-col" style={MODAL_BG}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <p className="text-white font-bold text-sm">Document History</p>
                <p className="text-white/40 text-xs mt-0.5">{histLabel}</p>
              </div>
              <button onClick={() => setHistType(null)} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                <X size={16}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {histLoading ? (
                <div className="flex items-center justify-center h-24"><Loader2 size={20} className="animate-spin" style={{ color: '#5B3EF5' }}/></div>
              ) : histItems.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">No previous versions found</p>
              ) : histItems.map(h => {
                const st = DOC_STATUS_STYLES[h.status] ?? DOC_STATUS_STYLES['pending'];
                return (
                  <div key={h.id} className="p-3 rounded-xl border border-white/[0.07]" style={CARD}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: st.bg, color: st.color }}>
                        {st.icon}{st.label}
                      </span>
                      <span className="text-white/25 text-[10px]">v{h.version}</span>
                    </div>
                    <p className="text-white/30 text-xs">
                      Uploaded: {new Date(h.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {h.reviewed_at && <p className="text-white/20 text-xs">Reviewed: {new Date(h.reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                    {h.archived_at && <p className="text-white/20 text-xs">Archived: {new Date(h.archived_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                    {h.rejection_reason && (
                      <p className="text-red-300 text-xs mt-2 px-2 py-1 rounded border border-red-400/15" style={{ background: 'rgba(239,68,68,0.06)' }}>
                        {h.rejection_reason}
                      </p>
                    )}
                    {h.document_url && (
                      <a href={h.document_url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-violet-400 text-xs hover:underline">
                        <Eye size={10}/> View file
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Root App ────────────────────────────────────────────────────── */
type Page = 'dashboard' | 'schedule' | 'jobs' | 'earnings' | 'payouts' | 'notifications' | 'documents' | 'profile';

const NAV: { id: Page; label: string; Icon: React.ElementType }[] = [
  { id: 'dashboard',     label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'schedule',      label: 'Schedule',     Icon: Calendar         },
  { id: 'jobs',          label: 'My Jobs',       Icon: Briefcase       },
  { id: 'earnings',      label: 'Earnings',      Icon: DollarSign      },
  { id: 'payouts',       label: 'Payouts',       Icon: FileText        },
  { id: 'documents',     label: 'Documents',     Icon: Shield          },
  { id: 'notifications', label: 'Notifications', Icon: Bell            },
  { id: 'profile',       label: 'Profile',       Icon: User            },
];

interface SidebarContentProps {
  page: Page;
  navigate: (p: Page) => void;
  unread: number;
  profile: PartnerProfile | null;
  logout: () => void;
}

function SidebarContent({ page, navigate, unread, profile, logout }: SidebarContentProps) {
  const labels: Record<Page, string> = {
    dashboard: 'Dashboard',
    schedule: 'Schedule',
    jobs: 'My Jobs',
    earnings: 'Earnings',
    payouts: 'Payouts',
    documents: 'Documents',
    notifications: 'Notifications',
    profile: 'Profile',
  };
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: ACCENT }}>
          <Briefcase size={15} className="text-white"/>
        </div>
        <div className="leading-none">
          <p className="text-white font-bold text-sm">ServeNow</p>
          <p className="text-white/40 text-[11px] mt-0.5">Partner Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => navigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              style={active ? { background: 'rgba(91,62,245,0.2)' } : {}}>
              <Icon size={17} className={active ? 'text-violet-300' : ''}/>
              <span className="flex-1 text-left">{labels[id] ?? label}</span>
              {id === 'notifications' && unread > 0 && (
                <span className="text-[10px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0"
                  style={{ background: '#5B3EF5' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      {profile && (
        <div className="px-3 py-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: ACCENT }}>
              {profile.name?.[0]?.toUpperCase() ?? 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile.name}</p>
              <p className="text-white/30 text-[10px] truncate">{profile.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/8 transition-all">
            <LogOut size={15}/> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const t = (source: string) => source;
  const [auth,    setAuth]    = useState<AuthTokens | null>(() => {
    try { const s = localStorage.getItem('partner_auth'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [page,    setPage]    = useState<Page>('dashboard');
  const [unread,  setUnread]  = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  function triggerRefresh() { setRefreshKey(k => k + 1); }

  // Register the refresh handler synchronously during render so it is available
  // before any child component fires its first API call. Moving this inside a
  // useEffect would leave a window between mount and the first effect flush where
  // 401 responses could not be retried. setRefreshHandler only mutates a
  // module-level variable, so calling it during render has no React-visible
  // side effects and is safe.
  setRefreshHandler(auth ? async () => {
    try {
      const t = await authApi.refresh(auth.refreshToken);
      const next = { ...auth, accessToken: t.accessToken, refreshToken: t.refreshToken };
      setAuth(next); localStorage.setItem('partner_auth', JSON.stringify(next));
      return t.accessToken;
    } catch { return null; }
  } : null);

  useEffect(() => {
    if (!auth) return;
    partnerApi.getProfile(auth.accessToken).then(setProfile).catch(() => {});
    notificationsApi.unreadCount(auth.accessToken).then(r => setUnread(r.count)).catch(() => {});
  }, [auth]);

  // Poll unread notification count every 30 s
  useEffect(() => {
    if (!auth) return;
    const t = setInterval(() => {
      notificationsApi.unreadCount(auth.accessToken).then(r => setUnread(r.count)).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, [auth]);

  function onLogin(tokens: AuthTokens) {
    setAuth(tokens); localStorage.setItem('partner_auth', JSON.stringify(tokens));
  }
  function logout() {
    if (auth) authApi.logout(auth.refreshToken).catch(() => {});
    setAuth(null); localStorage.removeItem('partner_auth');
  }
  function navigate(p: Page) {
    setPage(p); setMobileOpen(false);
    if (p === 'notifications') setUnread(0);
  }

  if (!auth) return <AuthScreen onLogin={onLogin}/>;

  const currentNav = NAV.find(n => n.id === page)!;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f1117' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[200px] border-r border-white/[0.07] flex-shrink-0"
        style={{ background: '#161B27' }}>
        <SidebarContent page={page} navigate={navigate} unread={unread} profile={profile} logout={logout}/>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)}/>
          <div className="relative w-56 flex flex-col border-r border-white/[0.07] h-full"
            style={{ background: '#161B27' }}>
            <SidebarContent page={page} navigate={navigate} unread={unread} profile={profile} logout={logout}/>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Topbar (matches admin panel exactly) ── */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.07] flex-shrink-0"
          style={{ background: '#161B27' }}>
          {/* Mobile hamburger */}
          <button className="md:hidden text-white/50 hover:text-white transition-colors mr-1"
            onClick={() => setMobileOpen(true)}>
            <Menu size={20}/>
          </button>
          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl leading-none">
              {({
                dashboard: 'Dashboard',
                schedule: 'Schedule',
                jobs: 'My Jobs',
                earnings: 'Earnings',
                payouts: 'Payouts',
                documents: 'Documents',
                notifications: 'Notifications',
                profile: 'Profile',
              } as Record<Page, string>)[page] ?? currentNav.label}
            </h1>
            <p className="text-white/40 text-sm mt-0.5">ServeNow Partner Portal</p>
          </div>
          {/* Refresh */}
          <button onClick={triggerRefresh}
            className="text-white/30 hover:text-white/70 transition-colors p-1 flex-shrink-0">
            <RefreshCw size={16}/>
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {page === 'dashboard'     && <Dashboard     key={refreshKey} token={auth.accessToken} profile={profile}/>}
          {page === 'schedule'      && <Schedule      key={refreshKey} token={auth.accessToken}/>}
          {page === 'jobs'          && <Jobs          key={refreshKey} token={auth.accessToken}/>}
          {page === 'earnings'      && <Earnings      key={refreshKey} token={auth.accessToken}/>}
          {page === 'payouts'       && <Payouts       key={refreshKey} token={auth.accessToken}/>}
          {page === 'documents'     && <Documents     key={refreshKey} token={auth.accessToken}/>}
          {page === 'notifications' && <Notifications key={refreshKey} token={auth.accessToken}/>}
          {page === 'profile'       && <Profile       key={refreshKey} token={auth.accessToken} profile={profile} setProfile={setProfile}/>}
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-white/[0.07] flex-shrink-0" style={{ background: '#161B27' }}>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => navigate(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-all relative ${
                page === id ? 'text-violet-400' : 'text-white/30'
              }`}>
              <Icon size={18}/>
              {id === 'notifications' && unread > 0 && (
                <span className="absolute top-2 right-1/2 translate-x-3 w-3 h-3 rounded-full text-white text-[8px] flex items-center justify-center font-bold"
                  style={{ background: '#5B3EF5' }}>{unread > 9 ? '9' : unread}</span>
              )}
              <span>{({
                dashboard: 'Dashboard',
                schedule: 'Schedule',
                jobs: 'My Jobs',
                earnings: 'Earnings',
                payouts: 'Payouts',
                documents: 'Documents',
                notifications: 'Notifications',
                profile: 'Profile',
              } as Record<Page, string>)[id] ?? label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
