import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, CheckCircle2, Clock, CreditCard, Lock, Save, UserRound, X,
} from 'lucide-react'
import { fadeUp, stagger } from '../../lib/motion'
import { useProjects } from '../../context/ProjectContext'
import { useApp } from '../../context/AppContext'

const TABS = [
  { id: 'profile',  label: 'Profile',  icon: UserRound  },
  { id: 'payments', label: 'Payments', icon: CreditCard  },
]

function parseBudget(value?: string) {
  if (!value || value === 'Not set') return 4400
  const n = Number(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 4400
}
function money(v: number) {
  return `£${Math.round(v).toLocaleString('en-GB')}`
}

// ── Detect card brand from first digit ──────────────────────────────────────
function cardBrand(num: string): 'visa' | 'mastercard' | 'amex' | null {
  const d = num.replace(/\s/g, '')
  if (/^4/.test(d)) return 'visa'
  if (/^5[1-5]/.test(d)) return 'mastercard'
  if (/^3[47]/.test(d)) return 'amex'
  return null
}

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return digits.slice(0, 2) + ' / ' + digits.slice(2)
  return digits
}

// ── Payment checkout modal ───────────────────────────────────────────────────
function PaymentModal({
  amount, label, onClose, onSuccess,
}: { amount: number; label: string; onClose: () => void; onSuccess: () => void }) {
  const [card, setCard]     = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc]       = useState('')
  const [name, setName]     = useState('')
  const [step, setStep]     = useState<'form' | 'processing' | 'done'>('form')
  const [error, setError]   = useState('')

  const brand = cardBrand(card)

  const handlePay = async () => {
    const digits = card.replace(/\s/g, '')
    if (digits.length < 16) { setError('Please enter a valid 16-digit card number.'); return }
    if (expiry.replace(/\s\/\s/g, '').length < 4) { setError('Please enter a valid expiry date.'); return }
    if (cvc.length < 3) { setError('Please enter your CVC.'); return }
    if (!name.trim()) { setError('Please enter the name on card.'); return }
    setError('')
    setStep('processing')
    await new Promise(r => setTimeout(r, 2200))
    setStep('done')
    setTimeout(onSuccess, 1400)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,6,18,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.32, ease: [0.22, 0.9, 0.32, 1] }}
        style={{
          width: '100%', maxWidth: 420,
          background: '#fff',
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1c1008 0%, #2e1a0c 100%)',
          padding: '20px 24px 18px',
          position: 'relative',
        }}>
          <div style={{ height: 2, position: 'absolute', top: 0, left: 0, right: 0, background: 'linear-gradient(90deg, transparent, #d4af37, #f7d96a, #d4af37, transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Secure Payment
              </p>
              <p style={{ margin: '4px 0 0', color: '#f7d96a', fontFamily: 'var(--app-font-display)', fontSize: '1.5rem', fontWeight: 300 }}>
                {money(amount)}
              </p>
              <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>{label}</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ padding: '24px 24px 20px' }}>
          {step === 'form' && (
            <div style={{ display: 'grid', gap: 14 }}>
              {/* Card number */}
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a6040' }}>
                  Card Number
                </span>
                <div style={{ position: 'relative' }}>
                  <input
                    value={card}
                    onChange={e => setCard(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    inputMode="numeric"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      border: '1.5px solid #e8ddd0', borderRadius: 10,
                      padding: '12px 46px 12px 14px',
                      fontSize: '1.02rem', letterSpacing: '0.08em',
                      color: '#1c1008', outline: 'none',
                      background: '#fffdf9',
                      fontFamily: 'monospace',
                    }}
                  />
                  {/* Brand badge */}
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 800, color: brand === 'visa' ? '#1a1f71' : brand === 'mastercard' ? '#eb001b' : '#2e77bc' }}>
                    {brand === 'visa' ? 'VISA' : brand === 'mastercard' ? 'MC' : brand === 'amex' ? 'AMEX' : ''}
                  </div>
                </div>
              </label>

              {/* Expiry + CVC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a6040' }}>Expiry</span>
                  <input
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM / YY"
                    inputMode="numeric"
                    style={{ border: '1.5px solid #e8ddd0', borderRadius: 10, padding: '12px 14px', fontSize: '0.95rem', color: '#1c1008', outline: 'none', background: '#fffdf9', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a6040' }}>CVC</span>
                  <input
                    value={cvc}
                    onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                    inputMode="numeric"
                    type="password"
                    style={{ border: '1.5px solid #e8ddd0', borderRadius: 10, padding: '12px 14px', fontSize: '0.95rem', color: '#1c1008', outline: 'none', background: '#fffdf9', fontFamily: 'monospace' }}
                  />
                </label>
              </div>

              {/* Name */}
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a6040' }}>Name on Card</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  style={{ border: '1.5px solid #e8ddd0', borderRadius: 10, padding: '12px 14px', fontSize: '0.95rem', color: '#1c1008', outline: 'none', background: '#fffdf9' }}
                />
              </label>

              {error && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#c0392b', background: '#fff5f5', border: '1px solid #f5c6cb', borderRadius: 8, padding: '8px 12px' }}>
                  {error}
                </p>
              )}

              <button
                onClick={() => void handlePay()}
                style={{
                  marginTop: 4,
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #1c1008, #3a2010)',
                  color: '#f7d96a', fontWeight: 800, fontSize: '0.9rem',
                  border: 'none', borderRadius: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  letterSpacing: '0.04em',
                  boxShadow: '0 6px 22px rgba(0,0,0,0.2)',
                }}
              >
                <Lock size={14} /> Pay {money(amount)} securely
              </button>

              <p style={{ margin: 0, textAlign: 'center', fontSize: '0.72rem', color: '#a09080', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Lock size={11} /> 256-bit SSL encrypted · Powered by Stripe
              </p>
            </div>
          )}

          {step === 'processing' && (
            <div style={{ padding: '32px 0', textAlign: 'center', display: 'grid', gap: 14 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e8ddd0', borderTopColor: '#d4af37', margin: '0 auto' }}
              />
              <p style={{ margin: 0, color: '#1c1008', fontWeight: 600, fontFamily: 'var(--app-font-display)' }}>Processing payment…</p>
              <p style={{ margin: 0, color: '#9a8070', fontSize: '0.82rem' }}>Please do not close this window.</p>
            </div>
          )}

          {step === 'done' && (
            <div style={{ padding: '32px 0', textAlign: 'center', display: 'grid', gap: 12 }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                <CheckCircle2 size={52} style={{ color: '#22c55e', margin: '0 auto' }} />
              </motion.div>
              <p style={{ margin: 0, color: '#1c1008', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--app-font-display)' }}>Payment successful!</p>
              <p style={{ margin: 0, color: '#9a8070', fontSize: '0.82rem' }}>A receipt has been sent to your email.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
const AVATAR_KEY = 'bb-customer-avatar'

export default function CustomerSettings() {
  const { portalProject } = useProjects()
  const { showToast } = useApp()
  const [activeTab, setActiveTab]     = useState('profile')
  const [profile, setProfile]         = useState({
    name:  portalProject?.customer.name  || '',
    email: portalProject?.customer.email || '',
    phone: portalProject?.customer.phone || '',
  })
  const [saving, setSaving]           = useState(false)
  const [avatarSrc, setAvatarSrc]     = useState<string>(() => localStorage.getItem(AVATAR_KEY) || '')
  const [payModal, setPayModal]       = useState<null | { amount: number; label: string }>(null)
  const fileRef                       = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    showToast('Profile saved', 'success')
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      setAvatarSrc(src)
      localStorage.setItem(AVATAR_KEY, src)
      window.dispatchEvent(new CustomEvent('bb-avatar-changed', { detail: src }))
      showToast('Profile photo updated', 'success')
    }
    reader.readAsDataURL(file)
  }

  // Payments
  const total    = parseBudget(portalProject?.budget)
  const paid     = Math.round(total * 0.27)
  const remaining = Math.max(total - paid, 0)
  const nextDue  = Math.round(remaining / 2)
  const dueDate  = portalProject?.timeline && portalProject.timeline !== 'Not set' ? portalProject.timeline : 'To be confirmed'
  const payments = [
    { id: 'p1', label: 'Booking deposit',  amount: Math.round(total * 0.18),                   status: 'paid',     date: 'Completed'      },
    { id: 'p2', label: 'Design approval',  amount: Math.max(paid - Math.round(total * 0.18), 0), status: 'paid',     date: 'Completed'      },
    { id: 'p3', label: 'Manufacturing',    amount: nextDue,                                       status: 'due',      date: dueDate          },
    { id: 'p4', label: 'Final balance',    amount: Math.max(remaining - nextDue, 0),              status: 'upcoming', date: 'Before delivery'},
  ]

  const initials = (profile.name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <motion.div variants={stagger(0.07)} initial="hidden" animate="visible" style={{ display: 'grid', gap: 24 }}>

        {/* Page header */}
        <motion.div variants={fadeUp}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--bb-pillar-3)' }}>
            Account
          </span>
          <h1 className="bb-display" style={{ margin: '4px 0 0', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
            Your <span className="bb-script" style={{ color: 'var(--bb-rose)', fontSize: '1.2em' }}>Settings</span>
          </h1>
        </motion.div>

        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '180px minmax(0,1fr)', gap: 16, alignItems: 'start' }} className="bb-stack-mobile">

          {/* Sidebar */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--bb-line)', padding: 10, display: 'grid', gap: 4 }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', borderRadius: 10,
                    border: `1px solid ${active ? '#efd9d0' : 'transparent'}`,
                    background: active ? '#fff7f4' : 'transparent',
                    color: active ? 'var(--bb-ink)' : 'var(--bb-muted)',
                    fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.18s ease',
                  }}
                >
                  <tab.icon size={16} style={{ color: active ? 'var(--bb-rose)' : 'inherit', flexShrink: 0 }} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Content panel */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--bb-line)', overflow: 'hidden' }}>

            {/* ── Profile tab ── */}
            {activeTab === 'profile' && (
              <div style={{ padding: '28px 28px 24px' }}>
                <h2 style={{ margin: '0 0 22px', fontFamily: 'var(--app-font-display)', fontWeight: 400, fontSize: '1.6rem', color: 'var(--bb-ink)' }}>
                  Your Profile
                </h2>

                {/* Avatar upload */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bb-line)' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {avatarSrc
                      ? <img src={avatarSrc} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #efd9d0', boxShadow: '0 4px 16px rgba(207,95,145,0.18)' }} />
                      : (
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #f0a8be, #cf5f91)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: '1.3rem', border: '3px solid #efd9d0', boxShadow: '0 4px 16px rgba(207,95,145,0.18)' }}>
                          {initials}
                        </div>
                      )
                    }
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'var(--bb-rose)', border: '2px solid #fff',
                        display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff',
                        boxShadow: '0 2px 8px rgba(207,95,145,0.35)',
                      }}
                    >
                      <Camera size={12} />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1rem', fontWeight: 500 }}>
                      {profile.name || 'Your Name'}
                    </strong>
                    <p style={{ margin: '4px 0 10px', color: 'var(--bb-muted)', fontSize: '0.82rem' }}>
                      {profile.email || 'your@email.com'}
                    </p>
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--bb-rose)', background: 'rgba(207,95,145,0.07)', border: '1px solid rgba(207,95,145,0.2)', borderRadius: 999, padding: '5px 14px', cursor: 'pointer' }}
                    >
                      Change photo
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
                  {[
                    { key: 'name',  label: 'Full Name',     type: 'text',  placeholder: 'Your full name'  },
                    { key: 'email', label: 'Email Address',  type: 'email', placeholder: 'your@email.com'  },
                    { key: 'phone', label: 'Phone',          type: 'tel',   placeholder: '+44 ...'         },
                  ].map(f => (
                    <label key={f.key} style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--bb-muted)' }}>{f.label}</span>
                      <input
                        type={f.type}
                        value={profile[f.key as keyof typeof profile]}
                        onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ border: '1.5px solid var(--bb-line)', borderRadius: 10, padding: '11px 14px', color: 'var(--bb-ink)', outline: 'none', background: '#fffdf9', fontSize: '0.94rem', transition: 'border-color 0.18s' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--bb-rose)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--bb-line)')}
                      />
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: saving ? '#ccc' : 'var(--bb-ink)',
                    color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                    padding: '11px 22px', borderRadius: 999, border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* ── Payments tab ── */}
            {activeTab === 'payments' && (
              <div style={{ padding: '28px 28px 24px' }}>
                <h2 style={{ margin: '0 0 22px', fontFamily: 'var(--app-font-display)', fontWeight: 400, fontSize: '1.6rem', color: 'var(--bb-ink)' }}>
                  Payment Schedule
                </h2>

                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
                  {[
                    { label: 'Total project',  value: money(total),     color: '#1c1008' },
                    { label: 'Paid so far',    value: money(paid),      color: '#16a34a' },
                    { label: 'Outstanding',    value: money(remaining), color: '#cf5f91' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fffdf9', border: '1px solid var(--bb-line)', borderRadius: 12, padding: '14px 16px' }}>
                      <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bb-muted)', marginBottom: 4 }}>{s.label}</span>
                      <strong style={{ fontFamily: 'var(--app-font-display)', fontSize: '1.25rem', fontWeight: 500, color: s.color }}>{s.value}</strong>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--bb-muted)', marginBottom: 7 }}>
                    <span>Amount paid</span>
                    <strong style={{ color: 'var(--bb-ink)' }}>{Math.round((paid / total) * 100)}%</strong>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: '#f0e8e4', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(paid / total) * 100}%` }}
                      transition={{ duration: 1.1, ease: [0.22, 0.9, 0.32, 1] }}
                      style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
                    />
                  </div>
                </div>

                {/* Payment rows */}
                <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
                  {payments.map(pay => (
                    <div key={pay.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 12,
                      background: pay.status === 'due' ? 'linear-gradient(135deg,#fff8f6,#fff3ef)' : '#fffdf9',
                      border: `1px solid ${pay.status === 'due' ? '#f5c6b0' : 'var(--bb-line)'}`,
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        display: 'grid', placeItems: 'center',
                        background: pay.status === 'paid' ? '#dcfce7' : pay.status === 'due' ? '#fff0ea' : '#f5f0f8',
                      }}>
                        {pay.status === 'paid'
                          ? <CheckCircle2 size={17} style={{ color: '#16a34a' }} />
                          : <Clock size={17} style={{ color: pay.status === 'due' ? 'var(--bb-coral)' : 'var(--bb-muted)' }} />
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', color: 'var(--bb-ink)', fontSize: '0.92rem', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>{pay.label}</strong>
                        <span style={{ color: 'var(--bb-muted)', fontSize: '0.76rem' }}>{pay.date}</span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <strong style={{ display: 'block', fontFamily: 'var(--app-font-display)', fontSize: '1.05rem', color: 'var(--bb-ink)' }}>{money(pay.amount)}</strong>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                          color: pay.status === 'paid' ? '#16a34a' : pay.status === 'due' ? 'var(--bb-coral)' : 'var(--bb-muted)',
                        }}>
                          {pay.status === 'paid' ? 'Paid' : pay.status === 'due' ? 'Due now' : 'Upcoming'}
                        </span>
                      </div>
                      {pay.status === 'due' && (
                        <button
                          onClick={() => setPayModal({ amount: pay.amount, label: pay.label })}
                          style={{
                            flexShrink: 0, padding: '8px 16px', borderRadius: 999,
                            background: 'var(--bb-ink)', color: '#f7d96a',
                            fontWeight: 700, fontSize: '0.78rem', border: 'none',
                            cursor: 'pointer', letterSpacing: '0.03em',
                            boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
                          }}
                        >
                          Pay now
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--bb-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Lock size={11} /> All payments are secured with 256-bit SSL encryption.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Payment modal */}
      <AnimatePresence>
        {payModal && (
          <PaymentModal
            amount={payModal.amount}
            label={payModal.label}
            onClose={() => setPayModal(null)}
            onSuccess={() => {
              setPayModal(null)
              showToast('Payment successful! Receipt sent to your email.', 'success')
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
