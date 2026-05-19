import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Pencil,
  Plus,
  RadioTower,
  Save,
  Trash2,
  TrendingUp,
  Users,
  X,
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

const stageMeta: Record<string, { label: string; progress: number; tone: string }> = {
  concept_review: { label: 'Concept review', progress: 42, tone: 'var(--bb-rose)' },
  '3d_render': { label: '3D review', progress: 58, tone: 'var(--bb-violet)' },
  production: { label: 'Production', progress: 86, tone: 'var(--bb-emerald)' },
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function loadSchedule(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(scheduleStorageKey)
    if (!raw) return defaultSchedule
    const parsed = JSON.parse(raw) as ScheduleItem[]
    return Array.isArray(parsed) && parsed.length ? parsed : defaultSchedule
  } catch {
    return defaultSchedule
  }
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

export default function Dashboard() {
  const [, navigate] = useLocation()
  const { projects } = useProjects()
  const spot = useSpotPrices()
  const [schedule, setSchedule] = useState<ScheduleItem[]>(loadSchedule)
  const [editing, setEditing] = useState<ScheduleItem | null>(null)
  const reviewCount = projects.filter(p => ['concept_review', '3d_render'].includes(p.stage)).length
  const productionCount = projects.filter(p => p.stage === 'production').length

  const sortedSchedule = useMemo(
    () => [...schedule].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    [schedule],
  )

  const saveSchedule = (items: ScheduleItem[]) => {
    setSchedule(items)
    localStorage.setItem(scheduleStorageKey, JSON.stringify(items))
  }

  const startNewSchedule = () => {
    setEditing({
      id: `sched_${Date.now()}`,
      date: todayIso(),
      time: '09:00',
      title: '',
      meta: '',
      tone: 'var(--bb-rose)',
    })
  }

  const commitSchedule = () => {
    if (!editing || !editing.title.trim()) return
    const nextItem = {
      ...editing,
      title: editing.title.trim(),
      meta: editing.meta.trim() || 'Scheduled',
    }
    const exists = schedule.some(item => item.id === nextItem.id)
    saveSchedule(exists
      ? schedule.map(item => item.id === nextItem.id ? nextItem : item)
      : [...schedule, nextItem])
    setEditing(null)
  }

  const deleteSchedule = (id: string) => {
    saveSchedule(schedule.filter(item => item.id !== id))
    if (editing?.id === id) setEditing(null)
  }

  const priceRows = useMemo(() => {
    const metals: Array<{ key: MetalType; label: string }> = [
      { key: '18k-yellow', label: '18K Gold' },
      { key: '14k-yellow', label: '14K Gold' },
      { key: 'white-gold', label: 'White Gold' },
      { key: 'rose-gold', label: 'Rose Gold' },
      { key: 'platinum', label: 'Platinum' },
      { key: 'sterling-silver', label: 'Sterling Silver' },
    ]
    return metals.map(metal => ({
      label: metal.label,
      value: `$${metalPricePerGramUSD(metal.key, spot).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/g`,
    }))
  }, [spot])

  return (
    <motion.div
      variants={stagger(0.08)}
      initial="hidden"
      animate="visible"
      className="bb-page"
      style={{ padding: 'clamp(22px, 3vw, 32px)' }}
    >
      <motion.section
        variants={fadeUp}
        className="bb-stack-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.22fr) minmax(340px, 0.78fr)',
          gap: 18,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 24,
            padding: 'clamp(28px, 4vw, 44px)',
            color: '#fff',
            background: 'linear-gradient(135deg, #211820 0%, #563044 48%, #8b5a4d 100%)',
            boxShadow: '0 28px 70px rgba(51,39,35,0.16)',
          }}
        >
          <div aria-hidden style={{
            position: 'absolute',
            right: -110,
            top: -110,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,215,117,0.28), transparent 68%)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span className="bb-eyebrow" style={{ color: 'rgba(255,255,255,0.68)' }}>Jeweller Portal</span>
            <h1 className="bb-display" style={{ color: '#fff', fontSize: 'clamp(2.3rem, 4.8vw, 4.3rem)', lineHeight: 0.98, margin: '14px 0 20px' }}>
              Today's client bench.
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginTop: 28 }} className="bb-grid-2-mobile">
              {[
                { label: 'Clients', value: projects.length, icon: Users },
                { label: 'In review', value: reviewCount, icon: MessageCircle },
                { label: 'In production', value: productionCount, icon: CheckCircle2 },
              ].map(item => (
                <div key={item.label} style={{
                  padding: 16,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(14px)',
                }}>
                  <item.icon size={17} style={{ opacity: 0.72, marginBottom: 10 }} />
                  <strong style={{ display: 'block', fontSize: '2rem', lineHeight: 1, fontFamily: 'var(--app-font-display)' }}>{item.value}</strong>
                  <span style={{ display: 'block', marginTop: 6, color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', fontWeight: 700 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ScheduleCard
          items={sortedSchedule}
          editing={editing}
          onAdd={startNewSchedule}
          onEdit={setEditing}
          onChange={setEditing}
          onSave={commitSchedule}
          onCancel={() => setEditing(null)}
          onDelete={deleteSchedule}
        />
      </motion.section>

      <motion.section variants={fadeUp} className="bb-card" style={{ padding: 22, borderRadius: 20, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
          <div>
            <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-4)' }}>Live pricing</span>
            <h2 className="bb-display" style={{ margin: '6px 0 0', fontSize: '1.45rem' }}>Metals and stone benchmarks</h2>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: spot.isLive ? 'var(--bb-emerald)' : 'var(--bb-coral)', fontSize: '0.78rem', fontWeight: 800 }}>
            <RadioTower size={16} />
            <span>{spot.isLive ? `Live ${relTime(spot.fetchedAt)}` : 'Fallback prices'}</span>
          </div>
        </div>
        <div className="bb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
          <PriceTile label="Gold spot" value={`$${spot.goldOzUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}/oz`} tone="var(--bb-gold)" />
          <PriceTile label="Silver spot" value={`$${spot.silverOzUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}/oz`} tone="var(--bb-pillar-2)" />
          <PriceTile label="Platinum spot" value={`$${spot.platinumOzUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}/oz`} tone="var(--bb-pillar-3)" />
          <PriceTile label="Diamond benchmark" value={`$${gemPricePerCaratUSD('diamond', 1).toLocaleString()}/ct`} tone="var(--bb-rose)" />
          {priceRows.map(row => <PriceTile key={row.label} label={row.label} value={row.value} tone="var(--bb-coral)" />)}
        </div>
      </motion.section>

      <motion.section variants={fadeUp} className="bb-card" style={{ padding: 24, borderRadius: 20, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 14 }}>
          <div>
            <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>Pipeline</span>
            <h2 className="bb-display" style={{ margin: '6px 0 0', fontSize: '1.55rem' }}>Active clients</h2>
          </div>
          <button onClick={() => navigate('/workspace/customers')} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', color: 'var(--bb-rose)', fontWeight: 800, cursor: 'pointer', fontSize: '0.86rem' }}>
            View all <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {projects.map(project => {
            const meta = stageMeta[project.stage] ?? { label: project.stage.replace('_', ' '), progress: 30, tone: 'var(--bb-coral)' }
            const projectName = project.name.includes(' - ') ? project.name.split(' - ').slice(1).join(' - ') : project.name
            return (
              <motion.article
                key={project.id}
                whileHover={{ x: 4 }}
                onClick={() => navigate(`/workspace/customers/${project.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0,1fr) minmax(140px,0.32fr) auto',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 16,
                  border: '1px solid var(--bb-line)',
                  background: 'linear-gradient(135deg, #fff, rgba(255,248,244,0.72))',
                  cursor: 'pointer',
                }}
                className="bb-stack-mobile"
              >
                <div style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 800, fontSize: '0.82rem', color: '#fff', background: `linear-gradient(135deg, ${meta.tone}, var(--bb-rose))` }}>
                  {project.customer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: 'var(--bb-ink)', display: 'block', fontSize: '1rem', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>{project.customer.name}</strong>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem' }}>{projectName}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
                    <span style={{ color: 'var(--bb-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>{meta.label}</span>
                    <span style={{ color: 'var(--bb-ink)', fontSize: '0.76rem', fontWeight: 800 }}>{meta.progress}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: '#efe5df', overflow: 'hidden' }}>
                    <div style={{ width: `${meta.progress}%`, height: '100%', borderRadius: 999, background: meta.tone }} />
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--bb-muted)' }} />
              </motion.article>
            )
          })}
        </div>
      </motion.section>

      <motion.section variants={fadeUp} className="bb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { label: 'Approval response', value: '1.8h', icon: Clock3, tone: 'var(--bb-pillar-1)' },
          { label: 'Monthly value', value: 'GBP 34.2k', icon: TrendingUp, tone: 'var(--bb-pillar-4)' },
          { label: 'Tasks done', value: '18', icon: CheckCircle2, tone: 'var(--bb-pillar-3)' },
        ].map(item => (
          <div key={item.label} className="bb-card bb-lift" style={{ padding: 22, borderRadius: 18 }}>
            <item.icon size={18} style={{ color: item.tone, marginBottom: 14 }} />
            <strong className="bb-display" style={{ display: 'block', fontSize: '2.1rem', lineHeight: 1 }}>{item.value}</strong>
            <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', fontWeight: 700 }}>{item.label}</span>
          </div>
        ))}
      </motion.section>
    </motion.div>
  )
}

function ScheduleCard({
  items,
  editing,
  onAdd,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  items: ScheduleItem[]
  editing: ScheduleItem | null
  onAdd: () => void
  onEdit: (item: ScheduleItem) => void
  onChange: (item: ScheduleItem) => void
  onSave: () => void
  onCancel: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bb-card" style={{ padding: 22, borderRadius: 20 }}>
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
          <input placeholder="Schedule title" value={editing.title} onChange={e => onChange({ ...editing, title: e.target.value })} style={fieldStyle} />
          <input placeholder="Notes or client context" value={editing.meta} onChange={e => onChange({ ...editing, meta: e.target.value })} style={fieldStyle} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="bb-btn-secondary" onClick={onCancel} style={{ minHeight: 34, padding: '8px 12px' }}><X size={14} /> Cancel</button>
            <button type="button" className="bb-btn-primary" onClick={onSave} style={{ minHeight: 34, padding: '8px 12px' }}><Save size={14} /> Save</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 12, alignItems: 'center', padding: '11px 0', borderTop: '1px solid var(--bb-line)' }}>
            <div>
              <strong style={{ display: 'block', color: item.tone, fontSize: '0.84rem' }}>{item.time}</strong>
              <span style={{ color: 'var(--bb-muted)', fontSize: '0.68rem', fontWeight: 700 }}>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
            <div>
              <strong style={{ display: 'block', color: 'var(--bb-ink)', fontSize: '0.9rem' }}>{item.title}</strong>
              <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem' }}>{item.meta}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" aria-label="Edit schedule" onClick={() => onEdit(item)} style={iconButtonStyle}><Pencil size={14} /></button>
              <button type="button" aria-label="Delete schedule" onClick={() => onDelete(item.id)} style={iconButtonStyle}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PriceTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, border: '1px solid var(--bb-line)', background: '#fff' }}>
      <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
      <strong style={{ display: 'block', marginTop: 7, color: tone, fontSize: '1rem', fontFamily: 'var(--app-font-display)', fontWeight: 600 }}>{value}</strong>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--bb-line)',
  borderRadius: 10,
  padding: '9px 11px',
  background: '#fff',
  color: 'var(--bb-ink)',
  outline: 'none',
  fontSize: '0.86rem',
}

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: '1px solid var(--bb-line)',
  background: '#fff',
  color: 'var(--bb-muted)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
}
