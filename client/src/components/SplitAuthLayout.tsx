import { motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'wouter'
import { ArrowLeft } from 'lucide-react'
import BlinkBlingLogo from './BlinkBlingLogo'

interface Props {
  side: 'left' | 'right'
  photo: string
  eyebrow: string
  children: React.ReactNode
}

export default function SplitAuthLayout({ side, photo, eyebrow, children }: Props) {
  const [, navigate] = useLocation()
  const reduced = useReducedMotion()

  const photoPanel = (
    <div style={{ position: 'relative', minHeight: 560, overflow: 'hidden' }}>
      <motion.img
        src={photo}
        alt=""
        loading="lazy"
        initial={reduced ? false : { scale: 1.06 }}
        animate={reduced ? undefined : { scale: 1 }}
        transition={reduced ? undefined : { duration: 1.4, ease: [0.22, 0.9, 0.32, 1] }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(20,18,28,0.05) 0%, rgba(20,18,28,0.55) 100%)',
      }} />
      <div style={{ position: 'absolute', left: 28, right: 28, top: 28 }}>
        <span className="bb-eyebrow" style={{ color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}>
          {eyebrow}
        </span>
      </div>
    </div>
  )

  const formPanel = (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.45, ease: [0.22, 0.9, 0.32, 1] }}
      style={{ padding: 'clamp(34px, 5vw, 62px)', background: '#fff', display: 'flex', flexDirection: 'column' }}
    >
      <BlinkBlingLogo variant="lockup" size="md" style={{ marginBottom: 22 }} />
      {children}
    </motion.div>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'clamp(16px, 3vw, 36px)',
      background: 'radial-gradient(circle at 18% 12%, rgba(244,223,226,0.7), transparent 32%), radial-gradient(circle at 82% 88%, rgba(225,210,239,0.55), transparent 35%), linear-gradient(135deg, #fffefe 0%, #fbf8f5 50%, #f5ece7 100%)',
    }}>
      <button
        onClick={() => navigate('/')}
        className="bb-lift"
        style={{
          position: 'fixed', left: 24, top: 24, display: 'inline-flex', alignItems: 'center', gap: 8,
          color: 'var(--bb-muted)', background: '#fff', border: '1px solid var(--bb-line)',
          borderRadius: 999, padding: '10px 14px', boxShadow: 'var(--bb-soft-shadow)', cursor: 'pointer',
          fontWeight: 600, zIndex: 50,
        }}>
        <ArrowLeft size={16} /> Back
      </button>

      <motion.section
        initial={reduced ? false : { opacity: 0, scale: 0.98 }}
        animate={reduced ? undefined : { opacity: 1, scale: 1 }}
        transition={reduced ? undefined : { duration: 0.55, ease: [0.22, 0.9, 0.32, 1] }}
        style={{
          width: 'min(1180px, 100%)',
          display: 'grid',
          gridTemplateColumns: side === 'left' ? '1.05fr 0.95fr' : '0.95fr 1.05fr',
          overflow: 'hidden', borderRadius: 24,
          border: '1px solid var(--bb-line)',
          boxShadow: '0 30px 80px rgba(51,39,35,0.14)',
        }}
        className="bb-stack-mobile"
      >
        {side === 'left' ? photoPanel : formPanel}
        {side === 'left' ? formPanel : photoPanel}
      </motion.section>
    </div>
  )
}
