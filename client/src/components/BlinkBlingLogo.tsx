import { useEffect, useId } from 'react'

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
  sm: { mark: 32, text: '1.05rem', gap: 10 },
  md: { mark: 42, text: '1.35rem', gap: 12 },
  lg: { mark: 64, text: '2rem', gap: 16 },
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

  if (variant === 'hero') {
    return (
      <main className={`bb-brand-logo bb-brand-logo--hero${className ? ` ${className}` : ''}`} style={style}>
        <Decor animate={animate} />
        <Wordmark hero />
        <Decor animate={animate} />
      </main>
    )
  }

  if (variant === 'wordmark') {
    return <Wordmark className={className} style={{ fontSize: SIZE[size].text, ...style }} />
  }

  if (variant === 'mark') {
    return <StarMark sizePx={SIZE[size].mark} animate={animate} className={className} style={style} />
  }

  return (
    <span
      className={`bb-brand-lockup${className ? ` ${className}` : ''}`}
      style={{ gap: SIZE[size].gap, ...style }}
    >
      <StarMark sizePx={SIZE[size].mark} animate={animate} />
      <Wordmark style={{ fontSize: SIZE[size].text }} />
    </span>
  )
}

function Wordmark({ hero = false, className, style }: { hero?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`${hero ? 'bb-brand-wordmark bb-brand-wordmark--hero' : 'bb-brand-wordmark'}${className ? ` ${className}` : ''}`}
      style={style}
    >
      Blink <span className="bb-brand-amp">&amp;</span> Bling
    </span>
  )
}

function Decor({ animate }: { animate: boolean }) {
  return (
    <div className="bb-brand-decor" aria-hidden="true">
      <span className="bb-brand-line" />
      <StarMark sizePx={68} animate={animate} glow />
      <span className="bb-brand-line" />
    </div>
  )
}

function StarMark({
  sizePx,
  animate,
  glow = false,
  className,
  style,
}: {
  sizePx: number
  animate: boolean
  glow?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const id = useId().replace(/:/g, '')
  const inner = Math.round(sizePx * 0.9)

  return (
    <span
      className={`${glow ? 'bb-brand-star-wrap bb-brand-star-wrap--glow' : 'bb-brand-star-wrap'}${className ? ` ${className}` : ''}`}
      style={{ width: sizePx, height: sizePx, ...style }}
    >
      <svg
        className={animate ? 'bb-brand-star bb-brand-star--animate' : 'bb-brand-star'}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ width: inner, height: inner }}
      >
        <defs>
          <radialGradient id={`goldStar${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7bd" />
            <stop offset="25%" stopColor="#f4d56d" />
            <stop offset="48%" stopColor="#bd8628" />
            <stop offset="72%" stopColor="#8b6218" />
            <stop offset="100%" stopColor="#5f410e" />
          </radialGradient>
        </defs>
        <path
          d="M50 2 C55 34 66 45 98 50 C66 55 55 66 50 98 C45 66 34 55 2 50 C34 45 45 34 50 2Z"
          fill={`url(#goldStar${id})`}
        />
      </svg>
    </span>
  )
}
