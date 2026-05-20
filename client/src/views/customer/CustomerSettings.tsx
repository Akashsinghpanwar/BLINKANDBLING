import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, CreditCard, Save, UserRound } from 'lucide-react'
import { fadeUp, stagger } from '../../lib/motion'
import { useProjects } from '../../context/ProjectContext'
import { useApp } from '../../context/AppContext'

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'payments', label: 'Payments', icon: CreditCard },
]

function parseBudget(value?: string) {
  if (!value || value === 'Not set') return 4400
  const n = Number(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 4400
}
function money(v: number) {
  return `GBP ${Math.round(v).toLocaleString('en-GB')}`
}

export default function CustomerSettings() {
  const { portalProject } = useProjects()
  const { showToast } = useApp()
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState({
    name: portalProject?.customer.name || '',
    email: portalProject?.customer.email || '',
    phone: portalProject?.customer.phone || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    showToast('Profile saved', 'success')
  }

  // Payments
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
    <motion.div variants={stagger(0.07)} initial="hidden" animate="visible" style={{ display: 'grid', gap: 22 }}>
      <motion.header variants={fadeUp} className="bb-page-header">
        <div>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-3)' }}>Account</span>
          <h1 className="bb-display" style={{ marginBottom: 8 }}>
            Your <span className="bb-script" style={{ color: 'var(--bb-rose)', fontSize: '1.25em' }}>Settings</span>
          </h1>
        </div>
      </motion.header>

      <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', gap: 18, alignItems: 'start' }} className="bb-stack-mobile">
        {/* Sidebar tabs */}
        <div className="bb-card" style={{ padding: 14, display: 'grid', gap: 6 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 13px', borderRadius: 10, border: 'none',
                  background: active ? '#fff' : 'transparent',
                  border: `1px solid ${active ? '#efd9d0' : 'transparent'}`,
                  color: active ? 'var(--bb-ink)' : 'var(--bb-muted)',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  boxShadow: active ? 'var(--bb-soft-shadow)' : 'none',
                  textAlign: 'left',
                }}
              >
                <tab.icon size={17} style={{ color: active ? 'var(--bb-rose)' : 'inherit', flexShrink: 0 }} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="bb-card" style={{ padding: 28 }}>
          {activeTab === 'profile' && (
            <>
              <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Profile</span>
              <h2 style={{ margin: '0 0 24px', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 400, fontSize: '1.8rem' }}>
                Your Information
              </h2>

              <div style={{ display: 'grid', gap: 16, marginBottom: 28 }}>
                <label style={{ display: 'grid', gap: 7 }}>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Name</span>
                  <input
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your full name"
                    style={{ border: '1px solid var(--bb-line)', borderRadius: 10, padding: '12px 14px', color: 'var(--bb-ink)', outline: 'none', background: '#fff', fontSize: '0.95rem' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 7 }}>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Address</span>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    style={{ border: '1px solid var(--bb-line)', borderRadius: 10, padding: '12px 14px', color: 'var(--bb-ink)', outline: 'none', background: '#fff', fontSize: '0.95rem' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 7 }}>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone</span>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+44 ..."
                    style={{ border: '1px solid var(--bb-line)', borderRadius: 10, padding: '12px 14px', color: 'var(--bb-ink)', outline: 'none', background: '#fff', fontSize: '0.95rem' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="bb-btn-primary" onClick={() => void handleSave()} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={15} />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6, color: 'var(--bb-pillar-4)' }}>Payments</span>
              <h2 style={{ margin: '0 0 22px', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 400, fontSize: '1.8rem' }}>
                Payment Schedule
              </h2>

              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 12, marginBottom: 22 }}>
                {[
                  { label: 'Total', value: money(total), accent: 'var(--bb-pillar-3)' },
                  { label: 'Paid', value: money(paid), accent: 'var(--bb-pillar-1)' },
                  { label: 'Remaining', value: money(remaining), accent: 'var(--bb-pillar-4)' },
                  { label: 'Next due', value: dueDate, accent: 'var(--bb-pillar-2)' },
                ].map(s => (
                  <div key={s.label} className="bb-card" style={{ padding: 16, borderRadius: 14, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent }} />
                    <div style={{ color: 'var(--bb-muted)', fontSize: '0.72rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--app-font-display)', fontSize: '1.1rem', fontWeight: 500, color: 'var(--bb-ink)' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bb-muted)', fontSize: '0.82rem', marginBottom: 8 }}>
                  <span>Paid</span>
                  <strong style={{ color: 'var(--bb-ink)' }}>{Math.round((paid / total) * 100)}%</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: '#efe5df', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((paid / total) * 100)}%` }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--bb-pillar-1), var(--bb-rose))' }}
                  />
                </div>
              </div>

              {/* Payment rows */}
              <div style={{ display: 'grid', gap: 10 }}>
                {payments.map(pay => (
                  <div key={pay.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12,
                    border: `1px solid ${pay.status === 'due' ? '#f9d0c0' : 'var(--bb-line)'}`,
                    background: pay.status === 'due' ? 'linear-gradient(135deg,#fff8f6,#fff4f0)' : '#fff',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: pay.status === 'paid' ? '#edf7f3' : pay.status === 'due' ? '#fff0ea' : '#f5f5f7', color: pay.status === 'paid' ? 'var(--bb-emerald)' : pay.status === 'due' ? 'var(--bb-coral)' : 'var(--bb-muted)' }}>
                      {pay.status === 'paid' ? <CheckCircle2 size={17} /> : <Clock size={17} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', color: 'var(--bb-ink)', fontSize: '0.95rem' }}>{pay.label}</strong>
                      <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem' }}>{pay.date}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ display: 'block', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1.05rem' }}>{pay.amount}</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: pay.status === 'paid' ? 'var(--bb-emerald)' : pay.status === 'due' ? 'var(--bb-coral)' : 'var(--bb-muted)' }}>
                        {pay.status === 'paid' ? 'Paid' : pay.status === 'due' ? 'Due now' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
