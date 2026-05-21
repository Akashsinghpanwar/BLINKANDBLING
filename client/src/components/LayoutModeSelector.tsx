import { motion } from 'framer-motion'
import { Monitor, Smartphone, Sparkles } from 'lucide-react'

interface Props {
  onDismiss: () => void
}

function choose(mode: 'mobile' | 'desktop') {
  localStorage.setItem('bb-layout-mode', mode)
  window.location.reload()
}

export default function LayoutModeSelector({ onDismiss: _ }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(circle at 70% 20%, rgba(244,223,226,0.9), transparent 40%), radial-gradient(circle at 20% 80%, rgba(207,232,222,0.5), transparent 40%), linear-gradient(135deg, #fffefe, #fbf8f5 55%, #f7eee9)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 28,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))',
          display: 'grid', placeItems: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 18px 40px rgba(207,95,145,0.28)',
          color: '#fff',
        }}>
          <Sparkles size={28} />
        </div>
        <h1 style={{
          margin: '0 0 6px',
          fontFamily: 'var(--app-font-display)',
          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
          fontWeight: 400, color: 'var(--bb-ink)', lineHeight: 1.1,
        }}>
          Welcome to Blink &amp; Bling
        </h1>
        <p style={{ margin: 0, color: 'var(--bb-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          How would you like to use this app?
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 14, width: '100%', maxWidth: 520,
        }}
      >
        <ModeCard
          icon={<Smartphone size={26} />}
          iconBg="linear-gradient(135deg, rgba(227,141,90,0.15), rgba(207,95,145,0.15))"
          iconColor="var(--bb-rose)"
          title="Phone App"
          desc="Bottom navigation, large touch targets, full-screen native feel"
          badge="Recommended for mobile"
          badgeBg="linear-gradient(135deg, rgba(227,141,90,0.12), rgba(207,95,145,0.12))"
          badgeColor="var(--bb-rose)"
          onClick={() => choose('mobile')}
        />
        <ModeCard
          icon={<Monitor size={26} />}
          iconBg="rgba(207,232,222,0.4)"
          iconColor="#3a7a64"
          title="Desktop App"
          desc="Side navigation, full dashboard, keyboard & mouse optimised"
          badge="Recommended for tablet / desktop"
          badgeBg="rgba(207,232,222,0.4)"
          badgeColor="#3a7a64"
          onClick={() => choose('desktop')}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ margin: 0, color: 'var(--bb-muted)', fontSize: '0.76rem', textAlign: 'center' }}
      >
        You can change this anytime in Settings
      </motion.p>
    </motion.div>
  )
}

function ModeCard({
  icon, iconBg, iconColor, title, desc, badge, badgeBg, badgeColor, onClick
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string
  title: string; desc: string; badge: string; badgeBg: string; badgeColor: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bb-lift"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, padding: '28px 20px',
        background: '#fff', border: '2px solid transparent',
        borderRadius: 20, boxShadow: '0 8px 28px rgba(51,39,35,0.09)',
        cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bb-rose)'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: iconBg, display: 'grid', placeItems: 'center', color: iconColor,
      }}>
        {icon}
      </div>
      <div>
        <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--bb-ink)', marginBottom: 4, fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>
          {title}
        </strong>
        <span style={{ fontSize: '0.8rem', color: 'var(--bb-muted)', lineHeight: 1.5 }}>{desc}</span>
      </div>
      <div style={{
        padding: '6px 14px', borderRadius: 999,
        background: badgeBg, color: badgeColor, fontSize: '0.74rem', fontWeight: 700,
      }}>
        {badge}
      </div>
    </button>
  )
}
