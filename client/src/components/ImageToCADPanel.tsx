import { useRef, useState } from "react";
import { Image, Upload, Cpu, CheckCircle2, AlertCircle, Download, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useRecipeStore, type ParametricRecipe } from "@/store/recipe";
import { toast } from "sonner";

interface CadAnalysisResult {
  jewelryCategory: ParametricRecipe["jewelryCategory"];
  metal: ParametricRecipe["metal"];
  centerStone: { shape: ParametricRecipe["centerStone"]["shape"]; diameterMm: number; material: ParametricRecipe["centerStone"]["material"]; };
  settingType: ParametricRecipe["setting"]["type"];
  prongCount: 4 | 6 | 8;
  hasHalo: boolean;
  hasPave: boolean;
  shankStyle: ParametricRecipe["shank"]["style"];
  bandWidthMm: number;
  description: string;
  confidence: number;
}

function ConfidenceBadge({ v }: { v: number }) {
  const pct = Math.round(v * 100);
  const color = pct >= 80 ? "#16a34a" : pct >= 60 ? "#d97706" : "#dc2626";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
      style={{ borderColor: color, color }}>
      {pct}% confidence
    </span>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded border border-[#C8C8C8] bg-[#FAFAFA]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold text-zinc-700"
      >
        {title}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="space-y-1.5 border-t border-[#C8C8C8] px-3 py-2">{children}</div>}
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string | number | boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-zinc-500">{k}</span>
      <span className="text-[11px] font-medium capitalize text-zinc-800">{String(v).replace(/-/g, " ")}</span>
    </div>
  );
}

// Build a recipe patch from the AI analysis result
function buildRecipePatch(r: CadAnalysisResult): Partial<ParametricRecipe> {
  return {
    jewelryCategory: r.jewelryCategory,
    metal: r.metal,
    centerStone: {
      shape: r.centerStone.shape,
      diameter: r.centerStone.diameterMm,
      depthRatio: 0.61,
      material: r.centerStone.material,
    },
    setting: {
      type: r.settingType,
      seatDepth: 1.2,
      colletHeight: 0.8,
      bezelWallThickness: 0.5,
      eastWest: false,
    },
    prongs: {
      count: r.prongCount,
      style: "claw",
      thickness: 0.8,
      height: 1.2,
      tipStyle: "round",
    },
    shank: {
      style: r.shankStyle,
      splitGapMm: 1.2,
      twistTurns: 1.5,
      galleryRail: true,
      undergalleryStyle: "open",
    },
    ringBase: {
      sizeSystem: "US",
      sizeNumber: 7,
      comfortFit: true,
      width: Math.max(1.5, r.bandWidthMm),
      thickness: 1.8,
      profile: "comfort-dome",
      taperRatio: 0.15,
      surfaceFinish: "high-polish",
      fingerGroove: false,
    },
    halo: {
      enabled: r.hasHalo,
      stoneCount: 18,
      stoneSize: 1.2,
      spacing: 0.1,
      doubleHalo: false,
      floatingHalo: false,
    },
    pave: {
      enabled: r.hasPave,
      coverage: "half",
      stoneSize: 1.0,
      stoneSpacing: 0.12,
      rows: 1,
      setStyle: "pave",
      startAngleDeg: 45,
    },
  };
}

export function ImageToCADPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useRecipeStore((s) => s.load);
  const currentRecipe = useRecipeStore((s) => s.recipe);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [status, setStatus] = useState<"idle" | "analyzing" | "ready" | "error">("idle");
  const [result, setResult] = useState<CadAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageDataUrl(e.target!.result as string);
      setImageName(file.name);
      setStatus("idle");
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!imageDataUrl) return;
    setStatus("analyzing");
    setResult(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai/cad/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imageDataUrl }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `Server error ${res.status}`);
      }
      setResult(data as CadAnalysisResult);
      setStatus("ready");
    } catch (err) {
      setErrorMsg((err as Error).message || "Analysis failed");
      setStatus("error");
    }
  };

  const handleApply = () => {
    if (!result) return;
    const patch = buildRecipePatch(result);
    load({ ...currentRecipe, ...patch });
    toast.success("AI parameters applied to 3D model — check the viewport");
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-lg border border-[#0066CC]/30 bg-gradient-to-br from-[#E8F0FF] to-[#F0F8FF] p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066CC]">
            <Image className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-zinc-900">Image → CAD</div>
            <div className="text-[10px] text-zinc-500">Upload any jewelry photo — AI extracts parameters &amp; builds a 3D model</div>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="group relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-[#A8A8A8] bg-[#F8F8F8] transition-all hover:border-[#0066CC] hover:bg-[#E8F0FF]/40"
        style={{ minHeight: imageDataUrl ? "auto" : 120 }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        {imageDataUrl ? (
          <div className="relative">
            <img src={imageDataUrl} alt="Reference"
              className="h-52 w-full object-contain bg-white" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
              <span className="hidden rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-zinc-800 group-hover:block">
                Change image
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6">
            <Upload className="h-8 w-8 text-zinc-400 group-hover:text-[#0066CC]" />
            <div className="text-center">
              <div className="text-[12px] font-semibold text-zinc-700">Drop jewelry photo here</div>
              <div className="text-[10px] text-zinc-400">or click to browse — JPG, PNG, WEBP</div>
            </div>
          </div>
        )}
      </div>

      {imageDataUrl && imageName && (
        <div className="flex items-center gap-2 rounded border border-[#A8A8A8] bg-[#F0F0F0] px-3 py-1.5">
          <Image className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <span className="truncate text-[11px] text-zinc-600">{imageName}</span>
        </div>
      )}

      {/* Analyze button */}
      {imageDataUrl && status !== "analyzing" && (
        <button
          onClick={handleAnalyze}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1A7DD8] to-[#0066CC] py-2.5 text-[12px] font-bold text-white shadow-md transition-all hover:from-[#1A7DD8]/90 hover:to-[#0066CC]/90 active:scale-[0.98]"
        >
          <Cpu className="h-4 w-4" />
          Analyze &amp; Extract Parameters
        </button>
      )}

      {/* Analyzing */}
      {status === "analyzing" && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[#0066CC]/20 bg-[#E8F0FF]/40 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
          <div className="text-center">
            <div className="text-[12px] font-semibold text-zinc-800">AI is analyzing your jewelry…</div>
            <div className="text-[10px] text-zinc-500">Detecting metal, stone, setting, shank style</div>
          </div>
          {/* Animated detection steps */}
          <div className="w-full max-w-[220px] space-y-1.5">
            {["Detecting jewelry type", "Identifying metal", "Reading stone shape", "Mapping setting style", "Building parameters"].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#D0E4FF]">
                  <div
                    className="h-full rounded-full bg-[#0066CC] transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (Date.now() % 5000) / 50 - i * 20))}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <div>
            <div className="text-[11px] font-semibold text-red-700">Analysis failed</div>
            <div className="text-[10px] text-red-600">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {status === "ready" && result && (
        <div className="space-y-2">
          {/* Success banner */}
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-[11px] font-bold text-green-800">Parameters extracted</div>
                <div className="text-[9px] text-green-600">{result.description}</div>
              </div>
            </div>
            <ConfidenceBadge v={result.confidence} />
          </div>

          {/* Detected params */}
          <Section title="Jewelry Type & Metal" defaultOpen>
            <Kv k="Category" v={result.jewelryCategory} />
            <Kv k="Metal" v={result.metal} />
          </Section>

          <Section title="Center Stone" defaultOpen>
            <Kv k="Shape" v={result.centerStone.shape} />
            <Kv k="Est. diameter" v={`${result.centerStone.diameterMm} mm`} />
            <Kv k="Material" v={result.centerStone.material} />
          </Section>

          <Section title="Setting & Prongs" defaultOpen>
            <Kv k="Setting" v={result.settingType} />
            <Kv k="Prong count" v={result.prongCount} />
            <Kv k="Shank style" v={result.shankStyle} />
            <Kv k="Band width" v={`${result.bandWidthMm} mm`} />
            <Kv k="Halo" v={result.hasHalo ? "Yes" : "No"} />
            <Kv k="Pavé" v={result.hasPave ? "Yes" : "No"} />
          </Section>

          {/* Apply button */}
          <button
            onClick={handleApply}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#0066CC] bg-[#0066CC] py-3 text-[13px] font-bold text-white shadow-lg transition-all hover:bg-[#005BB5] active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            Build 3D Model from These Parameters
          </button>

          <p className="text-center text-[9px] text-zinc-400">
            Parameters will be applied to the viewport. Fine-tune using the left panels. Export STL via the top bar.
          </p>

          <button
            onClick={handleAnalyze}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-[#A8A8A8] bg-[#F0F0F0] py-2 text-[11px] text-zinc-600 hover:bg-white"
          >
            <Cpu className="h-3 w-3" /> Re-analyze
          </button>
        </div>
      )}

      {/* How it works */}
      {status === "idle" && !imageDataUrl && (
        <div className="rounded-lg border border-[#A8A8A8] bg-[#F8F8F8] p-3">
          <div className="mb-2 text-[11px] font-bold text-zinc-700">How Image→CAD works</div>
          <ol className="space-y-1.5">
            {[
              "Upload any jewelry photo (sketch, product photo, render)",
              "AI vision model detects: category, metal, stone shape, setting type, shank style",
              "Parameters are applied to the live 3D OpenCascade B-Rep model",
              "Fine-tune parameters in the left panel, then export STL / STEP",
            ].map((step, i) => (
              <li key={i} className="flex gap-2 text-[10px] text-zinc-600">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0066CC] text-[8px] font-bold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
