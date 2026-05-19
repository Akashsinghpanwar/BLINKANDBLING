import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleUserRound,
  Columns3,
  CreditCard,
  LogIn,
  Rocket,
  ShieldCheck,
  Star,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import GradientHeadline from '../components/GradientHeadline'
import BlinkBlingLogo from '../components/BlinkBlingLogo'
import PenWriteLogo from '../components/PenWriteLogo'
import PillarSelector from '../components/PillarSelector'
import { photos } from '../lib/photos'
import { fadeUp, scrollFadeUp, stagger } from '../lib/motion'

const NAV_LINKS = [
  { label: 'For Jewellers', href: '#who', icon: CircleUserRound, testId: 'for-jewellers' },
  { label: 'Features', href: '#pillars', icon: Columns3, testId: 'features' },
  { label: 'Pricing', href: '#pricing', icon: CreditCard, testId: 'pricing' },
]

const TRUSTED_BY = [
  'MAISON LIOR',
  'STUDIO AURELIO',
  'KAVAN & CO',
  'ATELIER NOVA',
  'HOUSE OF SOLENE',
]

const HERO_SKETCH_IMAGE = '/jewellery-sketch-floating.png'

const RESULT_SHOWCASE_IMAGES = [
  '/result-showcase/result-01.png',
  '/result-showcase/result-02.png',
  '/result-showcase/result-03.png',
  '/result-showcase/result-04.png',
  '/result-showcase/result-05.png',
  '/result-showcase/result-06.png',
  '/result-showcase/result-07.png',
  '/result-showcase/result-08.png',
  '/result-showcase/result-09.png',
  '/result-showcase/result-10.png',
  '/result-showcase/result-11.png',
  '/result-showcase/result-12.png',
  '/result-showcase/result-13.png',
  '/result-showcase/result-14.png',
  '/result-showcase/result-15.png',
  '/result-showcase/result-16.png',
  '/result-showcase/result-17.png',
  '/result-showcase/result-18.png',
  '/result-showcase/result-19.png',
  '/result-showcase/result-20.png',
  '/result-showcase/result-21.png',
  '/result-showcase/result-22.png',
  '/result-showcase/result-23.png',
  '/result-showcase/result-24.png',
  '/result-showcase/result-25.png',
]

const RESULT_SHOWCASE_TOP = RESULT_SHOWCASE_IMAGES.filter((_, index) => index % 2 === 0)
const RESULT_SHOWCASE_BOTTOM = RESULT_SHOWCASE_IMAGES.filter((_, index) => index % 2 === 1)

export default function LandingPage() {
  const [, navigate] = useLocation()
  const reduced = useReducedMotion()
  const { scrollY } = useScroll()
  const heroBlobY = useTransform(scrollY, [0, 600], [0, -120])
  const heroImgY = useTransform(scrollY, [0, 600], [0, -60])
  const [scrolled, setScrolled] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  const [isIslandOpen, setIsIslandOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const finishIntro = useCallback(() => setIntroDone(true), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (introDone) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [introDone])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const dateText = now.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeText = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div data-testid="landing-page" style={{ minHeight: '100vh', color: 'var(--bb-text)', overflowX: 'hidden', position: 'relative' }}>
      <div className="bb-grain" aria-hidden />

      <AnimatePresence>
        {!introDone && (
          <motion.div
            key="bb-intro"
            data-testid="pen-write-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.65, 0.05, 0.36, 1] }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              display: 'grid', placeItems: 'center',
              background:
                'radial-gradient(circle at 78% 4%, rgba(244,223,226,0.85), transparent 35%),' +
                'radial-gradient(circle at 12% 92%, rgba(225,210,239,0.6), transparent 40%),' +
                'linear-gradient(135deg, #fffefe 0%, #fbf8f5 50%, #f4ece6 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
              <PenWriteLogo duration={2} onDone={finishIntro} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.9, 0.32, 1], delay: 0.05 }}
        style={{
          position: 'fixed', top: scrolled ? 12 : 22, left: 0, right: 0, zIndex: 60,
          display: 'flex', justifyContent: 'center', padding: '0 18px', pointerEvents: 'none',
          transition: 'top 0.3s ease',
        }}
      >
        <motion.div
          className={`bb-premium-island${isIslandOpen ? ' is-open' : ''}`}
          data-testid="top-nav"
          onMouseEnter={() => setIsIslandOpen(true)}
          onMouseLeave={() => setIsIslandOpen(false)}
          onFocus={() => setIsIslandOpen(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsIslandOpen(false)
          }}
          animate={{
            width: isIslandOpen ? 'min(940px, calc(100vw - 30px))' : '82px',
            height: isIslandOpen ? 66 : 48,
          }}
          transition={{ duration: 0.34, ease: [0.22, 0.9, 0.32, 1] }}
          style={{
            pointerEvents: 'auto',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            overflow: 'hidden',
            background:
              'radial-gradient(circle at 14% 0%, rgba(241,208,107,0.18), transparent 34%),' +
              'radial-gradient(circle at 86% 95%, rgba(207,95,145,0.22), transparent 38%),' +
              'linear-gradient(135deg, rgba(26,20,27,0.96), rgba(58,43,55,0.96) 48%, rgba(35,29,42,0.97))',
            border: '1px solid rgba(241,208,107,0.28)',
            boxShadow:
              '0 24px 64px rgba(37, 22, 31, 0.28),' +
              '0 8px 20px rgba(91, 54, 70, 0.14),' +
              'inset 0 1px 0 rgba(255,255,255,0.18),' +
              'inset 0 -1px 0 rgba(199,166,106,0.16)',
            backdropFilter: 'blur(28px) saturate(1.28)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.28)',
          }}
        >
          <div
            aria-hidden
            className="bb-premium-island__wash"
            style={{
              position: 'absolute',
              inset: 1,
              borderRadius: 999,
              background: isIslandOpen
                ? 'linear-gradient(115deg, rgba(255,244,206,0.08), rgba(207,95,145,0.16) 44%, rgba(139,107,181,0.12))'
                : 'linear-gradient(115deg, rgba(255,244,206,0.08), rgba(207,95,145,0.12))',
              opacity: 1,
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: isIslandOpen ? 'auto minmax(0, 1fr) auto' : '1fr',
              alignItems: 'center',
              gap: 18,
              padding: isIslandOpen ? '8px 10px 8px 13px' : '4px 10px',
            }}
          >
            <Link
              href="/"
              aria-label="Blink & Bling"
              className="bb-island-brand"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifySelf: isIslandOpen ? 'start' : 'center',
                gap: 10,
                minWidth: 0,
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              <span
                className="bb-island-mark"
                style={{
                  width: 40,
                  height: 40,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  transition: 'box-shadow 0.28s ease, transform 0.28s ease',
                }}
              >
                <BlinkBlingLogo variant="mark" size="sm" />
              </span>
              {isIslandOpen && (
                <motion.strong
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  className="bb-island-wordmark"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Blink &amp; Bling
                </motion.strong>
              )}
            </Link>

            {isIslandOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bb-island-menu"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 0,
                }}
              >
                {NAV_LINKS.map(l => {
                  const Icon = l.icon
                  return (
                    <a
                      key={l.href}
                      href={l.href}
                      data-testid={`nav-${l.testId}`}
                      className="bb-island-link"
                      style={{
                        height: 40,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0 13px',
                        borderRadius: 999,
                        color: 'rgba(255,255,255,0.88)',
                        textDecoration: 'none',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                      }}
                    >
                      <Icon size={16} strokeWidth={1.9} />
                      <span className="bb-hide-mobile">{l.label}</span>
                    </a>
                  )
                })}
              </motion.div>
            )}

            {isIslandOpen && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="bb-island-actions"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifySelf: 'end' }}
              >
                <button
                  onClick={() => navigate('/customer/login')}
                  data-testid="nav-signin"
                  aria-label="Login"
                  className="bb-island-login"
                  style={{
                    height: 40,
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '0 14px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  <LogIn size={17} strokeWidth={2} />
                  <span className="bb-hide-mobile">Login</span>
                </button>
                <button
                  onClick={() => navigate('/jeweller/signup')}
                  data-testid="nav-get-started"
                  className="bb-island-cta"
                  style={{
                    height: 42,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 999,
                    border: 0,
                    cursor: 'pointer',
                    padding: '0 18px',
                    color: '#fff',
                    fontWeight: 800,
                  }}
                >
                  <Rocket size={16} strokeWidth={2} />
                  <span className="bb-hide-mobile">Get Started</span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.nav>

      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          paddingTop: 'clamp(140px, 18vh, 200px)',
          paddingBottom: 'clamp(60px, 10vh, 110px)',
          overflow: 'hidden',
        }}
      >
        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 0.9, 0.32, 1], delay: 0.5 }}
          className="bb-hero-time"
          aria-label={`Current date and time, ${dateText}, ${timeText}`}
          style={{
            position: 'absolute',
            top: 'clamp(138px, 18vh, 190px)',
            right: 'clamp(18px, 3.2vw, 44px)',
            zIndex: 4,
            width: 'min(210px, 30vw)',
            padding: '2px 0',
            color: 'var(--bb-ink)',
            textAlign: 'right',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 7 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--bb-rose)',
              boxShadow: '0 0 0 5px rgba(207,95,145,0.10)',
              flexShrink: 0,
            }} />
            <span style={{ color: 'var(--bb-emerald)', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Today
            </span>
          </div>
          <strong style={{
            display: 'block',
            fontFamily: 'var(--app-font-display)',
            fontSize: 'clamp(2rem, 3.2vw, 3.1rem)',
            fontWeight: 500,
            lineHeight: 0.94,
            color: 'transparent',
            backgroundImage: 'linear-gradient(110deg, #e38d5a, #cf5f91 58%, #8b6bb5)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            textShadow: '0 18px 42px rgba(207,95,145,0.10)',
          }}>
            {timeText}
          </strong>
          <span style={{ display: 'block', marginTop: 7, color: 'rgba(33,32,42,0.58)', fontSize: '0.8rem', fontWeight: 800, lineHeight: 1.35 }}>
            {dateText}
          </span>
        </motion.aside>

        <motion.div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            y: reduced ? 0 : heroBlobY,
          }}
        >
          <div className="bb-orb bb-orb--coral" style={{ top: '8%', left: '-6%' }} />
          <div className="bb-orb bb-orb--rose" style={{ top: '46%', right: '-8%' }} />
          <div className="bb-orb bb-orb--violet" style={{ bottom: '6%', left: '32%' }} />
        </motion.div>

        <div
          className="bb-hero-grid"
          style={{
            position: 'relative', zIndex: 1,
            maxWidth: 1280, margin: '0 auto',
            padding: '0 clamp(24px, 5vw, 56px)',
            display: 'grid',
            gridTemplateColumns: '1.18fr 0.82fr',
            gap: 'clamp(36px, 5vw, 80px)',
            alignItems: 'center',
          }}
        >
          <motion.div
            variants={stagger(0.09, 0.18)}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <motion.span
              variants={fadeUp}
              className="bb-eyebrow"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '7px 14px',
                marginBottom: 28,
                background: 'rgba(255,255,255,0.78)',
                border: '1px solid var(--bb-line)',
                borderRadius: 999,
                color: 'var(--bb-pillar-1)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 6px 18px rgba(51,39,35,0.05)',
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--bb-pillar-1)',
                boxShadow: '0 0 0 4px rgba(63,136,116,0.18)',
              }} />
              Design OS
            </motion.span>

            <GradientHeadline
              intro="The future of"
              gradient={[
                { text: 'bespoke', color: '#e38d5a' },
                { text: 'jewellery,', serif: true, color: '#cf5f91' },
                { text: 'crafted', color: '#8b6bb5', breakBefore: true },
                { text: 'end', color: '#3f8874' },
                { text: 'to', color: '#cf5f91' },
                { text: 'end.', color: '#e38d5a' },
              ]}
              style={{ fontSize: 'clamp(2.6rem, 5.6vw, 5rem)', letterSpacing: '-0.028em' }}
            />

            <motion.p
              variants={fadeUp}
              style={{
                marginTop: 28,
                color: 'var(--bb-muted)',
                fontSize: '1.06rem',
                lineHeight: 1.72,
                maxWidth: 560,
              }}
            >
              A jewellery studio workspace for intake, concepts, 3D previews, approvals, files, and payments.
            </motion.p>

            <motion.div
              variants={fadeUp}
              style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap' }}
            >
              <button
                className="bb-btn-primary bb-lift"
                onClick={() => navigate('/jeweller/signup')}
                data-testid="hero-cta-jeweller"
                style={{ fontSize: '0.98rem', padding: '14px 26px' }}
              >
                Open jeweller workspace <ArrowRight size={18} />
              </button>
              <button
                className="bb-btn-secondary bb-lift"
                onClick={() => navigate('/customer/login')}
                data-testid="hero-cta-customer"
                style={{ fontSize: '0.98rem', padding: '14px 26px' }}
              >
                View my order
              </button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                marginTop: 32,
                flexWrap: 'wrap',
              }}
            >
              {[
                { label: 'AI concepts', tone: 'var(--bb-pillar-1)' },
                { label: '3D previews', tone: 'var(--bb-pillar-3)' },
                { label: 'Client approvals', tone: 'var(--bb-pillar-4)' },
              ].map(item => (
                <span
                  key={item.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--bb-muted)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={15} style={{ color: item.tone }} />
                  {item.label}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 0.9, 0.32, 1], delay: 0.25 }}
            style={{
              position: 'relative',
              y: reduced ? 0 : heroImgY,
              minHeight: 460,
            }}
            className="bb-hero-visual"
          >
            <motion.div
              animate={reduced ? undefined : { y: [0, -14, 0] }}
              transition={reduced ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'relative',
                width: 'min(112%, 720px)',
                margin: '0 auto',
                aspectRatio: '16 / 10',
                transform: 'rotate(-2deg)',
                pointerEvents: 'none',
              }}
            >
              <img
                src={HERO_SKETCH_IMAGE}
                alt="Floating jewellery design sketches"
                loading="eager"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'drop-shadow(0 18px 22px rgba(77,52,65,0.14))',
                  opacity: 0.82,
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section style={{ padding: '20px clamp(24px, 5vw, 48px) 50px', position: 'relative' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', textAlign: 'center' }}>
          <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 20, color: 'var(--bb-muted)' }}>
            Approved by independent jewellery studios
          </span>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(18px, 4vw, 52px)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {TRUSTED_BY.map((brand, i) => (
              <motion.span
                key={brand}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 0.68, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                style={{
                  fontFamily: 'var(--app-font-display)',
                  fontWeight: 500,
                  fontSize: '0.92rem',
                  letterSpacing: '0.2em',
                  color: 'var(--bb-text)',
                }}
              >
                {brand}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      <section className="bb-results-showcase" aria-labelledby="results-showcase-title">
        <motion.div {...scrollFadeUp} className="bb-results-showcase__copy">
          <span className="bb-eyebrow">Some of the results</span>
          <h2 id="results-showcase-title" className="bb-display">
            Designs your customers can see before production starts.
          </h2>
          <p>
            A moving preview of jewellery concepts, watches, sets, and statement pieces generated for a polished client presentation.
          </p>
        </motion.div>

        <div className="bb-results-showcase__rows" aria-hidden="true">
          <ResultMarquee images={RESULT_SHOWCASE_TOP} direction="right" />
          <ResultMarquee images={RESULT_SHOWCASE_BOTTOM} direction="left" />
        </div>
      </section>

      <section id="pillars" style={{ padding: 'clamp(50px, 9vh, 110px) clamp(24px, 5vw, 48px)', position: 'relative' }}>
        <motion.div {...scrollFadeUp} style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 44px' }}>
          <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 14 }}>The four pillars</span>
          <h2 className="bb-display" style={{ fontSize: 'clamp(2.1rem, 4.4vw, 3.6rem)', marginBottom: 16, lineHeight: 1.06 }}>
            Every stage of your studio
          </h2>
          <p style={{ color: 'var(--bb-muted)', fontSize: '1rem', lineHeight: 1.7, margin: '18px auto 0', maxWidth: 560 }}>
            Each pillar is built around a real jewellery workflow: briefing, design, production files, and client sign-off.
          </p>
        </motion.div>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <PillarSelector />
        </div>
      </section>

      <section id="who" style={{ padding: 'clamp(50px, 9vh, 110px) clamp(24px, 5vw, 48px)' }}>
        <motion.div
          {...scrollFadeUp}
          className="bb-stack-mobile"
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(36px, 5vw, 64px)',
            alignItems: 'center', maxWidth: 1180, margin: '0 auto',
          }}
        >
          <div style={{ position: 'relative' }}>
            <motion.img
              src={photos.ringBox}
              alt="Customer portal preview"
              loading="lazy"
              whileHover={{ scale: 1.025 }}
              transition={{ duration: 0.45 }}
              style={{ width: '100%', borderRadius: 24, objectFit: 'cover', height: 520, boxShadow: '0 32px 80px rgba(51,39,35,0.18)' }}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.55 }}
              style={{
                position: 'absolute', right: -16, top: 28, padding: '10px 14px',
                borderRadius: 999, background: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8,
                border: '1px solid var(--bb-line)', boxShadow: 'var(--bb-soft-shadow)',
              }}
            >
              <ShieldCheck size={15} style={{ color: 'var(--bb-pillar-3)' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--bb-ink)' }}>Verified</span>
            </motion.div>
          </div>
          <div>
            <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 16, color: 'var(--bb-pillar-3)' }}>Customers</span>
            <h2 className="bb-display" style={{
              fontSize: 'clamp(2rem, 4vw, 3.3rem)', marginBottom: 22, lineHeight: 1.06,
            }}>
              Customer portal
            </h2>
            <p style={{ color: 'var(--bb-muted)', lineHeight: 1.76, marginBottom: 28, fontSize: '1.02rem' }}>
              Clients can review design options, compare 3D previews, follow the production timeline, and pay from one branded portal.
            </p>
            <button
              className="bb-btn-primary bb-lift"
              onClick={() => navigate('/customer/login')}
              data-testid="portal-cta"
            >
              See customer view <ArrowRight size={17} />
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 34 }}>
              {[
                { v: '<2 min', l: 'Concept turnaround' },
                { v: '6 stages', l: 'Tracked workflow' },
                { v: '3D', l: 'Preview ready' },
                { v: '4.9/5', l: 'Client feedback' },
              ].map(m => (
                <div
                  key={m.l}
                  className="bb-lift"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.72)',
                    border: '1px solid var(--bb-line)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <strong style={{
                    display: 'block',
                    color: 'var(--bb-ink)',
                    fontFamily: 'var(--app-font-display)',
                    fontSize: '1.35rem',
                    fontWeight: 500,
                  }}>{m.v}</strong>
                  <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.78rem', marginTop: 2 }}>{m.l}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section style={{ padding: '0 clamp(24px, 5vw, 48px) clamp(50px, 9vh, 90px)' }}>
        <motion.div
          {...scrollFadeUp}
          style={{
            maxWidth: 980,
            margin: '0 auto',
            padding: 'clamp(34px, 5vw, 58px)',
            borderRadius: 28,
            background: 'rgba(255,255,255,0.78)',
            border: '1px solid var(--bb-line)',
            boxShadow: '0 24px 60px rgba(51,39,35,0.10)',
            backdropFilter: 'blur(18px)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div aria-hidden style={{
            position: 'absolute',
            top: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(207,95,145,0.16), transparent 70%)',
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', gap: 4, marginBottom: 20 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <Star key={i} size={18} fill="var(--bb-gold)" stroke="var(--bb-gold)" />
              ))}
            </div>
            <blockquote style={{
              margin: 0,
              fontFamily: 'var(--app-font-display)',
              fontWeight: 400,
              fontSize: 'clamp(1.25rem, 2.3vw, 1.8rem)',
              lineHeight: 1.42,
              color: 'var(--bb-ink)',
              fontStyle: 'italic',
            }}>
              "Blink &amp; Bling replaced scattered tools with one studio. Clients understand every stage before the piece is made."
            </blockquote>
            <div style={{ marginTop: 26, display: 'inline-flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-violet))',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 700,
              }}>SA</div>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ color: 'var(--bb-ink)', display: 'block' }}>Sara Avani</strong>
                <span style={{ color: 'var(--bb-muted)', fontSize: '0.84rem' }}>Studio Aurelio, London</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="pricing" style={{ padding: 'clamp(50px, 9vh, 110px) clamp(24px, 5vw, 48px)', scrollMarginTop: 110 }}>
        <motion.div
          {...scrollFadeUp}
          style={{
            maxWidth: 1140, margin: '0 auto', padding: 'clamp(44px, 6vw, 78px)',
            borderRadius: 32, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #1c1620 0%, #3a1c2c 45%, #1a1f30 100%)',
            color: '#fff', textAlign: 'center',
          }}
        >
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 18% 0%, rgba(227,141,90,0.42), transparent 45%), radial-gradient(circle at 82% 100%, rgba(207,95,145,0.46), transparent 50%), radial-gradient(circle at 50% 50%, rgba(139,107,181,0.18), transparent 60%)',
          }} />
          <div aria-hidden className="bb-cta-grain" />
          <div style={{ position: 'relative' }}>
            <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 14, color: 'rgba(255,255,255,0.72)' }}>Pricing</span>
            <h2 className="bb-display" style={{ color: '#fff', fontSize: 'clamp(2.1rem, 5vw, 4rem)', marginBottom: 16, lineHeight: 1.06 }}>
              Simple plans for jewellery studios
            </h2>
            <p style={{ maxWidth: 620, margin: '0 auto 34px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>
              Start with the full jeweller workspace. Customer-side self-serve pricing is reserved for a future release.
            </p>

            <div className="bb-pricing-grid">
              <article className="bb-price-card bb-price-card--active" data-testid="price-b2b-enterprise">
                <div className="bb-price-card__top">
                  <span>Enterprise B2B</span>
                  <strong>For jewellers</strong>
                </div>
                <div className="bb-price-card__price">
                  <span>GBP</span>
                  <strong>499</strong>
                  <small>/ month</small>
                </div>
                <p>Everything needed to run custom jewellery design, approval, CAD and client delivery from one workspace.</p>
                <ul className="bb-price-features">
                  {[
                    'Unlimited CAD projects',
                    'Custom jewellery design workflow',
                    'Customer management and access codes',
                    'Client portal for approvals',
                    'Luna AI voice and text assistant',
                    'AI concept generation and gallery',
                    '3D preview and CAD file storage',
                    'Live gold, silver, platinum and diamond pricing tools',
                    'Editable schedule and client follow-ups',
                    'Timeline, payments and production handoff',
                    'Team-ready workspace controls',
                    'Priority onboarding support',
                  ].map(feature => (
                    <li key={feature}><CheckCircle2 size={15} /> {feature}</li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/jeweller/signup')}
                  className="bb-price-card__cta"
                  data-testid="cta-start-studio"
                >
                  Start B2B workspace <ArrowUpRight size={17} />
                </button>
              </article>

              <article className="bb-price-card bb-price-card--future" data-testid="price-b2c-future" aria-disabled="true">
                <div className="bb-price-card__blur">
                  <div className="bb-price-card__top">
                    <span>Customer B2C</span>
                    <strong>Future option</strong>
                  </div>
                  <div className="bb-price-card__price">
                    <span>GBP</span>
                    <strong>Coming</strong>
                    <small>soon</small>
                  </div>
                  <p>Self-serve customer purchasing and direct consumer journeys will be added later.</p>
                </div>
                <div className="bb-price-card__locked">Future release</div>
              </article>
            </div>
          </div>
        </motion.div>
      </section>

      <footer style={{
        padding: '52px clamp(24px, 5vw, 48px) 34px',
        borderTop: '1px solid var(--bb-line)',
        maxWidth: 1280,
        margin: '0 auto',
      }}>
        <div className="bb-footer-grid">
          <div>
            <BlinkBlingLogo variant="lockup" size="sm" />
            <p style={{ margin: '18px 0 0', color: 'var(--bb-muted)', lineHeight: 1.7, maxWidth: 310 }}>
              Blink &amp; Bling helps jewellery studios manage CAD, client approvals, pricing, timelines, and delivery from one polished workspace.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <a className="bb-footer-social" href="https://www.linkedin.com/company/blink-bling" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <Linkedin size={17} />
              </a>
              <a className="bb-footer-social" href="mailto:support@blinkandbling.com" aria-label="Email support">
                <Mail size={17} />
              </a>
            </div>
          </div>

          <FooterColumn title="Company" links={[
            ['For Jewellers', '#who'],
            ['Features', '#pillars'],
            ['Pricing', '#pricing'],
            ['Customer Portal', '/customer/login'],
            ['Jeweller Login', '/jeweller/login'],
          ]} />

          <FooterColumn title="Help" links={[
            ['Help Centre', 'mailto:support@blinkandbling.com'],
            ['Support', 'mailto:support@blinkandbling.com'],
            ['Book Onboarding', '/jeweller/signup'],
            ['System Status', '/'],
            ['Contact Sales', 'mailto:sales@blinkandbling.com'],
          ]} />

          <div>
            <h3 className="bb-footer-title">Contact</h3>
            <div className="bb-footer-contact">
              <span><MapPin size={15} /> London, United Kingdom</span>
              <span><Mail size={15} /> support@blinkandbling.com</span>
              <span><Phone size={15} /> +44 20 0000 0000</span>
            </div>
          </div>
        </div>

        <div className="bb-footer-bottom">
          <span>© {new Date().getFullYear()} Blink &amp; Bling. All rights reserved.</span>
          <div>
            <a href="/">Privacy</a>
            <a href="/">Terms</a>
            <a href="/">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ResultMarquee({ images, direction }: { images: string[]; direction: 'left' | 'right' }) {
  const repeated = [...images, ...images]

  return (
    <div className={`bb-result-marquee bb-result-marquee--${direction}`}>
      <div className="bb-result-marquee__track">
        {repeated.map((src, index) => (
          <figure className="bb-result-float" key={`${src}-${index}`}>
            <img src={src} alt="" loading="lazy" />
          </figure>
        ))}
      </div>
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="bb-footer-title">{title}</h3>
      <nav className="bb-footer-links">
        {links.map(([label, href]) => (
          <a key={label} href={href}>{label}</a>
        ))}
      </nav>
    </div>
  )
}
