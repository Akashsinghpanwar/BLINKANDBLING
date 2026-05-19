import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecipeStore, type ShankStyle, type StoneShape, type GemMaterial, type SettingType, type ProngStyle, type MetalType, type RingProfile, type SizeSystem } from "@/store/recipe";
import { useUIStore } from "@/store/ui";
import { METAL_SPECS } from "@/cad/metals";
import { GEM_SPECS } from "@/cad/gems";
import { volumeToGrams } from "@/cad/weight";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Circle, Diamond, Sparkles, Layers, Disc3, Type, Settings as SettingsIcon, LayoutDashboard, Wand2 } from "lucide-react";
import { StoneShapeThumb } from "./StoneShapeThumb";
import { PRESETS } from "@/lib/presets";

function Row({ label, value, children }: { label: string; value?: string | number; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-zinc-700">{label}</label>
        {value !== undefined && <span className="font-mono text-[11px] text-[#0066CC]">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function ChipRow<T extends string>({ value, options, onChange, testid }: {
  value: T; options: { v: T; label: string; swatch?: string }[];
  onChange: (v: T) => void; testid?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid={testid}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] transition-colors",
            value === o.v
              ? "border-[#0066CC] bg-[#0066CC]/10 text-[#0066CC]"
              : "border-[#A8A8A8] bg-[#FFFFFF] text-zinc-700 hover:border-zinc-600",
          )}
        >
          {o.swatch && (
            <span
              className="inline-block h-3 w-3 rounded-full border border-black/30"
              style={{ background: o.swatch }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#A8A8A8] bg-[#F8F8F8]">
      <header className="flex items-center gap-2 border-b border-[#A8A8A8] px-3 py-2">
        <Icon className="h-3.5 w-3.5 text-[#0066CC]" />
        <span className="text-[12px] font-semibold text-zinc-800">{title}</span>
      </header>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

function MetalWeightLine() {
  const recipe = useRecipeStore((s) => s.recipe);
  const [grams, setGrams] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      const b = (window as unknown as { __ringBuilder?: { result: { assembly: { meta: { metalVolumeMm3: number } } } | null } }).__ringBuilder;
      const v = b?.result?.assembly?.meta?.metalVolumeMm3 ?? 0;
      setGrams(volumeToGrams(v, METAL_SPECS[recipe.metal].density));
    }, 500);
    return () => clearInterval(t);
  }, [recipe.metal]);
  return (
    <div className="rounded border border-[#A8A8A8] bg-[#F0F0F0] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">Metal weight</div>
      <div className="mt-0.5 font-mono text-sm text-[#0066CC]">{grams.toFixed(2)} g <span className="text-[10px] text-zinc-500">(approx)</span></div>
    </div>
  );
}

function BlueprintSketch() {
  return (
    <div className="rounded-lg border border-[#A8A8A8] bg-[#F0F0F0] p-4">
      <svg viewBox="0 0 160 200" className="mx-auto h-44 w-full">
        {/* Ring outline */}
        <ellipse cx="80" cy="120" rx="58" ry="58" fill="none" stroke="#0066CC" strokeWidth="1.4" />
        <ellipse cx="80" cy="120" rx="40" ry="40" fill="none" stroke="#0066CC" strokeWidth="1.0" opacity="0.6" />
        {/* Stone */}
        <polygon points="80,30 92,52 80,76 68,52" fill="none" stroke="#0066CC" strokeWidth="1.2" />
        <polygon points="80,40 88,52 80,68 72,52" fill="none" stroke="#0066CC" strokeWidth="0.8" opacity="0.7" />
        {/* Prongs */}
        <line x1="68" y1="52" x2="60" y2="44" stroke="#0066CC" strokeWidth="1" />
        <line x1="92" y1="52" x2="100" y2="44" stroke="#0066CC" strokeWidth="1" />
        {/* Width dimension */}
        <line x1="22" y1="100" x2="138" y2="100" stroke="#5b6066" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1="22" y1="96" x2="22" y2="104" stroke="#5b6066" strokeWidth="0.6" />
        <line x1="138" y1="96" x2="138" y2="104" stroke="#5b6066" strokeWidth="0.6" />
        <text x="80" y="94" fill="#9ca3af" fontSize="7" textAnchor="middle" fontFamily="monospace">Width</text>
        {/* Thickness dimension */}
        <line x1="148" y1="62" x2="148" y2="178" stroke="#5b6066" strokeWidth="0.5" strokeDasharray="2,2" />
        <text x="148" y="124" fill="#9ca3af" fontSize="7" textAnchor="middle" fontFamily="monospace" transform="rotate(90 148 124)">Thickness</text>
      </svg>
    </div>
  );
}

// ---------- SECTIONS ----------

function RingSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <>
      <Card title="Ring" icon={Circle}>
        <Row label="Ring Size" value={`${recipe.ringBase.sizeNumber.toFixed(2)} (${recipe.ringBase.sizeSystem})`}>
          <Select value={recipe.ringBase.sizeSystem} onValueChange={(v) => update((d) => { d.ringBase.sizeSystem = v as SizeSystem; })}>
            <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="UK">UK</SelectItem>
              <SelectItem value="ISO">ISO</SelectItem>
              <SelectItem value="Indian">Indian</SelectItem>
            </SelectContent>
          </Select>
          <Slider value={[recipe.ringBase.sizeNumber]} min={3} max={13} step={0.25}
            onValueChange={([v]) => update((d) => { d.ringBase.sizeNumber = v!; })} />
        </Row>
        <Row label="Band Width" value={`${recipe.ringBase.width.toFixed(2)} mm`}>
          <Slider value={[recipe.ringBase.width]} min={1.5} max={8} step={0.05}
            onValueChange={([v]) => update((d) => { d.ringBase.width = v!; })} />
        </Row>
        <Row label="Band Thickness" value={`${recipe.ringBase.thickness.toFixed(2)} mm`}>
          <Slider value={[recipe.ringBase.thickness]} min={1} max={3} step={0.05}
            onValueChange={([v]) => update((d) => { d.ringBase.thickness = v!; })} />
        </Row>
        <Row label="Profile">
          <Select value={recipe.ringBase.profile} onValueChange={(v) => update((d) => { d.ringBase.profile = v as RingProfile; })}>
            <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat</SelectItem>
              <SelectItem value="dome">Dome</SelectItem>
              <SelectItem value="comfort-dome">Comfort Fit</SelectItem>
              <SelectItem value="knife-edge">Knife Edge</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <div className="flex items-center justify-between rounded border border-[#A8A8A8] bg-[#F0F0F0] px-3 py-2">
          <span className="text-xs text-zinc-700">Comfort fit</span>
          <Switch checked={recipe.ringBase.comfortFit} onCheckedChange={(v) => update((d) => { d.ringBase.comfortFit = v; })} />
        </div>
        <Row label="Taper" value={recipe.ringBase.taperRatio.toFixed(2)}>
          <Slider value={[recipe.ringBase.taperRatio]} min={0} max={0.4} step={0.01}
            onValueChange={([v]) => update((d) => { d.ringBase.taperRatio = v!; })} />
        </Row>
      </Card>

      <Card title="Material" icon={Disc3}>
        <Row label="Metal">
          <Select value={recipe.metal} onValueChange={(v) => update((d) => { d.metal = v as MetalType; })}>
            <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(METAL_SPECS) as MetalType[]).map((m) => (
                <SelectItem key={m} value={m}>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full border border-black/40" style={{ background: METAL_SPECS[m].color }} />
                    {METAL_SPECS[m].name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <MetalWeightLine />
      </Card>

      <BlueprintSketch />
    </>
  );
}

function CenterStoneSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const SHAPES: StoneShape[] = ["round-brilliant", "oval", "pear", "princess", "emerald", "cushion", "marquise"];
  return (
    <Card title="Center Stone" icon={Diamond}>
      <div>
        <div className="mb-2 text-[11px] font-medium text-zinc-700">Shape</div>
        <div className="grid grid-cols-4 gap-1.5" data-testid="stone-shape-grid">
          {SHAPES.map((s) => (
            <StoneShapeThumb
              key={s}
              shape={s}
              active={recipe.centerStone.shape === s}
              onClick={() => update((d) => { d.centerStone.shape = s; })}
            />
          ))}
        </div>
      </div>
      <Row label="Diameter" value={`${recipe.centerStone.diameter.toFixed(2)} mm`}>
        <Slider value={[recipe.centerStone.diameter]} min={3} max={12} step={0.1}
          onValueChange={([v]) => update((d) => { d.centerStone.diameter = v!; })} />
      </Row>
      <Row label="Depth ratio" value={recipe.centerStone.depthRatio.toFixed(2)}>
        <Slider value={[recipe.centerStone.depthRatio]} min={0.55} max={0.65} step={0.005}
          onValueChange={([v]) => update((d) => { d.centerStone.depthRatio = v!; })} />
      </Row>
      <Row label="Material">
        <ChipRow
          value={recipe.centerStone.material}
          onChange={(v) => update((d) => { d.centerStone.material = v; })}
          options={(Object.keys(GEM_SPECS) as GemMaterial[]).map((g) => ({
            v: g, label: GEM_SPECS[g].name, swatch: GEM_SPECS[g].color,
          }))}
        />
      </Row>
      <Row label="Setting type">
        <ChipRow
          value={recipe.setting.type}
          onChange={(v) => update((d) => { d.setting.type = v; })}
          options={[
            { v: "solitaire", label: "Solitaire" },
            { v: "cathedral-solitaire", label: "Cathedral" },
            { v: "bezel", label: "Bezel" },
            { v: "half-bezel", label: "Half" },
            { v: "tension", label: "Tension" },
          ]}
        />
      </Row>
      <Row label="Seat depth" value={`${recipe.setting.seatDepth.toFixed(2)} mm`}>
        <Slider value={[recipe.setting.seatDepth]} min={0.5} max={2.0} step={0.05}
          onValueChange={([v]) => update((d) => { d.setting.seatDepth = v!; })} />
      </Row>
    </Card>
  );
}

function SideStonesSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Side Stones (Halo &amp; Pavé)" icon={Sparkles}>
      <div className="flex items-center justify-between rounded border border-[#A8A8A8] bg-[#F0F0F0] px-3 py-2">
        <span className="text-xs text-zinc-700">Enable halo</span>
        <Switch checked={recipe.halo.enabled} onCheckedChange={(v) => update((d) => { d.halo.enabled = v; })} />
      </div>
      <Row label="Stone count" value={recipe.halo.stoneCount}>
        <Slider value={[recipe.halo.stoneCount]} min={12} max={24} step={1}
          disabled={!recipe.halo.enabled}
          onValueChange={([v]) => update((d) => { d.halo.stoneCount = v!; })} />
      </Row>
      <Row label="Stone size" value={`${recipe.halo.stoneSize.toFixed(2)} mm`}>
        <Slider value={[recipe.halo.stoneSize]} min={0.8} max={2.0} step={0.05}
          disabled={!recipe.halo.enabled}
          onValueChange={([v]) => update((d) => { d.halo.stoneSize = v!; })} />
      </Row>
      <Row label="Spacing" value={`${recipe.halo.spacing.toFixed(2)} mm`}>
        <Slider value={[recipe.halo.spacing]} min={0.0} max={0.5} step={0.01}
          disabled={!recipe.halo.enabled}
          onValueChange={([v]) => update((d) => { d.halo.spacing = v!; })} />
      </Row>
    </Card>
  );
}

function GalleryRailsSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Gallery Rails (Shank)" icon={Layers}>
      <Row label="Style">
        <ChipRow
          value={recipe.shank.style}
          onChange={(v) => update((d) => { d.shank.style = v; })}
          options={[
            { v: "straight", label: "Straight" },
            { v: "cathedral", label: "Cathedral" },
            { v: "split-shank", label: "Split" },
            { v: "bypass", label: "Bypass" },
            { v: "twisted", label: "Twisted" },
          ]}
        />
      </Row>
      <Row label="Prong count">
        <ChipRow
          value={String(recipe.prongs.count) as "4" | "6"}
          onChange={(v) => update((d) => { d.prongs.count = (v === "4" ? 4 : 6); })}
          options={[{ v: "4", label: "4 prongs" }, { v: "6", label: "6 prongs" }]}
        />
      </Row>
      <Row label="Prong style">
        <ChipRow
          value={recipe.prongs.style}
          onChange={(v) => update((d) => { d.prongs.style = v; })}
          options={[
            { v: "round", label: "Round" },
            { v: "claw", label: "Claw" },
            { v: "V", label: "V-prong" },
          ]}
        />
      </Row>
      <Row label="Prong thickness" value={`${recipe.prongs.thickness.toFixed(2)} mm`}>
        <Slider value={[recipe.prongs.thickness]} min={0.4} max={1.4} step={0.02}
          onValueChange={([v]) => update((d) => { d.prongs.thickness = v!; })} />
      </Row>
    </Card>
  );
}

function BandDetailsSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Band Details" icon={Disc3}>
      <Row label="Profile">
        <ChipRow
          value={recipe.ringBase.profile}
          onChange={(v) => update((d) => { d.ringBase.profile = v; })}
          options={[
            { v: "flat", label: "Flat" },
            { v: "dome", label: "Dome" },
            { v: "comfort-dome", label: "Comfort" },
            { v: "knife-edge", label: "Knife edge" },
          ]}
        />
      </Row>
      <Row label="Width" value={`${recipe.ringBase.width.toFixed(2)} mm`}>
        <Slider value={[recipe.ringBase.width]} min={1.5} max={8} step={0.05}
          onValueChange={([v]) => update((d) => { d.ringBase.width = v!; })} />
      </Row>
      <Row label="Thickness" value={`${recipe.ringBase.thickness.toFixed(2)} mm`}>
        <Slider value={[recipe.ringBase.thickness]} min={1} max={3} step={0.05}
          onValueChange={([v]) => update((d) => { d.ringBase.thickness = v!; })} />
      </Row>
      <Row label="Taper" value={recipe.ringBase.taperRatio.toFixed(2)}>
        <Slider value={[recipe.ringBase.taperRatio]} min={0} max={0.4} step={0.01}
          onValueChange={([v]) => update((d) => { d.ringBase.taperRatio = v!; })} />
      </Row>
    </Card>
  );
}

function EngravingSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Engraving" icon={Type}>
      <Row label="Text">
        <Input
          maxLength={30}
          value={recipe.engraving.text}
          placeholder="e.g. Forever"
          onChange={(e) => update((d) => { d.engraving.text = e.target.value; })}
          data-testid="input-engraving"
        />
      </Row>
      <Row label="Font">
        <ChipRow
          value={recipe.engraving.font}
          onChange={(v) => update((d) => { d.engraving.font = v; })}
          options={[
            { v: "serif", label: "Serif" },
            { v: "sans", label: "Sans" },
            { v: "script", label: "Script" },
          ]}
        />
      </Row>
      <Row label="Placement">
        <ChipRow
          value={recipe.engraving.placement}
          onChange={(v) => update((d) => { d.engraving.placement = v; })}
          options={[{ v: "inner-band", label: "Inner band" }, { v: "top", label: "Top" }]}
        />
      </Row>
    </Card>
  );
}

function SettingsSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Render Studio" icon={SettingsIcon}>
      <Row label="HDRI">
        <Select value={recipe.renderStudio.hdri} onValueChange={(v) => update((d) => { d.renderStudio.hdri = v; })}>
          <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="studio">Studio</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="sunset">Sunset</SelectItem>
            <SelectItem value="dark-studio">Dark Studio</SelectItem>
            <SelectItem value="jewelry-box">Jewelry Box</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Exposure" value={recipe.renderStudio.exposure.toFixed(2)}>
        <Slider value={[recipe.renderStudio.exposure]} min={0.3} max={2.0} step={0.05}
          onValueChange={([v]) => update((d) => { d.renderStudio.exposure = v!; })} />
      </Row>
      <Row label="Bloom" value={recipe.renderStudio.bloomIntensity.toFixed(2)}>
        <Slider value={[recipe.renderStudio.bloomIntensity]} min={0} max={3} step={0.05}
          onValueChange={([v]) => update((d) => { d.renderStudio.bloomIntensity = v!; })} />
      </Row>
      <div className="flex items-center justify-between rounded border border-[#A8A8A8] bg-[#F0F0F0] px-3 py-2">
        <span className="text-xs text-zinc-700">Turntable</span>
        <Switch checked={recipe.renderStudio.turntable} onCheckedChange={(v) => update((d) => { d.renderStudio.turntable = v; })} />
      </div>
      <Row label="Turntable speed" value={recipe.renderStudio.turntableSpeed.toFixed(2)}>
        <Slider value={[recipe.renderStudio.turntableSpeed]} min={0.1} max={3} step={0.1}
          disabled={!recipe.renderStudio.turntable}
          onValueChange={([v]) => update((d) => { d.renderStudio.turntableSpeed = v!; })} />
      </Row>
    </Card>
  );
}

function DashboardSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const setSection = useUIStore((s) => s.setSection);
  const reset = useRecipeStore((s) => s.reset);
  const SHAPES: StoneShape[] = ["round-brilliant", "oval", "pear", "princess", "emerald", "cushion", "marquise"];
  const galleryPresets = PRESETS.filter((p) => p.category === "Gallery").slice(0, 6);
  const metals = (Object.keys(METAL_SPECS) as MetalType[]);

  return (
    <>
      <Card title="Quick Style" icon={Wand2}>
        <div className="grid grid-cols-3 gap-1.5" data-testid="quick-style-grid">
          {galleryPresets.map((p) => (
            <button
              key={p.id}
              onClick={() => update((d) => p.apply(d))}
              data-testid={`quick-style-${p.id}`}
              className="group flex flex-col items-center gap-1 rounded-md border border-[#A8A8A8] bg-[#F0F0F0] p-2 transition-all hover:border-[#0066CC]/50"
            >
              <svg viewBox="0 0 60 60" className="h-9 w-9">
                <defs>
                  <linearGradient id={`qg-${p.id}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#1A7DD8" /><stop offset="100%" stopColor="#003388" />
                  </linearGradient>
                </defs>
                <ellipse cx="30" cy="38" rx="16" ry="16" fill="none" stroke={`url(#qg-${p.id})`} strokeWidth="2.5" />
                <polygon points="30,14 36,24 30,32 24,24" fill={`url(#qg-${p.id})`} />
              </svg>
              <span className="text-[10px] font-medium text-zinc-700">{p.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Diamond Shape" icon={Diamond}>
        <div className="grid grid-cols-4 gap-1.5" data-testid="dashboard-shape-grid">
          {SHAPES.map((s) => (
            <StoneShapeThumb
              key={s}
              shape={s}
              active={recipe.centerStone.shape === s}
              onClick={() => update((d) => { d.centerStone.shape = s; })}
            />
          ))}
        </div>
      </Card>

      <Card title="Metal" icon={Disc3}>
        <div className="grid grid-cols-4 gap-1.5">
          {metals.map((m) => {
            const spec = METAL_SPECS[m];
            return (
              <button
                key={m}
                onClick={() => update((d) => { d.metal = m; })}
                title={spec.name}
                data-testid={`dashboard-metal-${m}`}
                className={cn(
                  "flex flex-col items-center gap-1 rounded border p-1.5 transition-all",
                  recipe.metal === m
                    ? "border-[#0066CC] shadow-[0_0_0_1px_rgba(212,175,55,0.4)]"
                    : "border-[#A8A8A8] hover:border-zinc-500",
                )}
              >
                <span
                  className="block h-6 w-6 rounded-full border border-black/40 shadow-inner"
                  style={{ background: `radial-gradient(circle at 35% 30%, #ffffff60, ${spec.color} 60%)` }}
                />
                <span className="text-[9px] leading-tight text-zinc-700">{spec.name.split(" ").pop()}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Active Recipe" icon={LayoutDashboard}>
        <div className="space-y-1.5 text-xs">
          {[
            { l: "Metal", v: METAL_SPECS[recipe.metal].name, s: "ring" as const },
            { l: "Stone", v: `${recipe.centerStone.shape.replace("-", " ")} · ${recipe.centerStone.diameter}mm`, s: "centerStone" as const },
            { l: "Setting", v: recipe.setting.type.replace("-", " "), s: "centerStone" as const },
            { l: "Shank", v: recipe.shank.style.replace("-", " "), s: "galleryRails" as const },
            { l: "Prongs", v: `${recipe.prongs.count} × ${recipe.prongs.style}`, s: "galleryRails" as const },
            { l: "Halo", v: recipe.halo.enabled ? `${recipe.halo.stoneCount} stones` : "off", s: "sideStones" as const },
            { l: "Engraving", v: recipe.engraving.text || "—", s: "engraving" as const },
          ].map((row) => (
            <button
              key={row.l}
              onClick={() => setSection(row.s)}
              className="flex w-full items-center justify-between rounded border border-transparent px-1.5 py-1 text-left hover:border-[#A8A8A8] hover:bg-[#F0F0F0]"
            >
              <span className="text-zinc-500">{row.l}</span>
              <span className="text-zinc-800 capitalize">{row.v}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => reset()}
          className="mt-2 w-full rounded border border-[#A8A8A8] bg-[#F0F0F0] px-2 py-1.5 text-[11px] text-zinc-400 hover:border-red-700/50 hover:text-red-700"
          data-testid="btn-reset-recipe"
        >
          Reset to default
        </button>
      </Card>

      <BlueprintSketch />
    </>
  );
}

const SECTIONS: Record<string, React.FC> = {
  dashboard: DashboardSection,
  ring: RingSection,
  centerStone: CenterStoneSection,
  sideStones: SideStonesSection,
  galleryRails: GalleryRailsSection,
  bandDetails: BandDetailsSection,
  engraving: EngravingSection,
  settings: SettingsSection,
};

export function LeftPanel() {
  const section = useUIStore((s) => s.section);
  const Section = SECTIONS[section] ?? RingSection;
  return (
    <aside className="flex h-full w-[85vw] max-w-[320px] shrink-0 flex-col border-r border-[#A8A8A8] bg-[#F0F0F0] shadow-xl md:w-[300px] md:shadow-none" data-testid="left-panel">
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          <Section />
        </div>
      </ScrollArea>
    </aside>
  );
}
