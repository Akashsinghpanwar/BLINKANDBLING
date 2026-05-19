interface Props {
  variant: 'left' | 'right'
  style?: React.CSSProperties
}

// Soft watercolor-style decorative SVG. Inspired by rubykinglet.ai's flanking illustrations.
export default function WatercolorBlob({ variant, style }: Props) {
  if (variant === 'left') {
    return (
      <svg
        className="bb-watercolor"
        style={{ left: -80, top: 60, width: 360, height: 480, ...style }}
        viewBox="0 0 360 480"
        aria-hidden
      >
        <defs>
          <radialGradient id="wcL1" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#cf5f91" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#e38d5a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wcL2" cx="50%" cy="60%" r="55%">
            <stop offset="0%" stopColor="#8b6bb5" stopOpacity="0.35" />
            <stop offset="80%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M40 80 C 100 20, 280 30, 320 140 C 360 250, 280 380, 180 420 C 80 460, 0 360, 20 250 C 30 180, 0 130, 40 80 Z" fill="url(#wcL1)" />
        <path d="M70 200 C 150 160, 240 200, 260 290 C 270 360, 170 400, 120 350 C 70 300, 30 240, 70 200 Z" fill="url(#wcL2)" />
        {/* Subtle ring sketch outlines */}
        <g stroke="#8b6bb5" strokeWidth="1.2" fill="none" opacity="0.45">
          <ellipse cx="120" cy="180" rx="36" ry="42" transform="rotate(-12 120 180)" />
          <circle cx="120" cy="160" r="6" />
          <ellipse cx="200" cy="280" rx="44" ry="50" transform="rotate(8 200 280)" />
          <circle cx="200" cy="252" r="8" />
          <path d="M70 360 Q 110 340 150 360 T 230 350" />
        </g>
      </svg>
    )
  }

  return (
    <svg
      className="bb-watercolor"
      style={{ right: -60, top: 100, width: 340, height: 460, ...style }}
      viewBox="0 0 340 460"
      aria-hidden
    >
      <defs>
        <radialGradient id="wcR1" cx="55%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e38d5a" stopOpacity="0.42" />
          <stop offset="65%" stopColor="#cf5f91" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wcR2" cx="40%" cy="65%" r="55%">
          <stop offset="0%" stopColor="#3f8874" stopOpacity="0.32" />
          <stop offset="80%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M40 90 C 130 20, 280 50, 310 160 C 340 270, 280 380, 170 420 C 60 460, 10 350, 30 240 C 40 180, 10 130, 40 90 Z" fill="url(#wcR1)" />
      <path d="M80 230 C 160 180, 250 210, 270 300 C 280 370, 180 410, 130 360 C 80 310, 40 270, 80 230 Z" fill="url(#wcR2)" />
      <g stroke="#cf5f91" strokeWidth="1.2" fill="none" opacity="0.5">
        <path d="M130 130 q 30 -20 70 0 t 70 10" />
        <ellipse cx="180" cy="220" rx="42" ry="48" />
        <circle cx="180" cy="195" r="9" />
        <path d="M120 320 q 40 30 90 10 t 80 -20" />
        <path d="M220 360 l 12 -16 l 12 16 l -12 16 z" />
      </g>
    </svg>
  )
}
