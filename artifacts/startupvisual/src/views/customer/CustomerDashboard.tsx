import { Link } from 'wouter'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, CreditCard, Images, MessageCircle, Mic2 } from 'lucide-react'
import { fadeUp, stagger } from '../../lib/motion'
import { photos } from '../../lib/photos'
import { useProjects } from '../../context/ProjectContext'

const fallbackProject = {
  name: 'Customer Workspace',
  estimatedDelivery: 'Timeline not set',
  heroImage: photos.haloRing,
}

const timeline = [
  { id: 'intake', label: 'Intake', done: true },
  { id: 'concepts', label: 'Concepts', done: true },
  { id: 'shortlist', label: 'Shortlist', done: true },
  { id: 'render', label: '3D render', done: true },
  { id: 'cad', label: 'CAD review', done: false, current: true },
  { id: 'approval', label: 'Approval', done: false },
  { id: 'production', label: 'Production', done: false },
  { id: 'delivery', label: 'Delivery', done: false },
]

const fallbackPayment = { label: 'Manufacturing payment', amount: 'GBP 1,600', due: 'to be confirmed' }

function cleanProjectName(name: string) {
  return name.includes(' - ') ? name.split(' - ').slice(1).join(' - ') : name
}

export default function CustomerDashboard() {
  const { portalProject } = useProjects()
  const customerName = portalProject?.customer.name || 'Customer'
  const firstName = customerName.split(' ')[0] || 'Customer'
  const projectName = cleanProjectName(portalProject?.name || fallbackProject.name)
  const titleWord = projectName.split(/\s+/)[0] || 'custom'
  const estimatedDelivery =
    portalProject?.timeline && portalProject.timeline !== 'Not set'
      ? portalProject.timeline
      : fallbackProject.estimatedDelivery
  const paymentAmount =
    portalProject?.budget && portalProject.budget !== 'Not set'
      ? portalProject.budget
      : fallbackPayment.amount
  const message = {
    from: 'Your jeweller',
    text: `Your ${projectName} workspace is ready. You can review designs, gallery files, timeline, and payments here.`,
    when: 'Updated now',
  }

  return (
    <motion.div variants={stagger(0.1)} initial="hidden" animate="visible" style={{ display: 'grid', gap: 22 }}>
      <motion.section
        variants={fadeUp}
        className="bb-stack-mobile"
        style={{
          display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,0.95fr)',
          borderRadius: 24, overflow: 'hidden',
          background: '#fff', border: '1px solid var(--bb-line)', boxShadow: '0 22px 50px rgba(51,39,35,0.10)',
        }}
      >
        <div style={{ padding: 'clamp(32px, 4.5vw, 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 32 }}>
          <div>
            <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 14, color: 'var(--bb-pillar-2)' }}>Customer Portal - Welcome back, {firstName}</span>
            <h1 className="bb-display" style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)', marginBottom: 16 }}>
              Your <span className="bb-script" style={{ fontSize: '1.35em', color: 'var(--bb-rose)' }}>{titleWord}</span> workspace.
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, color: 'var(--bb-muted)', fontSize: '0.92rem' }}>
              <span>{projectName}</span>
              <strong style={{ color: 'var(--bb-ink)' }}>{estimatedDelivery}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/portal/magic-movement" className="bb-btn-primary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Review the new render <ArrowRight size={16} />
            </Link>
            <Link href="/portal/gallery" className="bb-btn-secondary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Images size={16} /> User Gallery
            </Link>
          </div>
        </div>

        <div style={{ position: 'relative', minHeight: 320 }}>
          <motion.img
            src={fallbackProject.heroImage} alt={projectName} loading="lazy"
            initial={{ scale: 1.08 }} animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 0.9, 0.32, 1] }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.18) 100%)' }} />
        </div>
      </motion.section>

      <motion.section variants={fadeUp} className="bb-card" style={{ padding: 24, borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 4, color: 'var(--bb-pillar-3)' }}>Project journey</span>
            <strong style={{ color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1.2rem', fontWeight: 500 }}>Current milestones.</strong>
          </div>
          <Link href="/portal/timeline" className="bb-no-underline" style={{ color: 'var(--bb-rose)', fontWeight: 700, fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Full timeline <ArrowRight size={14} />
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 6 }}>
          {timeline.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', flex: '1 1 0', minWidth: 90 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  background: s.done ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))' : s.current ? '#fff' : '#f5ece7',
                  border: `2px solid ${s.done ? 'transparent' : s.current ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
                  color: s.done ? '#fff' : 'var(--bb-muted)',
                  boxShadow: s.current ? '0 0 0 4px rgba(207,95,145,0.14)' : 'none',
                }}>
                  {s.done ? <CheckCircle2 size={14} /> : <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{i + 1}</span>}
                </div>
                <span style={{
                  fontSize: '0.74rem', textAlign: 'center', whiteSpace: 'nowrap',
                  color: s.done || s.current ? 'var(--bb-ink)' : 'var(--bb-muted)',
                  fontWeight: s.current ? 700 : 500,
                }}>{s.label}</span>
              </div>
              {i < timeline.length - 1 && (
                <div style={{ flex: '0 0 24px', height: 2, marginTop: 14, background: timeline[i + 1].done || timeline[i + 1].current ? 'var(--bb-rose)' : '#efe5df' }} />
              )}
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={fadeUp} className="bb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="bb-card bb-lift" style={{ padding: 26, borderRadius: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'var(--bb-pillar-4)' }} />
          <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6, color: 'var(--bb-pillar-4)' }}>Next payment</span>
          <strong style={{ display: 'block', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1.15rem', fontWeight: 500, marginBottom: 18 }}>
            {fallbackPayment.label}
          </strong>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span className="bb-display" style={{ fontSize: '2.4rem', lineHeight: 1 }}>{paymentAmount}</span>
            <span style={{ color: 'var(--bb-muted)', fontSize: '0.9rem' }}>due {fallbackPayment.due}</span>
          </div>
          <Link href="/portal/payments" className="bb-btn-primary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={16} /> Pay now
          </Link>
        </div>

        <div className="bb-card bb-lift" style={{ padding: 26, borderRadius: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'var(--bb-pillar-2)' }} />
          <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6, color: 'var(--bb-pillar-2)' }}>Latest message</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))', fontWeight: 700 }}>B</div>
            <div>
              <strong style={{ color: 'var(--bb-ink)', display: 'block', fontFamily: 'var(--app-font-display)', fontSize: '1rem', fontWeight: 500 }}>{message.from}</strong>
              <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem' }}>{message.when}</span>
            </div>
          </div>
          <p style={{ margin: '0 0 22px', color: 'var(--bb-text)', fontSize: '0.95rem', lineHeight: 1.65, fontFamily: 'var(--app-font-display)', fontStyle: 'italic' }}>
            "{message.text}"
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="bb-btn-primary bb-lift"
              onClick={() => window.dispatchEvent(new CustomEvent('bb-open-messenger'))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <MessageCircle size={16} /> Reply
            </button>
            <Link href="/portal/luna" className="bb-btn-secondary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Mic2 size={16} /> Talk to Luna
            </Link>
          </div>
        </div>
      </motion.section>
    </motion.div>
  )
}
