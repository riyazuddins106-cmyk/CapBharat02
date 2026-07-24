import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Briefcase, DollarSign, User, Bell,
  LogOut, CheckCircle, Clock, XCircle, Loader2, TrendingUp,
  Star, RefreshCw, X, Check, AlertCircle, Pencil, Lock,
  Calendar, Phone, FileText, Menu, BarChart2, Zap,
} from 'lucide-react';
import {
  authApi, partnerApi, notificationsApi, categoriesApi, setRefreshHandler,
  type Job, type JobStatus, type Earnings, type PartnerProfile, type Category,
  type AppNotification, type AuthTokens,
} from '@/lib/api';

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

/* ─── Login ───────────────────────────────────────────────────────── */
function Login({ onLogin }: { onLogin: (t: AuthTokens) => void }) {
  const [email,    setEmail]    = useState('partner@servenow.in');
  const [password, setPassword] = useState('');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const tokens = await authApi.login(email, password);
      if (tokens.user.role !== 'partner') {
        setErr('This portal is for partners only.'); setLoading(false); return;
      }
      onLogin(tokens);
    } catch (e: any) { setErr(e.message ?? 'Login failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f1117' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: ACCENT }}>
            <Briefcase size={20} color="white"/>
          </div>
          <span className="text-white font-bold text-xl">ServeNow Partner</span>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-white/10 p-6"
          style={{ background: '#161B27' }}>
          <h2 className="text-white font-bold text-lg mb-1">Welcome back</h2>
          <p className="text-white/40 text-sm mb-6">Sign in to your partner portal</p>
          {err && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-400/20"
              style={{ background: 'rgba(239,68,68,0.08)' }}>
              <AlertCircle size={14} className="inline mr-2"/>{err}
            </div>
          )}
          <div className="space-y-4">
            <Field label="Email">
              <TextInput type="email" value={email} onChange={setEmail} placeholder="partner@servenow.in"/>
            </Field>
            <Field label="Password">
              <TextInput type="password" value={password} onChange={setPassword} placeholder="••••••••"/>
            </Field>
          </div>
          <button type="submit" disabled={loading}
            className="w-full mt-6 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: ACCENT }}>
            {loading && <Loader2 size={16} className="animate-spin"/>}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────────── */
function Dashboard({ token, profile }: { token: string; profile: PartnerProfile | null }) {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [jobs,     setJobs]     = useState<Job[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, j] = await Promise.all([
        partnerApi.getEarnings(token),
        partnerApi.listJobs(token),
      ]);
      setEarnings(e); setJobs(j);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const upcoming = jobs.filter(j => j.status === 'upcoming' || j.status === 'in_progress').slice(0, 8);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin" style={{ color: '#5B3EF5' }}/>
    </div>
  );

  const stats = [

    { label: 'Total Earnings', value: fmt(earnings?.total ?? 0),     color: '#16A34A', icon: DollarSign },
    { label: 'This Month',     value: fmt(earnings?.thisMonth ?? 0), color: '#5B3EF5', icon: TrendingUp },
    { label: 'Today',          value: fmt(earnings?.today ?? 0),     color: '#F59E0B', icon: Zap        },
    { label: 'Rating',         value: profile ? profile.rating.toFixed(1) : '—', color: '#F59E0B', icon: Star },
  ];

  return (
    <div>
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

      {/* Profile + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile snapshot */}
        {profile && (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <h3 className="text-white font-bold text-sm">My Profile</h3>
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
                  {profile.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Rating',  value: profile.rating.toFixed(1) },
                  { label: 'Reviews', value: String(profile.reviewCount) },
                  { label: 'Rate',    value: `${fmt(profile.basePrice)}/${profile.priceUnit}` },
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

        {/* Upcoming jobs */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={CARD}>
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <h3 className="text-white font-bold text-sm">Upcoming Jobs</h3>
          </div>
          {upcoming.length === 0
            ? <p className="px-5 py-8 text-white/30 text-sm text-center">No upcoming jobs</p>
            : upcoming.map(j => (
                <div key={j.id} className="px-5 py-3 flex items-center gap-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{j.serviceName}</p>
                    <p className="text-white/40 text-xs truncate">{j.customerName ?? 'Customer'}</p>
                  </div>
                  <p className="text-white/60 text-xs flex-shrink-0">{fmt(j.price)}</p>
                  <StatusBadge status={j.status}/>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Jobs ────────────────────────────────────────────────────────── */
function Jobs({ token }: { token: string }) {
  const [jobs,      setJobs]      = useState<Job[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Job | null>(null);
  const [completing,setCompleting]= useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [checkingIn,setCheckingIn]= useState(false);
  const [filter,    setFilter]    = useState<JobStatus | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { setJobs(await partnerApi.listJobs(token)); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

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

  async function checkin(id: string) {
    setCheckingIn(true);
    try {
      const j = await partnerApi.checkinJob(id, token);
      setJobs(prev => prev.map(x => x.id === id ? j : x)); setSelected(j);
    } finally { setCheckingIn(false); }
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
              filter === s
                ? 'text-white'
                : 'border border-white/10 text-white/50 hover:bg-white/5'
            }`}
            style={filter === s ? { background: ACCENT } : {}}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            <span className={`ml-1.5 ${filter === s ? 'text-white/70' : 'text-white/30'}`}>
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

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
                <thead>
                  <tr className="border-b border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Service', 'Customer', 'Scheduled', 'Status', 'Price', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(j => (
                    <tr key={j.id}
                      className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelected(j)}>
                      <td className="px-4 py-3">
                        <p className="text-white font-semibold leading-snug">{j.serviceName}</p>
                        {j.notes && <p className="text-white/35 text-xs mt-0.5 truncate max-w-[180px]">{j.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-white/70">{j.customerName ?? '—'}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">{fmtDate(j.scheduledAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={j.status}/></td>
                      <td className="px-4 py-3 text-white font-bold">{fmt(j.price)}</td>
                      <td className="px-4 py-3">
                        <button className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors"
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

      {selected && (
        <Modal title="Job Details" onClose={() => setSelected(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Service',   selected.serviceName],
                ['Customer',  selected.customerName ?? '—'],
                ['Phone',     selected.customerPhone ?? '—'],
                ['Scheduled', fmtDate(selected.scheduledAt)],
                ['Price',     fmt(selected.price)],
                ['Status',    selected.status.replace('_', ' ')],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-white/40 text-xs mb-1">{k}</p>
                  <p className="text-white font-semibold">{v}</p>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-white/40 text-xs mb-1">Notes</p>
                <p className="text-white text-sm leading-relaxed">{selected.notes}</p>
              </div>
            )}
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
              <div className="flex gap-3 mt-2">
                <PrimaryBtn loading={checkingIn} onClick={() => checkin(selected.id)} className="flex-1 justify-center">
                  <TrendingUp size={14}/> Check In / Start Job
                </PrimaryBtn>
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
  const [editProf, setEditProf] = useState(false);
  const [editPwd,  setEditPwd]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [msgOk,    setMsgOk]    = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCats,    setSubCats]    = useState<SubCategory[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(c => setCategories(c.filter((x: Category) => x.isActive))).catch(() => {});
  }, []);

  const [title,            setTitle]           = useState(profile?.title ?? '');
  const [bio,              setBio]             = useState(profile?.bio ?? '');
  const [price,            setPrice]           = useState(String(profile?.basePrice ?? ''));
  const [tags,             setTags]            = useState((profile?.tags ?? []).join(', '));
  const [editCatId,        setEditCatId]       = useState(profile?.categoryId ?? '');
  const [editSubCatId,     setEditSubCatId]    = useState(profile?.subCategoryId ?? '');
  const [curPwd,           setCurPwd]          = useState('');
  const [newPwd,           setNewPwd]          = useState('');

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
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        categoryId: editCatId || undefined,
        subCategoryId: editSubCatId || null,
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
            <button onClick={() => {
              setTitle(profile.title); setBio(profile.bio);
              setPrice(String(profile.basePrice)); setTags(profile.tags.join(', '));
              const cid = profile.categoryId ?? '';
              setEditCatId(cid); setEditSubCatId(profile.subCategoryId ?? '');
              if (cid) loadSubCats(cid); setEditProf(true);
            }}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity"
              style={{ background: ACCENT }}>
              <Pencil size={13}/> Edit Profile
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
            <Field label="Base Price (₹)">
              <TextInput value={price} onChange={setPrice} type="number" placeholder="500"/>
            </Field>
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
    } catch {}
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

/* ─── Root App ────────────────────────────────────────────────────── */
type Page = 'dashboard' | 'jobs' | 'earnings' | 'profile' | 'notifications';

const NAV: { id: Page; label: string; Icon: React.ElementType }[] = [
  { id: 'dashboard',     label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'jobs',          label: 'My Jobs',       Icon: Briefcase       },
  { id: 'earnings',      label: 'Earnings',      Icon: DollarSign      },
  { id: 'notifications', label: 'Notifications', Icon: Bell            },
  { id: 'profile',       label: 'Profile',       Icon: User            },
];

const PAGE_SUBTITLE: Record<Page, string> = {
  dashboard:     'ServeNow Partner Portal',
  jobs:          'ServeNow Partner Portal',
  earnings:      'ServeNow Partner Portal',
  notifications: 'ServeNow Partner Portal',
  profile:       'ServeNow Partner Portal',
};

export default function App() {
  const [auth,    setAuth]    = useState<AuthTokens | null>(() => {
    try { const s = localStorage.getItem('partner_auth'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [page,    setPage]    = useState<Page>('dashboard');
  const [unread,  setUnread]  = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  function triggerRefresh() { setRefreshKey(k => k + 1); }

  useEffect(() => {
    if (!auth) return;
    setRefreshHandler(async () => {
      try {
        const t = await authApi.refresh(auth.refreshToken);
        const next = { ...auth, accessToken: t.accessToken, refreshToken: t.refreshToken };
        setAuth(next); localStorage.setItem('partner_auth', JSON.stringify(next));
        return t.accessToken;
      } catch { return null; }
    });
    partnerApi.getProfile(auth.accessToken).then(setProfile).catch(() => {});
    notificationsApi.unreadCount(auth.accessToken).then(r => setUnread(r.count)).catch(() => {});
  }, [auth]);

  function onLogin(tokens: AuthTokens) {
    setAuth(tokens); localStorage.setItem('partner_auth', JSON.stringify(tokens));
  }
  function logout() {
    if (auth) authApi.logout(auth.accessToken).catch(() => {});
    setAuth(null); localStorage.removeItem('partner_auth');
  }
  function navigate(p: Page) {
    setPage(p); setMobileOpen(false);
    if (p === 'notifications') setUnread(0);
  }

  if (!auth) return <Login onLogin={onLogin}/>;

  const SidebarContent = () => (
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
              <span className="flex-1 text-left">{label}</span>
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

  const currentNav = NAV.find(n => n.id === page)!;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f1117' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[200px] border-r border-white/[0.07] flex-shrink-0"
        style={{ background: '#161B27' }}>
        <SidebarContent/>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)}/>
          <div className="relative w-56 flex flex-col border-r border-white/[0.07] h-full"
            style={{ background: '#161B27' }}>
            <SidebarContent/>
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
            <h1 className="text-white font-bold text-xl leading-none">{currentNav.label}</h1>
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
          {page === 'jobs'          && <Jobs          key={refreshKey} token={auth.accessToken}/>}
          {page === 'earnings'      && <Earnings      key={refreshKey} token={auth.accessToken}/>}
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
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
