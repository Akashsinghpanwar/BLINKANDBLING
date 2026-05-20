import { Link } from 'wouter'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, CreditCard, Images, MessageCircle, Mic2, Sparkles } from 'lucide-react'
import { fadeUp, stagger } from '../../lib/motion'
import { photos } from '../../lib/photos'
import { useProjects } from '../../context/ProjectContext'

const TIMELINE_STAGES = [
  { id: 'intake', label: 'Intake' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'concept_review', label: 'Shortlist' },
  { id: '3d_render', label: '3D Render' },
  { id: 'cad_refinement', label: 'CAD' },
  { id: 'customer_approval', label: 'Approval' },
  { id: 'production', label: 'Production' },
  { id: 'delivered', label: 'Delivered' },
]

const STAGE_CTA: Record<string, { label: string; href: string }> = {
  intake:            { label: 'View your workspace', href: '/portal/timeline' },
  concepts:          { label: 'Review concepts', href: '/portal/magic-movement' },
  concept_review:    { label: 'Review your shortlist', href: '/portal/magic-movement' },
  '3d_render':       { label: 'Review the 3D render', href: '/portal/magic-movement' },
  cad_refinement:    { label: 'View CAD details', href: '/portal/gallery' },
  customer_approval: { label: 'Approve your design', href: '/portal/timeline' },
  production:        { label: 'Track progress', href: '/portal/timeline' },
  qa:                { label: 'Track progress', href: '/portal/timeline' },
  delivered:         { label: 'View your project', href: '/portal/timeline' },
}

const STAGE_MESSAGE: Record<string, string> = {
  intake:            'Your workspace is set up and ready. Your jeweller will upload your first concepts soon.',
  concepts:          'Your jeweller has uploaded initial concepts for you to explore.',
  concept_review:    'Your shortlisted designs are ready — let your jeweller know which direction excites you most.',
  '3d_render':       'Your 3D render is ready for review. Take your time — this is the moment to perfect every detail.',
  cad_refinement:    'The CAD files are being refined. You can review technical drawings in your gallery.',
  customer_approval: 'Everything looks great — please review and approve your final design to begin production.',
  production:        'Your piece is now in the hands of our craftspeople. We\'ll keep you updated at every step.',
  qa:                'Almost there — your piece is in final quality checks before delivery.',
  delivered:         'Your bespoke piece has been delivered. Thank you for choosing Blink & Bling.',
}

const PAYMENT_LABEL: Record<string, string> = {
  intake:            'Design deposit',
  concepts:          'Design deposit',
  concept_review:    'Concept approval fee',
  '3d_render':       'Design approval fee',
  cad_refinement:    'Design approval fee',
  customer_approval: 'Pre-production payment',
  production:        'Manufacturing payment',
  qa:                'Balance due',
  delivered:         'Paid in full',
}

function cleanProjectName(name: string) {
  return name.includes(' - ') ? name.split(' - ').slice(1).join(' - ') : name
}

export default function CustomerDashboard() {
  const { portalProject } = useProjects()
  const customerName = portalProject?.customer.name || 'Customer'
  const firstName = customerName.split(' ')[0] || 'Customer'
  const projectName = cleanProjectName(portalProject?.name || 'Customer Workspace')
  const titleWord = projectName.split(/\s+/)[0] || 'custom'
  const stage = portalProject?.stage ?? 'intake'
  const stageIdx = TIMELINE_STAGES.findIndex(s => s.id === stage)
  const currentIdx = stageIdx === -1 ? 0 : stageIdx

  const estimatedDelivery = portalProject?.timeline && portalProject.timeline !== 'Not set'
    ? portalProject.timeline
    : 'Timeline not confirmed'
  const paymentAmount = portalProject?.budget && portalProject.budget !== 'Not set'
    ? portalProject.budget
    : 'To be confirmed'
  const paymentLabel = PAYMENT_LABEL[stage] ?? 'Next payment'
  const paymentDue = portalProject?.timeline && portalProject.timeline !== 'Not set'
    ? `within ${portalProject.timeline}` : 'to be confirmed'

  const cta = STAGE_CTA[stage] ?? { label: 'View your workspace', href: '/portal/timeline' }
  const messageText = STAGE_MESSAGE[stage] ?? `Your ${projectName} workspace is ready.`

  const progressPct = Math.round(((currentIdx + 1) / TIMELINE_STAGES.length) * 100)

  return (
    <motion.div variants={stagger(0.1)} initial="hidden" animate="visible" style={{ display: 'grid', gap: 22 }}>

      {/* Hero */}
      <motion.section variants={fadeUp} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, minHeight: 320, display: 'grid', placeItems: 'end start' }}>
        {/* BG image */}
        <motion.img
          src={photos.haloRing} alt={projectName} loading="lazy"
          initial={{ scale: 1.06 }} animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 0.9, 0.32, 1] }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(33,24,32,0.88) 0%, rgba(86,48,68,0.72) 50%, rgba(0,0,0,0.28) 100%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(28px, 4vw, 48px)', color: '#fff', maxWidth: 640 }}>
          <span className="bb-eyebrow" style={{ color: 'rgba(255,255,255,0.72)', display: 'block', marginBottom: 12 }}>
            Customer Portal — Welcome back, {firstName}
          </span>
          <h1 className="bb-display" style={{ color: '#fff', fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)', lineHeight: 0.98, marginBottom: 14 }}>
            Your <span className="bb-script" style={{ fontSize: '1.28em', color: '#f9c4d2' }}>{titleWord}</span> workspace.
          </h1>

          {/* Stage chip */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f9c4d2', boxShadow: '0 0 0 3px rgba(249,196,210,0.3)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
              Stage {currentIdx + 1} of {TIMELINE_STAGES.length} · {TIMELINE_STAGES[currentIdx]?.label ?? stage}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>{progressPct}%</span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href={cta.href} className="bb-btn-primary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: 'var(--bb-ink)' }}>
              {cta.label} <ArrowRight size={15} />
            </Link>
            <Link href="/portal/gallery" className="bb-btn-secondary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff' }}>
              <Images size={15} /> Gallery
            </Link>
            <Link href="/portal/luna" className="bb-btn-secondary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff' }}>
              <Mic2 size={15} /> Talk to Luna
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Milestone tracker */}
      <motion.section variants={fadeUp} className="bb-card" style={{ padding: 24, borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 4, color: 'var(--bb-pillar-3)' }}>Project journey</span>
            <strong style={{ color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1.15rem', fontWeight: 500 }}>Your milestones</strong>
          </div>
          <Link href="/portal/timeline" className="bb-no-underline" style={{ color: 'var(--bb-rose)', fontWeight: 700, fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Full timeline <ArrowRight size={14} />
          </Link>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 999, background: '#f0e8e4', marginBottom: 20, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose))' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 6 }}>
          {TIMELINE_STAGES.map((s, i) => {
            const done = i < currentIdx
            const current = i === currentIdx
            const future = i > currentIdx
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', flex: '1 1 0', minWidth: 76 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    background: done ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))' : current ? '#fff' : '#f5ece7',
                    border: `2px solid ${done ? 'transparent' : current ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
                    color: done ? '#fff' : future ? 'var(--bb-muted)' : 'var(--bb-rose)',
                    boxShadow: current ? '0 0 0 5px rgba(207,95,145,0.14)' : 'none',
                    flexShrink: 0,
                  }}>
                    {done ? <CheckCircle2 size={14} /> : <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>{i + 1}</span>}
                  </div>
                  <span style={{
                    fontSize: '0.72rem', textAlign: 'center', whiteSpace: 'nowrap',
                    color: done || current ? 'var(--bb-ink)' : 'var(--bb-muted)',
                    fontWeight: current ? 800 : done ? 600 : 400,
                  }}>{s.label}</span>
                </div>
                {i < TIMELINE_STAGES.length - 1 && (
                  <div style={{ flex: '0 0 20px', height: 2, marginTop: 14, background: i < currentIdx ? 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose))' : '#efe5df' }} />
                )}
              </div>
            )
          })}
        </div>
      </motion.section>

      {/* Payment + Message */}
      <motion.section variants={fadeUp} className="bb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Payment */}
        <div className="bb-card bb-lift" style={{ padding: 26, borderRadius: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose))' }} />
          <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6, color: 'var(--bb-pillar-4)' }}>Next payment</span>
          <strong style={{ display: 'block', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1.1rem', fontWeight: 500, marginBottom: 14 }}>
            {paymentLabel}
          </strong>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <span className="bb-display" style={{ fontSize: '2.1rem', lineHeight: 1 }}>{paymentAmount}</span>
            <span style={{ color: 'var(--bb-muted)', fontSize: '0.86rem' }}>due {paymentDue}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/portal/payments" className="bb-btn-primary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={15} /> View payments
            </Link>
          </div>
        </div>

        {/* Message */}
        <div className="bb-card bb-lift" style={{ padding: 26, borderRadius: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'linear-gradient(90deg, var(--bb-violet), var(--bb-rose))' }} />
          <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 10, color: 'var(--bb-pillar-2)' }}>From your jeweller</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))', fontWeight: 800, fontSize: '0.82rem', flexShrink: 0 }}>B</div>
            <div>
              <strong style={{ color: 'var(--bb-ink)', display: 'block', fontFamily: 'var(--app-font-display)', fontSize: '0.98rem', fontWeight: 500 }}>Blink & Bling</strong>
              <span style={{ color: 'var(--bb-muted)', fontSize: '0.76rem' }}>Your jeweller team</span>
            </div>
          </div>
          <p style={{ margin: '0 0 20px', color: 'var(--bb-text)', fontSize: '0.9rem', lineHeight: 1.65, fontFamily: 'var(--app-font-display)', fontStyle: 'italic' }}>
            "{messageText}"
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="bb-btn-primary bb-lift"
              onClick={() => window.dispatchEvent(new CustomEvent('bb-open-messenger'))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <MessageCircle size={15} /> Reply
            </button>
            <Link href="/portal/magic-movement" className="bb-btn-secondary bb-lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} /> Explore designs
            </Link>
          </div>
        </div>
      </motion.section>
    </motion.div>
  )
}
