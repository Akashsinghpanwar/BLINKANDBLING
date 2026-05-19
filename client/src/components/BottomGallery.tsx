import { useRecipeStore } from "@/store/recipe";
import { useUIStore } from "@/store/ui";
import { presetsByCategory, type Preset } from "@/lib/presets";
import { cn } from "@/lib/utils";
import { Diamond, Gem, Sparkles, Layers, Disc3, Triangle, Square } from "lucide-react";

const TABS: { id: Preset["category"]; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "Gallery", icon: Gem },
  { id: "Prongs", icon: Triangle },
  { id: "Settings", icon: Diamond },
  { id: "Head", icon: Diamond },
  { id: "Shoulders", icon: Sparkles },
  { id: "Under Gallery", icon: Layers },
  { id: "Band", icon: Disc3 },
];

// Each preset gets a small distinct vector glyph instead of an identical ring icon,
// so users can scan the gallery row visually like in pro CAD tools.
function PresetGlyph({ id, category }: { id: string; category: Preset["category"] }) {
  const gradId = `pg-${id}`;
  const grad = (
    <defs>
      <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#1A7DD8" />
        <stop offset="100%" stopColor="#7a6320" />
      </linearGradient>
    </defs>
  );

  // Choose glyph based on preset id, fallback by category
  switch (id) {
    case "solitaire":
      return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <ellipse cx="30" cy="40" rx="16" ry="16" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <polygon points="30,16 36,26 30,34 24,26" fill={`url(#${gradId})`} stroke="#fff5cc" strokeWidth="0.4" />
        </svg>
      );
    case "cathedral":
      return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <path d="M14 50 Q14 30 30 26 Q46 30 46 50" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <ellipse cx="30" cy="42" rx="16" ry="10" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.4" opacity="0.5" />
          <polygon points="30,16 36,24 30,32 24,24" fill={`url(#${gradId})`} />
        </svg>
      );
    case "basket":
      return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <ellipse cx="30" cy="40" rx="16" ry="16" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" />
          <line x1="18" y1="30" x2="22" y2="42" stroke={`url(#${gradId})`} strokeWidth="1.2" />
          <line x1="42" y1="30" x2="38" y2="42" stroke={`url(#${gradId})`} strokeWidth="1.2" />
          <line x1="30" y1="24" x2="30" y2="42" stroke={`url(#${gradId})`} strokeWidth="1.2" />
          <polygon points="30,18 36,26 30,32 24,26" fill={`url(#${gradId})`} />
        </svg>
      );
    case "pegHead":
      return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <ellipse cx="30" cy="42" rx="14" ry="14" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" />
          <rect x="28" y="20" width="4" height="12" fill={`url(#${gradId})`} />
          <polygon points="22,20 38,20 30,12" fill={`url(#${gradId})`} />
        </svg>
      );
    case "flushFit":
      return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <ellipse cx="30" cy="34" rx="18" ry="18" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <circle cx="30" cy="34" r="6" fill={`url(#${gradId})`} stroke="#fff5cc" strokeWidth="0.5" />
        </svg>
      );
    case "tension":
      return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <path d="M14 38 Q22 18 30 30 Q38 42 46 22" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <polygon points="30,24 36,30 30,36 24,30" fill={`url(#${gradId})`} />
        </svg>
      );
    default:
      // Generic glyph by category
      if (category === "Prongs") return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <circle cx="30" cy="34" r="10" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.4" opacity="0.6" />
          <line x1="30" y1="14" x2="30" y2="24" stroke={`url(#${gradId})`} strokeWidth="2" />
          <line x1="14" y1="34" x2="22" y2="34" stroke={`url(#${gradId})`} strokeWidth="2" />
          <line x1="38" y1="34" x2="46" y2="34" stroke={`url(#${gradId})`} strokeWidth="2" />
          <line x1="30" y1="44" x2="30" y2="54" stroke={`url(#${gradId})`} strokeWidth="2" />
        </svg>
      );
      if (category === "Band") return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <ellipse cx="30" cy="30" rx="22" ry="6" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <ellipse cx="30" cy="30" rx="14" ry="3" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.2" opacity="0.5" />
        </svg>
      );
      if (category === "Head" || category === "Settings") return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <polygon points="30,12 46,28 30,48 14,28" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" />
          <polygon points="30,20 38,28 30,40 22,28" fill={`url(#${gradId})`} opacity="0.7" />
        </svg>
      );
      if (category === "Shoulders") return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <path d="M10 44 Q22 28 30 32 Q38 36 50 20" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <circle cx="22" cy="32" r="1.6" fill={`url(#${gradId})`} />
          <circle cx="30" cy="32" r="1.6" fill={`url(#${gradId})`} />
          <circle cx="38" cy="30" r="1.6" fill={`url(#${gradId})`} />
        </svg>
      );
      return (
        <svg viewBox="0 0 60 60" className="h-12 w-12">{grad}
          <ellipse cx="30" cy="36" rx="18" ry="18" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" />
          <polygon points="30,16 36,26 30,32 24,26" fill={`url(#${gradId})`} />
        </svg>
      );
  }
}

function PresetThumb({ preset, onClick }: { preset: Preset; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-testid={`preset-${preset.id}`}
      className="group flex w-[78px] shrink-0 flex-col items-center gap-1 rounded-md border border-[#B8B8B8] bg-[#ECECEC] p-1.5 transition-all hover:border-[#0066CC]/50 hover:bg-[#CCE4FF]"
    >
      <div className="flex h-[54px] w-full items-center justify-center overflow-hidden rounded bg-gradient-to-b from-[#F0F0F0] to-[#E0E0E0]">
        <PresetGlyph id={preset.id} category={preset.category} />
      </div>
      <span className="w-full truncate text-center text-[10px] font-medium text-zinc-700 group-hover:text-[#1A7DD8]">{preset.name}</span>
    </button>
  );
}

export function BottomGallery() {
  const update = useRecipeStore((s) => s.update);
  const tab = useUIStore((s) => s.galleryTab);
  const setTab = useUIStore((s) => s.setGalleryTab);
  const items = presetsByCategory(tab);

  return (
    <div className="flex h-[124px] shrink-0 flex-col border-t border-[#B8B8B8] bg-[#EAEAEA]" data-testid="bottom-gallery">
      <div className="flex items-center gap-1 border-b border-[#B8B8B8] px-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`gallery-tab-${t.id}`}
              className={cn(
                "relative flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              <Icon className={cn("h-3 w-3", active ? "text-[#0066CC]" : "text-zinc-400")} />
              {t.id}
              {active && <span className="absolute inset-x-1.5 -bottom-px h-0.5 bg-[#0066CC]" />}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full items-center gap-1.5 px-3">
          {items.length === 0 && (
            <div className="px-2 text-[11px] text-zinc-400 italic">No presets in this category yet</div>
          )}
          {items.map((p) => (
            <PresetThumb
              key={p.id}
              preset={p}
              onClick={() => { update((d) => p.apply(d)); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
