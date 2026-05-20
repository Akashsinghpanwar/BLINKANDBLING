import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Pencil,
  Plus,
  RadioTower,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useProjects } from '../../context/ProjectContext'
import { fadeUp, stagger } from '../../lib/motion'
import {
  gemPricePerCaratUSD,
  metalPricePerGramUSD,
  useSpotPrices,
} from '../../lib/prices'
import type { MetalType } from '../../store/recipe'

type ScheduleItem = {
  id: string
  date: string
  time: string
  title: string
  meta: string
  tone: string
}

const scheduleStorageKey = 'bb-jeweller-schedule-v1'

const defaultSchedule: ScheduleItem[] = [
  { id: 'sched_1', date: todayIso(), time: '10:30', title: 'Emma render review', meta: 'Decision needed', tone: 'var(--bb-rose)' },
  { id: 'sched_2', date: todayIso(), time: '13:00', title: 'Sarah stone shortlist', meta: 'Awaiting supplier', tone: 'var(--bb-violet)' },
  { id: 'sched_3', date: todayIso(), time: '16:15', title: 'Jessica production note', meta: 'Bench update', tone: 'var(--bb-emerald)' },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function loadSchedule(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(scheduleStorageKey)
    if (!raw) return defaultSchedule
    const parsed = JSON.parse(raw) as ScheduleItem[]
    return Array.isArray(parsed) && parsed.length ? parsed : defaultSchedule
  } catch { return defaultSchedule }
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (!t) return 'not live'
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function parseBudgetMin(budget: string): number {
  const match = budget.replace(/[£$,]/g, '').match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

export default function Dashboard() {
  const [, navigate] = useLocation()
  const { isLoading, projects, stages } = useProjects()
  const spot = useSpotPrices()
  const [schedule, setSchedule] = useState<ScheduleItem[]>(loadSchedule)
  const [editing, setEditing] = useState<ScheduleItem | null>(null)

  const pendingApproval = projects.filter(p => p.status === 'pending_approval')
  const activeCount = projects.filter(p => !['delivered', 'qa'].includes(p.stage)).length
  const completedCount = projects.filter(p => p.stage === 'delivered').length
  const portfolioValue = projects.reduce((sum, p) => sum + parseBudgetMin(p.budget ?? ''), 0)

  // Build stage meta from STAGES array — progress by index position
  const stageMeta = useMemo(() => {
    const map: Record<string, { label: string; progress: number; tone: string }> = {}
    const tones = ['var(--bb-coral)', 'var(--bb-rose)', 'var(--bb-violet)', 'var(--bb-emerald)', 'var(--bb-pillar-4)', 'var(--bb-pillar-2)', 'var(--bb-gold)', 'var(--bb-pillar-1)', 'var(--bb-pillar-3)', 'var(--bb-emerald)']
    stages.forEach((s, i) => {
      map[s.id] = { label: s.label, progress: Math.round(((i + 1) / stages.length) * 100), tone: tones[i] ?? 'var(--bb-coral)' }
    })
    return map
  }, [stages])

  const sortedSchedule = useMemo(
    () => [...schedule].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    [schedule],
  )

  const todaySchedule = useMemo(() => sortedSchedule.filter(s => s.date === todayIso()), [sortedSchedule])
  const upcomingSchedule = useMemo(() => sortedSchedule.filter(s => s.date > todayIso()), [sortedSchedule])

  const saveSchedule = (items: ScheduleItem[]) => {
    setSchedule(items)
    localStorage.setItem(scheduleStorageKey, JSON.stringify(items))
  }

  const startNewSchedule = () => setEditing({ id: `sched_${Date.now()}`, date: todayIso(), time: '09:00', title: '', meta: '', tone: 'var(--bb-rose)' })

  const commitSchedule = () => {
    if (!editing || !editing.title.trim()) return
    const next = { ...editing, title: editing.title.trim(), meta: editing.meta.trim() || 'Scheduled' }
    const exists = schedule.some(s => s.id === next.id)
    saveSchedule(exists ? schedule.map(s => s.id === next.id ? next : s) : [...schedule, next])
    setEditing(null)
  }

  const deleteSchedule = (id: string) => {
    saveSchedule(schedule.filter(s => s.id !== id))
    if (editing?.id === id) setEditing(null)
  }

  const priceRows = useMemo(() => {
    const metals: Array<{ key: MetalType; label: string }> = [
      { key: '18k-yellow', label: '18K Gold' }, { key: '14k-yellow', label: '14K Gold' },
      { key: 'white-gold', label: 'White Gold' }, { key: 'rose-gold', label: 'Rose Gold' },
      { key: 'platinum', label: 'Platinum' }, { key: 'sterling-silver', label: 'Sterling Silver' },
    ]
    return metals.map(m => ({ label: m.label, value: `$${metalPricePerGramUSD(m.key, spot).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/g` }))
  }, [spot])

  return (
    <motion.div variants={stagger(0.08)} initial="hidden" animate="visible" className="bb-page" style={{ padding: 'clamp(22px, 3vw, 32px)' }}>

      {/* Needs attention banner */}
      {pendingApproval.length > 0 && (
        <motion.div variants={fadeUp} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
          borderRadius: 16, marginBottom: 18,
          background: 'linear-gradient(135deg, #fff8f0, #fff2f5)',
          border: '1px solid #f9d0c0',
        }}>
          <AlertCircle size={18} style={{ color: 'var(--bb-coral)', flexShrink: 0 }} />
          <span style={{ flex: 1, color: 'var(--bb-ink)', fontSize: '0.9rem' }}>
            <strong>{pendingApproval.length} client{pendingApproval.length > 1 ? 's' : ''}</strong> waiting for your approval —{' '}
            {pendingApproval.map(p => p.customer.name.split(' ')[0]).join(', ')}
          </span>
          <button onClick={() => navigate('/workspace/customers')} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', color: 'var(--bb-coral)', fontWeight: 800, cursor: 'pointer', fontSize: '0.84rem', flexShrink: 0 }}>
            Review <ArrowRight size={14} />
          </button>
        </motion.div>
      )}

      <motion.section variants={fadeUp} className="bb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(340px,0.85fr)', gap: 18, marginBottom: 22 }}>
        {/* Hero */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 'clamp(28px, 4vw, 44px)', color: '#fff', background: 'linear-gradient(135deg, #211820 0%, #563044 48%, #8b5a4d 100%)', boxShadow: '0 28px 70px rgba(51,39,35,0.16)' }}>
          <div aria-hidden style={{ position: 'absolute', right: -110, top: -110, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,215,117,0.28), transparent 68%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span className="bb-eyebrow" style={{ color: 'rgba(255,255,255,0.68)' }}>Jeweller Portal</span>
            <h1 className="bb-display" style={{ color: '#fff', fontSize: 'clamp(2rem, 4.2vw, 3.8rem)', lineHeight: 0.98, margin: '14px 0 20px' }}>
              Today's client bench.
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginTop: 20 }} className="bb-grid-2-mobile">
              {[
                { label: 'Total clients', value: projects.length, icon: Users },
                { label: 'Active', value: activeCount, icon: Zap },
                { label: 'Approvals needed', value: pendingApproval.length, icon: MessageCircle },
                { label: 'Completed', value: completedCount, icon: CheckCircle2 },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(14px)' }}>
                  <item.icon size={15} style={{ opacity: 0.72, marginBottom: 8 }} />
                  <strong style={{ display: 'block', fontSize: '1.8rem', lineHeight: 1, fontFamily: 'var(--app-font-display)' }}>{item.value}</strong>
                  <span style={{ display: 'block', marginTop: 5, color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem', fontWeight: 700 }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/workspace/customers/new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999, border: 0, background: '#fff', color: 'var(--bb-ink)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                <Plus size={14} /> New client
              </button>
              <button onClick={() => navigate('/workspace/magic-movement')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                <Sparkles size={14} /> Magic Studio
              </button>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <ScheduleCard
          today={todaySchedule}
          upcoming={upcomingSchedule}
          editing={editing}
          onAdd={startNewSchedule}
          onEdit={setEditing}
          onChange={setEditing}
          onSave={commitSchedule}
          onCancel={() => setEditing(null)}
          onDelete={deleteSchedule}
        />
      </motion.section>

      {/* Live pricing */}
      <motion.section variants={fadeUp} className="bb-card" style={{ padding: 22, borderRadius: 20, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
          <div>
            <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-4)' }}>Live pricing</span>
            <h2 className="bb-display" style={{ margin: '6px 0 0', fontSize: '1.3rem' }}>Metals & stone benchmarks</h2>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: spot.isLive ? 'var(--bb-emerald)' : 'var(--bb-coral)', fontSize: '0.78rem', fontWeight: 800 }}>
            <RadioTower size={16} /><span>{spot.isLive ? `Live ${relTime(spot.fetchedAt)}` : 'Fallback prices'}</span>
          </div>
        </div>
        <div className="bb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10 }}>
          <PriceTile label="Gold spot" value={`$${spot.goldOzUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}/oz`} tone="var(--bb-gold)" />
          <PriceTile label="Silver spot" value={`$${spot.silverOzUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}/oz`} tone="var(--bb-pillar-2)" />
          <PriceTile label="Platinum" value={`$${spot.platinumOzUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}/oz`} tone="var(--bb-pillar-3)" />
          <PriceTile label="Diamond" value={`$${gemPricePerCaratUSD('diamond', 1).toLocaleString()}/ct`} tone="var(--bb-rose)" />
          {priceRows.map(row => <PriceTile key={row.label} label={row.label} value={row.value} tone="var(--bb-coral)" />)}
        </div>
      </motion.section>

      {/* Active clients pipeline */}
      <motion.section variants={fadeUp} className="bb-card" style={{ padding: 24, borderRadius: 20, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 14 }}>
          <div>
            <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>Pipeline</span>
            <h2 className="bb-display" style={{ margin: '6px 0 0', fontSize: '1.45rem' }}>Active clients</h2>
          </div>
          <button onClick={() => navigate('/workspace/customers')} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', color: 'var(--bb-rose)', fontWeight: 800, cursor: 'pointer', fontSize: '0.86rem' }}>
            View all <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) minmax(160px,0.35fr) auto', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, border: '1px solid var(--bb-line)', background: '#fff' }}>
              <div className="bb-skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
              <div style={{ display: 'grid', gap: 8 }}>
                <div className="bb-skeleton" style={{ height: 14, width: '40%' }} />
                <div className="bb-skeleton" style={{ height: 10, width: '65%' }} />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div className="bb-skeleton" style={{ height: 10, width: '50%' }} />
                <div className="bb-skeleton" style={{ height: 6, borderRadius: 999 }} />
              </div>
              <div className="bb-skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
            </div>
          ))}
          {!isLoading && projects.map(project => {
            const meta = stageMeta[project.stage] ?? { label: project.stage.replace(/_/g, ' '), progress: 30, tone: 'var(--bb-coral)' }
            const projectName = project.name.includes(' - ') ? project.name.split(' - ').slice(1).join(' - ') : project.name
            const needsAction = project.status === 'pending_approval'
            return (
              <motion.article
                key={project.id}
                whileHover={{ x: 4 }}
                onClick={() => navigate(`/workspace/customers/${project.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) minmax(160px,0.35fr) auto',
                  alignItems: 'center', gap: 14, padding: 14, borderRadius: 16,
                  border: `1px solid ${needsAction ? '#f9d0c0' : 'var(--bb-line)'}`,
                  background: needsAction ? 'linear-gradient(135deg, #fff8f6, #fff4f0)' : 'linear-gradient(135deg, #fff, rgba(255,248,244,0.72))',
                  cursor: 'pointer',
                }}
                className="bb-stack-mobile"
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 800, fontSize: '0.8rem', color: '#fff', background: `linear-gradient(135deg, ${meta.tone}, var(--bb-rose))` }}>
                  {project.customer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ color: 'var(--bb-ink)', fontSize: '0.98rem', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>{project.customer.name}</strong>
                    {needsAction && <span style={{ padding: '2px 8px', borderRadius: 999, background: '#f9d0c0', color: 'var(--bb-coral)', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Approval needed</span>}
                  </div>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.8rem' }}>
                    {projectName}
                    {project.metalPreference ? ` · ${project.metalPreference}` : ''}
                    {project.gemstonePreference ? ` · ${project.gemstonePreference.split(',')[0]}` : ''}
                  </span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
                    <span style={{ color: 'var(--bb-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{meta.label}</span>
                    <span style={{ color: 'var(--bb-ink)', fontSize: '0.74rem', fontWeight: 800 }}>{meta.progress}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: '#efe5df', overflow: 'hidden' }}>
                    <div style={{ width: `${meta.progress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${meta.tone}, var(--bb-rose))` }} />
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--bb-muted)' }} />
              </motion.article>
            )
          })}
          {!isLoading && projects.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--bb-muted)' }}>
              <Users size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No clients yet — add your first client to get started.</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section variants={fadeUp} className="bb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { label: 'Pending approvals', value: String(pendingApproval.length), icon: Clock3, tone: 'var(--bb-pillar-1)', sub: 'need action' },
          { label: 'Portfolio value', value: portfolioValue > 0 ? `£${(portfolioValue / 1000).toFixed(0)}k+` : '—', icon: TrendingUp, tone: 'var(--bb-pillar-4)', sub: 'combined budgets' },
          { label: 'Completed projects', value: String(completedCount), icon: CheckCircle2, tone: 'var(--bb-pillar-3)', sub: 'all time' },
        ].map(item => (
          <div key={item.label} className="bb-card bb-lift" style={{ padding: 22, borderRadius: 18 }}>
            <item.icon size={18} style={{ color: item.tone, marginBottom: 14 }} />
            <strong className="bb-display" style={{ display: 'block', fontSize: '2.1rem', lineHeight: 1 }}>{item.value}</strong>
            <span style={{ color: 'var(--bb-ink)', fontSize: '0.86rem', fontWeight: 700 }}>{item.label}</span>
            <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.76rem', marginTop: 3 }}>{item.sub}</span>
          </div>
        ))}
      </motion.section>
    </motion.div>
  )
}

function ScheduleCard({ today, upcoming, editing, onAdd, onEdit, onChange, onSave, onCancel, onDelete }: {
  today: ScheduleItem[]; upcoming: ScheduleItem[]
  editing: ScheduleItem | null
  onAdd: () => void; onEdit: (item: ScheduleItem) => void; onChange: (item: ScheduleItem) => void
  onSave: () => void; onCancel: () => void; onDelete: (id: string) => void
}) {
  return (
    <div className="bb-card" style={{ padding: 22, borderRadius: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-4)' }}>Schedule</span>
          <h2 style={{ margin: '6px 0 0', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>Appointments</h2>
        </div>
        <button type="button" className="bb-btn-primary" onClick={onAdd} style={{ minHeight: 36, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Plus size={15} /> Add
        </button>
      </div>

      {editing && (
        <div style={{ display: 'grid', gap: 8, padding: 12, marginBottom: 12, borderRadius: 14, border: '1px solid var(--bb-line)', background: '#fffaf7' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8 }}>
            <input type="date" value={editing.date} onChange={e => onChange({ ...editing, date: e.target.value })} style={fieldStyle} />
            <input type="time" value={editing.time} onChange={e => onChange({ ...editing, time: e.target.value })} style={fieldStyle} />
          </div>
          <input placeholder="Appointment title" value={editing.title} onChange={e => onChange({ ...editing, title: e.target.value })} style={fieldStyle} />
          <input placeholder="Client or notes" value={editing.meta} onChange={e => onChange({ ...editing, meta: e.target.value })} style={fieldStyle} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="bb-btn-secondary" onClick={onCancel} style={{ minHeight: 34, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}><X size={14} /> Cancel</button>
            <button type="button" className="bb-btn-primary" onClick={onSave} style={{ minHeight: 34, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Save size={14} /> Save</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 340 }}>
        {today.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CalendarClock size={13} style={{ color: 'var(--bb-rose)' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--bb-rose)' }}>Today</span>
            </div>
            {today.map(item => <ScheduleRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} highlight />)}
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: `${today.length > 0 ? 14 : 0}px 0 8px` }}>
              <CalendarClock size={13} style={{ color: 'var(--bb-muted)' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--bb-muted)' }}>Upcoming</span>
            </div>
            {upcoming.map(item => <ScheduleRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />)}
          </>
        )}
        {today.length === 0 && upcoming.length === 0 && !editing && (
          <p style={{ color: 'var(--bb-muted)', fontSize: '0.86rem', textAlign: 'center', padding: '24px 0' }}>No appointments — click Add to schedule one.</p>
        )}
      </div>
    </div>
  )
}

function ScheduleRow({ item, onEdit, onDelete, highlight = false }: { item: ScheduleItem; onEdit: (i: ScheduleItem) => void; onDelete: (id: string) => void; highlight?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 12, alignItems: 'center', padding: '11px 0', borderTop: '1px solid var(--bb-line)', borderLeft: highlight ? `3px solid ${item.tone}` : 'none', paddingLeft: highlight ? 10 : 0 }}>
      <div>
        <strong style={{ display: 'block', color: item.tone, fontSize: '0.84rem' }}>{item.time}</strong>
        <span style={{ color: 'var(--bb-muted)', fontSize: '0.66rem', fontWeight: 700 }}>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
      <div>
        <strong style={{ display: 'block', color: 'var(--bb-ink)', fontSize: '0.88rem' }}>{item.title}</strong>
        <span style={{ color: 'var(--bb-muted)', fontSize: '0.76rem' }}>{item.meta}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" aria-label="Edit" onClick={() => onEdit(item)} style={iconButtonStyle}><Pencil size={13} /></button>
        <button type="button" aria-label="Delete" onClick={() => onDelete(item.id)} style={iconButtonStyle}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

function PriceTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, border: '1px solid var(--bb-line)', background: '#fff' }}>
      <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
      <strong style={{ display: 'block', marginTop: 7, color: tone, fontSize: '0.95rem', fontFamily: 'var(--app-font-display)', fontWeight: 600 }}>{value}</strong>
    </div>
  )
}

const fieldStyle: React.CSSProperties = { width: '100%', border: '1px solid var(--bb-line)', borderRadius: 10, padding: '9px 11px', background: '#fff', color: 'var(--bb-ink)', outline: 'none', fontSize: '0.86rem' }
const iconButtonStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 10, border: '1px solid var(--bb-line)', background: '#fff', color: 'var(--bb-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }
