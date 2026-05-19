import * as THREE from "three";
import type { ParametricRecipe } from "@/store/recipe";
import { getOuterRadius, getTopOfBand } from "./shank";

export interface SettingMeta {
  stoneCenter: THREE.Vector3;
  girdleY: number;
  geometries: THREE.BufferGeometry[];
}

export function buildSetting(recipe: ParametricRecipe, stoneR: number, stoneHeight: number): SettingMeta {
  const top = getTopOfBand(recipe);
  const settingType = recipe.setting.type;
  const geometries: THREE.BufferGeometry[] = [];
  // Stone sits with girdle at this Y; crown above, pavilion below
  const liftAboveBand = stoneHeight * 0.45 + recipe.setting.seatDepth * 0.3;
  const girdleY = top + liftAboveBand;
  const stoneCenter = new THREE.Vector3(0, girdleY, 0);

  if (settingType === "bezel" || settingType === "half-bezel") {
    const bezelH = stoneHeight * 0.7;
    const bezelOuterR = stoneR + 0.4;
    const bezelInnerR = stoneR - 0.05;
    const bezel = new THREE.CylinderGeometry(bezelOuterR, bezelOuterR, bezelH, 64, 1, true);
    bezel.translate(0, girdleY, 0);
    const inner = new THREE.CylinderGeometry(bezelInnerR, bezelInnerR, bezelH + 0.01, 64, 1, true);
    inner.scale(1, 1, 1);
    inner.translate(0, girdleY, 0);
    // Top ring (lip)
    const lip = new THREE.RingGeometry(bezelInnerR, bezelOuterR, 64);
    lip.rotateX(-Math.PI / 2);
    lip.translate(0, girdleY + bezelH / 2, 0);
    // Bottom ring (closed underside)
    const bot = new THREE.RingGeometry(bezelInnerR, bezelOuterR, 64);
    bot.rotateX(Math.PI / 2);
    bot.translate(0, girdleY - bezelH / 2, 0);
    geometries.push(bezel, inner, lip, bot);
  } else if (settingType === "cathedral-solitaire") {
    // Two arching supports from band top to under stone
    const baseY = getOuterRadius(recipe);
    const headY = girdleY - stoneHeight * 0.45;
    for (const sign of [-1, 1]) {
      const start = new THREE.Vector3(sign * (stoneR + 0.5), baseY * 0.85, 0);
      const ctrl  = new THREE.Vector3(sign * (stoneR + 0.3), baseY + 0.4, 0);
      const end   = new THREE.Vector3(sign * (stoneR * 0.6), headY, 0);
      const curve = new THREE.QuadraticBezierCurve3(start, ctrl, end);
      const tube = new THREE.TubeGeometry(curve, 24, 0.45, 8, false);
      geometries.push(tube);
    }
    // Underbasket gallery wires (two horizontal rings)
    for (let k = 0; k < 2; k++) {
      const ringY = headY - k * 0.6;
      const torus = new THREE.TorusGeometry(stoneR * 0.85 - k * 0.05, 0.12, 8, 48);
      torus.rotateX(Math.PI / 2);
      torus.translate(0, ringY, 0);
      geometries.push(torus);
    }
  } else if (settingType === "tension") {
    // No visible cup — just two raised pads
    for (const sign of [-1, 1]) {
      const pad = new THREE.SphereGeometry(0.5, 16, 16);
      pad.translate(sign * (stoneR + 0.1), girdleY, 0);
      geometries.push(pad);
    }
  } else {
    // solitaire — simple basket
    const headY = girdleY - stoneHeight * 0.4;
    const torus = new THREE.TorusGeometry(stoneR * 0.85, 0.12, 8, 48);
    torus.rotateX(Math.PI / 2);
    torus.translate(0, headY, 0);
    geometries.push(torus);
    // Vertical posts down to band
    const baseY = getOuterRadius(recipe);
    const N = 4;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + Math.PI / N;
      const x = Math.cos(a) * stoneR * 0.85;
      const z = Math.sin(a) * stoneR * 0.85;
      const start = new THREE.Vector3(x, headY, z);
      const end = new THREE.Vector3(x * 0.5, baseY * 0.95, z * 0.5);
      const curve = new THREE.LineCurve3(start, end);
      const tube = new THREE.TubeGeometry(curve, 1, 0.18, 6, false);
      geometries.push(tube);
    }
  }

  return { stoneCenter, girdleY, geometries };
}
