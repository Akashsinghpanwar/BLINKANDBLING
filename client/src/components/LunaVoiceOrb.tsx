import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface Props {
  state?: 'idle' | 'listening' | 'thinking' | 'speaking'
  size?: number
  /**
   * Microphone amplitude 0..1. If undefined, the orb auto-simulates a soft
   * ambient breath. Pipe a real mic analyser node here for actual reactivity.
   */
  amplitude?: number
  onClick?: () => void
  testId?: string
}

/**
 * LunaVoiceOrb — Apple-Siri inspired glowing voice orb.
 *
 * Layers (back → front):
 *  1. Outer halo  — soft drifting radial bloom
 *  2. Conic ring  — slowly rotating multicolor rim
 *  3. Glass dome  — frosted spherical surface
 *  4. Wave canvas — animated SVG blobs warping in real time
 *  5. Inner pearl — bright specular highlight
 *  6. Particles   — drift outward when "speaking"
 */
export default function LunaVoiceOrb({
  state = 'idle',
  size = 240,
  amplitude,
  onClick,
  testId,
}: Props) {
  const reduced = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const ampRef = useRef<number>(0)

  useEffect(() => { ampRef.current = amplitude ?? 0 }, [amplitude])

  // Animated wave blob inside the orb
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = size + 'px'
    canvas.style.height = size + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = size / 2
    const cy = size / 2
    const baseR = size * 0.36
    const start = performance.now()

    const stops = [
      ['rgba(227, 141, 90, 0.85)', 'rgba(207, 95, 145, 0.85)', 'rgba(139, 107, 181, 0.85)'],
      ['rgba(63, 136, 116, 0.7)', 'rgba(227, 141, 90, 0.6)', 'rgba(207, 95, 145, 0.8)'],
      ['rgba(139, 107, 181, 0.8)', 'rgba(63, 136, 116, 0.55)', 'rgba(227, 141, 90, 0.7)'],
    ]

    const speedFor = (s: typeof state) => {
      switch (s) {
        case 'listening': return 1.4
        case 'thinking':  return 2.2
        case 'speaking':  return 3.0
        default:          return 0.7
      }
    }

    const render = (now: number) => {
      const t = (now - start) / 1000
      const speed = speedFor(state)
      const amp = ampRef.current || (0.18 + Math.sin(t * 1.6) * 0.06)

      ctx.clearRect(0, 0, size, size)

      // 3 blob layers, each a wobbling circle path
      stops.forEach((cols, i) => {
        const phase = t * speed + i * 1.7
        const wobble = baseR * (0.08 + amp * 0.42)
        const rot = phase * 0.4
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rot * (i % 2 ? -1 : 1))

        ctx.beginPath()
        const segs = 64
        for (let s = 0; s <= segs; s++) {
          const ang = (s / segs) * Math.PI * 2
          const wave =
            Math.sin(ang * 3 + phase) * wobble * 0.6 +
            Math.sin(ang * 5 + phase * 1.3) * wobble * 0.35 +
            Math.sin(ang * 2 + phase * 0.7) * wobble * 0.4
          const r = baseR + wave + i * 6
          const x = Math.cos(ang) * r
          const y = Math.sin(ang) * r
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath()

        const grad = ctx.createLinearGradient(-baseR, -baseR, baseR, baseR)
        grad.addColorStop(0, cols[0])
        grad.addColorStop(0.5, cols[1])
        grad.addColorStop(1, cols[2])
        ctx.fillStyle = grad
        ctx.globalCompositeOperation = i === 0 ? 'source-over' : 'screen'
        ctx.globalAlpha = i === 0 ? 0.92 : 0.55
        ctx.filter = `blur(${i === 0 ? 0 : 6 + i * 4}px)`
        ctx.fill()
        ctx.restore()
      })

      ctx.filter = 'none'
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1

      if (!reduced) rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [size, state, reduced])

  const scaleAnim =
    state === 'speaking' ? [1, 1.06, 1] :
    state === 'listening' ? [1, 1.03, 1] :
    state === 'thinking' ? [1, 1.015, 1] :
    [1, 1.01, 1]

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
        outline: 'none',
      }}
    >
      {/* Outer halo bloom */}
      <motion.div
        animate={reduced ? undefined : { scale: scaleAnim, opacity: [0.55, 0.78, 0.55] }}
        transition={reduced ? undefined : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: -size * 0.32,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(207,95,145,0.45) 0%, rgba(227,141,90,0.32) 30%, rgba(139,107,181,0.22) 55%, transparent 75%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* Conic rim — rotates slowly */}
      <motion.div
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? undefined : { duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: -2,
          borderRadius: '50%',
          background:
            'conic-gradient(from 0deg, #e38d5a, #cf5f91, #8b6bb5, #3f8874, #e38d5a)',
          filter: 'blur(0.4px)',
          opacity: 0.92,
          pointerEvents: 'none',
        }}
      />

      {/* Glass dome — frosted background */}
      <div
        style={{
          position: 'absolute', inset: 3,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), rgba(255,255,255,0.20) 28%, rgba(20,18,28,0.30) 65%, rgba(20,18,28,0.45) 100%)',
          boxShadow:
            'inset 0 6px 24px rgba(255,255,255,0.35), inset 0 -10px 40px rgba(20,18,28,0.35)',
          overflow: 'hidden',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Wave canvas inside the dome */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            mixBlendMode: 'screen',
          }}
        />

        {/* Specular highlight */}
        <div
          style={{
            position: 'absolute',
            top: '12%', left: '20%',
            width: '34%', height: '24%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)',
            filter: 'blur(2px)',
            pointerEvents: 'none',
          }}
        />

        {/* State pill at the bottom */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 16,
            transform: 'translateX(-50%)',
            padding: '5px 12px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.28)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            textShadow: '0 1px 3px rgba(0,0,0,0.35)',
          }}
        >
          <motion.span
            animate={reduced ? undefined : { opacity: [0.5, 1, 0.5] }}
            transition={reduced ? undefined : { duration: 1.4, repeat: Infinity }}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background:
                state === 'listening' ? '#7cf3a2' :
                state === 'speaking' ? '#fbd06b' :
                state === 'thinking' ? '#b69cff' : '#ffffff',
              boxShadow: '0 0 8px currentColor',
            }}
          />
          {state}
        </div>
      </div>

      {/* Floating particles when speaking */}
      {!reduced && (state === 'speaking' || state === 'listening') &&
        Array.from({ length: 8 }).map((_, i) => (
          <motion.span
            key={i}
            initial={{
              x: 0, y: 0,
              opacity: 0,
              scale: 0.4,
            }}
            animate={{
              x: Math.cos((i / 8) * Math.PI * 2) * size * 0.7,
              y: Math.sin((i / 8) * Math.PI * 2) * size * 0.7,
              opacity: [0, 0.9, 0],
              scale: [0.4, 1, 0.6],
            }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              ease: 'easeOut',
              delay: i * 0.18,
            }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 6, height: 6,
              borderRadius: '50%',
              background:
                i % 3 === 0 ? '#cf5f91' :
                i % 3 === 1 ? '#e38d5a' : '#8b6bb5',
              boxShadow: '0 0 10px currentColor',
              pointerEvents: 'none',
            }}
          />
        ))
      }
    </button>
  )
}
