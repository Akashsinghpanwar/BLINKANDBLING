import React, { useEffect, useRef, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { useRecipeStore } from "@/store/recipe";
import { useUIStore, type ViewName } from "@/store/ui";
import { RingScene, type RingSceneHandle } from "./RingScene";
import { PendantScene, EarringStudScene, EarringHoopScene, BangleScene } from "./JewelryScene";
import { KernelStatus } from "./KernelStatus";
import { ViewCube } from "./ViewCube";
import { useRingBuilder } from "@/kernel/useRingBuilder";
import { cn } from "@/lib/utils";
import { Grid3x3, Sun, Box, Move3d } from "lucide-react";

class CanvasErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: unknown) { console.warn("[BBCad] 3D viewport unavailable:", e); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#D4D4D4] text-center text-xs text-zinc-500">
          <div className="max-w-sm space-y-1">
            <div className="text-zinc-700">3D preview unavailable</div>
            <div>WebGL is required for the live viewport. The B-Rep kernel and exports continue to work.</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const HDRI_PRESETS: Record<string, "studio" | "warehouse" | "sunset" | "city" | "apartment"> = {
  studio: "studio",
  warehouse: "warehouse",
  sunset: "sunset",
  "dark-studio": "apartment",
  "jewelry-box": "city",
};

const VIEW_POS: Record<ViewName, [number, number, number]> = {
  perspective: [18, 14, 22],
  top: [0, 36, 0.001],
  front: [0, 0, 36],
  right: [36, 0, 0],
};

const VIEWS: { v: ViewName; label: string }[] = [
  { v: "perspective", label: "Perspective" },
  { v: "top", label: "Top" },
  { v: "front", label: "Front" },
  { v: "right", label: "Right" },
];

export interface ViewportHandle {
  sceneRef: React.RefObject<RingSceneHandle | null>;
  canvasEl: HTMLCanvasElement | null;
}

export const Viewport = forwardRef<ViewportHandle>((_, ref) => {
  const recipe = useRecipeStore((s) => s.recipe);
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const showGrid = useUIStore((s) => s.showGrid);
  const showShadow = useUIStore((s) => s.showShadow);
  const showWireframe = useUIStore((s) => s.showWireframe);
  const editMode = useUIStore((s) => s.editMode);
  const isDragging = useUIStore((s) => s.isDragging);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const toggleShadow = useUIStore((s) => s.toggleShadow);
  const toggleWireframe = useUIStore((s) => s.toggleWireframe);
  const toggleEditMode = useUIStore((s) => s.toggleEditMode);
  const sceneRef = useRef<RingSceneHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const builder = useRingBuilder(recipe);

  useEffect(() => {
    (window as unknown as { __ringBuilder?: typeof builder }).__ringBuilder = builder;
  }, [builder]);

  if (typeof window !== "undefined") {
    (window as unknown as { __ringSceneRef?: typeof sceneRef }).__ringSceneRef = sceneRef;
  }

  return (
    <div ref={canvasContainerRef} className="relative h-full w-full bg-[#D4D4D4]" data-testid="viewport-container">
      <ViewCube />

      {showWireframe && (
        <button
          onClick={toggleWireframe}
          className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded border border-amber-500 bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-900 shadow hover:bg-amber-200"
          data-testid="wireframe-banner"
        >
          Wireframe view ON · Click to return to shaded
        </button>
      )}

      {builder.error && (
        <div className="absolute left-1/2 top-20 z-20 max-w-2xl -translate-x-1/2 rounded border border-red-400 bg-red-50 px-3 py-2 text-xs text-red-700 backdrop-blur" data-testid="build-error">
          B-Rep build failed: {builder.error}
        </div>
      )}

      <CanvasErrorBoundary>
        <Canvas
          shadows={showShadow}
          dpr={[1, 2]}
          gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: Math.min(recipe.renderStudio.exposure, 0.68), preserveDrawingBuffer: true }}
          data-testid="viewport-canvas"
        >
          <PerspectiveCamera makeDefault position={VIEW_POS[view]} fov={view === "perspective" ? 28 : 14} />
          <color attach="background" args={["#8FA0B5"]} />
          <fog attach="fog" args={["#8FA0B5", 80, 180]} />

          {/* Studio lighting — enough environment to make gold look like real gold,
              but no bloom so the diamond doesn't blow out. */}
          <ambientLight intensity={0.18} />
          <directionalLight position={[12, 22, 14]} intensity={0.72} castShadow color="#FFF4D6" shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
          <directionalLight position={[-12, 14, -10]} intensity={0.38} color="#D8E6FF" />
          <directionalLight position={[0, -8, 16]} intensity={0.25} color="#FFD9A8" />

          <Environment preset={HDRI_PRESETS[recipe.renderStudio.hdri] ?? "studio"} background={false} environmentIntensity={0.82} />

          {/* Subtle radial backdrop disc */}
          <mesh position={[0, -10.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[40, 64]} />
            <meshStandardMaterial color="#E8E8E8" roughness={0.85} metalness={0.05} />
          </mesh>

          {showGrid && (
            <gridHelper args={[40, 40, "#A8A8A8", "#E8E8E8"]} position={[0, -9.99, 0]} />
          )}

          {recipe.jewelryCategory === "ring" && (
            <RingScene ref={sceneRef} result={builder.result} wireframe={showWireframe} />
          )}
          {recipe.jewelryCategory === "pendant" && (
            <PendantScene wireframe={showWireframe} />
          )}
          {recipe.jewelryCategory === "earring-stud" && (
            <EarringStudScene wireframe={showWireframe} />
          )}
          {recipe.jewelryCategory === "earring-hoop" && (
            <EarringHoopScene wireframe={showWireframe} />
          )}
          {recipe.jewelryCategory === "bangle" && (
            <BangleScene wireframe={showWireframe} />
          )}

          {showShadow && (
            <ContactShadows position={[0, -10, 0]} opacity={0.7} scale={40} blur={2.6} far={22} color="#000000" />
          )}

          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minDistance={12}
            maxDistance={70}
            target={[0, 5, 0]}
            enabled={!isDragging}
          />

          {/* Bloom disabled — was producing a glowing white halo around the stone.
              The MeshTransmissionMaterial alone gives plenty of sparkle without bleed. */}
        </Canvas>
      </CanvasErrorBoundary>

      <KernelStatus />

      {/* Bottom view tabs + toggles */}
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-[#A8A8A8] bg-[#F8F8F8]/95 p-0.5 shadow-lg backdrop-blur">
          {VIEWS.map((v) => (
            <button
              key={v.v}
              onClick={() => setView(v.v)}
              data-testid={`view-${v.v}`}
              className={cn(
                "rounded px-3 py-1 text-[11px] font-medium transition-colors",
                view === v.v
                  ? "bg-[#CCE4FF] text-[#1A7DD8] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]"
                  : "text-zinc-400 hover:text-zinc-800",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-[#A8A8A8] bg-[#F8F8F8]/95 p-0.5 shadow-lg backdrop-blur">
          <button
            onClick={toggleShadow}
            data-testid="toggle-shadow"
            className={cn("flex h-7 w-8 items-center justify-center rounded-md", showShadow ? "bg-[#CCE4FF] text-[#0066CC]" : "text-zinc-500 hover:text-zinc-700")}
            title="Shadows"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleGrid}
            data-testid="toggle-grid"
            className={cn("flex h-7 w-8 items-center justify-center rounded-md", showGrid ? "bg-[#CCE4FF] text-[#0066CC]" : "text-zinc-500 hover:text-zinc-700")}
            title="Grid"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleWireframe}
            data-testid="toggle-wireframe"
            className={cn("flex h-7 w-8 items-center justify-center rounded-md", showWireframe ? "bg-amber-200 text-amber-800 ring-1 ring-amber-500" : "text-zinc-500 hover:text-zinc-700")}
            title={showWireframe ? "Wireframe ON — click to switch to shaded" : "Wireframe (show triangles)"}
          >
            <Box className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleEditMode}
            data-testid="toggle-edit-handles"
            className={cn("flex h-7 w-8 items-center justify-center rounded-md", editMode ? "bg-[#CCE4FF] text-[#0066CC]" : "text-zinc-500 hover:text-zinc-700")}
            title="Drag handles (live edit geometry)"
          >
            <Move3d className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Click-to-edit hint */}
      <div className="pointer-events-none absolute right-3 bottom-3 z-10 rounded border border-[#A8A8A8] bg-white/85 px-2.5 py-1 text-[10px] uppercase tracking-widest text-zinc-400 backdrop-blur">
        <span className="text-[#0066CC]">Click</span> any part to edit · <span className="text-[#0066CC]">Drag</span> to orbit
      </div>

      {/* Build status pill — kernel is on-demand now (only when exporting STEP/IGES/STL) */}
      <div className="pointer-events-none absolute left-3 bottom-3 z-10 flex items-center gap-2 rounded border border-[#A8A8A8] bg-white/85 px-2.5 py-1 text-[10px] uppercase tracking-widest backdrop-blur" data-testid="build-status">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
          builder.error ? "bg-red-500"
          : builder.building ? "bg-amber-400 animate-pulse"
          : builder.result ? "bg-emerald-400"
          : "bg-zinc-400"
        }`} />
        <span className={
          builder.error ? "text-red-700"
          : builder.building ? "text-amber-700"
          : builder.result ? "text-emerald-700"
          : "text-zinc-500"
        }>
          {builder.error ? "Build failed"
          : builder.building ? "Building B-Rep"
          : builder.result ? `B-Rep · ${builder.result.assembly.meta.metalVolumeMm3.toFixed(1)} mm³`
          : "Live preview · B-Rep on export"}
        </span>
      </div>
    </div>
  );
});
Viewport.displayName = "Viewport";
