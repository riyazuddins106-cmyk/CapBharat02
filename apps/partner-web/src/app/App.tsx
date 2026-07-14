import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Briefcase, DollarSign, User, Bell,
  LogOut, ChevronRight, CheckCircle, Clock, XCircle,
  Loader2, TrendingUp, Star, RefreshCw, Eye, X, Check,
  AlertCircle, Pencil, Lock,
} from 'lucide-react';
import {
  authApi, partnerApi, notificationsApi, setRefreshHandler,
  type Job, type JobStatus, type Earnings, type PartnerProfile,
  type AppNotification, type AuthTokens,
} from '@/lib/api';

// ── Helpers ────────────────────────────────────────────────
const CARD = { background: 'rgba(255,255,255,0.04)' } as const;
const INPUT_STYLE = { background: 'rgba(255,255,255,0.05)', WebkitAppearance: 'none' } as const;
const MODAL_BG = { background: '#1a2035' } as const;

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function fmtDate(s: string) {
  return new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLE: Record<JobStatus, string> = {
  pending:     'bg-yellow-500/15 text-yellow-400',
  upcoming:    'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-violet-500/15 text-violet-400',
  completed:   'bg-green-500/15 text-green-400',
  cancelled:   'bg-red-500/15 text-red-400',
};
const STATUS_ICON: Record<JobStatus, React.ReactNode> = {
  pending:     <Clock size={12} />,
  upcoming:    <Clock size={12} />,
  in_progress: <TrendingUp size={12} />,
  completed:   <CheckCircle size={12} />,
  cancelled:   <XCircle size={12} />,
};

// ── Sub-components ─────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto" style={MODAL_BG}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
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
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors disabled:opacity-40"
      style={INPUT_STYLE}
    />
  );
}

function Btn({ onClick, disabled, loading, children, variant = 'primary', className = '' }: {
  onClick?: () => void; disabled?: boolean; loading?: boolean;
  children: React.ReactNode; variant?: 'primary' | 'ghost' | 'danger'; className?: string;
}) {
  const base = 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50';
  const styles = {
    primary: 'text-white',
    ghost: 'border border-white/10 text-white/60 hover:bg-white/5',
    danger: 'text-white bg-red-600 hover:bg-red-700',
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${styles[variant]} ${className}`}
      style={variant === 'primary' ? { background: 'linear-gradient(135deg,#5b3ef5,#7c5bf8)' } : undefined}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Login ──────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (tokens: AuthTokens) => void }) {
  const [email, setEmail] = useState('partner@servenow.in');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const tokens = await authApi.login(email, password);
      if (tokens.user.role !== 'partner') { setErr('This portal is for partners only.'); setLoading(false); return; }
      onLogin(tokens);
    } catch (e: any) { setErr(e.message ?? 'Login failed'); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0d1117' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#5b3ef5,#7c5bf8)' }}>
            <Briefcase size={26} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">ServeNow Partner</h1>
          <p className="text-white/40 text-sm mt-1">Sign in to your partner portal</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-white/10 p-6 space-y-4" style={MODAL_BG}>
          {err && <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3"><AlertCircle size={14}/>{err}</div>}
          <Field label="Email">
            <TextInput value={email} onChange={setEmail} type="email" placeholder="partner@servenow.in" />
          </Field>
          <Field label="Password">
            <TextInput value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          </Field>
          <Btn loading={loading} className="w-full justify-center" onClick={undefined}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Btn>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────
function Dashboard({ token, profile }: { token: string; profile: PartnerProfile | null }) {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [e, j] = await Promise.all([partnerApi.getEarnings(token), partnerApi.listJobs(token)]);
      setEarnings(e); setJobs(j);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const upcoming = jobs.filter(j => j.status === 'upcoming' || j.status === 'in_progress').slice(0, 5);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-violet-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Dashboard</h2>
          <p className="text-white/40 text-sm mt-0.5">Welcome back, {profile?.name ?? 'Partner'}</p>
        </div>
        <button onClick={load} className="text-white/40 hover:text-white/80 transition-colors"><RefreshCw size={18}/></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Earnings', value: fmt(earnings?.total ?? 0), icon: <DollarSign size={20}/>, color: '#10b981' },
          { label: 'This Month',     value: fmt(earnings?.thisMonth ?? 0), icon: <TrendingUp size={20}/>, color: '#6366f1' },
          { label: 'Today',          value: fmt(earnings?.today ?? 0), icon: <Star size={20}/>, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/8 p-5" style={CARD}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.color + '22', color: s.color }}>{s.icon}</div>
              <span className="text-white/50 text-sm">{s.label}</span>
            </div>
            <p className="text-white font-bold text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Profile snapshot */}
      {profile && (
        <div className="rounded-2xl border border-white/8 p-5 flex flex-wrap gap-4 items-center" style={CARD}>
          <div className="w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-xl flex-shrink-0">
            {profile.name?.[0] ?? 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold">{profile.name}</p>
            <p className="text-white/50 text-sm">{profile.title}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/50">
            <div className="text-center"><p className="text-white font-semibold">{profile.rating.toFixed(1)}</p><p>Rating</p></div>
            <div className="text-center"><p className="text-white font-semibold">{profile.reviewCount}</p><p>Reviews</p></div>
            <div className="text-center"><p className="text-white font-semibold">{fmt(profile.basePrice)}</p><p>/{profile.priceUnit}</p></div>
          </div>
        </div>
      )}

      {/* Upcoming jobs */}
      <div className="rounded-2xl border border-white/8 p-5" style={CARD}>
        <h3 className="text-white font-semibold mb-4">Upcoming Jobs</h3>
        {upcoming.length === 0
          ? <p className="text-white/40 text-sm text-center py-6">No upcoming jobs</p>
          : <div className="space-y-3">
              {upcoming.map(j => (
                <div key={j.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{j.serviceName}</p>
                    <p className="text-white/40 text-xs mt-0.5">{j.customerName ?? 'Customer'} · {fmtDate(j.scheduledAt)}</p>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${STATUS_STYLE[j.status]}`}>
                    {STATUS_ICON[j.status]} {j.status.replace('_', ' ')}
                  </span>
                  <span className="text-white/60 text-sm font-semibold">{fmt(j.price)}</span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ── Jobs ───────────────────────────────────────────────────
function Jobs({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Job | null>(null);
  const [completing, setCompleting] = useState(false);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { setJobs(await partnerApi.listJobs(token)); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function complete(id: string) {
    setCompleting(true);
    try { const j = await partnerApi.completeJob(id, token); setJobs(prev => prev.map(x => x.id === id ? j : x)); setSelected(j); }
    finally { setCompleting(false); }
  }

  const statuses: (JobStatus | 'all')[] = ['all', 'upcoming', 'in_progress', 'completed', 'cancelled', 'pending'];
  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl">Jobs</h2>
        <button onClick={load} className="text-white/40 hover:text-white/80 transition-colors"><RefreshCw size={18}/></button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${filter === s ? 'border-violet-500/60 bg-violet-500/15 text-violet-300' : 'border-white/10 text-white/50 hover:bg-white/5'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>
      {loading
        ? <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-violet-400"/></div>
        : filtered.length === 0
          ? <p className="text-white/40 text-sm text-center py-10">No jobs found</p>
          : <div className="space-y-3">
              {filtered.map(j => (
                <button key={j.id} onClick={() => setSelected(j)} className="w-full text-left rounded-2xl border border-white/8 p-4 hover:border-white/20 transition-colors" style={CARD}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium text-sm truncate">{j.serviceName}</p>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium flex-shrink-0 ${STATUS_STYLE[j.status]}`}>
                          {STATUS_ICON[j.status]} {j.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-white/50 text-xs">{j.customerName ?? 'Customer'} · {fmtDate(j.scheduledAt)}</p>
                      {j.notes && <p className="text-white/40 text-xs mt-1 truncate">{j.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-semibold text-sm">{fmt(j.price)}</p>
                      <Eye size={14} className="text-white/30 mt-1 ml-auto"/>
                    </div>
                  </div>
                </button>
              ))}
            </div>
      }

      {selected && (
        <Modal title="Job Details" onClose={() => setSelected(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Service', selected.serviceName],
                ['Customer', selected.customerName ?? '—'],
                ['Phone', selected.customerPhone ?? '—'],
                ['Scheduled', fmtDate(selected.scheduledAt)],
                ['Price', fmt(selected.price)],
                ['Status', selected.status.replace('_', ' ')],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl p-3 border border-white/5" style={CARD}>
                  <p className="text-white/40 text-xs mb-1">{k}</p>
                  <p className="text-white font-medium">{v}</p>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="rounded-xl p-3 border border-white/5" style={CARD}>
                <p className="text-white/40 text-xs mb-1">Notes</p>
                <p className="text-white text-sm">{selected.notes}</p>
              </div>
            )}
            {selected.status === 'in_progress' && (
              <Btn loading={completing} onClick={() => complete(selected.id)} className="w-full justify-center">
                <Check size={16}/> Mark as Completed
              </Btn>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Earnings ───────────────────────────────────────────────
function Earnings({ token }: { token: string }) {
  const [data, setData] = useState<import('@/lib/api').Earnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnerApi.getEarnings(token).then(setData).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-violet-400"/></div>;
  if (!data) return <p className="text-white/40 text-sm text-center py-10">Failed to load earnings</p>;

  const max = Math.max(...data.weekly.map(w => w.amount), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-white font-bold text-xl">Earnings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Earnings', value: fmt(data.total), color: '#10b981' },
          { label: 'This Month', value: fmt(data.thisMonth), color: '#6366f1' },
          { label: 'Today', value: fmt(data.today), color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/8 p-5" style={CARD}>
            <p className="text-white/50 text-sm mb-2">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="rounded-2xl border border-white/8 p-5" style={CARD}>
        <h3 className="text-white font-semibold mb-5">Weekly Breakdown</h3>
        {data.weekly.length === 0
          ? <p className="text-white/40 text-sm text-center py-6">No data yet</p>
          : <div className="flex items-end gap-2 h-40">
              {data.weekly.map(w => (
                <div key={w.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg transition-all" style={{
                    height: `${Math.max((w.amount / max) * 120, 4)}px`,
                    background: 'linear-gradient(180deg,#7c5bf8,#5b3ef5)',
                  }}/>
                  <span className="text-white/40 text-xs">{new Date(w.date).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="text-white/60 text-xs">₹{w.amount}</span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────
function Profile({ token, profile, setProfile }: {
  token: string; profile: PartnerProfile | null; setProfile: (p: PartnerProfile) => void;
}) {
  const [editProf, setEditProf] = useState(false);
  const [editPwd, setEditPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Edit profile fields
  const [title, setTitle] = useState(profile?.title ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [price, setPrice] = useState(String(profile?.basePrice ?? ''));
  const [tags, setTags] = useState((profile?.tags ?? []).join(', '));

  // Password fields
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  async function saveProfile() {
    setSaving(true); setMsg('');
    try {
      const updated = await partnerApi.updateProfile({ title, bio, basePrice: Number(price), tags: tags.split(',').map(t => t.trim()).filter(Boolean) }, token);
      setProfile(updated); setMsg('Profile updated'); setEditProf(false);
    } catch (e: any) { setMsg(e.message); } finally { setSaving(false); }
  }

  async function savePassword() {
    setSaving(true); setMsg('');
    try {
      await partnerApi.changePassword(curPwd, newPwd, token);
      setMsg('Password changed'); setEditPwd(false); setCurPwd(''); setNewPwd('');
    } catch (e: any) { setMsg(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-white font-bold text-xl">Profile</h2>
      {msg && <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 rounded-xl p-3"><CheckCircle size={14}/>{msg}</div>}

      {profile && (
        <div className="rounded-2xl border border-white/8 p-5" style={CARD}>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-2xl">
              {profile.name?.[0] ?? 'P'}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{profile.name}</p>
              <p className="text-white/50 text-sm">{profile.title}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star size={13} className="text-yellow-400 fill-yellow-400"/>
                <span className="text-white/60 text-sm">{profile.rating.toFixed(1)} ({profile.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            {[
              ['Base Price', `${fmt(profile.basePrice)}/${profile.priceUnit}`],
              ['Status', profile.isActive ? 'Active' : 'Inactive'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl p-3 border border-white/5" style={CARD}>
                <p className="text-white/40 text-xs mb-1">{k}</p>
                <p className="text-white font-medium">{v}</p>
              </div>
            ))}
          </div>

          {profile.bio && <p className="text-white/60 text-sm mb-4">{profile.bio}</p>}

          {profile.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {profile.tags.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-lg text-xs border border-violet-500/30 text-violet-300 bg-violet-500/10">{t}</span>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Btn onClick={() => { setTitle(profile.title); setBio(profile.bio); setPrice(String(profile.basePrice)); setTags(profile.tags.join(', ')); setEditProf(true); }}>
              <Pencil size={14}/> Edit Profile
            </Btn>
            <Btn variant="ghost" onClick={() => setEditPwd(true)}>
              <Lock size={14}/> Change Password
            </Btn>
          </div>
        </div>
      )}

      {editProf && (
        <Modal title="Edit Profile" onClose={() => setEditProf(false)}>
          <div className="space-y-4">
            <Field label="Professional Title"><TextInput value={title} onChange={setTitle} placeholder="e.g. Expert Plumber"/></Field>
            <Field label="Bio">
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell customers about yourself…"
                className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-violet-500/60 transition-colors resize-none"
                style={INPUT_STYLE}/>
            </Field>
            <Field label="Base Price (₹)"><TextInput value={price} onChange={setPrice} type="number" placeholder="500"/></Field>
            <Field label="Tags (comma-separated)"><TextInput value={tags} onChange={setTags} placeholder="plumbing, repair, installation"/></Field>
            <div className="flex gap-3 pt-1">
              <Btn loading={saving} onClick={saveProfile} className="flex-1 justify-center"><Check size={14}/> Save</Btn>
              <Btn variant="ghost" onClick={() => setEditProf(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {editPwd && (
        <Modal title="Change Password" onClose={() => setEditPwd(false)}>
          <div className="space-y-4">
            <Field label="Current Password"><TextInput value={curPwd} onChange={setCurPwd} type="password" placeholder="••••••••"/></Field>
            <Field label="New Password"><TextInput value={newPwd} onChange={setNewPwd} type="password" placeholder="••••••••"/></Field>
            <div className="flex gap-3 pt-1">
              <Btn loading={saving} onClick={savePassword} className="flex-1 justify-center"><Check size={14}/> Update</Btn>
              <Btn variant="ghost" onClick={() => setEditPwd(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Notifications ──────────────────────────────────────────
function Notifications({ token }: { token: string }) {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotifs(await notificationsApi.list(token)); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    setActing(id);
    try { await notificationsApi.markRead(id, token); setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n)); }
    finally { setActing(null); }
  }

  async function del(id: string) {
    setActing(id);
    try { await notificationsApi.delete(id, token); setNotifs(prev => prev.filter(n => n.id !== id)); }
    finally { setActing(null); }
  }

  async function markAll() {
    try { await notificationsApi.markAllRead(token); setNotifs(prev => prev.map(n => ({ ...n, isRead: true }))); }
    catch {}
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl">Notifications</h2>
        <div className="flex gap-2">
          <button onClick={markAll} className="text-white/40 hover:text-violet-400 text-xs transition-colors">Mark all read</button>
          <button onClick={load} className="text-white/40 hover:text-white/80 transition-colors"><RefreshCw size={18}/></button>
        </div>
      </div>
      {loading
        ? <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-violet-400"/></div>
        : notifs.length === 0
          ? <div className="text-center py-16 text-white/40"><Bell size={32} className="mx-auto mb-3 opacity-40"/><p className="text-sm">No notifications</p></div>
          : <div className="space-y-2">
              {notifs.map(n => (
                <div key={n.id} className={`rounded-2xl border p-4 transition-all ${n.isRead ? 'border-white/5 opacity-60' : 'border-violet-500/20 bg-violet-500/5'}`}>
                  <div className="flex items-start gap-3">
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-violet-400 mt-1.5 flex-shrink-0"/>}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{n.title}</p>
                      <p className="text-white/50 text-xs mt-0.5">{n.body}</p>
                      <p className="text-white/30 text-xs mt-1">{fmtDate(n.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!n.isRead && (
                        <button onClick={() => markRead(n.id)} disabled={acting === n.id} className="text-violet-400 hover:text-violet-300 transition-colors" title="Mark read">
                          {acting === n.id ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                        </button>
                      )}
                      <button onClick={() => del(n.id)} disabled={acting === n.id} className="text-red-400/60 hover:text-red-400 transition-colors" title="Delete">
                        <X size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────
type Page = 'dashboard' | 'jobs' | 'earnings' | 'profile' | 'notifications';

export default function App() {
  const [auth, setAuth] = useState<AuthTokens | null>(() => {
    try { const s = localStorage.getItem('partner_auth'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [unread, setUnread] = useState(0);

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

  if (!auth) return <Login onLogin={onLogin} />;

  const nav: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',     label: 'Dashboard',      icon: <LayoutDashboard size={20}/> },
    { id: 'jobs',          label: 'Jobs',            icon: <Briefcase size={20}/> },
    { id: 'earnings',      label: 'Earnings',        icon: <DollarSign size={20}/> },
    { id: 'notifications', label: 'Notifications',   icon: <Bell size={20}/> },
    { id: 'profile',       label: 'Profile',         icon: <User size={20}/> },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#0d1117' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-white/8 p-4 flex-shrink-0" style={{ background: '#111827' }}>
        <div className="flex items-center gap-2.5 px-2 mb-8 mt-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#5b3ef5,#7c5bf8)' }}>
            <Briefcase size={16} className="text-white"/>
          </div>
          <span className="text-white font-bold text-sm">ServeNow Partner</span>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === n.id ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
              style={page === n.id ? { background: 'linear-gradient(135deg,rgba(91,62,245,0.25),rgba(124,91,248,0.15))' } : {}}>
              {n.icon}
              {n.label}
              {n.id === 'notifications' && unread > 0 && (
                <span className="ml-auto text-xs bg-violet-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>
              )}
              {page === n.id && <ChevronRight size={14} className="ml-auto text-violet-400"/>}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all mt-2">
          <LogOut size={18}/> Sign Out
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/8" style={{ background: '#111827' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5b3ef5,#7c5bf8)' }}>
              <Briefcase size={14} className="text-white"/>
            </div>
            <span className="text-white font-bold text-sm">ServeNow Partner</span>
          </div>
          <button onClick={logout} className="text-red-400/60 hover:text-red-400"><LogOut size={18}/></button>
        </header>

        <main className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full">
          {page === 'dashboard'     && <Dashboard token={auth.accessToken} profile={profile}/>}
          {page === 'jobs'          && <Jobs token={auth.accessToken}/>}
          {page === 'earnings'      && <Earnings token={auth.accessToken}/>}
          {page === 'notifications' && <Notifications token={auth.accessToken}/>}
          {page === 'profile'       && <Profile token={auth.accessToken} profile={profile} setProfile={setProfile}/>}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-white/8" style={{ background: '#111827' }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all relative ${page === n.id ? 'text-violet-400' : 'text-white/40'}`}>
              {n.icon}
              {n.id === 'notifications' && unread > 0 && (
                <span className="absolute top-2 right-1/2 translate-x-3 text-xs bg-violet-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">{unread}</span>
              )}
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
