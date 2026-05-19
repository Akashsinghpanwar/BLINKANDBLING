// BBCad logo — interlocking double-B mark with a diamond facet motif.
// The two B's share a vertical spine; a small diamond cuts through the
// center to reference jewelry CAD. Renders as inline SVG so it scales
// crisply at any size and inherits currentColor.
interface Props {
  size?: number;
  /** Show the "BBCad" wordmark to the right of the icon */
  withWordmark?: boolean;
  /** Color of the icon strokes/fills (defaults to CAD blue) */
  color?: string;
  /** Color of the diamond accent (defaults to amber) */
  accent?: string;
  className?: string;
}

export function BBLogo({
  size = 32,
  withWordmark = false,
  color = "#0066CC",
  accent = "#E89500",
  className = "",
}: Props) {
  const h = size;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={h} height={h} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="BBCad">
        {/* Outer rounded square frame */}
        <rect x="2" y="2" width="60" height="60" rx="10" fill={color} />

        {/* Twin B's — left and right, mirrored */}
        {/* Left B */}
        <path
          d="M14 14 L14 50 L26 50 C32 50 35 46.5 35 42.5 C35 39.2 33 36.6 30 35.8 C32.4 34.8 34 32.4 34 29.5 C34 25.5 31 22 25 22 L20 22 L20 14 Z M20 28 L25 28 C27.5 28 29 29.5 29 31.5 C29 33.5 27.5 35 25 35 L20 35 Z M20 40 L25.5 40 C28.2 40 30 41.5 30 43.5 C30 45.5 28.2 47 25.5 47 L20 47 Z"
          fill="#FFFFFF"
          opacity="0.95"
        />
        {/* Right B (mirrored, slightly offset to interlock) */}
        <path
          d="M50 14 L50 50 L38 50 C32 50 29 46.5 29 42.5 C29 39.2 31 36.6 34 35.8 C31.6 34.8 30 32.4 30 29.5 C30 25.5 33 22 39 22 L44 22 L44 14 Z M44 28 L39 28 C36.5 28 35 29.5 35 31.5 C35 33.5 36.5 35 39 35 L44 35 Z M44 40 L38.5 40 C35.8 40 34 41.5 34 43.5 C34 45.5 35.8 47 38.5 47 L44 47 Z"
          fill="#FFFFFF"
          opacity="0.6"
        />

        {/* Diamond facet at center — references jewelry CAD */}
        <g transform="translate(32 32)">
          <polygon points="0,-6 5,-1 0,7 -5,-1" fill={accent} stroke="#FFFFFF" strokeWidth="0.6" />
          <polygon points="0,-6 5,-1 0,-1" fill="#FFFFFF" opacity="0.45" />
        </g>
      </svg>

      {withWordmark && (
        <div className="flex flex-col leading-none">
          <span style={{ fontFamily: "Segoe UI, system-ui, sans-serif", fontWeight: 700, fontSize: h * 0.55, color, letterSpacing: "-0.02em" }}>
            BB<span style={{ color: accent }}>Cad</span>
          </span>
          <span style={{ fontFamily: "Segoe UI, system-ui, sans-serif", fontWeight: 500, fontSize: h * 0.22, color: "#5A6B7C", letterSpacing: "0.18em", marginTop: 2 }}>
            PARAMETRIC JEWELRY
          </span>
        </div>
      )}
    </div>
  );
}
