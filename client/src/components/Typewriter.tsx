import { useEffect, useState, ReactNode } from 'react'

interface Segment {
  text: string
  className?: string
  glow?: boolean
  breakBefore?: boolean
  style?: React.CSSProperties
}

interface Props {
  segments: Segment[]
  speed?: number
  startDelay?: number
  cursor?: boolean
  onDone?: () => void
}

export default function Typewriter({
  segments,
  speed = 55,
  startDelay = 250,
  cursor = true,
  onDone,
}: Props) {
  const total = segments.reduce((n, s) => n + s.text.length, 0)
  const [count, setCount] = useState(0)
  const [done, setDone] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mql.matches)
  }, [])

  useEffect(() => {
    if (reduced) {
      setCount(total)
      setDone(true)
      onDone?.()
      return
    }
    let cancelled = false
    let i = 0
    const tick = () => {
      if (cancelled) return
      i += 1
      setCount(i)
      if (i >= total) {
        setDone(true)
        onDone?.()
        return
      }
      const ch = charAt(segments, i - 1)
      const delay =
        ch === ' ' ? speed * 0.6 :
        /[.,;]/.test(ch) ? speed * 6 :
        speed + (Math.random() * 30 - 15)
      window.setTimeout(tick, Math.max(20, delay))
    }
    const initial = window.setTimeout(tick, startDelay)
    return () => {
      cancelled = true
      window.clearTimeout(initial)
    }
  }, [total, speed, startDelay, reduced])

  const nodes: ReactNode[] = []
  let used = 0
  segments.forEach((seg, idx) => {
    const remaining = Math.max(0, count - used)
    const slice = seg.text.slice(0, Math.min(seg.text.length, remaining))
    used += seg.text.length
    if (seg.breakBefore) nodes.push(<br key={`br-${idx}`} />)
    if (!slice) return
    const baseStyle: React.CSSProperties = seg.glow
      ? {
          textShadow:
            '0 0 18px rgba(207,95,145,0.55), 0 0 38px rgba(227,141,90,0.35), 0 0 70px rgba(139,107,181,0.28)',
        }
      : {}
    const style = { ...baseStyle, ...(seg.style || {}) }
    nodes.push(
      <span key={idx} className={seg.className} style={style}>
        {slice}
      </span>
    )
  })

  return (
    <span>
      {nodes}
      {cursor && !done && (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: '0.08em',
            height: '0.85em',
            marginLeft: '0.06em',
            verticalAlign: '-0.08em',
            background:
              'linear-gradient(180deg, var(--bb-rose), var(--bb-coral))',
            borderRadius: 2,
            boxShadow:
              '0 0 12px rgba(207,95,145,0.7), 0 0 24px rgba(227,141,90,0.45)',
            animation: 'bb-caret-blink 0.9s steps(2,end) infinite',
          }}
        />
      )}
    </span>
  )
}

function charAt(segments: Segment[], idx: number) {
  let i = idx
  for (const s of segments) {
    if (i < s.text.length) return s.text[i]
    i -= s.text.length
  }
  return ''
}
