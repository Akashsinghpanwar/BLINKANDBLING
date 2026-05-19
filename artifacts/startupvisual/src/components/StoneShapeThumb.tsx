import type { StoneShape } from "@/store/recipe";
import { cn } from "@/lib/utils";

interface Props {
  shape: StoneShape;
  active?: boolean;
  onClick?: () => void;
  size?: number;
}

// Each shape rendered as a tiny SVG top-down brilliant pattern.
function paths(shape: StoneShape): { outline: string; star: string[] } {
  const c = 24, r = 18;
  switch (shape) {
    case "round-brilliant": {
      const star = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return `M${c},${c} L${c + Math.cos(a) * r},${c + Math.sin(a) * r}`;
      });
      return { outline: `M ${c} ${c - r} a ${r} ${r} 0 1 1 0 ${r * 2} a ${r} ${r} 0 1 1 0 -${r * 2}`, star };
    }
    case "oval": {
      const ry = r, rx = r * 0.72;
      const star = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return `M${c},${c} L${c + Math.cos(a) * rx},${c + Math.sin(a) * ry}`;
      });
      return { outline: `M ${c} ${c - ry} a ${rx} ${ry} 0 1 1 0 ${ry * 2} a ${rx} ${ry} 0 1 1 0 -${ry * 2}`, star };
    }
    case "pear": {
      return {
        outline: `M${c},${c - r} C${c + 14},${c - 8} ${c + 12},${c + 14} ${c},${c + r} C${c - 12},${c + 14} ${c - 14},${c - 8} ${c},${c - r} Z`,
        star: [`M${c},${c - r} L${c},${c + r}`, `M${c - 8},${c + 4} L${c + 8},${c + 4}`, `M${c - 6},${c - 6} L${c + 6},${c - 6}`],
      };
    }
    case "princess": {
      const s = r * 0.95;
      return {
        outline: `M${c - s},${c - s} L${c + s},${c - s} L${c + s},${c + s} L${c - s},${c + s} Z`,
        star: [`M${c - s},${c - s} L${c + s},${c + s}`, `M${c + s},${c - s} L${c - s},${c + s}`, `M${c},${c - s} L${c},${c + s}`, `M${c - s},${c} L${c + s},${c}`],
      };
    }
    case "emerald": {
      const w = r * 0.78, h = r * 1.05, cc = 4;
      return {
        outline: `M${c - w + cc},${c - h} L${c + w - cc},${c - h} L${c + w},${c - h + cc} L${c + w},${c + h - cc} L${c + w - cc},${c + h} L${c - w + cc},${c + h} L${c - w},${c + h - cc} L${c - w},${c - h + cc} Z`,
        star: [`M${c - w + 4},${c - h + 4} L${c + w - 4},${c - h + 4}`, `M${c - w + 4},${c + h - 4} L${c + w - 4},${c + h - 4}`, `M${c - w + 4},${c - h + 4} L${c - w + 4},${c + h - 4}`, `M${c + w - 4},${c - h + 4} L${c + w - 4},${c + h - 4}`],
      };
    }
    case "cushion": {
      const s = r * 0.92;
      return {
        outline: `M${c - s + 4},${c - s} L${c + s - 4},${c - s} Q${c + s},${c - s} ${c + s},${c - s + 4} L${c + s},${c + s - 4} Q${c + s},${c + s} ${c + s - 4},${c + s} L${c - s + 4},${c + s} Q${c - s},${c + s} ${c - s},${c + s - 4} L${c - s},${c - s + 4} Q${c - s},${c - s} ${c - s + 4},${c - s} Z`,
        star: Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return `M${c},${c} L${c + Math.cos(a) * s * 0.88},${c + Math.sin(a) * s * 0.88}`;
        }),
      };
    }
    case "marquise": {
      return {
        outline: `M${c},${c - r} Q${c + 14},${c} ${c},${c + r} Q${c - 14},${c} ${c},${c - r} Z`,
        star: [`M${c},${c - r} L${c},${c + r}`, `M${c - 10},${c} L${c + 10},${c}`, `M${c - 6},${c - 4} L${c + 6},${c + 4}`],
      };
    }
  }
}

export function StoneShapeThumb({ shape, active, onClick, size = 48 }: Props) {
  const { outline, star } = paths(shape);
  return (
    <button
      onClick={onClick}
      data-testid={`stone-thumb-${shape}`}
      title={shape.replace("-", " ")}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-md border bg-[#F0F0F0] p-1.5 transition-all",
        active
          ? "border-[#0066CC] shadow-[0_0_0_1px_rgba(212,175,55,0.4),0_0_14px_rgba(212,175,55,0.2)]"
          : "border-[#A8A8A8] hover:border-zinc-500",
      )}
    >
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <defs>
          <radialGradient id={`s-${shape}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#F5FBFF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#A2B5D6" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#1a1a22" stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <path d={outline} fill={`url(#s-${shape})`} stroke={active ? "#0066CC" : "#5b6066"} strokeWidth="1" />
        {star.map((d, i) => (
          <path key={i} d={d} stroke="#FFF" strokeWidth="0.4" opacity="0.55" fill="none" />
        ))}
      </svg>
      <span className={cn("text-[9px] font-medium leading-tight", active ? "text-[#0066CC]" : "text-zinc-400")}>
        {shape === "round-brilliant" ? "Round" : shape.charAt(0).toUpperCase() + shape.slice(1)}
      </span>
    </button>
  );
}
