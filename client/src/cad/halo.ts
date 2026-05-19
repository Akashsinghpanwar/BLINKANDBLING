import * as THREE from "three";
import type { ParametricRecipe } from "@/store/recipe";
import { buildRoundBrilliant } from "./stones";

export interface HaloResult {
  stoneGeom: THREE.BufferGeometry;
  matrices: THREE.Matrix4[];
  collarGeom: THREE.BufferGeometry | null;
}

export function buildHalo(recipe: ParametricRecipe, centerStoneR: number, girdleY: number): HaloResult | null {
  if (!recipe.halo.enabled) return null;
  const count = recipe.halo.stoneCount;
  const stoneSize = recipe.halo.stoneSize;
  const spacing = recipe.halo.spacing;
  const haloR = centerStoneR + stoneSize / 2 + spacing + 0.15;

  const { geometry } = buildRoundBrilliant(stoneSize, 0.61);

  const matrices: THREE.Matrix4[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const m = new THREE.Matrix4();
    m.setPosition(Math.cos(a) * haloR, girdleY - stoneSize * 0.1, Math.sin(a) * haloR);
    matrices.push(m);
  }

  // Halo collar (small ring under the stones)
  const collarGeom = new THREE.TorusGeometry(haloR, stoneSize * 0.35, 8, 64);
  collarGeom.rotateX(Math.PI / 2);
  collarGeom.translate(0, girdleY - stoneSize * 0.45, 0);

  return { stoneGeom: geometry, matrices, collarGeom };
}
