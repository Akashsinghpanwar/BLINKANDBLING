// Presentation-quality jewelry ring built entirely in Three.js.
// OpenCascade still runs in the background for stats / STEP / IGES export,
// but the visible scene uses these higher-poly procedural meshes so the
// ring actually LOOKS like jewelry.
//
// World coords:
//   Y = vertical (up)
//   X = band axis (finger direction)
//   Z = depth
// The band is a torus around X with hole-axis = X. Stone sits on top (+Y).

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ParametricRecipe } from "@/store/recipe";

export interface MiniProng {
  pos: THREE.Vector3;
  tipPos: THREE.Vector3;
}

export interface PaveStoneSpot {
  pos: THREE.Vector3;
  diameter: number;
  rotY: number;
}

export interface RealisticRing {
  metalGeom: THREE.BufferGeometry; // band + cathedral arms + basket + posts + prongs (single mesh)
  innerR: number;
  outerR: number;
  bandTopY: number;
  girdleY: number;
  stoneR: number;
  stoneTopY: number;
  prongTipsY: number;
  paveSpots: PaveStoneSpot[]; // small accent stones embedded in band shoulders
}

// ---------- Helpers ----------

function alignCylinderTo(geom: THREE.BufferGeometry, from: THREE.Vector3, to: THREE.Vector3, length: number) {
  // Cylinder default axis is +Y, base at -length/2, top at +length/2.
  // Translate so base is at origin, then rotate to point along (to-from), then translate to from.
  geom.translate(0, length / 2, 0);
  const dir = to.clone().sub(from).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
  geom.applyQuaternion(quat);
  geom.translate(from.x, from.y, from.z);
}

// Build a horizontal torus ring (around Y axis) at given height.
function horizontalRing(majorR: number, tubeR: number, segments = 64, tubeSegs = 14): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(majorR, tubeR, tubeSegs, segments);
  g.rotateX(Math.PI / 2);
  return g;
}

// ---------- Main builder ----------

export function buildRealisticRing(recipe: ParametricRecipe, innerR: number): RealisticRing {
  const w = recipe.ringBase.width;
  const t = recipe.ringBase.thickness;
  const stoneR = recipe.centerStone.diameter / 2;
  const outerR = innerR + t;
  const bandTopY = outerR;
  // Stone seated just above the band, with seat depth recess
  const seatDrop = recipe.setting.seatDepth * 0.4;
  const girdleY = bandTopY + 0.6 - seatDrop;
  const totalStoneH = recipe.centerStone.diameter * recipe.centerStone.depthRatio;
  const crownH = totalStoneH * 0.165;
  const stoneTopY = girdleY + crownH;

  const isBezel = recipe.setting.type === "bezel" || recipe.setting.type === "half-bezel";
  const isTension = recipe.setting.type === "tension";
  const isCathedral = recipe.shank.style === "cathedral" || recipe.setting.type === "cathedral-solitaire";
  const isSplit = recipe.shank.style === "split-shank";
  const isTwisted = recipe.shank.style === "twisted";

  const parts: THREE.BufferGeometry[] = [];

  // ============ BAND ============
  // Hole-axis = X. Use a torus around X with elliptical cross-section (w wide × t thick).
  // Default torus has hole-axis = Z, so rotate Y by 90°.
  const bandMeanR = innerR + t / 2;
  const bandTube = new THREE.TorusGeometry(bandMeanR, t / 2, 18, 96);
  bandTube.rotateY(Math.PI / 2); // hole-axis -> X
  // Squish in finger direction (X) so cross-section is oval w wide × t thick.
  // After rotation, X is the finger direction; the tube cross-section "circles" around the centerline,
  // so scaling X scales the WIDTH only (keeps thickness intact).
  const widthScale = w / t;
  bandTube.scale(widthScale, 1, 1);

  // Optional twist effect: rotate vertices around X-axis based on their angular position
  if (isTwisted) {
    const pos = bandTube.attributes["position"]!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const angle = Math.atan2(z, y); // around X axis
      const twist = Math.sin(angle * 2) * 0.3;
      const c = Math.cos(twist), s = Math.sin(twist);
      pos.setY(i, y * c - z * s);
      pos.setZ(i, y * s + z * c);
      void x;
    }
    bandTube.computeVertexNormals();
  }

  parts.push(bandTube);

  // ============ CATHEDRAL SHOULDERS ============
  // Two graceful tubes that arc up from the band sides into the basket area.
  // Without these the head looks like it's "floating".
  const armBaseY = bandTopY - 0.2;
  const armTopY = girdleY - 0.5;
  const armRise = armTopY - armBaseY;

  if (isCathedral && armRise > 0.4) {
    for (const sign of [-1, 1]) {
      const start = new THREE.Vector3(sign * (w / 2 + 0.05), armBaseY, 0);
      const c1 = new THREE.Vector3(sign * (w / 2 + 0.1), armBaseY + armRise * 0.45, 0);
      const c2 = new THREE.Vector3(sign * (stoneR * 0.55), armTopY - 0.15, 0);
      const end = new THREE.Vector3(sign * (stoneR * 0.45), armTopY, 0);
      const curve = new THREE.CubicBezierCurve3(start, c1, c2, end);
      const arm = new THREE.TubeGeometry(curve, 48, 0.55, 14, false);
      parts.push(arm);
    }
  } else if (isSplit) {
    // Split shank: the band splits into two side rails near the head.
    for (const sign of [-1, 1]) {
      for (const offsetSign of [-1, 1]) {
        const x = sign * (w * 0.35);
        const start = new THREE.Vector3(x, armBaseY - 0.1, offsetSign * 0.4);
        const c1 = new THREE.Vector3(x * 0.7, armBaseY + armRise * 0.5, offsetSign * 0.6);
        const c2 = new THREE.Vector3(x * 0.4, armTopY - 0.2, offsetSign * 0.4);
        const end = new THREE.Vector3(x * 0.3, armTopY, offsetSign * 0.2);
        const curve = new THREE.CubicBezierCurve3(start, c1, c2, end);
        parts.push(new THREE.TubeGeometry(curve, 32, 0.35, 10, false));
      }
    }
  } else {
    // Plain straight shank: still add tiny shoulder bumps so the head is supported visually.
    for (const sign of [-1, 1]) {
      const start = new THREE.Vector3(sign * (w / 2), bandTopY - 0.05, 0);
      const c1 = new THREE.Vector3(sign * (w / 2), bandTopY + 0.4, 0);
      const c2 = new THREE.Vector3(sign * (stoneR * 0.6), armTopY - 0.1, 0);
      const end = new THREE.Vector3(sign * (stoneR * 0.5), armTopY, 0);
      const curve = new THREE.CubicBezierCurve3(start, c1, c2, end);
      parts.push(new THREE.TubeGeometry(curve, 32, 0.35, 12, false));
    }
  }

  // ============ BEZEL WALL (if bezel setting) ============
  if (isBezel) {
    const bezelOuter = stoneR + 0.5;
    const bezelInner = stoneR - 0.05;
    const bezelH = crownH + 0.6;
    const bezelBottomY = girdleY - 0.4;
    const outerCyl = new THREE.CylinderGeometry(bezelOuter, bezelOuter, bezelH, 64, 1, true);
    outerCyl.translate(0, bezelBottomY + bezelH / 2, 0);
    const topRing = new THREE.RingGeometry(bezelInner, bezelOuter, 64);
    topRing.rotateX(-Math.PI / 2);
    topRing.translate(0, bezelBottomY + bezelH, 0);
    const innerCyl = new THREE.CylinderGeometry(bezelInner, bezelInner, bezelH * 0.8, 64, 1, true);
    innerCyl.translate(0, bezelBottomY + bezelH * 0.4, 0);
    parts.push(outerCyl, topRing, innerCyl);
  }

  // ============ BASKET / GALLERY ============
  // Two horizontal rails connected by vertical posts (between prong angles).
  const lowerRailY = bandTopY + 0.1;
  const upperRailY = girdleY - 0.5;
  const lowerRailR = Math.max(stoneR * 0.82, 1.0);
  const upperRailR = Math.max(stoneR * 0.95, 1.2);
  const wireR = 0.22;
  const prongCount = recipe.prongs.count;

  if (!isBezel && !isTension && upperRailY > lowerRailY + 0.2) {
    parts.push(horizontalRing(lowerRailR, wireR, 64, 14).translate(0, lowerRailY, 0));
    parts.push(horizontalRing(upperRailR, wireR * 0.95, 64, 14).translate(0, upperRailY, 0));

    // Vertical posts between prongs (offset by half-step)
    const offset = Math.PI / prongCount;
    for (let i = 0; i < prongCount; i++) {
      const a = (i / prongCount) * Math.PI * 2 + offset;
      const ca = Math.cos(a), sa = Math.sin(a);
      const start = new THREE.Vector3(ca * lowerRailR, lowerRailY, sa * lowerRailR);
      const end = new THREE.Vector3(ca * upperRailR, upperRailY, sa * upperRailR);
      const len = start.distanceTo(end);
      const post = new THREE.CylinderGeometry(wireR * 0.85, wireR * 0.85, len, 12);
      alignCylinderTo(post, start, end, len);
      parts.push(post);
    }
  }

  // ============ PRONGS ============
  // Each prong: vertical base cylinder + leaning tip cylinder + bead cap.
  // Tip overhangs the girdle slightly to "grip" the stone.
  let prongTipsY = girdleY;
  if (!isBezel && !isTension) {
    const prongR = Math.max(0.18, recipe.prongs.thickness / 2);
    const baseR = stoneR + prongR + 0.05;
    const baseY = lowerRailY - 0.1;
    const collarY = girdleY - 0.3;
    const tipRise = Math.min(0.55, Math.max(0.3, crownH * 0.45 + 0.15));
    const tipY = girdleY + tipRise;
    prongTipsY = tipY;
    const tipR = Math.max(0.5, stoneR - prongR * 0.8);

    for (let i = 0; i < prongCount; i++) {
      const a = (i / prongCount) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);

      // 1. Vertical base
      const vBase = new THREE.Vector3(baseR * ca, baseY, baseR * sa);
      const vTop = new THREE.Vector3(baseR * ca, collarY, baseR * sa);
      const vLen = vBase.distanceTo(vTop);
      const vert = new THREE.CylinderGeometry(prongR, prongR * 1.05, vLen, 16);
      alignCylinderTo(vert, vBase, vTop, vLen);
      parts.push(vert);

      // 2. Leaning tip
      const tBase = vTop.clone();
      const tTop = new THREE.Vector3(tipR * ca, tipY, tipR * sa);
      const tLen = tBase.distanceTo(tTop);
      const lean = new THREE.CylinderGeometry(prongR * 0.85, prongR * 1.0, tLen, 16);
      alignCylinderTo(lean, tBase, tTop, tLen);
      parts.push(lean);

      // 3. Bead cap (the part that "grips" the stone)
      const beadR = prongR * (recipe.prongs.style === "round" ? 1.45 : recipe.prongs.style === "V" ? 0.95 : 1.2);
      const bead = new THREE.SphereGeometry(beadR, 18, 14);
      bead.translate(tipR * ca, tipY, tipR * sa);
      parts.push(bead);
    }
  }

  // ============ HALO MINI-BASKETS ============
  // Tiny supporting metal under each halo stone: a small ring + 2 mini-prongs.
  if (recipe.halo.enabled) {
    const haloR = stoneR + recipe.halo.stoneSize / 2 + recipe.halo.spacing + 0.15;
    const miniStoneR = recipe.halo.stoneSize / 2;
    const miniRailY = girdleY - 0.35;
    const miniWireR = 0.12;
    for (let i = 0; i < recipe.halo.stoneCount; i++) {
      const a = (i / recipe.halo.stoneCount) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Tiny support ring under the halo stone
      const ring = horizontalRing(miniStoneR + 0.02, miniWireR, 16, 8);
      ring.translate(haloR * ca, miniRailY, haloR * sa);
      parts.push(ring);
      // 2 mini-prongs (outside + inside) per halo stone
      for (const radialOff of [miniStoneR + 0.05, -(miniStoneR + 0.05)]) {
        const px = (haloR + radialOff) * ca;
        const pz = (haloR + radialOff) * sa;
        const base = new THREE.Vector3(px, miniRailY, pz);
        const tip = new THREE.Vector3(haloR * ca - radialOff * 0.4 * ca / Math.abs(radialOff || 1),
                                       girdleY + 0.1,
                                       haloR * sa - radialOff * 0.4 * sa / Math.abs(radialOff || 1));
        const len = base.distanceTo(tip);
        const post = new THREE.CylinderGeometry(miniWireR, miniWireR, len, 8);
        alignCylinderTo(post, base, tip, len);
        parts.push(post);
        // Tiny bead at tip
        const bead = new THREE.SphereGeometry(miniWireR * 1.4, 10, 8);
        bead.translate(tip.x, tip.y, tip.z);
        parts.push(bead);
      }
    }
  }

  // ============ PAVÉ STONE SPOTS (returned as positions, rendered separately) ============
  // Tiny dots embedded in the band shoulders — high-end engagement ring detail.
  const paveSpots: PaveStoneSpot[] = [];
  if (isCathedral || isSplit) {
    const paveStoneSize = 1.2;
    const paveCount = 4;
    for (const sign of [-1, 1]) {
      for (let i = 0; i < paveCount; i++) {
        const tnorm = i / (paveCount - 1); // 0..1 along the shoulder
        // Walk along the bezier from band toward head (re-derive lightweight curve)
        const start = new THREE.Vector3(sign * (w / 2 + 0.05), armBaseY, 0);
        const end = new THREE.Vector3(sign * (stoneR * 0.55), armTopY - 0.1, 0);
        const p = start.clone().lerp(end, tnorm);
        // Push slightly outward of the metal centerline to sit on the upper face
        const upperOffset = 0.42;
        p.y += upperOffset;
        paveSpots.push({ pos: p, diameter: paveStoneSize, rotY: 0 });
      }
    }
  }

  // ============ MERGE EVERYTHING ============
  const merged = mergeGeometries(parts.filter(Boolean), false);
  if (!merged) {
    throw new Error("Failed to merge realistic ring metal parts");
  }
  merged.computeVertexNormals();

  return {
    metalGeom: merged,
    innerR,
    outerR,
    bandTopY,
    girdleY,
    stoneR,
    stoneTopY,
    prongTipsY,
    paveSpots,
  };
}
