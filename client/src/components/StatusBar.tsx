import { useEffect, useState } from "react";
import { useUIStore } from "@/store/ui";
import { Circle } from "lucide-react";

export function StatusBar() {
  const autoSave = useUIStore((s) => s.autoSave);
  const [stats, setStats] = useState({ polys: 0, verts: 0, building: false, ready: false });

  useEffect(() => {
    const t = setInterval(() => {
      const b = (window as unknown as {
        __ringBuilder?: {
          result: {
            metalGeom?: { index?: { count: number }; attributes?: { position?: { count: number } } };
            stoneGeom?: { index?: { count: number }; attributes?: { position?: { count: number } } };
            haloGeom?: { index?: { count: number }; attributes?: { position?: { count: number } } } | null;
          } | null;
          building: boolean;
          kernelReady: boolean;
        };
      }).__ringBuilder;
      if (!b) return;
      const r = b.result;
      const polys =
        ((r?.metalGeom?.index?.count ?? 0) +
          (r?.stoneGeom?.index?.count ?? 0) +
          (r?.haloGeom?.index?.count ?? 0)) / 3;
      const verts =
        (r?.metalGeom?.attributes?.position?.count ?? 0) +
        (r?.stoneGeom?.attributes?.position?.count ?? 0) +
        (r?.haloGeom?.attributes?.position?.count ?? 0);
      setStats({
        polys: Math.round(polys),
        verts,
        building: b.building,
        ready: b.kernelReady,
      });
    }, 500);
    return () => clearInterval(t);
  }, []);

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[#A8A8A8] bg-[#F0F0F0] px-4 text-[11px] text-zinc-500" data-testid="status-bar">
      <div className="flex items-center gap-5 font-mono">
        <span>Polys: <span className="text-zinc-700">{stats.polys.toLocaleString()}</span></span>
        <span>Verts: <span className="text-zinc-700">{stats.verts.toLocaleString()}</span></span>
        <span>Units: <span className="text-zinc-700">Millimeters</span></span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Circle className={`h-2 w-2 fill-current ${stats.building ? "animate-pulse text-amber-700" : stats.ready ? "text-emerald-700" : "text-zinc-400"}`} />
          <span className="text-zinc-400">{stats.building ? "Building" : stats.ready ? "B-Rep ready" : "Loading"}</span>
        </span>
        <span className="text-zinc-400">Auto Save: <span className={autoSave ? "text-emerald-700" : "text-zinc-500"}>{autoSave ? "On" : "Off"}</span></span>
      </div>
    </footer>
  );
}
