import { useEffect, useRef } from 'react'

interface Blob {
  x: number
  y: number
  r: number
  color: string
  ax: number
  ay: number
  px: number
  py: number
  speed: number
}

interface Props {
  palette?: string[]
  blur?: number
  opacity?: number
  speed?: number
}

const DEFAULT_PALETTE = [
  'rgba(207, 95, 145, 0.95)',
  'rgba(227, 141, 90, 0.92)',
  'rgba(139, 107, 181, 0.88)',
  'rgba(199, 166, 106, 0.85)',
  'rgba(63, 136, 116, 0.78)',
  'rgba(255, 186, 200, 0.85)',
]

export default function AnimatedMeshGradient({
  palette = DEFAULT_PALETTE,
  blur = 90,
  opacity = 0.85,
  speed = 1,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const blobsRef = useRef<Blob[]>([])
  const reducedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const w = parent.offsetWidth
      const h = parent.offsetHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      blobsRef.current = palette.map((color, i) => {
        const seed = i * 1.7
        return {
          x: w * (0.2 + 0.6 * Math.random()),
          y: h * (0.2 + 0.6 * Math.random()),
          r: Math.max(w, h) * (0.32 + 0.18 * Math.random()),
          color,
          ax: w * (0.18 + 0.32 * Math.random()),
          ay: h * (0.22 + 0.34 * Math.random()),
          px: Math.random() * Math.PI * 2 + seed,
          py: Math.random() * Math.PI * 2 + seed * 0.7,
          speed: 0.00012 + Math.random() * 0.00018,
        }
      })
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mql.matches
    const onReduced = () => { reducedRef.current = mql.matches }
    mql.addEventListener?.('change', onReduced)

    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const start = performance.now()

    const render = (now: number) => {
      const t = (now - start) * speed
      const w = canvas.width / dpr
      const h = canvas.height / dpr

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#fffaf4'
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = opacity

      for (const b of blobsRef.current) {
        const phase = reducedRef.current ? 0 : t * b.speed
        const cx = b.x + Math.sin(phase + b.px) * b.ax * 0.5
        const cy = b.y + Math.cos(phase * 1.13 + b.py) * b.ay * 0.5

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r)
        grad.addColorStop(0, b.color)
        grad.addColorStop(0.55, b.color.replace(/[\d.]+\)$/, '0.22)'))
        grad.addColorStop(1, b.color.replace(/[\d.]+\)$/, '0)'))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, b.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1

      if (!reducedRef.current) {
        rafRef.current = requestAnimationFrame(render)
      }
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      mql.removeEventListener?.('change', onReduced)
    }
  }, [palette, opacity, speed])

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          filter: `blur(${blur}px) saturate(1.15)`,
          transform: 'scale(1.15)',
          transformOrigin: 'center',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% 0%, rgba(255,250,244,0) 40%, rgba(255,250,244,0.55) 100%)',
        }}
      />
    </div>
  )
}
