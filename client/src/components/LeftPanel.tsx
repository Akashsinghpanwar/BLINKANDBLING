import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useRecipeStore,
  type JewelryCategory, type ShankStyle, type StoneShape, type GemMaterial, type SettingType,
  type ProngStyle, type MetalType, type RingProfile, type SizeSystem,
  type SurfaceFinish, type BailStyle, type PendantShape, type BangleProfile,
  type BangleOpening, type EarringBacking, type HoopClosure,
} from "@/store/recipe";
import { useUIStore } from "@/store/ui";
import { METAL_SPECS } from "@/cad/metals";
import { GEM_SPECS } from "@/cad/gems";
import { volumeToGrams } from "@/cad/weight";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Circle, Diamond, Sparkles, Layers, Disc3, Type, Settings as SettingsIcon,
  LayoutDashboard, Wand2, Sparkle, AlignHorizontalDistributeCenter, Grip,
  Scan, Brush, Gem, Heart, Watch, CircleDot,
} from "lucide-react";
import { StoneShapeThumb } from "./StoneShapeThumb";
import { PRESETS } from "@/lib/presets";
import { ImageToCADPanel } from "./ImageToCADPanel";

// ─── Shared sub-components ────────────────────────────────────────────────────

function Row({
  label, value, children,
}: { label: string; value?: string | number; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-zinc-700">{label}</label>
        {value !== undefined && (
          <span className="font-mono text-[11px] text-[#0066CC]">{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ChipRow<T extends string>({
  value, options, onChange, testid, disabled,
}: {
  value: T;
  options: { v: T; label: string; swatch?: string }[];
  onChange: (v: T) => void;
  testid?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid={testid}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => !disabled && onChange(o.v)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] transition-colors",
            value === o.v
              ? "border-[#0066CC] bg-[#0066CC]/10 text-[#0066CC]"
              : "border-[#A8A8A8] bg-[#FFFFFF] text-zinc-700 hover:border-zinc-600",
            disabled && "opacity-40 cursor-not-allowed",
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

function Card({
  title, icon: Icon, children,
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded border border-[#A8A8A8] bg-[#F0F0F0] px-3 py-2">
      <span className="text-xs text-zinc-700">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function MetalWeightLine() {
  const recipe = useRecipeStore((s) => s.recipe);
  const [grams, setGrams] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      const b = (window as unknown as { __ringBuilder?: { result: { assembly: { meta: { metalVolumeMm3: number } } } | null } }).__ringBuilder;
      const v = b?.result?.assembly?.meta?.metalVolumeMm3 ?? 0;
      setGrams(volumeToGrams(v, METAL_SPECS[recipe.metal as keyof typeof METAL_SPECS]?.density ?? 15.58));
    }, 500);
    return () => clearInterval(t);
  }, [recipe.metal]);
  return (
    <div className="rounded border border-[#A8A8A8] bg-[#F0F0F0] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">Metal weight</div>
      <div className="mt-0.5 font-mono text-sm text-[#0066CC]">
        {grams.toFixed(2)} g <span className="text-[10px] text-zinc-500">(approx)</span>
      </div>
    </div>
  );
}

// All stone shapes for chips
const ALL_SHAPES: StoneShape[] = [
  "round-brilliant", "oval", "pear", "princess", "emerald", "cushion",
  "marquise", "asscher", "radiant", "heart", "trillion", "baguette",
  "briolette", "cabochon", "rose-cut",
];

// ─── RING SECTIONS ────────────────────────────────────────────────────────────

function RingSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <>
      <Card title="Ring Base" icon={Circle}>
        <Row label="Ring Size" value={`${recipe.ringBase.sizeNumber.toFixed(2)} (${recipe.ringBase.sizeSystem})`}>
          <Select value={recipe.ringBase.sizeSystem}
            onValueChange={(v) => update((d) => { d.ringBase.sizeSystem = v as SizeSystem; })}>
            <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["US", "UK", "ISO", "Indian"] as SizeSystem[]).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Slider value={[recipe.ringBase.sizeNumber]} min={3} max={13} step={0.25}
            onValueChange={([v]) => update((d) => { d.ringBase.sizeNumber = v!; })} />
        </Row>
        <Row label="Band Width" value={`${recipe.ringBase.width.toFixed(2)} mm`}>
          <Slider value={[recipe.ringBase.width]} min={1.5} max={12} step={0.05}
            onValueChange={([v]) => update((d) => { d.ringBase.width = v!; })} />
        </Row>
        <Row label="Band Thickness" value={`${recipe.ringBase.thickness.toFixed(2)} mm`}>
          <Slider value={[recipe.ringBase.thickness]} min={1} max={4} step={0.05}
            onValueChange={([v]) => update((d) => { d.ringBase.thickness = v!; })} />
        </Row>
        <Row label="Profile">
          <Select value={recipe.ringBase.profile}
            onValueChange={(v) => update((d) => { d.ringBase.profile = v as RingProfile; })}>
            <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {([
                ["flat", "Flat"], ["dome", "Dome"], ["comfort-dome", "Comfort Fit"],
                ["knife-edge", "Knife Edge"], ["square", "Square"], ["d-shape", "D-Shape"],
                ["oval-section", "Oval Section"], ["barrel", "Barrel"],
              ] as [RingProfile, string][]).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Toggle label="Comfort fit inner groove" checked={recipe.ringBase.comfortFit}
          onChange={(v) => update((d) => { d.ringBase.comfortFit = v; })} />
        <Toggle label="Finger groove (full comfort)" checked={recipe.ringBase.fingerGroove}
          onChange={(v) => update((d) => { d.ringBase.fingerGroove = v; })} />
        <Row label="Taper ratio" value={recipe.ringBase.taperRatio.toFixed(2)}>
          <Slider value={[recipe.ringBase.taperRatio]} min={0} max={0.4} step={0.01}
            onValueChange={([v]) => update((d) => { d.ringBase.taperRatio = v!; })} />
        </Row>
      </Card>

      <Card title="Metal" icon={Disc3}>
        <Row label="Metal alloy">
          <Select value={recipe.metal}
            onValueChange={(v) => update((d) => { d.metal = v as MetalType; })}>
            <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(METAL_SPECS) as MetalType[]).map((m) => (
                <SelectItem key={m} value={m}>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full border border-black/40"
                      style={{ background: METAL_SPECS[m as keyof typeof METAL_SPECS]?.color ?? "#ccc" }} />
                    {METAL_SPECS[m as keyof typeof METAL_SPECS]?.name ?? m}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <MetalWeightLine />
      </Card>
    </>
  );
}

function CenterStoneSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Center Stone" icon={Diamond}>
      <div>
        <div className="mb-2 text-[11px] font-medium text-zinc-700">Shape</div>
        <div className="grid grid-cols-4 gap-1.5" data-testid="stone-shape-grid">
          {ALL_SHAPES.map((s) => (
            <StoneShapeThumb key={s} shape={s} active={recipe.centerStone.shape === s}
              onClick={() => update((d) => { d.centerStone.shape = s; })} />
          ))}
        </div>
      </div>
      <Row label="Diameter" value={`${recipe.centerStone.diameter.toFixed(2)} mm`}>
        <Slider value={[recipe.centerStone.diameter]} min={2} max={15} step={0.1}
          onValueChange={([v]) => update((d) => { d.centerStone.diameter = v!; })} />
      </Row>
      <Row label="Depth ratio" value={recipe.centerStone.depthRatio.toFixed(2)}>
        <Slider value={[recipe.centerStone.depthRatio]} min={0.4} max={0.7} step={0.005}
          onValueChange={([v]) => update((d) => { d.centerStone.depthRatio = v!; })} />
      </Row>
      <Row label="Gem material">
        <ChipRow
          value={recipe.centerStone.material}
          onChange={(v) => update((d) => { d.centerStone.material = v; })}
          options={(Object.keys(GEM_SPECS) as GemMaterial[]).map((g) => ({
            v: g,
            label: GEM_SPECS[g as keyof typeof GEM_SPECS]?.name ?? g,
            swatch: GEM_SPECS[g as keyof typeof GEM_SPECS]?.color ?? "#fff",
          }))}
        />
      </Row>
      <Row label="Setting type">
        <ChipRow
          value={recipe.setting.type}
          onChange={(v) => update((d) => { d.setting.type = v; })}
          options={([
            ["solitaire", "Solitaire"], ["cathedral-solitaire", "Cathedral"],
            ["bezel", "Bezel"], ["half-bezel", "Half Bezel"], ["tension", "Tension"],
            ["pave", "Pavé Set"], ["channel", "Channel"], ["bar", "Bar Set"],
            ["flush", "Flush/Gypsy"], ["invisible", "Invisible"], ["burnish", "Burnish"],
            ["east-west", "East-West"], ["prong-basket", "Prong Basket"], ["split-prong", "Split Prong"],
          ] as [SettingType, string][]).map(([v, l]) => ({ v, label: l }))}
        />
      </Row>
      <Toggle label="East-West orientation" checked={recipe.setting.eastWest}
        onChange={(v) => update((d) => { d.setting.eastWest = v; })} />
      <Row label="Seat depth" value={`${recipe.setting.seatDepth.toFixed(2)} mm`}>
        <Slider value={[recipe.setting.seatDepth]} min={0.3} max={2.5} step={0.05}
          onValueChange={([v]) => update((d) => { d.setting.seatDepth = v!; })} />
      </Row>
      <Row label="Collet height" value={`${recipe.setting.colletHeight.toFixed(2)} mm`}>
        <Slider value={[recipe.setting.colletHeight]} min={0.2} max={2.0} step={0.05}
          onValueChange={([v]) => update((d) => { d.setting.colletHeight = v!; })} />
      </Row>
      <Row label="Bezel wall thickness" value={`${recipe.setting.bezelWallThickness.toFixed(2)} mm`}>
        <Slider value={[recipe.setting.bezelWallThickness]} min={0.2} max={1.5} step={0.05}
          onValueChange={([v]) => update((d) => { d.setting.bezelWallThickness = v!; })} />
      </Row>
    </Card>
  );
}

function SideStonesSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Halo" icon={Sparkles}>
      <Toggle label="Enable halo" checked={recipe.halo.enabled}
        onChange={(v) => update((d) => { d.halo.enabled = v; })} />
      <Row label="Stone count" value={recipe.halo.stoneCount}>
        <Slider value={[recipe.halo.stoneCount]} min={8} max={32} step={1}
          disabled={!recipe.halo.enabled}
          onValueChange={([v]) => update((d) => { d.halo.stoneCount = v!; })} />
      </Row>
      <Row label="Stone size" value={`${recipe.halo.stoneSize.toFixed(2)} mm`}>
        <Slider value={[recipe.halo.stoneSize]} min={0.6} max={2.5} step={0.05}
          disabled={!recipe.halo.enabled}
          onValueChange={([v]) => update((d) => { d.halo.stoneSize = v!; })} />
      </Row>
      <Row label="Spacing" value={`${recipe.halo.spacing.toFixed(2)} mm`}>
        <Slider value={[recipe.halo.spacing]} min={0} max={0.6} step={0.01}
          disabled={!recipe.halo.enabled}
          onValueChange={([v]) => update((d) => { d.halo.spacing = v!; })} />
      </Row>
      <Toggle label="Double halo" checked={recipe.halo.doubleHalo}
        onChange={(v) => update((d) => { d.halo.doubleHalo = v; })} />
      <Toggle label="Floating halo" checked={recipe.halo.floatingHalo}
        onChange={(v) => update((d) => { d.halo.floatingHalo = v; })} />
    </Card>
  );
}

function GalleryRailsSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Gallery & Prongs" icon={Layers}>
      <Row label="Shank style">
        <ChipRow
          value={recipe.shank.style}
          onChange={(v) => update((d) => { d.shank.style = v; })}
          options={([
            ["straight", "Straight"], ["cathedral", "Cathedral"],
            ["split-shank", "Split"], ["bypass", "Bypass"], ["twisted", "Twisted"],
            ["trellis", "Trellis"], ["peg-head", "Peg Head"],
            ["double-bypass", "Dbl Bypass"], ["euro-shank", "Euro"],
          ] as [ShankStyle, string][]).map(([v, l]) => ({ v, label: l }))}
        />
      </Row>
      <Toggle label="Gallery rail" checked={recipe.shank.galleryRail}
        onChange={(v) => update((d) => { d.shank.galleryRail = v; })} />
      <Row label="Under-gallery style">
        <ChipRow
          value={recipe.shank.undergalleryStyle}
          onChange={(v) => update((d) => { d.shank.undergalleryStyle = v; })}
          options={[
            { v: "open", label: "Open" },
            { v: "solid", label: "Solid" },
            { v: "filigree", label: "Filigree" },
          ]}
        />
      </Row>
      <Row label="Split gap" value={`${recipe.shank.splitGapMm.toFixed(1)} mm`}>
        <Slider value={[recipe.shank.splitGapMm]} min={0.5} max={4} step={0.1}
          onValueChange={([v]) => update((d) => { d.shank.splitGapMm = v!; })} />
      </Row>
      <Row label="Prong count">
        <ChipRow
          value={String(recipe.prongs.count) as "4" | "6" | "8"}
          onChange={(v) => update((d) => { d.prongs.count = parseInt(v) as 4 | 6 | 8; })}
          options={[{ v: "4", label: "4 prongs" }, { v: "6", label: "6 prongs" }, { v: "8", label: "8 prongs" }]}
        />
      </Row>
      <Row label="Prong style">
        <ChipRow
          value={recipe.prongs.style}
          onChange={(v) => update((d) => { d.prongs.style = v; })}
          options={([
            ["round", "Round"], ["claw", "Claw"], ["V", "V-Prong"],
            ["square", "Square"], ["pointed", "Pointed"], ["eagle-claw", "Eagle Claw"],
          ] as [ProngStyle, string][]).map(([v, l]) => ({ v, label: l }))}
        />
      </Row>
      <Row label="Prong thickness" value={`${recipe.prongs.thickness.toFixed(2)} mm`}>
        <Slider value={[recipe.prongs.thickness]} min={0.3} max={1.8} step={0.02}
          onValueChange={([v]) => update((d) => { d.prongs.thickness = v!; })} />
      </Row>
      <Row label="Prong height" value={`${recipe.prongs.height.toFixed(2)} mm`}>
        <Slider value={[recipe.prongs.height]} min={0.5} max={2.5} step={0.05}
          onValueChange={([v]) => update((d) => { d.prongs.height = v!; })} />
      </Row>
      <Row label="Tip style">
        <ChipRow
          value={recipe.prongs.tipStyle}
          onChange={(v) => update((d) => { d.prongs.tipStyle = v; })}
          options={[
            { v: "round", label: "Round" }, { v: "flat", label: "Flat" },
            { v: "pointed", label: "Pointed" }, { v: "split", label: "Split" },
          ]}
        />
      </Row>
    </Card>
  );
}

function BandDetailsSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Band Details" icon={Disc3}>
      <Row label="Width" value={`${recipe.ringBase.width.toFixed(2)} mm`}>
        <Slider value={[recipe.ringBase.width]} min={1.5} max={12} step={0.05}
          onValueChange={([v]) => update((d) => { d.ringBase.width = v!; })} />
      </Row>
      <Row label="Thickness" value={`${recipe.ringBase.thickness.toFixed(2)} mm`}>
        <Slider value={[recipe.ringBase.thickness]} min={1} max={4} step={0.05}
          onValueChange={([v]) => update((d) => { d.ringBase.thickness = v!; })} />
      </Row>
      <Row label="Taper" value={recipe.ringBase.taperRatio.toFixed(2)}>
        <Slider value={[recipe.ringBase.taperRatio]} min={0} max={0.4} step={0.01}
          onValueChange={([v]) => update((d) => { d.ringBase.taperRatio = v!; })} />
      </Row>
      <Row label="Twist turns (twisted shank)" value={recipe.shank.twistTurns.toFixed(1)}>
        <Slider value={[recipe.shank.twistTurns]} min={0.5} max={4} step={0.25}
          onValueChange={([v]) => update((d) => { d.shank.twistTurns = v!; })} />
      </Row>
    </Card>
  );
}

// ─── NEW RING SECTIONS ────────────────────────────────────────────────────────

function PaveSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const on = recipe.pave.enabled;
  return (
    <Card title="Pavé Stone Setting" icon={Sparkle}>
      <Toggle label="Enable pavé" checked={on}
        onChange={(v) => update((d) => { d.pave.enabled = v; })} />
      <Row label="Coverage">
        <ChipRow disabled={!on} value={recipe.pave.coverage}
          onChange={(v) => update((d) => { d.pave.coverage = v; })}
          options={[
            { v: "quarter", label: "1/4" }, { v: "half", label: "1/2" },
            { v: "three-quarter", label: "3/4" }, { v: "full-eternity", label: "Full" },
          ]}
        />
      </Row>
      <Row label="Pavé style">
        <ChipRow disabled={!on} value={recipe.pave.setStyle}
          onChange={(v) => update((d) => { d.pave.setStyle = v; })}
          options={[
            { v: "pave", label: "Pavé" }, { v: "micro-pave", label: "Micro" },
            { v: "french-pave", label: "French" },
          ]}
        />
      </Row>
      <Row label="Stone size" value={`${recipe.pave.stoneSize.toFixed(2)} mm`}>
        <Slider disabled={!on} value={[recipe.pave.stoneSize]} min={0.5} max={2.0} step={0.05}
          onValueChange={([v]) => update((d) => { d.pave.stoneSize = v!; })} />
      </Row>
      <Row label="Stone spacing" value={`${recipe.pave.stoneSpacing.toFixed(2)} mm`}>
        <Slider disabled={!on} value={[recipe.pave.stoneSpacing]} min={0.05} max={0.5} step={0.01}
          onValueChange={([v]) => update((d) => { d.pave.stoneSpacing = v!; })} />
      </Row>
      <Row label="Rows">
        <ChipRow disabled={!on} value={String(recipe.pave.rows) as "1" | "2" | "3"}
          onChange={(v) => update((d) => { d.pave.rows = parseInt(v) as 1 | 2 | 3; })}
          options={[{ v: "1", label: "1 row" }, { v: "2", label: "2 rows" }, { v: "3", label: "3 rows" }]}
        />
      </Row>
      <Row label="Start angle" value={`${recipe.pave.startAngleDeg}°`}>
        <Slider disabled={!on} value={[recipe.pave.startAngleDeg]} min={0} max={180} step={5}
          onValueChange={([v]) => update((d) => { d.pave.startAngleDeg = v!; })} />
      </Row>
    </Card>
  );
}

function EternitySection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const on = recipe.eternity.enabled;
  return (
    <Card title="Eternity Band" icon={AlignHorizontalDistributeCenter}>
      <Toggle label="Enable eternity" checked={on}
        onChange={(v) => update((d) => { d.eternity.enabled = v; })} />
      <Row label="Stone shape">
        <div className="grid grid-cols-4 gap-1">
          {(["round-brilliant", "oval", "princess", "baguette", "cushion", "marquise"] as StoneShape[]).map((s) => (
            <StoneShapeThumb key={s} shape={s} active={recipe.eternity.stoneShape === s}
              onClick={() => update((d) => { d.eternity.stoneShape = s; })} />
          ))}
        </div>
      </Row>
      <Row label="Stone size" value={`${recipe.eternity.stoneSize.toFixed(2)} mm`}>
        <Slider disabled={!on} value={[recipe.eternity.stoneSize]} min={1.0} max={4.0} step={0.1}
          onValueChange={([v]) => update((d) => { d.eternity.stoneSize = v!; })} />
      </Row>
      <Row label="Total stones" value={recipe.eternity.totalCount}>
        <Slider disabled={!on} value={[recipe.eternity.totalCount]} min={8} max={40} step={1}
          onValueChange={([v]) => update((d) => { d.eternity.totalCount = v!; })} />
      </Row>
      <Row label="Coverage">
        <ChipRow disabled={!on} value={recipe.eternity.coverage}
          onChange={(v) => update((d) => { d.eternity.coverage = v; })}
          options={[
            { v: "half", label: "Half" }, { v: "three-quarter", label: "3/4" }, { v: "full", label: "Full" },
          ]}
        />
      </Row>
      <Row label="Setting style">
        <ChipRow disabled={!on} value={recipe.eternity.setStyle}
          onChange={(v) => update((d) => { d.eternity.setStyle = v; })}
          options={[
            { v: "prong", label: "Prong" }, { v: "shared-prong", label: "Shared" },
            { v: "channel", label: "Channel" }, { v: "bezel", label: "Bezel" }, { v: "pave", label: "Pavé" },
          ]}
        />
      </Row>
    </Card>
  );
}

function ThreeStoneSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const on = recipe.threeStone.enabled;
  return (
    <Card title="Three-Stone" icon={Gem}>
      <Toggle label="Enable three-stone" checked={on}
        onChange={(v) => update((d) => { d.threeStone.enabled = v; })} />
      <Row label="Side stone shape">
        <div className="grid grid-cols-4 gap-1">
          {(["oval", "pear", "marquise", "cushion", "trillion", "baguette", "round-brilliant", "princess"] as StoneShape[]).map((s) => (
            <StoneShapeThumb key={s} shape={s} active={recipe.threeStone.sideShape === s}
              onClick={() => update((d) => { d.threeStone.sideShape = s; })} />
          ))}
        </div>
      </Row>
      <Row label="Side stone size" value={`${recipe.threeStone.sideDiameterMm.toFixed(2)} mm`}>
        <Slider disabled={!on} value={[recipe.threeStone.sideDiameterMm]} min={2} max={8} step={0.1}
          onValueChange={([v]) => update((d) => { d.threeStone.sideDiameterMm = v!; })} />
      </Row>
      <Row label="Side offset" value={`${recipe.threeStone.sideOffsetMm.toFixed(2)} mm`}>
        <Slider disabled={!on} value={[recipe.threeStone.sideOffsetMm]} min={-1} max={2} step={0.05}
          onValueChange={([v]) => update((d) => { d.threeStone.sideOffsetMm = v!; })} />
      </Row>
      <Row label="Side setting">
        <ChipRow disabled={!on} value={recipe.threeStone.sideSetting}
          onChange={(v) => update((d) => { d.threeStone.sideSetting = v; })}
          options={[
            { v: "bezel", label: "Bezel" }, { v: "half-bezel", label: "Half Bezel" },
            { v: "solitaire", label: "Prong" }, { v: "channel", label: "Channel" },
          ]}
        />
      </Row>
    </Card>
  );
}

function MilgrainSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Milgrain & Detail" icon={Grip}>
      <div className="space-y-3">
        <Toggle label="Enable milgrain" checked={recipe.milgrain.enabled}
          onChange={(v) => update((d) => { d.milgrain.enabled = v; })} />
        <Row label="Bead width" value={`${recipe.milgrain.widthMm.toFixed(2)} mm`}>
          <Slider disabled={!recipe.milgrain.enabled} value={[recipe.milgrain.widthMm]} min={0.2} max={1.2} step={0.02}
            onValueChange={([v]) => update((d) => { d.milgrain.widthMm = v!; })} />
        </Row>
        <Row label="Placement">
          <ChipRow disabled={!recipe.milgrain.enabled} value={recipe.milgrain.placement}
            onChange={(v) => update((d) => { d.milgrain.placement = v; })}
            options={[
              { v: "both-edges", label: "Both" }, { v: "outer-edge", label: "Outer" },
              { v: "inner-edge", label: "Inner" }, { v: "bezel-border", label: "Bezel" },
            ]}
          />
        </Row>
      </div>
    </Card>
  );
}

function FiligreSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Filigree" icon={Scan}>
      <Toggle label="Enable filigree" checked={recipe.filigree.enabled}
        onChange={(v) => update((d) => { d.filigree.enabled = v; })} />
      <Row label="Pattern">
        <ChipRow disabled={!recipe.filigree.enabled} value={recipe.filigree.pattern}
          onChange={(v) => update((d) => { d.filigree.pattern = v; })}
          options={[
            { v: "scroll", label: "Scroll" }, { v: "lattice", label: "Lattice" },
            { v: "vine", label: "Vine" }, { v: "geometric", label: "Geometric" },
          ]}
        />
      </Row>
      <Row label="Density">
        <ChipRow disabled={!recipe.filigree.enabled} value={recipe.filigree.density}
          onChange={(v) => update((d) => { d.filigree.density = v; })}
          options={[
            { v: "light", label: "Light" }, { v: "medium", label: "Medium" }, { v: "dense", label: "Dense" },
          ]}
        />
      </Row>
    </Card>
  );
}

function FinishSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Surface Finish" icon={Brush}>
      <Row label="Finish">
        <ChipRow
          value={recipe.ringBase.surfaceFinish}
          onChange={(v) => update((d) => { d.ringBase.surfaceFinish = v; })}
          options={([
            ["high-polish", "Polish"], ["matte", "Matte"], ["brushed", "Brushed"],
            ["hammered", "Hammered"], ["florentine", "Florentine"], ["sandblast", "Sandblast"],
            ["satin", "Satin"], ["pebble", "Pebble"], ["bark", "Bark"],
          ] as [SurfaceFinish, string][]).map(([v, l]) => ({ v, label: l }))}
        />
      </Row>
      <div className="rounded border border-[#A8A8A8] bg-[#F0F0F0] p-2 text-[10px] text-zinc-500">
        <div className="mb-1 font-semibold text-zinc-700">Finish notes</div>
        <div>High-Polish: mirror bright, shows every detail</div>
        <div>Matte: flat, contemporary, hides scratches well</div>
        <div>Brushed: linear texture, fingerprint-resistant</div>
        <div>Hammered: artisan texture, light-scattering peaks</div>
        <div>Florentine: crosshatched, antique Italian style</div>
        <div>Satin: semi-matte, soft sheen, feminine look</div>
      </div>
    </Card>
  );
}

function EngravingSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Engraving" icon={Type}>
      <Row label="Text">
        <Input maxLength={40} value={recipe.engraving.text}
          placeholder="e.g. Forever & Always"
          onChange={(e) => update((d) => { d.engraving.text = e.target.value; })}
          data-testid="input-engraving" />
      </Row>
      <Row label="Font">
        <ChipRow value={recipe.engraving.font}
          onChange={(v) => update((d) => { d.engraving.font = v; })}
          options={[
            { v: "serif", label: "Serif" }, { v: "sans", label: "Sans" },
            { v: "script", label: "Script" }, { v: "block", label: "Block" },
            { v: "roman", label: "Roman" },
          ]}
        />
      </Row>
      <Row label="Placement">
        <ChipRow value={recipe.engraving.placement}
          onChange={(v) => update((d) => { d.engraving.placement = v; })}
          options={[
            { v: "inner-band", label: "Inner band" },
            { v: "outer-band", label: "Outer band" },
            { v: "both", label: "Both" },
          ]}
        />
      </Row>
      <Row label="Depth" value={`${recipe.engraving.depth.toFixed(2)} mm`}>
        <Slider value={[recipe.engraving.depth]} min={0.1} max={0.6} step={0.02}
          onValueChange={([v]) => update((d) => { d.engraving.depth = v!; })} />
      </Row>
    </Card>
  );
}

// ─── PENDANT SECTION ──────────────────────────────────────────────────────────

function PendantSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const p = recipe.pendant;
  return (
    <>
      <Card title="Pendant Shape" icon={Heart}>
        <Row label="Shape">
          <ChipRow value={p.shape}
            onChange={(v) => update((d) => { d.pendant.shape = v; })}
            options={([
              ["round", "Round"], ["oval", "Oval"], ["teardrop", "Teardrop"],
              ["square", "Square"], ["heart", "Heart"], ["marquise", "Marquise"],
              ["cross", "Cross"], ["star", "Star"], ["hexagon", "Hexagon"],
              ["freeform", "Freeform"],
            ] as [PendantShape, string][]).map(([v, l]) => ({ v, label: l }))}
          />
        </Row>
        <Row label="Width" value={`${p.widthMm.toFixed(1)} mm`}>
          <Slider value={[p.widthMm]} min={4} max={40} step={0.5}
            onValueChange={([v]) => update((d) => { d.pendant.widthMm = v!; })} />
        </Row>
        <Row label="Height" value={`${p.heightMm.toFixed(1)} mm`}>
          <Slider value={[p.heightMm]} min={4} max={60} step={0.5}
            onValueChange={([v]) => update((d) => { d.pendant.heightMm = v!; })} />
        </Row>
        <Row label="Thickness" value={`${p.thicknessMm.toFixed(1)} mm`}>
          <Slider value={[p.thicknessMm]} min={1} max={12} step={0.25}
            onValueChange={([v]) => update((d) => { d.pendant.thicknessMm = v!; })} />
        </Row>
        <Row label="Surface finish">
          <ChipRow value={p.surfaceFinish}
            onChange={(v) => update((d) => { d.pendant.surfaceFinish = v; })}
            options={([
              ["high-polish", "Polish"], ["matte", "Matte"], ["brushed", "Brushed"],
              ["hammered", "Hammered"], ["satin", "Satin"],
            ] as [SurfaceFinish, string][]).map(([v, l]) => ({ v, label: l }))}
          />
        </Row>
        <Toggle label="Openwork (pierced design)" checked={p.openwork}
          onChange={(v) => update((d) => { d.pendant.openwork = v; })} />
        <Toggle label="Filigree overlay" checked={p.filigree}
          onChange={(v) => update((d) => { d.pendant.filigree = v; })} />
        <Toggle label="Milgrain border" checked={p.milgrain}
          onChange={(v) => update((d) => { d.pendant.milgrain = v; })} />
      </Card>

      <Card title="Center Stone" icon={Diamond}>
        <Toggle label="Include stone" checked={p.stone.enabled}
          onChange={(v) => update((d) => { d.pendant.stone.enabled = v; })} />
        <div className="grid grid-cols-4 gap-1">
          {(["round-brilliant", "oval", "pear", "heart", "cushion", "marquise", "emerald", "princess"] as StoneShape[]).map((s) => (
            <StoneShapeThumb key={s} shape={s} active={p.stone.shape === s}
              onClick={() => update((d) => { d.pendant.stone.shape = s; })} />
          ))}
        </div>
        <Row label="Size" value={`${p.stone.diameter.toFixed(1)} mm`}>
          <Slider disabled={!p.stone.enabled} value={[p.stone.diameter]} min={3} max={20} step={0.5}
            onValueChange={([v]) => update((d) => { d.pendant.stone.diameter = v!; })} />
        </Row>
        <Row label="Gem material">
          <ChipRow disabled={!p.stone.enabled} value={p.stone.material}
            onChange={(v) => update((d) => { d.pendant.stone.material = v; })}
            options={(Object.keys(GEM_SPECS) as GemMaterial[]).map((g) => ({
              v: g,
              label: GEM_SPECS[g as keyof typeof GEM_SPECS]?.name ?? g,
              swatch: GEM_SPECS[g as keyof typeof GEM_SPECS]?.color ?? "#fff",
            }))}
          />
        </Row>
        <Row label="Setting">
          <ChipRow disabled={!p.stone.enabled} value={p.stone.settingType}
            onChange={(v) => update((d) => { d.pendant.stone.settingType = v; })}
            options={[
              { v: "bezel", label: "Bezel" }, { v: "half-bezel", label: "Half Bezel" },
              { v: "solitaire", label: "Prong" }, { v: "tension", label: "Tension" },
              { v: "channel", label: "Channel" }, { v: "burnish", label: "Burnish" },
            ]}
          />
        </Row>
      </Card>

      <Card title="Halo" icon={Sparkles}>
        <Toggle label="Halo around center stone" checked={p.halo.enabled}
          onChange={(v) => update((d) => { d.pendant.halo.enabled = v; })} />
        <Row label="Halo stone size" value={`${p.halo.stoneSize.toFixed(2)} mm`}>
          <Slider disabled={!p.halo.enabled} value={[p.halo.stoneSize]} min={0.5} max={2.0} step={0.05}
            onValueChange={([v]) => update((d) => { d.pendant.halo.stoneSize = v!; })} />
        </Row>
        <Row label="Halo count" value={p.halo.stoneCount}>
          <Slider disabled={!p.halo.enabled} value={[p.halo.stoneCount]} min={8} max={32} step={1}
            onValueChange={([v]) => update((d) => { d.pendant.halo.stoneCount = v!; })} />
        </Row>
      </Card>

      <Card title="Bail" icon={Layers}>
        <Row label="Bail style">
          <ChipRow value={p.bail.style}
            onChange={(v) => update((d) => { d.pendant.bail.style = v; })}
            options={([
              ["round-tube", "Round"], ["flat", "Flat"], ["fancy-fleur", "Fancy"],
              ["split", "Split"], ["hinged", "Hinged"], ["omega", "Omega"],
            ] as [BailStyle, string][]).map(([v, l]) => ({ v, label: l }))}
          />
        </Row>
        <Row label="Inner diameter" value={`${p.bail.innerDiameterMm.toFixed(1)} mm`}>
          <Slider value={[p.bail.innerDiameterMm]} min={1.5} max={6} step={0.25}
            onValueChange={([v]) => update((d) => { d.pendant.bail.innerDiameterMm = v!; })} />
        </Row>
        <Row label="Bail width" value={`${p.bail.widthMm.toFixed(1)} mm`}>
          <Slider value={[p.bail.widthMm]} min={2} max={10} step={0.5}
            onValueChange={([v]) => update((d) => { d.pendant.bail.widthMm = v!; })} />
        </Row>
      </Card>
    </>
  );
}

// ─── EARRING SECTION ──────────────────────────────────────────────────────────

function EarringSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const e = recipe.earring;
  const cat = recipe.jewelryCategory;

  return (
    <>
      <Card title="Earring Type" icon={Gem}>
        <Row label="Style">
          <ChipRow value={e.style}
            onChange={(v) => update((d) => { d.earring.style = v; })}
            options={[
              { v: "stud", label: "Stud" }, { v: "hoop", label: "Hoop" }, { v: "drop", label: "Drop" },
            ]}
          />
        </Row>
      </Card>

      {e.style === "stud" && (
        <Card title="Stud Settings" icon={Gem}>
          <div className="grid grid-cols-4 gap-1">
            {(["round-brilliant", "oval", "pear", "princess", "cushion", "heart", "marquise", "asscher"] as StoneShape[]).map((s) => (
              <StoneShapeThumb key={s} shape={s} active={e.stud.stone.shape === s}
                onClick={() => update((d) => { d.earring.stud.stone.shape = s; })} />
            ))}
          </div>
          <Row label="Stone size" value={`${e.stud.stone.diameter.toFixed(1)} mm`}>
            <Slider value={[e.stud.stone.diameter]} min={2} max={10} step={0.25}
              onValueChange={([v]) => update((d) => { d.earring.stud.stone.diameter = v!; })} />
          </Row>
          <Row label="Gem material">
            <ChipRow value={e.stud.stone.material}
              onChange={(v) => update((d) => { d.earring.stud.stone.material = v; })}
              options={(Object.keys(GEM_SPECS) as GemMaterial[]).map((g) => ({
                v: g,
                label: GEM_SPECS[g as keyof typeof GEM_SPECS]?.name ?? g,
                swatch: GEM_SPECS[g as keyof typeof GEM_SPECS]?.color ?? "#fff",
              }))}
            />
          </Row>
          <Row label="Setting">
            <ChipRow value={e.stud.setting}
              onChange={(v) => update((d) => { d.earring.stud.setting = v; })}
              options={[
                { v: "prong-basket", label: "Prong" }, { v: "bezel", label: "Bezel" },
                { v: "half-bezel", label: "Half" }, { v: "tension", label: "Tension" },
                { v: "pave", label: "Pavé" }, { v: "channel", label: "Channel" },
              ]}
            />
          </Row>
          <Toggle label="Halo around stone" checked={e.stud.halo.enabled}
            onChange={(v) => update((d) => { d.earring.stud.halo.enabled = v; })} />
          <Row label="Halo stone size" value={`${e.stud.halo.stoneSize.toFixed(2)} mm`}>
            <Slider disabled={!e.stud.halo.enabled} value={[e.stud.halo.stoneSize]} min={0.5} max={1.5} step={0.05}
              onValueChange={([v]) => update((d) => { d.earring.stud.halo.stoneSize = v!; })} />
          </Row>
          <Toggle label="Jacket (removable halo)" checked={e.stud.jacketEnabled}
            onChange={(v) => update((d) => { d.earring.stud.jacketEnabled = v; })} />
          <Row label="Backing">
            <ChipRow value={e.stud.backing}
              onChange={(v) => update((d) => { d.earring.stud.backing = v; })}
              options={([
                ["butterfly", "Butterfly"], ["screw-back", "Screw"], ["lever-back", "Lever"],
                ["omega-back", "Omega"], ["latch-back", "Latch"], ["threaded-nut", "Threaded"],
              ] as [EarringBacking, string][]).map(([v, l]) => ({ v, label: l }))}
            />
          </Row>
          <Row label="Post diameter" value={`${e.stud.postDiameterMm.toFixed(2)} mm`}>
            <Slider value={[e.stud.postDiameterMm]} min={0.6} max={1.2} step={0.05}
              onValueChange={([v]) => update((d) => { d.earring.stud.postDiameterMm = v!; })} />
          </Row>
        </Card>
      )}

      {e.style === "hoop" && (
        <Card title="Hoop Settings" icon={CircleDot}>
          <Row label="Inner diameter" value={`${e.hoop.innerDiameterMm.toFixed(0)} mm`}>
            <Slider value={[e.hoop.innerDiameterMm]} min={10} max={50} step={1}
              onValueChange={([v]) => update((d) => { d.earring.hoop.innerDiameterMm = v!; })} />
          </Row>
          <Row label="Tube width" value={`${e.hoop.tubeWidthMm.toFixed(1)} mm`}>
            <Slider value={[e.hoop.tubeWidthMm]} min={0.8} max={6} step={0.1}
              onValueChange={([v]) => update((d) => { d.earring.hoop.tubeWidthMm = v!; })} />
          </Row>
          <Row label="Cross-section profile">
            <ChipRow value={e.hoop.profile}
              onChange={(v) => update((d) => { d.earring.hoop.profile = v; })}
              options={[
                { v: "round-wire", label: "Round" }, { v: "flat-inside", label: "Flat In" },
                { v: "D-shape", label: "D-Shape" }, { v: "square-tube", label: "Square" },
                { v: "rectangular", label: "Rect" },
              ]}
            />
          </Row>
          <Toggle label="Pavé outside" checked={e.hoop.paveOutside}
            onChange={(v) => update((d) => { d.earring.hoop.paveOutside = v; })} />
          <Toggle label="Pavé inside" checked={e.hoop.paveInside}
            onChange={(v) => update((d) => { d.earring.hoop.paveInside = v; })} />
          <Row label="Pavé stone size" value={`${e.hoop.stoneSize.toFixed(2)} mm`}>
            <Slider value={[e.hoop.stoneSize]} min={0.5} max={2.0} step={0.05}
              onValueChange={([v]) => update((d) => { d.earring.hoop.stoneSize = v!; })} />
          </Row>
          <Row label="Closure">
            <ChipRow value={e.hoop.closure}
              onChange={(v) => update((d) => { d.earring.hoop.closure = v; })}
              options={([
                ["click-top", "Click Top"], ["hinge-snap", "Hinge Snap"],
                ["continuous", "Continuous"], ["huggie", "Huggie"],
              ] as [HoopClosure, string][]).map(([v, l]) => ({ v, label: l }))}
            />
          </Row>
        </Card>
      )}

      {e.style === "drop" && (
        <Card title="Drop Earring" icon={Gem}>
          <Row label="Total length" value={`${e.drop.totalLengthMm.toFixed(0)} mm`}>
            <Slider value={[e.drop.totalLengthMm]} min={15} max={80} step={1}
              onValueChange={([v]) => update((d) => { d.earring.drop.totalLengthMm = v!; })} />
          </Row>
          <Row label="Link style">
            <ChipRow value={e.drop.linkStyle}
              onChange={(v) => update((d) => { d.earring.drop.linkStyle = v; })}
              options={[
                { v: "cable", label: "Cable" }, { v: "box", label: "Box" },
                { v: "singapore", label: "Singapore" }, { v: "rope", label: "Rope" },
                { v: "bar", label: "Bar" }, { v: "figaro", label: "Figaro" },
              ]}
            />
          </Row>
          <Row label="Link length" value={`${e.drop.linkLengthMm.toFixed(0)} mm`}>
            <Slider value={[e.drop.linkLengthMm]} min={4} max={30} step={1}
              onValueChange={([v]) => update((d) => { d.earring.drop.linkLengthMm = v!; })} />
          </Row>
          <div className="grid grid-cols-4 gap-1">
            {(["pear", "oval", "heart", "marquise", "round-brilliant", "cushion", "teardrop", "briolette"] as StoneShape[]).filter(s => ALL_SHAPES.includes(s)).map((s) => (
              <StoneShapeThumb key={s} shape={s} active={e.drop.bottomShape === s}
                onClick={() => update((d) => { d.earring.drop.bottomShape = s; })} />
            ))}
          </div>
          <Row label="Bottom stone size" value={`${e.drop.bottomDiameterMm.toFixed(1)} mm`}>
            <Slider value={[e.drop.bottomDiameterMm]} min={4} max={15} step={0.5}
              onValueChange={([v]) => update((d) => { d.earring.drop.bottomDiameterMm = v!; })} />
          </Row>
          <Row label="Bottom setting">
            <ChipRow value={e.drop.bottomSetting}
              onChange={(v) => update((d) => { d.earring.drop.bottomSetting = v; })}
              options={[
                { v: "bezel", label: "Bezel" }, { v: "solitaire", label: "Prong" },
                { v: "channel", label: "Channel" }, { v: "tension", label: "Tension" },
              ]}
            />
          </Row>
          <Toggle label="Swing freely" checked={e.drop.swingEnabled}
            onChange={(v) => update((d) => { d.earring.drop.swingEnabled = v; })} />
        </Card>
      )}

      <Card title="Metal" icon={Disc3}>
        <Select value={recipe.metal}
          onValueChange={(v) => update((d) => { d.metal = v as MetalType; })}>
          <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(METAL_SPECS) as MetalType[]).map((m) => (
              <SelectItem key={m} value={m}>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full border border-black/40"
                    style={{ background: METAL_SPECS[m as keyof typeof METAL_SPECS]?.color ?? "#ccc" }} />
                  {METAL_SPECS[m as keyof typeof METAL_SPECS]?.name ?? m}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>
    </>
  );
}

// ─── BANGLE SECTION ───────────────────────────────────────────────────────────

function BangleSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const b = recipe.bangle;
  return (
    <>
      <Card title="Bangle Base" icon={Watch}>
        <Row label="Inner diameter" value={`${b.innerDiameterMm.toFixed(0)} mm`}>
          <Slider value={[b.innerDiameterMm]} min={45} max={70} step={0.5}
            onValueChange={([v]) => update((d) => { d.bangle.innerDiameterMm = v!; })} />
        </Row>
        <Row label="Width" value={`${b.widthMm.toFixed(1)} mm`}>
          <Slider value={[b.widthMm]} min={2} max={20} step={0.5}
            onValueChange={([v]) => update((d) => { d.bangle.widthMm = v!; })} />
        </Row>
        <Row label="Thickness" value={`${b.thicknessMm.toFixed(1)} mm`}>
          <Slider value={[b.thicknessMm]} min={1.5} max={8} step={0.25}
            onValueChange={([v]) => update((d) => { d.bangle.thicknessMm = v!; })} />
        </Row>
        <Row label="Cross-section">
          <ChipRow value={b.profile}
            onChange={(v) => update((d) => { d.bangle.profile = v; })}
            options={([
              ["flat", "Flat"], ["dome", "Dome"], ["D-shape", "D-Shape"],
              ["oval-section", "Oval"], ["square", "Square"],
            ] as [BangleProfile, string][]).map(([v, l]) => ({ v, label: l }))}
          />
        </Row>
        <Row label="Opening">
          <ChipRow value={b.opening}
            onChange={(v) => update((d) => { d.bangle.opening = v; })}
            options={([
              ["full-round", "Solid"], ["hinged-box", "Hinged Box"],
              ["hinged-toggle", "Hinged Toggle"], ["open-cuff", "Open Cuff"],
              ["expandable", "Expandable"],
            ] as [BangleOpening, string][]).map(([v, l]) => ({ v, label: l }))}
          />
        </Row>
        <Row label="Surface finish">
          <ChipRow value={b.surfaceFinish}
            onChange={(v) => update((d) => { d.bangle.surfaceFinish = v; })}
            options={([
              ["high-polish", "Polish"], ["matte", "Matte"], ["brushed", "Brushed"],
              ["hammered", "Hammered"], ["satin", "Satin"],
            ] as [SurfaceFinish, string][]).map(([v, l]) => ({ v, label: l }))}
          />
        </Row>
      </Card>

      <Card title="Stone Setting" icon={Sparkles}>
        <Toggle label="Pavé stones" checked={b.pave.enabled}
          onChange={(v) => update((d) => { d.bangle.pave.enabled = v; })} />
        <Row label="Pavé stone size" value={`${b.pave.stoneSize.toFixed(2)} mm`}>
          <Slider disabled={!b.pave.enabled} value={[b.pave.stoneSize]} min={0.5} max={2.0} step={0.05}
            onValueChange={([v]) => update((d) => { d.bangle.pave.stoneSize = v!; })} />
        </Row>
        <Row label="Pavé coverage">
          <ChipRow disabled={!b.pave.enabled} value={b.pave.coverage}
            onChange={(v) => update((d) => { d.bangle.pave.coverage = v; })}
            options={[
              { v: "outside", label: "Outside" }, { v: "inside", label: "Inside" },
              { v: "both", label: "Both" }, { v: "top-row", label: "Top Row" },
            ]}
          />
        </Row>
        <Toggle label="Channel stones" checked={b.channel.enabled}
          onChange={(v) => update((d) => { d.bangle.channel.enabled = v; })} />
        <Row label="Channel stone size" value={`${b.channel.stoneSize.toFixed(2)} mm`}>
          <Slider disabled={!b.channel.enabled} value={[b.channel.stoneSize]} min={1.0} max={3.0} step={0.1}
            onValueChange={([v]) => update((d) => { d.bangle.channel.stoneSize = v!; })} />
        </Row>
        <Row label="Channel count" value={b.channel.count}>
          <Slider disabled={!b.channel.enabled} value={[b.channel.count]} min={4} max={30} step={1}
            onValueChange={([v]) => update((d) => { d.bangle.channel.count = v!; })} />
        </Row>
      </Card>

      <Card title="Details" icon={Grip}>
        <Toggle label="Milgrain border" checked={b.milgrain.enabled}
          onChange={(v) => update((d) => { d.bangle.milgrain.enabled = v; })} />
        <Row label="Milgrain width" value={`${b.milgrain.widthMm.toFixed(2)} mm`}>
          <Slider disabled={!b.milgrain.enabled} value={[b.milgrain.widthMm]} min={0.2} max={1.2} step={0.05}
            onValueChange={([v]) => update((d) => { d.bangle.milgrain.widthMm = v!; })} />
        </Row>
        <Row label="Inside engraving">
          <Input maxLength={40} value={b.engraving} placeholder="e.g. My Love"
            onChange={(e) => update((d) => { d.bangle.engraving = e.target.value; })} />
        </Row>
      </Card>

      <Card title="Metal" icon={Disc3}>
        <Select value={recipe.metal}
          onValueChange={(v) => update((d) => { d.metal = v as MetalType; })}>
          <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(METAL_SPECS) as MetalType[]).map((m) => (
              <SelectItem key={m} value={m}>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full border border-black/40"
                    style={{ background: METAL_SPECS[m as keyof typeof METAL_SPECS]?.color ?? "#ccc" }} />
                  {METAL_SPECS[m as keyof typeof METAL_SPECS]?.name ?? m}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>
    </>
  );
}

// ─── SETTINGS / RENDER ────────────────────────────────────────────────────────

function SettingsSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  return (
    <Card title="Render Studio" icon={SettingsIcon}>
      <Row label="HDRI environment">
        <Select value={recipe.renderStudio.hdri}
          onValueChange={(v) => update((d) => { d.renderStudio.hdri = v; })}>
          <SelectTrigger className="h-8 bg-[#F0F0F0]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[["studio", "Studio"], ["warehouse", "Warehouse"], ["sunset", "Sunset"],
              ["dark-studio", "Dark Studio"], ["jewelry-box", "Jewelry Box"],
              ["showroom", "Showroom"], ["overcast", "Overcast Sky"],
            ].map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      <Row label="Background">
        <ChipRow value={recipe.renderStudio.background}
          onChange={(v) => update((d) => { d.renderStudio.background = v; })}
          options={[
            { v: "white", label: "White" }, { v: "black", label: "Black" },
            { v: "transparent", label: "Alpha" }, { v: "gradient", label: "Gradient" },
            { v: "velvet", label: "Velvet" },
          ]}
        />
      </Row>
      <Row label="Exposure" value={recipe.renderStudio.exposure.toFixed(2)}>
        <Slider value={[recipe.renderStudio.exposure]} min={0.2} max={3.0} step={0.05}
          onValueChange={([v]) => update((d) => { d.renderStudio.exposure = v!; })} />
      </Row>
      <Row label="Bloom" value={recipe.renderStudio.bloomIntensity.toFixed(2)}>
        <Slider value={[recipe.renderStudio.bloomIntensity]} min={0} max={4} step={0.05}
          onValueChange={([v]) => update((d) => { d.renderStudio.bloomIntensity = v!; })} />
      </Row>
      <Row label="Focal length" value={`${recipe.renderStudio.focalLength} mm`}>
        <Slider value={[recipe.renderStudio.focalLength]} min={28} max={200} step={1}
          onValueChange={([v]) => update((d) => { d.renderStudio.focalLength = v!; })} />
      </Row>
      <Toggle label="Depth of field" checked={recipe.renderStudio.dof.enabled}
        onChange={(v) => update((d) => { d.renderStudio.dof.enabled = v; })} />
      <Row label="f-stop" value={`f/${recipe.renderStudio.dof.fStop.toFixed(1)}`}>
        <Slider disabled={!recipe.renderStudio.dof.enabled}
          value={[recipe.renderStudio.dof.fStop]} min={0.95} max={16} step={0.05}
          onValueChange={([v]) => update((d) => { d.renderStudio.dof.fStop = v!; })} />
      </Row>
      <Toggle label="Turntable animation" checked={recipe.renderStudio.turntable}
        onChange={(v) => update((d) => { d.renderStudio.turntable = v; })} />
      <Row label="Turntable speed" value={recipe.renderStudio.turntableSpeed.toFixed(1)}>
        <Slider disabled={!recipe.renderStudio.turntable}
          value={[recipe.renderStudio.turntableSpeed]} min={0.1} max={5} step={0.1}
          onValueChange={([v]) => update((d) => { d.renderStudio.turntableSpeed = v!; })} />
      </Row>
    </Card>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function DashboardSection() {
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const setSection = useUIStore((s) => s.setSection);
  const reset = useRecipeStore((s) => s.reset);
  const metals = Object.keys(METAL_SPECS) as MetalType[];
  const SHAPES: StoneShape[] = ["round-brilliant", "oval", "pear", "princess", "emerald", "cushion", "marquise", "asscher", "radiant", "heart"];
  const galleryPresets = PRESETS.filter((p) => p.category === "Gallery").slice(0, 6);

  return (
    <>
      <Card title="Quick Style" icon={Wand2}>
        <div className="grid grid-cols-3 gap-1.5">
          {galleryPresets.map((p) => (
            <button key={p.id} onClick={() => update((d) => p.apply(d))}
              className="group flex flex-col items-center gap-1 rounded-md border border-[#A8A8A8] bg-[#F0F0F0] p-2 hover:border-[#0066CC]/50">
              <svg viewBox="0 0 60 60" className="h-9 w-9">
                <ellipse cx="30" cy="38" rx="16" ry="16" fill="none" stroke="#1A7DD8" strokeWidth="2.5" />
                <polygon points="30,14 36,24 30,32 24,24" fill="#1A7DD8" />
              </svg>
              <span className="text-[10px] font-medium text-zinc-700">{p.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Diamond Shape" icon={Diamond}>
        <div className="grid grid-cols-5 gap-1" data-testid="dashboard-shape-grid">
          {SHAPES.map((s) => (
            <StoneShapeThumb key={s} shape={s} active={recipe.centerStone.shape === s}
              onClick={() => update((d) => { d.centerStone.shape = s; })} />
          ))}
        </div>
      </Card>

      <Card title="Metal" icon={Disc3}>
        <div className="grid grid-cols-4 gap-1.5">
          {metals.map((m) => {
            const spec = METAL_SPECS[m as keyof typeof METAL_SPECS];
            return (
              <button key={m} onClick={() => update((d) => { d.metal = m; })}
                title={spec?.name ?? m}
                className={cn(
                  "flex flex-col items-center gap-1 rounded border p-1.5 transition-all",
                  recipe.metal === m ? "border-[#0066CC]" : "border-[#A8A8A8] hover:border-zinc-500",
                )}>
                <span className="block h-6 w-6 rounded-full border border-black/40 shadow-inner"
                  style={{ background: `radial-gradient(circle at 35% 30%, #ffffff60, ${spec?.color ?? "#ccc"} 60%)` }} />
                <span className="text-[9px] leading-tight text-zinc-700">{spec?.name?.split(" ").pop() ?? m}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Active Recipe" icon={LayoutDashboard}>
        <div className="space-y-1.5 text-xs">
          {[
            { l: "Category", v: recipe.jewelryCategory.replace("-", " "), s: "ring" as const },
            { l: "Metal", v: METAL_SPECS[recipe.metal as keyof typeof METAL_SPECS]?.name ?? recipe.metal, s: "ring" as const },
            { l: "Stone", v: `${recipe.centerStone.shape.replace(/-/g, " ")} · ${recipe.centerStone.diameter}mm`, s: "centerStone" as const },
            { l: "Setting", v: recipe.setting.type.replace(/-/g, " "), s: "centerStone" as const },
            { l: "Shank", v: recipe.shank.style.replace(/-/g, " "), s: "galleryRails" as const },
            { l: "Prongs", v: `${recipe.prongs.count} × ${recipe.prongs.style}`, s: "galleryRails" as const },
            { l: "Halo", v: recipe.halo.enabled ? `${recipe.halo.stoneCount} stones${recipe.halo.doubleHalo ? " (dbl)" : ""}` : "off", s: "sideStones" as const },
            { l: "Pavé", v: recipe.pave.enabled ? `${recipe.pave.coverage} · ${recipe.pave.setStyle}` : "off", s: "pave" as const },
            { l: "Eternity", v: recipe.eternity.enabled ? `${recipe.eternity.totalCount} st · ${recipe.eternity.setStyle}` : "off", s: "eternity" as const },
            { l: "Milgrain", v: recipe.milgrain.enabled ? `${recipe.milgrain.widthMm}mm` : "off", s: "milgrain" as const },
            { l: "Finish", v: recipe.ringBase.surfaceFinish.replace(/-/g, " "), s: "finish" as const },
            { l: "Engraving", v: recipe.engraving.text || "—", s: "engraving" as const },
          ].map((row) => (
            <button key={row.l} onClick={() => setSection(row.s)}
              className="flex w-full items-center justify-between rounded border border-transparent px-1.5 py-1 text-left hover:border-[#A8A8A8] hover:bg-[#F0F0F0]">
              <span className="text-zinc-500">{row.l}</span>
              <span className="capitalize text-zinc-800">{row.v}</span>
            </button>
          ))}
        </div>
        <button onClick={() => reset()}
          className="mt-2 w-full rounded border border-[#A8A8A8] bg-[#F0F0F0] px-2 py-1.5 text-[11px] text-zinc-400 hover:border-red-700/50 hover:text-red-700"
          data-testid="btn-reset-recipe">
          Reset to default
        </button>
      </Card>
    </>
  );
}

// ─── Section map ──────────────────────────────────────────────────────────────
const SECTIONS: Record<string, React.FC> = {
  dashboard:    DashboardSection,
  // ring
  ring:         RingSection,
  centerStone:  CenterStoneSection,
  sideStones:   SideStonesSection,
  galleryRails: GalleryRailsSection,
  bandDetails:  BandDetailsSection,
  pave:         PaveSection,
  eternity:     EternitySection,
  threeStone:   ThreeStoneSection,
  milgrain:     MilgrainSection,
  filigree:     FiligreSection,
  finish:       FinishSection,
  engraving:    EngravingSection,
  // other categories
  pendant:      PendantSection,
  earring:      EarringSection,
  bangle:       BangleSection,
  // shared
  settings:     SettingsSection,
  image2cad:    ImageToCADPanel,
};

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES: { id: JewelryCategory; label: string; short: string }[] = [
  { id: "ring",         label: "Ring",    short: "Ring" },
  { id: "pendant",      label: "Pendant", short: "Pend" },
  { id: "earring-stud", label: "Stud",    short: "Stud" },
  { id: "earring-hoop", label: "Hoop",    short: "Hoop" },
  { id: "bangle",       label: "Bangle",  short: "Bngl" },
];

const DEFAULT_SECTION_BY_CATEGORY: Record<JewelryCategory, string> = {
  ring:           "ring",
  pendant:        "pendant",
  "earring-stud": "earring",
  "earring-hoop": "earring",
  bangle:         "bangle",
};

export function LeftPanel() {
  const section = useUIStore((s) => s.section);
  const setSection = useUIStore((s) => s.setSection);
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const Section = SECTIONS[section] ?? DashboardSection;

  const handleCategoryChange = (cat: JewelryCategory) => {
    update((d) => { d.jewelryCategory = cat; });
    setSection(DEFAULT_SECTION_BY_CATEGORY[cat] as Parameters<typeof setSection>[0]);
  };

  return (
    <aside
      className="flex h-full w-[85vw] max-w-[320px] shrink-0 flex-col border-r border-[#A8A8A8] bg-[#F0F0F0] shadow-xl md:w-[300px] md:shadow-none"
      data-testid="left-panel"
    >
      {/* ── Category strip ── */}
      <div className="flex shrink-0 gap-1 border-b border-[#C0C0C0] bg-[#E8E8E8] px-2 py-1.5">
        {CATEGORIES.map((c) => {
          const active = recipe.jewelryCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCategoryChange(c.id)}
              title={c.label}
              className={cn(
                "flex-1 rounded py-1 text-[10px] font-bold transition-all",
                active
                  ? "bg-[#0066CC] text-white shadow-sm"
                  : "text-zinc-500 hover:bg-white/70 hover:text-zinc-700",
              )}
            >
              {c.short}
            </button>
          );
        })}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          <Section />
        </div>
      </ScrollArea>
    </aside>
  );
}
