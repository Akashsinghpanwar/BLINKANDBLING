import { Link } from 'wouter'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, CreditCard, MessageCircle, Sparkles, Package, Palette, Cpu, ThumbsUp, Truck, ClipboardCheck, Star } from 'lucide-react'
import { fadeUp, stagger } from '../../lib/motion'
import { useProjects } from '../../context/ProjectContext'

const TIMELINE_STAGES = [
  { id: 'intake',            label: 'Intake',      icon: ClipboardCheck },
  { id: 'concepts',          label: 'Concepts',    icon: Palette        },
  { id: 'concept_review',    label: 'Shortlist',   icon: Star           },
  { id: '3d_render',         label: '3D Render',   icon: Cpu            },
  { id: 'cad_refinement',    label: 'CAD',         icon: Sparkles       },
  { id: 'customer_approval', label: 'Approval',    icon: ThumbsUp       },
  { id: 'production',        label: 'Production',  icon: Package        },
  { id: 'delivered',         label: 'Delivered',   icon: Truck          },
]

const STAGE_CTA: Record<string, { label: string; href: string }> = {
  intake:            { label: 'View your workspace',   href: '/portal/timeline'        },
  concepts:          { label: 'Review concepts',        href: '/portal/magic-movement'  },
  concept_review:    { label: 'Review your shortlist',  href: '/portal/magic-movement'  },
  '3d_render':       { label: 'Review the 3D render',  href: '/portal/magic-movement'  },
  cad_refinement:    { label: 'View CAD details',       href: '/portal/gallery'         },
  customer_approval: { label: 'Approve your design',    href: '/portal/timeline'        },
  production:        { label: 'Track progress',         href: '/portal/timeline'        },
  qa:                { label: 'Track progress',         href: '/portal/timeline'        },
  delivered:         { label: 'View your project',      href: '/portal/timeline'        },
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

  const paymentAmount = portalProject?.budget && portalProject.budget !== 'Not set'
    ? portalProject.budget : 'To be confirmed'
  const paymentLabel = PAYMENT_LABEL[stage] ?? 'Next payment'
  const paymentDue = portalProject?.timeline && portalProject.timeline !== 'Not set'
    ? `within ${portalProject.timeline}` : 'to be confirmed'

  const cta = STAGE_CTA[stage] ?? { label: 'View your workspace', href: '/portal/timeline' }
  const messageText = STAGE_MESSAGE[stage] ?? `Your ${projectName} workspace is ready.`
  const progressPct = Math.round(((currentIdx + 1) / TIMELINE_STAGES.length) * 100)

  return (
    <motion.div variants={stagger(0.1)} initial="hidden" animate="visible" style={{ display: 'grid', gap: 20 }}>

      {/* ── Hero ── */}
      <motion.section
        variants={fadeUp}
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 28,
          minHeight: 380, display: 'grid', placeItems: 'end start',
          background: 'linear-gradient(135deg, #1a0620 0%, #2e0835 20%, #4a0848 44%, #6a0850 65%, #4a0428 82%, #1e0418 100%)',
          boxShadow: '0 32px 80px rgba(180,30,100,0.35), 0 8px 32px rgba(240,80,180,0.22), 0 0 0 1px rgba(255,140,200,0.12)',
        }}
      >
        {/* Animated shimmer — pink tinted */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 2.5 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, transparent 25%, rgba(255,160,210,0.08) 50%, rgba(255,100,180,0.04) 65%, transparent 75%)',
            pointerEvents: 'none',
          }}
        />

        {/* Left dark overlay for text readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(100deg, rgba(26,4,32,0.97) 0%, rgba(46,8,53,0.88) 26%, rgba(74,8,72,0.58) 50%, rgba(0,0,0,0.04) 75%)',
        }} />

        {/* Top hairline — rose → hot pink → rose */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, #e060b0 18%, #ff80d0 48%, #e060b0 78%, transparent 100%)',
          opacity: 0.90,
        }} />

        {/* Jewelry image */}
        <motion.img
          src="/assets/overview-hero.png" alt="" loading="lazy"
          initial={{ opacity: 0, x: 60, scale: 1.04 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 0.9, 0.32, 1], delay: 0.25 }}
          style={{
            position: 'absolute', right: 0, top: 0,
            height: '100%', width: '68%',
            objectFit: 'cover', objectPosition: '30% center',
            mixBlendMode: 'screen', opacity: 0.90,
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 12%, #000 38%, #000 88%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 12%, #000 38%, #000 88%, transparent 100%)',
          }}
        />

        {/* Deep pink glow orb centre-right */}
        <div style={{
          position: 'absolute', right: '18%', top: '50%', transform: 'translate(50%,-50%)',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,80,180,0.18) 0%, rgba(200,40,120,0.10) 50%, transparent 72%)',
          pointerEvents: 'none',
        }} />
        {/* Magenta bloom bottom-left */}
        <div style={{
          position: 'absolute', left: '30%', bottom: '-10%',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,60,160,0.13) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Twinkling stars — warm pinkish-white */}
        {[
          { top: '18%', left: '38%', size: 4, delay: 0 },
          { top: '68%', left: '42%', size: 3, delay: 0.8 },
          { top: '30%', left: '55%', size: 5, delay: 1.4 },
          { top: '75%', left: '60%', size: 3, delay: 0.4 },
          { top: '12%', left: '62%', size: 4, delay: 1.1 },
          { top: '50%', left: '46%', size: 3, delay: 1.8 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.7, 1.4, 0.7] }}
            transition={{ duration: 2.8 + i * 0.35, repeat: Infinity, delay: dot.delay }}
            style={{
              position: 'absolute', top: dot.top, left: dot.left,
              width: dot.size, height: dot.size, borderRadius: '50%',
              background: i % 2 === 0 ? '#ffb0e0' : '#ff80c8',
              boxShadow: `0 0 ${dot.size * 3}px ${i % 2 === 0 ? '#ff80c8' : '#e040a0'}`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Text content */}
        <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(32px, 4vw, 52px)', color: '#fff', maxWidth: 560 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 1.5, background: 'linear-gradient(90deg, #ff80c8, #ffb0e0)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,180,220,0.92)' }}>
              Welcome back, {firstName}
            </span>
          </div>
          <h1 className="bb-display" style={{ color: '#fff', fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: 0.95, textShadow: '0 2px 32px rgba(240,60,160,0.50), 0 0 60px rgba(200,40,120,0.28)' }}>
            Your{' '}
            <span className="bb-script" style={{ fontSize: '1.22em', color: '#ffaad8', textShadow: '0 0 24px rgba(255,80,180,0.70), 0 0 50px rgba(220,40,140,0.40)' }}>
              {titleWord}
            </span>
            {' '}workspace.
          </h1>
        </div>
      </motion.section>

      {/* ── Milestone tracker ── */}
      <motion.section
        variants={fadeUp}
        style={{
          borderRadius: 20,
          background: '#fff',
          border: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 2px 24px rgba(160,100,40,0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Hairline gold top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, #d4af37 25%, #e8c97a 50%, #d4af37 75%, transparent 100%)',
          opacity: 0.8,
        }} />

        <div style={{ padding: '26px 28px 22px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c99228' }}>
                Project Journey
              </span>
              <strong style={{ display: 'block', marginTop: 2, color: '#1c1008', fontFamily: 'var(--app-font-display)', fontSize: '1.1rem', fontWeight: 500, letterSpacing: '-0.01em' }}>
                Your milestones
              </strong>
            </div>
            <Link href="/portal/timeline" className="bb-no-underline" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600, color: '#cf5f91', letterSpacing: '0.01em' }}>
              Full timeline <ArrowRight size={12} />
            </Link>
          </div>

          {/* Slim progress track */}
          <div style={{ position: 'relative', height: 5, borderRadius: 999, background: 'rgba(212,175,55,0.1)', marginBottom: 24, overflow: 'visible' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1.4, ease: [0.22, 0.9, 0.32, 1], delay: 0.35 }}
              style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #e8c97a, #d4af37 45%, #cf5f91)', position: 'relative', overflow: 'hidden' }}
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
              />
            </motion.div>
            {/* Progress badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
              style={{
                position: 'absolute', left: `${progressPct}%`, top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 28, height: 28, borderRadius: '50%',
                background: '#fff', border: '1.5px solid #d4af37',
                boxShadow: '0 2px 10px rgba(212,175,55,0.3)',
                display: 'grid', placeItems: 'center',
                fontSize: '0.6rem', fontWeight: 800, color: '#c99228',
              }}
            >
              {progressPct}%
            </motion.div>
          </div>

          {/* Stage row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 2, gap: 0 }}>
            {TIMELINE_STAGES.map((s, i) => {
              const done = i < currentIdx
              const current = i === currentIdx
              const Icon = s.icon
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', flex: '1 1 0', minWidth: 68 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ position: 'relative' }}>
                      {current && (
                        <motion.div
                          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute', inset: -7, borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(207,95,145,0.28), transparent 70%)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        display: 'grid', placeItems: 'center', flexShrink: 0,
                        background: done
                          ? 'linear-gradient(135deg, #e8c97a 0%, #c99228 100%)'
                          : current
                            ? 'linear-gradient(135deg, #cf5f91 0%, #9b5aad 100%)'
                            : '#f7f3ef',
                        border: done
                          ? '1.5px solid rgba(212,175,55,0.35)'
                          : current
                            ? '1.5px solid rgba(207,95,145,0.4)'
                            : '1.5px solid rgba(0,0,0,0.08)',
                        boxShadow: current
                          ? '0 4px 16px rgba(207,95,145,0.3)'
                          : done
                            ? '0 2px 10px rgba(212,175,55,0.22)'
                            : 'none',
                      }}>
                        {done
                          ? <CheckCircle2 size={13} color="#fff" strokeWidth={2.5} />
                          : <Icon size={13} color={current ? '#fff' : 'rgba(0,0,0,0.22)'} strokeWidth={1.8} />
                        }
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.64rem', textAlign: 'center', whiteSpace: 'nowrap',
                      fontWeight: current ? 700 : done ? 500 : 400,
                      color: done ? '#a07020' : current ? '#b0446e' : 'rgba(0,0,0,0.32)',
                    }}>
                      {s.label}
                    </span>
                  </div>
                  {i < TIMELINE_STAGES.length - 1 && (
                    <div style={{
                      flex: '0 0 14px', height: 1.5, marginTop: 15, borderRadius: 999,
                      background: i < currentIdx ? 'linear-gradient(90deg, #d4af37, #e8c97a)' : '#ede8e2',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* ── Payment + Message ── */}
      <motion.section
        variants={fadeUp}
        className="bb-stack-mobile"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
      >

        {/* ── Payment card — champagne light ── */}
        <div style={{
          borderRadius: 20, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(150deg, #fffdf5 0%, #fdf6e3 55%, #faf0d0 100%)',
          border: '1px solid rgba(212,175,55,0.28)',
          boxShadow: '0 4px 28px rgba(180,130,20,0.09)',
          padding: '26px 26px 24px',
        }}>
          {/* Hairline gold top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, #c99228 30%, #f7d96a 55%, #c99228 80%, transparent)',
          }} />
          {/* Faint corner gem shape */}
          <div style={{
            position: 'absolute', bottom: -28, right: -28,
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.13) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: '#a07020', marginBottom: 14,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#c99228' }} />
              Next Payment
            </span>

            <p style={{
              margin: '0 0 8px',
              color: '#7a5a18', fontSize: '0.82rem',
              fontFamily: 'var(--app-font-display)', fontWeight: 400, letterSpacing: '0.02em',
            }}>
              {paymentLabel}
            </p>

            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontFamily: 'var(--app-font-display)',
                fontSize: 'clamp(1.7rem, 3vw, 2.2rem)',
                fontWeight: 300, lineHeight: 1.1,
                color: '#1c1008', letterSpacing: '-0.02em',
              }}>
                {paymentAmount}
              </div>
              <span style={{ color: '#a07020', fontSize: '0.75rem', fontWeight: 500 }}>
                {paymentDue}
              </span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)', marginBottom: 18 }} />

            <Link
              href="/portal/payments"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#1c1008',
                color: '#f7d96a', fontWeight: 700, fontSize: '0.8rem',
                padding: '10px 20px', borderRadius: 999,
                textDecoration: 'none',
                letterSpacing: '0.04em',
                boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
              }}
            >
              <CreditCard size={13} /> View payments
            </Link>
          </div>
        </div>

        {/* ── Jeweller message card ── */}
        <div style={{
          borderRadius: 20, overflow: 'hidden', position: 'relative',
          background: '#fff',
          border: '1px solid rgba(207,95,145,0.14)',
          boxShadow: '0 4px 28px rgba(180,80,120,0.07)',
          padding: '26px 26px 24px',
        }}>
          {/* Rose top hairline */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, #cf5f91 35%, #b06cc4 65%, transparent)',
            opacity: 0.7,
          }} />
          <div style={{
            position: 'absolute', bottom: -24, right: -24,
            width: 110, height: 110, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(207,95,145,0.06), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{
              display: 'block', fontSize: '0.62rem', fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: '#9b5aad', marginBottom: 16,
            }}>
              From your jeweller
            </span>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f0a8be, #cf5f91)',
                  display: 'grid', placeItems: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                  boxShadow: '0 3px 12px rgba(207,95,145,0.25)',
                }}>B</div>
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#22c55e', border: '1.5px solid #fff',
                }} />
              </div>
              <div>
                <strong style={{
                  color: '#1c1008', display: 'block',
                  fontFamily: 'var(--app-font-display)', fontSize: '0.94rem', fontWeight: 600,
                }}>Blink &amp; Bling</strong>
                <span style={{ color: '#9b5aad', fontSize: '0.7rem', fontWeight: 500 }}>
                  Active now
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(207,95,145,0.15), transparent)', marginBottom: 14 }} />

            {/* Message */}
            <p style={{
              margin: '0 0 20px',
              color: '#3e2035', fontSize: '0.85rem', lineHeight: 1.7,
              fontFamily: 'var(--app-font-display)', fontStyle: 'italic', fontWeight: 400,
            }}>
              &ldquo;{messageText}&rdquo;
            </p>

            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('bb-open-messenger'))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: 'linear-gradient(135deg, #cf5f91, #9b5aad)',
                  color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                  padding: '9px 18px', borderRadius: 999, border: 'none',
                  cursor: 'pointer', letterSpacing: '0.03em',
                  boxShadow: '0 4px 14px rgba(207,95,145,0.28)',
                }}
              >
                <MessageCircle size={13} /> Reply
              </button>
              <Link
                href={cta.href}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  border: '1px solid rgba(207,95,145,0.22)',
                  color: '#b0446e', fontWeight: 600, fontSize: '0.8rem',
                  padding: '9px 18px', borderRadius: 999,
                  textDecoration: 'none', letterSpacing: '0.03em',
                  background: 'rgba(207,95,145,0.04)',
                }}
              >
                <Sparkles size={13} /> {cta.label}
              </Link>
            </div>
          </div>
        </div>

      </motion.section>
    </motion.div>
  )
}
