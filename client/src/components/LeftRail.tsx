import {
  LayoutDashboard, Circle, Diamond, Sparkles, Layers, Disc3, Type,
  Settings as SettingsIcon, Gem, Sparkle, AlignHorizontalDistributeCenter,
  Grip, Scan, Brush, Heart, Watch, Image,
} from "lucide-react";
import { useUIStore, type Section } from "@/store/ui";
import { useRecipeStore } from "@/store/recipe";
import { cn } from "@/lib/utils";

type SectionMeta = { label: string; icon: React.ComponentType<{ className?: string }> };

const META: Partial<Record<Section, SectionMeta>> = {
  dashboard:    { label: "Dashboard",    icon: LayoutDashboard },
  ring:         { label: "Ring",         icon: Circle },
  centerStone:  { label: "Stone",        icon: Diamond },
  sideStones:   { label: "Halo",         icon: Sparkles },
  galleryRails: { label: "Gallery",      icon: Layers },
  bandDetails:  { label: "Band",         icon: Disc3 },
  pave:         { label: "Pavé",         icon: Sparkle },
  eternity:     { label: "Eternity",     icon: AlignHorizontalDistributeCenter },
  threeStone:   { label: "3-Stone",      icon: Gem },
  milgrain:     { label: "Milgrain",     icon: Grip },
  filigree:     { label: "Filigree",     icon: Scan },
  finish:       { label: "Finish",       icon: Brush },
  engraving:    { label: "Engraving",    icon: Type },
  pendant:      { label: "Pendant",      icon: Heart },
  earring:      { label: "Earring",      icon: Gem },
  bangle:       { label: "Bangle",       icon: Watch },
  settings:     { label: "Render",       icon: SettingsIcon },
  image2cad:    { label: "Img→CAD",      icon: Image },
};

const SECTIONS_BY_CATEGORY: Record<string, Section[]> = {
  ring:           ["dashboard", "ring", "centerStone", "sideStones", "galleryRails", "bandDetails", "pave", "eternity", "threeStone", "milgrain", "filigree", "finish", "engraving", "settings", "image2cad"],
  pendant:        ["dashboard", "pendant", "settings", "image2cad"],
  "earring-stud": ["dashboard", "earring", "settings", "image2cad"],
  "earring-hoop": ["dashboard", "earring", "settings", "image2cad"],
  bangle:         ["dashboard", "bangle", "settings", "image2cad"],
};

export function LeftRail() {
  const section = useUIStore((s) => s.section);
  const setSection = useUIStore((s) => s.setSection);
  const category = useRecipeStore((s) => s.recipe.jewelryCategory);
  const sections = SECTIONS_BY_CATEGORY[category] ?? SECTIONS_BY_CATEGORY["ring"]!;

  return (
    <nav
      className="flex h-full w-[68px] shrink-0 flex-col items-center gap-0.5 overflow-y-auto overflow-x-hidden border-r border-[#A8A8A8] bg-[#F0F0F0] py-2"
      style={{ scrollbarWidth: "none" }}
      data-testid="left-rail"
    >
      {sections.map((id, idx) => {
        const meta = META[id];
        if (!meta) return null;
        const Icon = meta.icon;
        const active = section === id;
        const isDivider = id === "settings" || id === "image2cad";
        return (
          <div key={id} className={cn("w-full flex flex-col items-center", isDivider && idx > 0 && "mt-auto")}>
            {isDivider && idx > 0 && (
              <div className="mb-0.5 w-10 border-t border-[#C8C8C8]" />
            )}
            <button
              onClick={() => setSection(id)}
              data-testid={`rail-${id}`}
              title={meta.label}
              className={cn(
                "group flex w-[58px] flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-all",
                active
                  ? "bg-[#CCE4FF] text-[#0066CC] shadow-[inset_0_0_0_1px_rgba(0,102,204,0.25)]"
                  : "text-zinc-500 hover:bg-[#FFFFFF] hover:text-zinc-700",
              )}
            >
              <Icon className={cn("h-[17px] w-[17px]", active && "drop-shadow-[0_0_5px_rgba(0,102,204,0.45)]")} />
              <span className="text-center text-[8.5px] leading-tight tracking-wide">
                {meta.label.split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
