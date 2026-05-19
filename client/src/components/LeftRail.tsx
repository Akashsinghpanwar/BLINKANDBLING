import { LayoutDashboard, Circle, Diamond, Sparkles, Layers, Disc3, Type, Settings as SettingsIcon } from "lucide-react";
import { useUIStore, type Section } from "@/store/ui";
import { cn } from "@/lib/utils";

const ITEMS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "ring", label: "Ring", icon: Circle },
  { id: "centerStone", label: "Center Stone", icon: Diamond },
  { id: "sideStones", label: "Side Stones", icon: Sparkles },
  { id: "galleryRails", label: "Gallery Rails", icon: Layers },
  { id: "bandDetails", label: "Band Details", icon: Disc3 },
  { id: "engraving", label: "Engraving", icon: Type },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function LeftRail() {
  const section = useUIStore((s) => s.section);
  const setSection = useUIStore((s) => s.setSection);

  return (
    <nav className="flex h-full w-[68px] shrink-0 flex-col items-center gap-1 border-r border-[#A8A8A8] bg-[#F0F0F0] py-2" data-testid="left-rail">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const active = section === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setSection(it.id)}
            data-testid={`rail-${it.id}`}
            className={cn(
              "group flex w-[58px] flex-col items-center gap-1 rounded-md px-1 py-2 transition-all",
              active
                ? "bg-[#CCE4FF] text-[#0066CC] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]"
                : "text-zinc-500 hover:bg-[#FFFFFF] hover:text-zinc-700",
            )}
            title={it.label}
          >
            <Icon className={cn("h-[18px] w-[18px]", active && "drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]")} />
            <span className="text-[9px] leading-tight tracking-wide">
              {it.label.split(" ").map((w, i) => (
                <span key={i} className="block">{w}</span>
              ))}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
