import { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { PILLAR_TABS } from '../lib/photos'
import { fadeUp } from '../lib/motion'

export default function PillarSelector() {
  const [active, setActive] = useState(0)
  const tab = PILLAR_TABS[active]

  return (
    <LayoutGroup id="pillar-selector">
      <div style={{ width: '100%' }}>
        <div
          className="bb-pillar-rail"
          style={{
            display: 'flex', gap: 12, marginBottom: 28,
            overflowX: 'auto', scrollSnapType: 'x mandatory',
            padding: '4px 8px', justifyContent: 'center',
            WebkitOverflowScrolling: 'touch',
          }}>
          {PILLAR_TABS.map((t, i) => {
            const isActive = i === active
            return (
              <button
                key={t.id}
                type="button"
                className="bb-pillar-pill"
                data-active={isActive}
                onClick={() => setActive(i)}
                style={{ position: 'relative', background: 'transparent', overflow: 'hidden', flex: '0 0 auto', scrollSnapAlign: 'center' }}
              >
                {isActive && (
                  <motion.span
                    layoutId="pillar-active-bg"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: 999,
                      background: t.accent, zIndex: 0,
                    }}
                  />
                )}
                <span className="dot" style={{ background: isActive ? '#fff' : t.accent, position: 'relative', zIndex: 1 }} />
                <span className="pill-label" style={{ position: 'relative', zIndex: 1, color: isActive ? '#fff' : undefined }}>
                  <span>{t.label}</span>
                  <small style={{ color: isActive ? 'rgba(255,255,255,0.78)' : undefined }}>{t.sub}</small>
                </span>
              </button>
            )
          })}
        </div>

      <div style={{
        position: 'relative',
        borderRadius: 22, overflow: 'hidden',
        border: '1px solid var(--bb-line)',
        background: '#fff',
        boxShadow: '0 22px 60px rgba(51,39,35,0.10)',
        minHeight: 420,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 0.9, 0.32, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.05fr)',
              minHeight: 420,
            }}
            className="bb-stack-mobile"
          >
            <div style={{ padding: 'clamp(28px, 4vw, 48px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 22 }}>
              <div>
                <span
                  className="bb-eyebrow"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: tab.accent, marginBottom: 18 }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: tab.accent, display: 'inline-block' }} />
                  {tab.label} · {tab.sub}
                </span>
                <motion.h3
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="bb-display"
                  style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', lineHeight: 1.1, marginBottom: 14 }}
                >
                  {tab.title}
                </motion.h3>
                <motion.p
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.08 }}
                  style={{ color: 'var(--bb-muted)', lineHeight: 1.7, fontSize: '1.02rem', margin: 0 }}
                >
                  {tab.body}
                </motion.p>
              </div>
              <button
                type="button"
                className="bb-lift"
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '11px 18px', borderRadius: 999,
                  background: tab.accent, color: '#fff',
                  fontWeight: 600, fontSize: '0.92rem',
                  border: 0, cursor: 'pointer',
                  boxShadow: `0 14px 30px ${tab.accent}38`,
                }}
              >
                Explore {tab.label.toLowerCase()} <ArrowUpRight size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', minHeight: 320 }}>
              <img
                src={tab.photo}
                alt={tab.label}
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(120deg, ${tab.accent}26 0%, transparent 55%)`,
              }} />
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  )
}
