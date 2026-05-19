import { motion, useReducedMotion } from 'framer-motion'
import { wordReveal, stagger } from '../lib/motion'

interface Word {
  text: string
  color?: string
  serif?: boolean
  breakBefore?: boolean
}

interface Props {
  intro: string
  gradient: Word[]
  outro?: string
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_COLORS = ['#e38d5a', '#cf5f91', '#8b6bb5', '#3f8874']

export default function GradientHeadline({ intro, gradient, outro, className, style }: Props) {
  const reduced = useReducedMotion()

  return (
    <h1 className={`bb-display ${className ?? ''}`} style={{ lineHeight: 1.08, ...style }}>
      <span style={{ display: 'block' }}>{intro}</span>
      <motion.span
        style={{
          display: 'block',
          marginTop: '0.12em',
          lineHeight: 1.18,
        }}
        variants={stagger(0.1, 0.18)}
        initial="hidden"
        animate="visible"
      >
        {gradient.map((w, i) => {
          const isScript = !!w.serif
          return (
            <span key={i} style={{ display: 'inline' }}>
              {w.breakBefore && <span style={{ display: 'block', height: 0 }} />}
              <motion.span
                variants={reduced ? undefined : wordReveal}
                style={{
                  display: 'inline-block',
                  marginRight: '0.26em',
                  color: w.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
                  fontFamily: isScript ? "'Pinyon Script', cursive" : undefined,
                  fontSize: isScript ? '1.18em' : undefined,
                  fontStyle: isScript ? 'normal' : undefined,
                  lineHeight: isScript ? 1.05 : undefined,
                  paddingBottom: isScript ? '0.08em' : undefined,
                  verticalAlign: 'baseline',
                  willChange: 'transform, opacity, filter',
                }}
              >
                {w.text}
              </motion.span>
            </span>
          )
        })}
      </motion.span>
      {outro && (
        <span style={{ display: 'block', marginTop: '0.08em', color: 'var(--bb-ink)' }}>{outro}</span>
      )}
    </h1>
  )
}
