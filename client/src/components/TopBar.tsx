import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2, Save, Upload, Download, ChevronDown, Pencil, Home, Menu, SlidersHorizontal, Lock, Unlock } from "lucide-react";
import { BBLogo } from "./BBLogo";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useRecipeStore } from "@/store/recipe";
import { useUIStore, type Mode } from "@/store/ui";
import { exportRecipeJSON, importRecipeJSON } from "@/export/exporters";
import { exportSTEP, exportIGES, exportSTL } from "@/kernel/export";
import { getOC } from "@/kernel/init";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProjects } from "../context/ProjectContext";

interface SavedDesign {
  id: string;
  name: string;
  savedAt: string;
  recipe: ReturnType<typeof useRecipeStore.getState>["recipe"];
}

const SAVED_KEY = "atelier-cad-saved-v1";

function loadSavedDesigns(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveDesignsList(list: SavedDesign[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

const MODES: { v: Mode; label: string }[] = [
  { v: "design", label: "Design" },
  { v: "render", label: "Render" },
  { v: "analyze", label: "Analyze" },
];

interface TopBarProps {
  onGoHome?: () => void;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
}

export function TopBar({ onGoHome, onToggleLeft, onToggleRight }: TopBarProps = {}) {
  const recipe = useRecipeStore((s) => s.recipe);
  const undo = useRecipeStore((s) => s.undo);
  const redo = useRecipeStore((s) => s.redo);
  const load = useRecipeStore((s) => s.load);
  const designName = useUIStore((s) => s.designName);
  const setDesignName = useUIStore((s) => s.setDesignName);
  const mode = useUIStore((s) => s.mode);
  const setMode = useUIStore((s) => s.setMode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedList, setSavedList] = useState<SavedDesign[]>(() => loadSavedDesigns());
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(designName);
  const { activeProject, setCadUnlocked } = useProjects();
  const cadUnlocked = activeProject?.cadUnlocked ?? false;

  const handleToggleCad = async () => {
    if (!activeProject) return;
    const next = !cadUnlocked;
    await setCadUnlocked(activeProject.id, next);
    toast.success(next ? "CAD unlocked — customer can now view the 3D studio" : "CAD locked — hidden from customer");
  };

  type WindowBuilder = {
    result: { assembly: { metalShape: unknown; centerStoneShape: unknown; haloShape: unknown | null } } | null;
    building: boolean;
    kernelReady: boolean;
    error: string | null;
    build: () => Promise<{ assembly: { metalShape: unknown; centerStoneShape: unknown; haloShape: unknown | null } } | null>;
  };
  const getBuilder = () => (window as unknown as { __ringBuilder?: WindowBuilder }).__ringBuilder ?? null;

  const handleSave = () => {
    const next: SavedDesign = {
      id: crypto.randomUUID(),
      name: designName,
      savedAt: new Date().toISOString(),
      recipe,
    };
    const updated = [next, ...savedList];
    saveDesignsList(updated);
    setSavedList(updated);
    toast.success(`Saved "${designName}"`);
  };

  const handleLoad = (d: SavedDesign) => {
    load(d.recipe);
    setDesignName(d.name);
    toast.success(`Loaded "${d.name}"`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const r = await importRecipeJSON(f);
      load(r);
      toast.success("Recipe imported");
    } catch (err) {
      toast.error("Failed to parse JSON: " + (err as Error).message);
    }
    e.target.value = "";
  };

  // Build the B-Rep on-demand. The kernel is heavy and would freeze the UI if it
  // ran on every recipe change, so we only invoke it when the user actually exports.
  const collectShapes = async (label: string) => {
    const b = getBuilder();
    if (!b) {
      toast.error(`${label}: 3D viewport not ready yet — open the design view first`, { duration: 6000 });
      return null;
    }
    let res = b.result;
    if (!res) {
      const tid = toast.loading(
        b.kernelReady
          ? "Building B-Rep solid (a few seconds)…"
          : "Loading CAD kernel (~30 MB) then building solid — please wait…",
        { duration: 60000 },
      );
      try {
        res = await b.build();
      } catch (e) {
        toast.dismiss(tid);
        const msg = (e as Error).message || String(e);
        toast.error(`${label}: kernel error — ${msg}`, { duration: 9000 });
        return null;
      }
      toast.dismiss(tid);
      if (!res) {
        const errMsg = b.error || "kernel returned no result (likely failed to load WASM — check your network)";
        toast.error(`${label}: ${errMsg}`, { duration: 9000 });
        return null;
      }
    }
    const oc = getOC();
    if (!oc) { toast.error(`${label}: kernel not initialised`, { duration: 6000 }); return null; }
    const a = res.assembly;
    const shapes = [a.metalShape, a.centerStoneShape, a.haloShape].filter(Boolean);
    return { oc, shapes, metal: a.metalShape };
  };

  const handleExportSTEP = async () => {
    const c = await collectShapes("STEP export"); if (!c) return;
    try { exportSTEP(c.oc, c.shapes); toast.success("STEP exported (real B-Rep)"); }
    catch (e) {
      console.error("[BBCad] STEP export failed:", e);
      toast.error("STEP export failed: " + ((e as Error).message || String(e)), { duration: 9000 });
    }
  };
  const handleExportIGES = async () => {
    const c = await collectShapes("IGES export"); if (!c) return;
    try { exportIGES(c.oc, c.shapes); toast.success("IGES exported"); }
    catch (e) {
      console.error("[BBCad] IGES export failed:", e);
      toast.error("IGES export failed: " + ((e as Error).message || String(e)), { duration: 9000 });
    }
  };
  const handleExportSTL = async () => {
    const c = await collectShapes("STL export"); if (!c) return;
    try { exportSTL(c.oc, c.metal); toast.success("STL exported (3D-print ready)"); }
    catch (e) {
      console.error("[BBCad] STL export failed:", e);
      toast.error("STL export failed: " + ((e as Error).message || String(e)), { duration: 9000 });
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (cmd && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (cmd && (e.key === "Z" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      else if (cmd && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const commitName = () => {
    const v = tempName.trim() || "Untitled Ring Design";
    setDesignName(v);
    setTempName(v);
    setEditingName(false);
  };

  return (
    <header
      className="flex h-[52px] shrink-0 items-center justify-between gap-1 border-b border-[#A8A8A8] bg-[#F0F0F0] px-2 md:px-3"
      data-testid="topbar"
    >
      {/* LEFT: brand + design name */}
      <div className="flex flex-1 items-center gap-2 md:gap-3 min-w-0">
        {/* Mobile-only: hamburger to open the parameter panel */}
        {onToggleLeft && (
          <button
            type="button"
            onClick={onToggleLeft}
            title="Show parameters"
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-[#A8A8A8] bg-white text-zinc-700 md:hidden"
            data-testid="topbar-menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            title="Back to home"
            className="hidden h-8 w-8 items-center justify-center rounded-sm border border-transparent text-zinc-600 hover:border-[#A8A8A8] hover:bg-white hover:text-[#0066CC] md:flex"
            data-testid="topbar-home"
          >
            <Home className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2 rounded-sm px-1 py-0.5 hover:bg-white/60"
          title="BBCad — back to home"
        >
          <BBLogo size={28} />
          <div className="flex items-baseline gap-1.5">
            <span style={{ fontFamily: "Segoe UI, system-ui, sans-serif" }} className="text-[15px] font-bold tracking-tight text-zinc-900 md:text-[17px]">
              BB<span className="text-[#0066CC]">Cad</span>
            </span>
            <span className="hidden rounded bg-gradient-to-r from-[#1A7DD8] to-[#0066CC] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E8E8E8] sm:inline">
              Studio
            </span>
          </div>
        </button>

        <div className="ml-2 hidden items-center gap-1.5 rounded-md border border-transparent px-2 py-1 hover:border-[#A8A8A8] md:ml-4 md:flex min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") { setTempName(designName); setEditingName(false); }
              }}
              className="w-56 rounded border border-[#909090] bg-[#FFFFFF] px-2 py-0.5 text-sm text-zinc-900 outline-none focus:border-[#0066CC]"
              data-testid="input-design-name"
            />
          ) : (
            <button
              onClick={() => { setTempName(designName); setEditingName(true); }}
              className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900"
              data-testid="btn-design-name"
            >
              <span className="max-w-[14rem] truncate">{designName}</span>
              <Pencil className="h-3 w-3 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* CENTER: mode tabs (subtle gold-underlined segments) — hidden on small phones */}
      <div className="hidden items-center gap-1 rounded-md border border-[#B8B8B8] bg-[#F8F8F8] p-0.5 sm:flex" data-testid="mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.v}
            onClick={() => setMode(m.v)}
            data-testid={`mode-${m.v}`}
            className={cn(
              "relative rounded px-5 py-1.5 text-xs font-medium transition-colors",
              mode === m.v
                ? "bg-[#E8E8E8] text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {m.label}
            {mode === m.v && (
              <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-[#0066CC] to-transparent" />
            )}
          </button>
        ))}
      </div>

      {/* RIGHT: undo/redo + save/export */}
      <div className="flex flex-1 items-center justify-end gap-1 md:gap-1.5">
        <Button variant="ghost" size="sm" onClick={undo} title="Undo (Ctrl+Z)" data-testid="btn-undo" className="hidden sm:inline-flex">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={redo} title="Redo (Ctrl+Shift+Z)" data-testid="btn-redo" className="hidden sm:inline-flex">
          <Redo2 className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} title="Import JSON" data-testid="btn-import" className="hidden md:inline-flex">
          <Upload className="h-4 w-4" />
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />

        {activeProject && (
          <button
            type="button"
            onClick={handleToggleCad}
            title={cadUnlocked ? "CAD is shared with customer — click to lock" : "CAD is hidden from customer — click to share"}
            data-testid="btn-cad-lock"
            className={cn(
              "flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-colors",
              cadUnlocked
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-[#A8A8A8] bg-white text-zinc-500 hover:text-zinc-700 hover:border-zinc-400",
            )}
          >
            {cadUnlocked
              ? <><Unlock className="h-3.5 w-3.5" /><span className="hidden sm:inline">Shared</span></>
              : <><Lock className="h-3.5 w-3.5" /><span className="hidden sm:inline">Locked</span></>
            }
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 border-[#A8A8A8] bg-[#FFFFFF] text-zinc-800" data-testid="btn-load">
              <Save className="mr-1 h-3.5 w-3.5" /> Save
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={handleSave}>Save current design</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Saved designs</DropdownMenuLabel>
            {savedList.length === 0 ? (
              <DropdownMenuItem disabled>No saved designs yet</DropdownMenuItem>
            ) : savedList.map((d) => (
              <DropdownMenuItem key={d.id} onClick={() => handleLoad(d)}>
                <div className="flex flex-col">
                  <span>{d.name}</span>
                  <span className="text-[10px] text-zinc-500">{new Date(d.savedAt).toLocaleString()}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1 border border-[#A8A8A8] bg-gradient-to-b from-[#FAFAFA] to-[#E0E0E0] text-zinc-800 hover:from-[#FFFFFF] hover:to-[#D8D8D8]" data-testid="btn-export">
              <Download className="mr-1 h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-zinc-500">CAD (B-Rep)</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExportSTEP}>STEP (.step) — manufacturing</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportIGES}>IGES (.iges)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-zinc-500">Mesh</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExportSTL}>STL (.stl) — 3D printing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportRecipeJSON(recipe)}>Recipe JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile-only: open the right inspector (B-Rep stats / pricing) */}
        {onToggleRight && (
          <button
            type="button"
            onClick={onToggleRight}
            title="Show properties"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-sm border border-[#A8A8A8] bg-white text-zinc-700 md:hidden"
            data-testid="topbar-properties"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
