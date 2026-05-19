// Real B-Rep jewelry assembly using OpenCascade operations.
// Coordinate convention (final world coords):
//   Y = vertical (up)
//   X = band axis (finger direction)
//   Z = depth
// Ring band stands like a wheel; stone sits at +Y on top of the band's outer edge.
import type { OC } from "./init";
import { decodeOCCTError } from "./init";
import {
  ax1, ax2, makeFaceFromWire, makeWireFromPoints, revolve,
  makeCylinder, makeSphere, makeTorus, makeCone,
  fuse, fuseAll, cut, filletAllEdges, polarArray, translate, rotate,
  volumeOf, surfaceAreaOf, type Shape,
} from "./ops";
import type { ParametricRecipe } from "@/store/recipe";
import { getInnerRadius } from "@/cad/shank";

function step<T>(label: string, fn: () => T): T {
  try { return fn(); }
  catch (e) {
    const inner = decodeOCCTError(e);
    throw new Error(`[step:${label}] ${inner.message}`);
  }
}

function trySafe<T>(label: string, fn: () => T): T | null {
  try { return fn(); }
  catch (e) {
    console.warn(`[BBCad] step "${label}" failed (skipping):`, decodeOCCTError(e).message);
    return null;
  }
}

// ---------- Ring band ----------
// Build a smooth D-shaped (or comfort-fit / dome / knife-edge) cross-section,
// revolve around Z, then rotate so the band hole-axis is world X.

function makeBandProfile(oc: OC, recipe: ParametricRecipe, innerR: number) {
  const w = recipe.ringBase.width;
  const t = recipe.ringBase.thickness;
  const profile = recipe.ringBase.profile;
  const halfW = w / 2;
  const innerEdge = innerR;
  const outerEdge = innerR + t;

  let pts: [number, number, number][];
  if (profile === "knife-edge") {
    pts = [
      [innerEdge, 0, -halfW],
      [outerEdge + t * 0.15, 0, 0],
      [innerEdge, 0,  halfW],
    ];
  } else if (profile === "dome" || profile === "comfort-dome") {
    // 11-point smooth half-circle dome on the outer face,
    // slightly chamfered inner edges for comfort.
    const N = 9;
    pts = [];
    pts.push([innerEdge + 0.05, 0, -halfW]);
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI;     // -90° → +90°
      const r = outerEdge - innerEdge;                // dome radius (= thickness)
      const x = innerEdge + r + Math.cos(a) * (r * 0.05); // tiny outward bulge
      const z = Math.sin(a) * halfW;
      pts.push([x, 0, z]);
    }
    pts.push([innerEdge + 0.05, 0,  halfW]);
    if (profile === "comfort-dome") {
      // Curve the inner face slightly inward for comfort fit
      pts[0]![0] = innerEdge + 0.08;
      pts[pts.length - 1]![0] = innerEdge + 0.08;
    }
  } else if (profile === "flat") {
    pts = [
      [innerEdge, 0, -halfW],
      [outerEdge, 0, -halfW],
      [outerEdge, 0,  halfW],
      [innerEdge, 0,  halfW],
    ];
  } else {
    pts = [
      [innerEdge, 0, -halfW],
      [outerEdge, 0, -halfW * 0.92],
      [outerEdge + 0.08, 0, 0],
      [outerEdge, 0,  halfW * 0.92],
      [innerEdge, 0,  halfW],
    ];
  }
  const wire = makeWireFromPoints(oc, pts, true);
  return makeFaceFromWire(oc, wire);
}

export function makeBand(oc: OC, recipe: ParametricRecipe, innerR: number): Shape {
  const face = step("band:profile", () => makeBandProfile(oc, recipe, innerR));
  const axis = ax1(oc, [0, 0, 0], [0, 0, 1]);
  const flat = step("band:revolve", () => revolve(oc, face, axis));
  return step("band:standUp", () => rotate(oc, flat, ax1(oc, [0, 0, 0], [0, 1, 0]), Math.PI / 2));
}

// ---------- Diamond stone solid (kernel-side, used for STEP/IGES export) ----------

export function makeStoneSolid(oc: OC, diameter: number, depthRatio: number, girdleY: number): Shape {
  const r = diameter / 2;
  const totalH = diameter * depthRatio;
  const crownH = totalH * 0.27;
  const pavilionH = totalH * 0.73;

  const crown = step("stone:crown", () => makeCone(oc, r, r * 0.55, crownH));
  const pavilion = step("stone:pavilion", () => makeCone(oc, r, 0.05, pavilionH));
  const pavilionFlipped = step("stone:flipPav", () =>
    rotate(oc, pavilion, ax1(oc, [0, 0, 0], [1, 0, 0]), Math.PI),
  );
  let stone = step("stone:fuseHalves", () => fuse(oc, crown, pavilionFlipped));
  stone = step("stone:rotZtoY", () => rotate(oc, stone, ax1(oc, [0, 0, 0], [1, 0, 0]), -Math.PI / 2));
  return step("stone:translate", () => translate(oc, stone, [0, girdleY, 0]));
}

// ---------- CLAW prongs that lean inward and grip OVER the girdle ----------
// Each prong = vertical base cylinder + inward-leaning tip cylinder + spherical cap.
// Polar-arrayed around the stone center axis (world Y).

function makeProngsYUp(
  oc: OC, recipe: ParametricRecipe,
  stoneR: number, girdleY: number, stoneTopY: number, bandTopY: number,
): Shape | null {
  if (recipe.setting.type === "bezel" || recipe.setting.type === "tension") return null;
  const count = recipe.prongs.count;
  const t = recipe.prongs.thickness;          // wire diameter (mm)
  const wireR = t / 2;

  // Geometry plan for ONE prong placed at +X:
  //  baseY   = bandTopY - 0.5 (anchored well into the metal for solid fusion)
  //  collarY = girdleY - 0.4  (top of vertical base, where lean starts)
  //  capY    = girdleY + Math.min(0.55, stoneTopY - girdleY - 0.05)
  //              (just above the girdle so the bead "grips" the stone but
  //               doesn't poke up into the table)
  //  baseR   = stoneR + wireR + 0.05  (just outside the girdle)
  //  capR    = stoneR - wireR * 0.6   (overhang inward a little)
  const baseY = bandTopY - 0.5;
  const collarY = girdleY - 0.4;
  const capY = girdleY + Math.min(0.55, Math.max(0.25, stoneTopY - girdleY - 0.1));
  const baseR = stoneR + wireR + 0.05;
  const capR = Math.max(0.5, stoneR - wireR * 0.6);

  if (collarY <= baseY + 0.2 || capY <= collarY + 0.2) return null;

  // 1. Vertical base cylinder (baseY -> collarY) at radius baseR
  const verticalAxis = ax2(oc, [baseR, baseY, 0], [0, 1, 0]);
  const vertical = step("prong:vert", () =>
    makeCylinder(oc, wireR, collarY - baseY, verticalAxis));

  // 2. Leaning tip cylinder from (baseR, collarY) -> (capR, capY)
  const dx = capR - baseR;
  const dy = capY - collarY;
  const leanLen = Math.hypot(dx, dy);
  const leanAxis = ax2(oc, [baseR, collarY, 0], [dx / leanLen, dy / leanLen, 0]);
  const leaning = step("prong:lean", () =>
    makeCylinder(oc, wireR, leanLen, leanAxis));

  // 3. Spherical cap "bead" at the tip (this is the part that grips the diamond)
  const capRadius = recipe.prongs.style === "round" ? wireR * 1.25
                  : recipe.prongs.style === "V"     ? wireR * 0.9
                  :                                   wireR * 1.1; // claw
  const cap = step("prong:cap", () =>
    makeSphere(oc, capRadius, [capR, capY, 0]));

  // Fuse one prong, then polar-array.
  let single = step("prong:fuseLow", () => fuse(oc, vertical, leaning));
  single = step("prong:fuseCap", () => fuse(oc, single, cap));

  const arrayAxis = ax1(oc, [0, 0, 0], [0, 1, 0]);
  const prongs = step("prong:array", () => polarArray(oc, single, arrayAxis, count));
  return step("prong:fuseAll", () => fuseAll(oc, prongs));
}

// ---------- Basket / gallery (visible cage that holds the prongs) ----------
// Builds a recognisable head structure: under-bezel ring + crown rail + (optional)
// cathedral arms rising from the band.

function makeSettingYUp(
  oc: OC, recipe: ParametricRecipe,
  stoneR: number, girdleY: number, bandTopY: number,
): Shape | null {
  const settingType = recipe.setting.type;
  const wireR = 0.22;            // gallery rail wire thickness (mm radius)

  if (settingType === "bezel" || settingType === "half-bezel") {
    const wall = step("bezel:wall", () =>
      makeCylinder(oc, stoneR + 0.4, 1.6, ax2(oc, [0, girdleY - 0.4, 0], [0, 1, 0])));
    const inner = step("bezel:inner", () =>
      makeCylinder(oc, stoneR - 0.05, 1.7, ax2(oc, [0, girdleY - 0.5, 0], [0, 1, 0])));
    return step("bezel:cut", () => cut(oc, wall, inner));
  }

  if (settingType === "tension") return null;

  // Universal basket cage (used by solitaire + cathedral-solitaire)
  const lowerRailY = bandTopY + 0.1;          // sits just on top of the band
  const upperRailY = girdleY - 0.5;            // hugs the underside of the girdle
  const lowerRailR = Math.max(stoneR * 0.85, stoneR - 0.6);
  const upperRailR = Math.max(stoneR * 0.95, stoneR - 0.15);

  const parts: Shape[] = [];

  // Lower under-bezel rail (torus around Y axis at lowerRailY)
  const lowerRail = trySafe("basket:lowerRail", () =>
    makeTorus(oc, lowerRailR, wireR, ax2(oc, [0, lowerRailY, 0], [0, 1, 0])));
  if (lowerRail) parts.push(lowerRail);

  // Upper crown rail (just below the girdle)
  const upperRail = trySafe("basket:upperRail", () =>
    makeTorus(oc, upperRailR, wireR * 0.95, ax2(oc, [0, upperRailY, 0], [0, 1, 0])));
  if (upperRail) parts.push(upperRail);

  // Vertical gallery posts between the two rails — placed BETWEEN the prong
  // positions (offset by half the prong angle) so they don't fight the prongs.
  const postCount = recipe.prongs.count;
  const offset = Math.PI / postCount;          // half-step
  const postLen = upperRailY - lowerRailY;
  if (postLen > 0.3) {
    for (let i = 0; i < postCount; i++) {
      const a = (i / postCount) * Math.PI * 2 + offset;
      const px = Math.cos(a) * (lowerRailR + (upperRailR - lowerRailR) * 0.5);
      const pz = Math.sin(a) * (lowerRailR + (upperRailR - lowerRailR) * 0.5);
      // Small inward lean for a more elegant basket
      const dxp = (Math.cos(a) * upperRailR) - (Math.cos(a) * lowerRailR);
      const dzp = (Math.sin(a) * upperRailR) - (Math.sin(a) * lowerRailR);
      const dyp = postLen;
      const len = Math.hypot(dxp, dyp, dzp);
      const startX = Math.cos(a) * lowerRailR;
      const startZ = Math.sin(a) * lowerRailR;
      const post = trySafe(`basket:post${i}`, () =>
        makeCylinder(oc, wireR * 0.9, len, ax2(oc, [startX, lowerRailY, startZ], [dxp / len, dyp / len, dzp / len])));
      if (post) parts.push(post);
      // Suppress unused warning
      void px; void pz;
    }
  }

  // Cathedral arms: smooth metal sweeps from band shoulders rising into the basket
  if (settingType === "cathedral-solitaire") {
    const armBaseY = bandTopY - 0.4;
    const armTopY = lowerRailY + wireR;
    for (const sign of [-1, 1]) {
      const startX = sign * (lowerRailR + 0.4);
      const endX = sign * lowerRailR * 0.5;
      const dx = endX - startX;
      const dy = armTopY - armBaseY;
      const length = Math.hypot(dx, dy);
      if (length < 0.4) continue;
      const arm = trySafe(`cath:arm${sign}`, () =>
        makeCylinder(oc, 0.45, length, ax2(oc, [startX, armBaseY, 0], [dx / length, dy / length, 0])));
      if (arm) parts.push(arm);
    }
  }

  if (parts.length === 0) return null;
  return step("basket:fuse", () => fuseAll(oc, parts));
}

// ---------- Halo (ring of small stones around centre) ----------

function makeHaloYUp(
  oc: OC, recipe: ParametricRecipe,
  centerStoneR: number, girdleY: number,
): Shape | null {
  if (!recipe.halo.enabled) return null;
  const count = recipe.halo.stoneCount;
  const stoneSize = recipe.halo.stoneSize;
  const haloR = centerStoneR + stoneSize / 2 + recipe.halo.spacing + 0.15;
  const oneStone = step("halo:stone", () => makeStoneSolid(oc, stoneSize, 0.61, girdleY - stoneSize * 0.05));
  const positioned = step("halo:position", () => translate(oc, oneStone, [haloR, 0, 0]));
  const arrayAxis = ax1(oc, [0, 0, 0], [0, 1, 0]);
  const stones = step("halo:array", () => polarArray(oc, positioned, arrayAxis, count));
  return step("halo:fuse", () => fuseAll(oc, stones));
}

// ---------- Top-level assembly ----------
export interface RingAssembly {
  metalShape: Shape;
  centerStoneShape: Shape;
  haloShape: Shape | null;
  meta: {
    innerR: number; outerR: number; girdleY: number; stoneR: number;
    metalVolumeMm3: number; metalSurfaceMm2: number;
  };
}

export function buildRingAssembly(oc: OC, recipe: ParametricRecipe): RingAssembly {
  const innerR = getInnerRadius(recipe);
  const outerR = innerR + recipe.ringBase.thickness;

  let metal = makeBand(oc, recipe, innerR);

  const stoneD = recipe.centerStone.diameter;
  const stoneR = stoneD / 2;
  const totalStoneH = stoneD * recipe.centerStone.depthRatio;
  const stoneCrownH = totalStoneH * 0.27;
  const stonePavH = totalStoneH * 0.73;

  // Position the stone girdle just above the band's outer edge, slightly recessed by seat depth.
  const seatDrop = recipe.setting.seatDepth * 0.4;
  const bandTopY = outerR;
  const girdleY = bandTopY + 0.5 - seatDrop;
  const stoneTopY = girdleY + stoneCrownH;
  const stoneBottomY = girdleY - stonePavH;

  const setting = makeSettingYUp(oc, recipe, stoneR, girdleY, bandTopY);
  if (setting) {
    const fused = trySafe("fuseSetting", () => fuse(oc, metal, setting));
    if (fused) metal = fused;
  }

  const prongs = makeProngsYUp(oc, recipe, stoneR, girdleY, stoneTopY, bandTopY);
  if (prongs) {
    const fused = trySafe("fuseProngs", () => fuse(oc, metal, prongs));
    if (fused) metal = fused;
  }

  // Seat cutter: cylinder along Y at stone center to make space for pavilion.
  if (recipe.setting.type !== "tension" && recipe.setting.seatDepth > 0.05) {
    const overlap = 1.0;
    const cutterH = recipe.setting.seatDepth + overlap;
    const cutterStartY = stoneBottomY - overlap * 0.5;
    const seatCutter = trySafe("seatCutter", () =>
      makeCylinder(oc, stoneR + 0.1, cutterH, ax2(oc, [0, cutterStartY, 0], [0, 1, 0])),
    );
    if (seatCutter) {
      const cutMetal = trySafe("seatCut", () => cut(oc, metal, seatCutter));
      if (cutMetal) metal = cutMetal;
    }
  }

  const filleted = trySafe("fillet", () => filletAllEdges(oc, metal, 0.08));
  if (filleted) metal = filleted;

  const centerStoneShape = makeStoneSolid(oc, stoneD, recipe.centerStone.depthRatio, girdleY);
  const haloShape = makeHaloYUp(oc, recipe, stoneR, girdleY);

  const metalVolumeMm3 = trySafe("vol", () => volumeOf(oc, metal)) ?? 0;
  const metalSurfaceMm2 = trySafe("surf", () => surfaceAreaOf(oc, metal)) ?? 0;

  return {
    metalShape: metal,
    centerStoneShape,
    haloShape,
    meta: { innerR, outerR, girdleY, stoneR, metalVolumeMm3, metalSurfaceMm2 },
  };
}
