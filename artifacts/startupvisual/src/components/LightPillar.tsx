interface Props {
  variant?: 'soft' | 'aurora'
}
export default function LightPillar({ variant = 'soft' }: Props) {
  if (variant === 'aurora') {
    return (
      <div className="bb-aurora" aria-hidden>
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
        <span className="a4" />
      </div>
    )
  }
  return (
    <div className="bb-light-pillar" aria-hidden>
      <span />
    </div>
  )
}
