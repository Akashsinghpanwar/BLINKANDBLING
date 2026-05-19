import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * PenWriteLogo — animates the "Blink & Bling" wordmark as if being written
 * with a pen in cursive script. After completion, fires `onDone()` so the
 * caller can fade the overlay out and reveal the rest of the page.
 *
 * Tech: a clip-path inset sweep from right-to-left "uncovers" the script
 * text while a pen-tip dot rides along the reveal edge. Subtle ink-bleed
 * fade-in follows for a more handwritten feel.
 */
interface Props {
  duration?: number      // seconds for the pen write
  onDone?: () => void
}

export default function PenWriteLogo({ duration = 2.4, onDone }: Props) {
  const reduced = useReducedMotion()
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (reduced) {
      setDone(true)
      onDone?.()
      return
    }
    const t = window.setTimeout(() => {
      setDone(true)
      onDone?.()
    }, duration * 1000 + 400)
    return () => window.clearTimeout(t)
  }, [duration, onDone, reduced])

  return (
    <div
      aria-hidden={done}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
      }}
    >
      {/* ghost layer — faint background guide that fades up subtly */}
      <span
        style={{
          fontFamily: "'Pinyon Script', cursive",
          fontSize: 'clamp(4rem, 11vw, 9rem)',
          color: 'transparent',
          backgroundImage: 'linear-gradient(110deg, #e38d5a, #cf5f91 50%, #8b6bb5)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          opacity: 0.10,
          letterSpacing: '0.005em',
          paddingBottom: '0.18em',
          paddingRight: '0.1em',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Blink &amp; Bling
      </span>

      {/* the inked layer — revealed by clip-path sweep */}
      <motion.span
        initial={reduced ? false : { clipPath: 'inset(0 100% 0 0)' }}
        animate={reduced ? undefined : { clipPath: 'inset(0 0% 0 0)' }}
        transition={reduced ? undefined : { duration, ease: [0.65, 0.05, 0.36, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Pinyon Script', cursive",
          fontSize: 'clamp(4rem, 11vw, 9rem)',
          color: 'transparent',
          backgroundImage: 'linear-gradient(110deg, #e38d5a, #cf5f91 50%, #8b6bb5)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          letterSpacing: '0.005em',
          paddingBottom: '0.18em',
          paddingRight: '0.1em',
          filter: 'drop-shadow(0 14px 30px rgba(207, 95, 145, 0.18))',
          userSelect: 'none',
        }}
      >
        Blink &amp; Bling
      </motion.span>

      {/* pen-tip dot riding along the reveal edge */}
      {!reduced && !done && (
        <motion.span
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
          transition={{
            left: { duration, ease: [0.65, 0.05, 0.36, 1] },
            opacity: { duration, times: [0, 0.06, 0.94, 1] },
          }}
          style={{
            position: 'absolute',
            top: '52%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff 0%, #cf5f91 55%, transparent 75%)',
            boxShadow:
              '0 0 14px rgba(207,95,145,0.85), 0 0 28px rgba(227,141,90,0.55), 0 0 56px rgba(139,107,181,0.45)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
