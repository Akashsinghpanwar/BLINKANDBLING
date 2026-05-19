import { motion } from 'framer-motion'
import { CreditCard, CheckCircle2, Clock } from 'lucide-react'
import { fadeUp, stagger } from '../../lib/motion'
import { useProjects } from '../../context/ProjectContext'

function parseBudget(value?: string) {
  if (!value || value === 'Not set') return 4400
  const number = Number(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(number) && number > 0 ? number : 4400
}

function money(value: number) {
  return `GBP ${Math.round(value).toLocaleString('en-GB')}`
}

export default function CustomerPayments() {
  const { portalProject } = useProjects()
  const total = parseBudget(portalProject?.budget)
  const paid = Math.round(total * 0.27)
  const remaining = Math.max(total - paid, 0)
  const nextDue = Math.round(remaining / 2)
  const dueDate = portalProject?.timeline && portalProject.timeline !== 'Not set' ? portalProject.timeline : 'To be confirmed'
  const payments = [
    { id: 'pay_001', label: 'Booking deposit', amount: money(Math.round(total * 0.18)), status: 'paid', date: 'Completed' },
    { id: 'pay_002', label: 'Design approval', amount: money(Math.max(paid - Math.round(total * 0.18), 0)), status: 'paid', date: 'Completed' },
    { id: 'pay_003', label: 'Manufacturing', amount: money(nextDue), status: 'due', date: dueDate },
    { id: 'pay_004', label: 'Final balance', amount: money(Math.max(remaining - nextDue, 0)), status: 'upcoming', date: 'Before delivery' },
  ]

  return (
    <motion.div variants={stagger(0.08)} initial="hidden" animate="visible" style={{ padding: 8 }}>
      <motion.div variants={fadeUp}>
        <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 10, color: 'var(--bb-pillar-4)' }}>Payments</span>
        <h1 className="bb-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', marginBottom: 28 }}>
          Schedule.
        </h1>
      </motion.div>

      <motion.div variants={fadeUp} className="bb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: money(total), accent: 'var(--bb-pillar-3)' },
          { label: 'Paid', value: money(paid), accent: 'var(--bb-pillar-1)' },
          { label: 'Remaining', value: money(remaining), accent: 'var(--bb-pillar-4)' },
          { label: 'Next due', value: dueDate, accent: 'var(--bb-pillar-2)' },
        ].map(s => (
          <div key={s.label} className="bb-card bb-lift" style={{ padding: 18, borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: s.accent, opacity: 0.85 }} />
            <div style={{ color: 'var(--bb-muted)', fontSize: '0.74rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{s.label}</div>
            <div className="bb-display" style={{ fontSize: '1.7rem', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bb-muted)', fontSize: '0.84rem', marginBottom: 8 }}>
          <span>Paid</span><strong style={{ color: 'var(--bb-ink)' }}>{Math.round((paid / total) * 100)}%</strong>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: '#efe5df', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(paid / total) * 100}%` }}
            transition={{ duration: 1, ease: [0.22, 0.9, 0.32, 1] }}
            style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose))' }}
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="bb-card" style={{ overflow: 'hidden', marginBottom: 22, borderRadius: 16 }}>
        {payments.map((p, i) => (
          <div key={p.id} className="bb-lift" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderBottom: i < payments.length - 1 ? '1px solid var(--bb-line)' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: p.status === 'paid' ? '#e6f4ef' : p.status === 'due' ? '#fff4e5' : '#f5f0f8' }}>
              {p.status === 'paid' ? <CheckCircle2 size={16} style={{ color: 'var(--bb-emerald)' }} /> : <Clock size={16} style={{ color: p.status === 'due' ? 'var(--bb-coral)' : 'var(--bb-muted)' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ color: 'var(--bb-ink)', display: 'block', fontSize: '0.94rem', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>{p.label}</strong>
              <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem' }}>{p.date}</span>
            </div>
            <strong style={{ color: 'var(--bb-ink)', fontSize: '0.98rem' }}>{p.amount}</strong>
          </div>
        ))}
      </motion.div>

      <motion.button variants={fadeUp} className="bb-btn-primary bb-lift" style={{ width: '100%', justifyContent: 'center' }}>
        <CreditCard size={16} /> Pay {money(nextDue)} due
      </motion.button>
    </motion.div>
  )
}
