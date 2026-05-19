import { useMemo, useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrthoPreview } from "./OrthoPreview";
import { useRecipeStore } from "@/store/recipe";
import { METAL_SPECS } from "@/cad/metals";
import { volumeToGrams, estimateCaratsFromDiameter } from "@/cad/weight";
import { getReport } from "@/cad/validation";
import { getUSSizeFromDiameter, getUKSizeFromUS } from "@/cad/ringSize";
import { getInnerRadius } from "@/cad/shank";
import { useSpotPrices, metalPricePerGramUSD, gemPricePerCaratUSD, makingChargeUSD } from "@/lib/prices";
import { CheckCircle2, AlertTriangle, XCircle, Diamond, RadioTower } from "lucide-react";

function statusIcon(s: "ok" | "warn" | "fail") {
  if (s === "ok") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />;
  if (s === "warn") return <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />;
  return <XCircle className="h-3.5 w-3.5 text-red-700" />;
}

function FacetGraphic() {
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20">
      <defs>
        <radialGradient id="diam-r" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#E8F2FF" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#9FB6D8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1a2030" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill="url(#diam-r)" stroke="#0066CC" strokeWidth="1" />
      {/* Star facet pattern */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x2 = 50 + Math.cos(a) * 44;
        const y2 = 50 + Math.sin(a) * 44;
        return <line key={i} x1="50" y1="50" x2={x2} y2={y2} stroke="#fff" strokeWidth="0.4" opacity="0.6" />;
      })}
      <polygon points="50,18 64,40 50,62 36,40" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.7" />
      <polygon points="50,30 58,42 50,54 42,42" fill="#fff" opacity="0.25" />
    </svg>
  );
}

interface MetricsSnapshot { volumeMm3: number; surfaceMm2: number; building: boolean; }

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return "never";
  const ms = Date.now() - t;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function RightColumn() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const [metrics, setMetrics] = useState<MetricsSnapshot>({ volumeMm3: 0, surfaceMm2: 0, building: true });
  const spot = useSpotPrices();

  useEffect(() => {
    const interval = setInterval(() => {
      const b = (window as unknown as { __ringBuilder?: { result: { assembly: { meta: { metalVolumeMm3: number; metalSurfaceMm2: number } } } | null; building: boolean; kernelReady: boolean } }).__ringBuilder;
      if (!b) return;
      const meta = b.result?.assembly?.meta;
      setMetrics({
        volumeMm3: meta?.metalVolumeMm3 ?? 0,
        surfaceMm2: meta?.metalSurfaceMm2 ?? 0,
        building: b.building || !b.kernelReady,
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const innerR = getInnerRadius(recipe);
    const innerD = innerR * 2;
    const us = getUSSizeFromDiameter(innerD);
    const stoneR = recipe.centerStone.diameter / 2;

    const metalSpec = METAL_SPECS[recipe.metal];
    // Volume comes from the B-Rep build when it's been run; until then we
    // approximate it from the band geometry so pricing is still meaningful
    // before the kernel finishes the first build.
    const approxVol = (() => {
      // Rough toroidal volume: 2π·R·(width × thickness)
      const meanR = innerR + recipe.ringBase.thickness / 2;
      return 2 * Math.PI * meanR * recipe.ringBase.width * recipe.ringBase.thickness;
    })();
    const volumeForPricing = metrics.volumeMm3 > 0 ? metrics.volumeMm3 : approxVol;
    const grams = volumeToGrams(volumeForPricing, metalSpec.density);

    // LIVE METAL PRICE — derived from real-time gold/silver/platinum spot
    const livePerGram = metalPricePerGramUSD(recipe.metal, spot);
    const metalCost = grams * livePerGram;

    const carats = estimateCaratsFromDiameter(recipe.centerStone.diameter);
    const stonePerCarat = gemPricePerCaratUSD(recipe.centerStone.material, carats);
    const stoneCost = carats * stonePerCarat;

    const haloCaratsEach = recipe.halo.enabled ? estimateCaratsFromDiameter(recipe.halo.stoneSize) : 0;
    const haloCarats = haloCaratsEach * (recipe.halo.enabled ? recipe.halo.stoneCount : 0);
    const haloCost = haloCarats * gemPricePerCaratUSD("diamond", haloCaratsEach);

    // LIVE MAKING — labour scales with weight, prong count, halo complexity
    const making = makingChargeUSD(grams, recipe.prongs.count, recipe.halo.enabled);

    const total = metalCost + stoneCost + haloCost + making;
    return {
      innerD, us, ukSize: getUKSizeFromUS(us), grams,
      area: metrics.surfaceMm2, metalCost, carats, stoneCost,
      haloCarats, haloCost, total, stoneR, livePerGram, stonePerCarat, making,
    };
  }, [recipe, spot, metrics]);

  const report = useMemo(() => getReport(recipe, stats.stoneR), [recipe, stats.stoneR]);
  const checks = report.checks;
  const fmt = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <aside className="flex h-full w-[85vw] max-w-[300px] shrink-0 flex-col border-l border-[#B8B8B8] bg-[#ECECEC] shadow-xl md:w-[260px] md:shadow-none" data-testid="right-column">
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          <div className="grid grid-cols-3 gap-1.5">
            <OrthoPreview axis="top" label="Top" />
            <OrthoPreview axis="front" label="Front" />
            <OrthoPreview axis="right" label="Right" />
          </div>

          <section className="rounded-lg border border-[#A8A8A8] bg-[#F8F8F8]">
            <header className="flex items-center gap-2 border-b border-[#A8A8A8] px-3 py-2">
              <Diamond className="h-3.5 w-3.5 text-[#0066CC]" />
              <span className="text-[12px] font-semibold text-zinc-800">Center Stone</span>
            </header>
            <div className="grid grid-cols-[1fr_auto] gap-3 p-3">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Shape</span>
                  <span className="text-zinc-800 capitalize">{recipe.centerStone.shape.replace("-", " ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Size</span>
                  <input
                    type="number"
                    step="0.1"
                    min="3"
                    max="12"
                    value={recipe.centerStone.diameter.toFixed(2)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) update((d) => { d.centerStone.diameter = v; });
                    }}
                    className="w-16 rounded border border-[#A8A8A8] bg-[#F0F0F0] px-1.5 py-0.5 text-right font-mono text-zinc-800 outline-none focus:border-[#0066CC]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Carat Wt</span>
                  <span className="font-mono text-[#0066CC]">{fmt(stats.carats)} ct</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Cut</span>
                  <span className="text-zinc-800">Excellent</span>
                </div>
              </div>
              <FacetGraphic />
            </div>
          </section>

          <section className="rounded-lg border border-[#A8A8A8] bg-[#F8F8F8] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#0066CC]">B-Rep Measurements</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><div className="text-zinc-500">Inner ø</div><div className="font-mono text-zinc-900">{fmt(stats.innerD)} mm</div></div>
              <div><div className="text-zinc-500">US size</div><div className="font-mono text-zinc-900">{stats.us}</div></div>
              <div><div className="text-zinc-500">UK size</div><div className="font-mono text-zinc-900">{stats.ukSize}</div></div>
              <div><div className="text-zinc-500">Weight</div><div className="font-mono text-[#0066CC]">{fmt(stats.grams)} g</div></div>
              <div><div className="text-zinc-500">Volume</div><div className="font-mono text-zinc-900">{fmt(metrics.volumeMm3, 1)} mm³</div></div>
              <div><div className="text-zinc-500">Surface</div><div className="font-mono text-zinc-900">{fmt(stats.area, 1)} mm²</div></div>
            </div>
          </section>

          <section className="rounded-lg border border-[#A8A8A8] bg-[#F8F8F8] p-3" data-testid="manufacturing-section">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#0066CC]">Manufacturing</div>

            {/* Verdict banner — large, unmissable */}
            {(() => {
              const v = report.verdict;
              const cls =
                v === "ok"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : v === "warn"
                  ? "border-amber-500 bg-amber-50 text-amber-900"
                  : "border-red-500 bg-red-50 text-red-900";
              const icon =
                v === "ok" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                ) : v === "warn" ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-700" />
                );
              const sub =
                v === "ok"
                  ? "Casts cleanly · sets safely · ready for STEP/STL"
                  : v === "warn"
                  ? `Possible but risky in: ${report.reasons.join(", ")}`
                  : `Will fail in production: ${report.reasons.join(", ")}`;
              return (
                <div
                  data-testid="manufacturing-verdict"
                  data-verdict={v}
                  className={`mb-2 flex items-start gap-2 rounded-md border-l-4 ${cls} px-2.5 py-2`}
                >
                  {icon}
                  <div className="leading-tight">
                    <div className="text-[12px] font-bold uppercase tracking-wide">
                      {v === "ok" ? "✓ POSSIBLE" : v === "warn" ? "△ POSSIBLE — WITH CAUTION" : "✗ NOT POSSIBLE"}
                    </div>
                    <div className="text-[10px] opacity-80">{sub}</div>
                  </div>
                </div>
              );
            })()}

            <ul className="space-y-1.5">
              {checks.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {statusIcon(c.status)}
                  <div className="flex-1 leading-tight">
                    <div className={c.status === "fail" ? "font-semibold text-red-800" : "text-zinc-800"}>{c.label}</div>
                    <div className="text-[10px] text-zinc-500">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-[#A8A8A8] bg-[#F8F8F8] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0066CC]">Live pricing</div>
              <div className={"flex items-center gap-1 text-[9px] " + (spot.isLive ? "text-emerald-700" : "text-amber-700")} title={spot.isLive ? `Live spot prices · updated ${relTime(spot.fetchedAt)}` : "Using fallback prices — network unavailable"}>
                <RadioTower className="h-3 w-3" />
                <span>{spot.isLive ? `Live · ${relTime(spot.fetchedAt)}` : "Offline"}</span>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-sm border border-[#D8D8D8] bg-white/50 p-1.5 text-[10px]">
              <div className="text-zinc-500">Gold spot</div><div className="text-right font-mono text-zinc-700">${fmt(spot.goldOzUsd, 0)}/oz</div>
              <div className="text-zinc-500">{METAL_SPECS[recipe.metal].name}</div><div className="text-right font-mono text-zinc-700">${fmt(stats.livePerGram, 2)}/g</div>
              <div className="text-zinc-500">{recipe.centerStone.material} ({fmt(stats.carats)} ct)</div><div className="text-right font-mono text-zinc-700">${fmt(stats.stonePerCarat, 0)}/ct</div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Metal ({fmt(stats.grams)} g)</span><span className="font-mono">${fmt(stats.metalCost, 0)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Center stone</span><span className="font-mono">${fmt(stats.stoneCost, 0)}</span></div>
              {recipe.halo.enabled && (
                <div className="flex justify-between"><span className="text-zinc-500">Halo ({fmt(stats.haloCarats)} ct)</span><span className="font-mono">${fmt(stats.haloCost, 0)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-zinc-500">Making / labour</span><span className="font-mono">${fmt(stats.making, 0)}</span></div>
              <div className="mt-2 flex items-center justify-between border-t border-[#A8A8A8] pt-2">
                <span className="text-zinc-800">Total</span>
                <span className="font-mono text-base text-[#0066CC]">${fmt(stats.total, 0)}</span>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
