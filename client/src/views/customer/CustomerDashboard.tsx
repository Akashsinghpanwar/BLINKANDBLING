import { Link } from 'wouter'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, CreditCard, Images, MessageCircle, Mic2, Sparkles } from 'lucide-react'
import { fadeUp, stagger } from '../../lib/motion'
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
      <motion.section
        variants={fadeUp}
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 28,
          minHeight: 380, display: 'grid', placeItems: 'end start',
          background: 'linear-gradient(125deg, #0f0818 0%, #1e0a2e 30%, #3b1040 55%, #1a0622 100%)',
          boxShadow: '0 32px 80px rgba(80,20,120,0.35), 0 0 0 1px rgba(180,120,255,0.10)',
        }}
      >
        {/* Animated shimmer sweep */}
        <motion.div
          animate={{ x: ['−100%', '200%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, transparent 30%, rgba(200,160,255,0.06) 50%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Deep vignette left + colour fade to transparent right */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(100deg, rgba(10,4,20,0.97) 0%, rgba(22,6,36,0.88) 28%, rgba(35,10,55,0.60) 50%, rgba(0,0,0,0.05) 75%)',
        }} />

        {/* Gold/rose top-edge accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, #d4af37 20%, #f9c4d2 50%, #d4af37 80%, transparent 100%)',
          opacity: 0.7,
        }} />

        {/* Jewelry sketch — right side, screen blend kills white bg */}
        <motion.img
          src="/assets/overview-hero.png" alt="" loading="lazy"
          initial={{ opacity: 0, x: 60, scale: 1.04 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 0.9, 0.32, 1], delay: 0.25 }}
          style={{
            position: 'absolute', right: 0, top: 0,
            height: '100%', width: '65%',
            objectFit: 'cover', objectPosition: 'left top',
            mixBlendMode: 'screen',
            opacity: 0.92,
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 12%, #000 40%, #000 88%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 12%, #000 40%, #000 88%, transparent 100%)',
          }}
        />

        {/* Subtle purple glow orb behind the image */}
        <div style={{
          position: 'absolute', right: '20%', top: '50%', transform: 'translate(50%,-50%)',
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(140,60,200,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Floating sparkle dots */}
        {[
          { top: '18%', left: '38%', size: 4, delay: 0 },
          { top: '68%', left: '42%', size: 3, delay: 0.8 },
          { top: '30%', left: '55%', size: 5, delay: 1.4 },
          { top: '75%', left: '60%', size: 3, delay: 0.4 },
          { top: '12%', left: '62%', size: 4, delay: 1.1 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: dot.delay }}
            style={{
              position: 'absolute', top: dot.top, left: dot.left,
              width: dot.size, height: dot.size, borderRadius: '50%',
              background: '#d4af37', boxShadow: `0 0 ${dot.size * 3}px #d4af37`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(32px, 4vw, 52px)', color: '#fff', maxWidth: 560 }}>

          {/* Eyebrow with gold accent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 1.5, background: 'linear-gradient(90deg, #d4af37, #f9c4d2)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.9)' }}>
              Welcome back, {firstName}
            </span>
          </div>

          <h1 className="bb-display" style={{ color: '#fff', fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: 0.95, marginBottom: 18, textShadow: '0 2px 24px rgba(140,60,200,0.4)' }}>
            Your{' '}
            <span className="bb-script" style={{ fontSize: '1.22em', background: 'linear-gradient(135deg, #f9c4d2 0%, #d4af37 60%, #f9c4d2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {titleWord}
            </span>
            {' '}workspace.
          </h1>

          {/* Stage chip — glassy gold */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 16px', borderRadius: 999, marginBottom: 24,
            background: 'rgba(212,175,55,0.12)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 0 20px rgba(212,175,55,0.1)',
          }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: '#d4af37', boxShadow: '0 0 0 3px rgba(212,175,55,0.25)' }}
            />
            <span style={{ fontSize: '0.79rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
              Stage {currentIdx + 1} of {TIMELINE_STAGES.length} · {TIMELINE_STAGES[currentIdx]?.label ?? stage}
            </span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 800, color: '#d4af37',
              background: 'rgba(212,175,55,0.2)', padding: '2px 8px', borderRadius: 999,
            }}>{progressPct}%</span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href={cta.href} className="bb-lift" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 99, fontWeight: 700, fontSize: '0.88rem',
              background: 'linear-gradient(135deg, #d4af37 0%, #f0c862 50%, #d4af37 100%)',
              color: '#1a0a00', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(212,175,55,0.4)',
            }}>
              {cta.label} <ArrowRight size={15} />
            </Link>
            <Link href="/portal/gallery" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 99, fontWeight: 600, fontSize: '0.88rem',
              background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}>
              <Images size={15} /> Gallery
            </Link>
            <Link href="/portal/luna" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 99, fontWeight: 600, fontSize: '0.88rem',
              background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}>
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
