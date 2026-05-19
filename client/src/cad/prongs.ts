import * as THREE from "three";
import type { ParametricRecipe } from "@/store/recipe";

export function buildProngs(recipe: ParametricRecipe, stoneR: number, girdleY: number, stoneHeight: number): THREE.BufferGeometry[] {
  if (recipe.setting.type === "bezel" || recipe.setting.type === "tension") return [];
  const count = recipe.prongs.count;
  const t = recipe.prongs.thickness;
  const style = recipe.prongs.style;
  const geometries: THREE.BufferGeometry[] = [];
  const baseY = girdleY - stoneHeight * 0.35;
  const tipY = girdleY + stoneHeight * 0.18;
  const length = tipY - baseY;

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / count;
    const x = Math.cos(a) * stoneR;
    const z = Math.sin(a) * stoneR;

    if (style === "round") {
      const cyl = new THREE.CylinderGeometry(t / 2, t / 2 * 1.1, length, 12);
      cyl.translate(0, length / 2, 0);
      cyl.rotateX(0);
      cyl.translate(x, baseY, z);
      geometries.push(cyl);
      const tip = new THREE.SphereGeometry(t / 2 * 0.9, 12, 12);
      tip.translate(x, tipY, z);
      geometries.push(tip);
    } else if (style === "claw") {
      const cyl = new THREE.CylinderGeometry(t / 2 * 0.7, t / 2 * 1.2, length, 12);
      cyl.translate(0, length / 2, 0);
      cyl.translate(x, baseY, z);
      geometries.push(cyl);
      // Curved claw tip clipping over girdle
      const tipStart = new THREE.Vector3(x, tipY - 0.1, z);
      const tipMid   = new THREE.Vector3(x * 0.85, tipY + 0.2, z * 0.85);
      const tipEnd   = new THREE.Vector3(x * 0.7, tipY - 0.05, z * 0.7);
      const curve = new THREE.QuadraticBezierCurve3(tipStart, tipMid, tipEnd);
      const tipGeom = new THREE.TubeGeometry(curve, 8, t / 2 * 0.6, 8, false);
      geometries.push(tipGeom);
    } else {
      // V-prong
      const cyl = new THREE.CylinderGeometry(t / 2 * 0.6, t / 2 * 1.1, length, 6);
      cyl.translate(0, length / 2, 0);
      cyl.translate(x, baseY, z);
      geometries.push(cyl);
      const v = new THREE.ConeGeometry(t / 2 * 1.2, t * 1.2, 4);
      v.rotateY(a);
      v.translate(x, tipY, z);
      geometries.push(v);
    }
  }
  return geometries;
}
