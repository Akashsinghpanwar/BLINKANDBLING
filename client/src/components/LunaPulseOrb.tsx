import { motion, useReducedMotion } from 'framer-motion'
import { Mic2 } from 'lucide-react'

interface Props {
  state?: 'idle' | 'listening' | 'thinking' | 'speaking'
  size?: number
  onClick?: () => void
  testId?: string
}

const stateColor = {
  idle: '#cf5f91',
  listening: '#3f8874',
  thinking: '#8b6bb5',
  speaking: '#e38d5a',
}

export default function LunaPulseOrb({ state = 'idle', size = 260, onClick, testId }: Props) {
  const reduced = useReducedMotion()
  const active = state !== 'idle'
  const color = stateColor[state]

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label="Luna voice orb"
      style={{
        position: 'relative',
        width: size,
        height: size,
        border: 0,
        padding: 0,
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        display: 'grid',
        placeItems: 'center',
        outline: 'none',
      }}
    >
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          aria-hidden
          animate={reduced ? undefined : {
            scale: active ? [0.62, 1.06, 0.62] : [0.7, 0.92, 0.7],
            opacity: active ? [0.45, 0.08, 0.45] : [0.28, 0.06, 0.28],
          }}
          transition={reduced ? undefined : {
            duration: active ? 2.15 : 3.1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.42,
          }}
          style={{
            position: 'absolute',
            width: size * (0.56 + i * 0.18),
            height: size * (0.56 + i * 0.18),
            borderRadius: '50%',
            border: `1px solid ${color}`,
            boxShadow: `0 0 ${24 + i * 18}px ${color}42`,
            background: `radial-gradient(circle, ${color}18 0%, transparent 66%)`,
          }}
        />
      ))}

      <motion.span
        aria-hidden
        animate={reduced ? undefined : {
          scale: active ? [1, 1.08, 1] : [1, 1.025, 1],
          boxShadow: active
            ? [`0 0 22px ${color}55`, `0 0 54px ${color}88`, `0 0 22px ${color}55`]
            : [`0 0 18px ${color}3d`, `0 0 32px ${color}55`, `0 0 18px ${color}3d`],
        }}
        transition={reduced ? undefined : { duration: active ? 1.35 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          zIndex: 2,
          width: size * 0.46,
          height: size * 0.46,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background:
            'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.92), rgba(255,255,255,0.36) 28%, rgba(207,95,145,0.38) 58%, rgba(32,24,36,0.62) 100%)',
          border: '1px solid rgba(255,255,255,0.72)',
          backdropFilter: 'blur(18px)',
          overflow: 'hidden',
        }}
      >
        <motion.span
          aria-hidden
          animate={reduced ? undefined : { rotate: active ? 360 : 180 }}
          transition={reduced ? undefined : { duration: active ? 9 : 18, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: -22,
            background: `conic-gradient(from 0deg, transparent, ${color}88, transparent, rgba(139,107,181,0.72), transparent)`,
            opacity: 0.56,
          }}
        />
        <Mic2 size={Math.max(25, size * 0.14)} style={{ position: 'relative', zIndex: 2, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.28))' }} />
      </motion.span>

      <div
        aria-hidden
        style={{
          position: 'absolute',
          zIndex: 3,
          bottom: size * 0.2,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {[0, 1, 2, 3, 4].map(i => (
          <motion.span
            key={i}
            animate={reduced ? undefined : { height: active ? [7, 20 + (i % 2) * 8, 7] : [6, 10, 6] }}
            transition={reduced ? undefined : { duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
            style={{
              width: 4,
              height: 8,
              borderRadius: 999,
              background: '#fff',
              opacity: 0.82,
              boxShadow: `0 0 12px ${color}`,
            }}
          />
        ))}
      </div>
    </button>
  )
}
