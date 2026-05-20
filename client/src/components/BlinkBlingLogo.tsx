import { useEffect } from 'react'

type LogoVariant = 'mark' | 'wordmark' | 'lockup' | 'hero'
type LogoSize = 'sm' | 'md' | 'lg'

interface BlinkBlingLogoProps {
  variant?: LogoVariant
  size?: LogoSize
  animate?: boolean
  onDone?: () => void
  className?: string
  style?: React.CSSProperties
}

const SIZE = {
  sm: { mark: 32, full: 96,  text: '1.05rem', gap: 10 },
  md: { mark: 44, full: 130, text: '1.35rem', gap: 12 },
  lg: { mark: 64, full: 200, text: '2rem',    gap: 16 },
}

export default function BlinkBlingLogo({
  variant = 'lockup',
  size = 'md',
  animate = true,
  onDone,
  className,
  style,
}: BlinkBlingLogoProps) {
  useEffect(() => {
    if (!onDone) return
    const timer = window.setTimeout(onDone, 3200)
    return () => window.clearTimeout(timer)
  }, [onDone])

  // ── Hero: full logo large, centred ────────────────────────────────────────
  if (variant === 'hero') {
    return (
      <div
        className={`bb-brand-logo bb-brand-logo--hero${className ? ` ${className}` : ''}`}
        style={style}
      >
        <img src="/bb-logo.svg" alt="Blink & Bling" style={{ width: 280, height: 'auto', display: 'block' }} />
      </div>
    )
  }

  // ── Wordmark: brand name text only (no image duplication) ─────────────────
  if (variant === 'wordmark') {
    return (
      <span
        className={`bb-brand-wordmark${className ? ` ${className}` : ''}`}
        style={{ fontSize: SIZE[size].text, ...style }}
      >
        Blink <span className="bb-brand-amp">&amp;</span> Bling
      </span>
    )
  }

  // ── Mark: emblem-only SVG (crown + BB monogram + gem) ─────────────────────
  if (variant === 'mark') {
    const sz = SIZE[size].mark
    return (
      <img
        src="/bb-mark.svg"
        alt=""
        aria-hidden="true"
        className={className}
        style={{ width: sz, height: sz, display: 'block', flexShrink: 0, ...style }}
      />
    )
  }

  // ── Lockup: full logo image (mark + wordmark combined) ────────────────────
  return (
    <span
      className={`bb-brand-lockup${className ? ` ${className}` : ''}`}
      style={{ gap: SIZE[size].gap, ...style }}
    >
      <img
        src="/bb-logo.svg"
        alt="Blink & Bling"
        style={{ height: SIZE[size].full, width: 'auto', display: 'block' }}
      />
    </span>
  )
}
