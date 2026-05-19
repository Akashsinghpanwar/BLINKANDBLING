import * as THREE from "three";
import type { ParametricRecipe } from "@/store/recipe";

function makeProfile(width: number, thickness: number, profile: ParametricRecipe["ringBase"]["profile"]): THREE.Shape {
  const w = width / 2;
  const t = thickness;
  const shape = new THREE.Shape();
  if (profile === "flat") {
    shape.moveTo(-w, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, t);
    shape.lineTo(-w, t);
    shape.lineTo(-w, 0);
  } else if (profile === "dome") {
    shape.moveTo(-w, 0);
    shape.lineTo(w, 0);
    shape.quadraticCurveTo(w, t, 0, t);
    shape.quadraticCurveTo(-w, t, -w, 0);
  } else if (profile === "comfort-dome") {
    shape.moveTo(-w, t * 0.2);
    shape.quadraticCurveTo(-w * 0.6, 0, 0, 0);
    shape.quadraticCurveTo(w * 0.6, 0, w, t * 0.2);
    shape.quadraticCurveTo(w, t * 0.95, 0, t);
    shape.quadraticCurveTo(-w, t * 0.95, -w, t * 0.2);
  } else {
    // knife-edge
    shape.moveTo(-w, t * 0.5);
    shape.lineTo(0, 0);
    shape.lineTo(w, t * 0.5);
    shape.lineTo(0, t);
    shape.lineTo(-w, t * 0.5);
  }
  return shape;
}

export function buildShank(recipe: ParametricRecipe): THREE.BufferGeometry {
  const innerD = (recipe.ringBase.sizeSystem === "US"
    ? 14 + (recipe.ringBase.sizeNumber - 3) * 0.41
    : recipe.ringBase.sizeNumber / Math.PI) + (recipe.ringBase.comfortFit ? 0.1 : 0);
  const innerR = innerD / 2;
  const outerR = innerR + recipe.ringBase.thickness;
  const meanR = (innerR + outerR) / 2;

  const segments = 256;
  const style = recipe.shank.style;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = t * Math.PI * 2 - Math.PI / 2;
    let r = meanR;
    let z = 0;
    if (style === "cathedral") {
      const top = Math.cos(a) > 0.6 ? (Math.cos(a) - 0.6) / 0.4 : 0;
      r += top * 0.6;
    } else if (style === "twisted") {
      z = Math.sin(t * Math.PI * 12) * 0.2;
    } else if (style === "bypass") {
      z = Math.sin(t * Math.PI * 2) * 0.5 * Math.max(0, Math.cos(a));
    }
    points.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
  }
  const path = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.3);

  const profile = makeProfile(recipe.ringBase.width, recipe.ringBase.thickness, recipe.ringBase.profile);
  const geom = new THREE.ExtrudeGeometry(profile, {
    steps: segments,
    bevelEnabled: false,
    extrudePath: path,
  });
  geom.computeVertexNormals();
  return geom;
}

export function getInnerRadius(recipe: ParametricRecipe): number {
  const innerD = (recipe.ringBase.sizeSystem === "US"
    ? 14 + (recipe.ringBase.sizeNumber - 3) * 0.41
    : recipe.ringBase.sizeNumber / Math.PI) + (recipe.ringBase.comfortFit ? 0.1 : 0);
  return innerD / 2;
}

export function getOuterRadius(recipe: ParametricRecipe): number {
  return getInnerRadius(recipe) + recipe.ringBase.thickness;
}

export function getTopOfBand(recipe: ParametricRecipe): number {
  const outerR = getOuterRadius(recipe);
  if (recipe.shank.style === "cathedral") return outerR + 0.6;
  return outerR;
}
