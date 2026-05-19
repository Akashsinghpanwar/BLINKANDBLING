import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { loadKernel, getOC, decodeOCCTError } from "./init";
import { buildRingAssembly, type RingAssembly } from "./ring";
import { shapeToGeometry } from "./tessellate";
import type { ParametricRecipe } from "@/store/recipe";

export interface BuildResult {
  metalGeom: THREE.BufferGeometry;
  stoneGeom: THREE.BufferGeometry;
  haloGeom: THREE.BufferGeometry | null;
  assembly: RingAssembly;
}

interface UseRingBuilderState {
  result: BuildResult | null;
  building: boolean;
  kernelReady: boolean;
  error: string | null;
  /** Trigger an on-demand B-Rep build with the latest recipe (returns the result). */
  build: () => Promise<BuildResult | null>;
}

/**
 * On-demand B-Rep builder.
 *
 * IMPORTANT: OpenCascade is heavy (~30 MB WASM that runs solid-modeling on the main
 * thread and freezes the UI for several seconds). The displayed ring is pure Three.js
 * (see `cad/realisticRing.ts`), so we do NOT auto-load OC and we do NOT auto-rebuild
 * on every recipe change. The user explicitly invokes a build only when they need a
 * B-Rep result (e.g. STEP/IGES export, or volume/surface analysis).
 */
export function useRingBuilder(recipe: ParametricRecipe): UseRingBuilderState {
  const [result, setResult] = useState<BuildResult | null>(null);
  const [building, setBuilding] = useState(false);
  const [kernelReady, setKernelReady] = useState<boolean>(!!getOC());
  const [error, setError] = useState<string | null>(null);
  const recipeRef = useRef(recipe);
  recipeRef.current = recipe;
  const tokenRef = useRef(0);

  const build = useCallback(async (): Promise<BuildResult | null> => {
    const myToken = ++tokenRef.current;
    setBuilding(true);
    setError(null);
    try {
      // Lazy-load the kernel on first build only.
      if (!getOC()) {
        await loadKernel();
        if (myToken !== tokenRef.current) return null;
        setKernelReady(true);
      }
      const oc = getOC();
      if (!oc) throw new Error("Kernel not loaded");

      // Yield to the event loop so React can paint a "Building..." toast/state
      // before we hand the main thread to OCCT for several seconds.
      await new Promise((r) => setTimeout(r, 0));

      const t0 = performance.now();
      const assembly = buildRingAssembly(oc, recipeRef.current);
      const buildMs = (performance.now() - t0) | 0;
      console.info(`[BBCad] B-Rep assembly built in ${buildMs}ms — volume ${assembly.meta.metalVolumeMm3.toFixed(1)} mm³`);

      const metalGeom = shapeToGeometry(oc, assembly.metalShape, 0.05, 0.3);
      const stoneGeom = shapeToGeometry(oc, assembly.centerStoneShape, 0.03, 0.2);
      const haloGeom = assembly.haloShape ? shapeToGeometry(oc, assembly.haloShape, 0.03, 0.2) : null;

      if (myToken !== tokenRef.current) return null;
      const r: BuildResult = { metalGeom, stoneGeom, haloGeom, assembly };
      (window as unknown as { __lastAssemblyMeta?: typeof assembly.meta }).__lastAssemblyMeta = assembly.meta;
      setResult(r);
      setBuilding(false);
      return r;
    } catch (e) {
      if (myToken !== tokenRef.current) return null;
      const err = decodeOCCTError(e);
      console.error("[BBCad] Build failed:", err.message, e);
      setResult(null);
      setBuilding(false);
      setError(err.message);
      return null;
    }
  }, []);

  return { result, building, kernelReady, error, build };
}
