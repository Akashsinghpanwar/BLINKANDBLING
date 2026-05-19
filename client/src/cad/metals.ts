import * as THREE from "three";
import type { MetalType } from "@/store/recipe";

export interface MetalSpec {
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  density: number;
  pricePerGram: number;
}

export const METAL_SPECS: Record<MetalType, MetalSpec> = {
  "18k-yellow":      { name: "18k Yellow Gold", color: "#E6BE48", metalness: 1.0, roughness: 0.13, density: 15.5, pricePerGram: 60 },
  "14k-yellow":      { name: "14k Yellow Gold", color: "#D4A93A", metalness: 1.0, roughness: 0.18, density: 13.0, pricePerGram: 45 },
  "rose-gold":       { name: "Rose Gold",       color: "#C77E83", metalness: 1.0, roughness: 0.16, density: 14.0, pricePerGram: 50 },
  "white-gold":      { name: "White Gold",      color: "#F2EEE6", metalness: 1.0, roughness: 0.10, density: 14.7, pricePerGram: 55 },
  "platinum":        { name: "Platinum",        color: "#E8E8E6", metalness: 1.0, roughness: 0.08, density: 21.4, pricePerGram: 35 },
  "sterling-silver": { name: "Sterling Silver", color: "#DCDCDC", metalness: 1.0, roughness: 0.14, density: 10.4, pricePerGram: 1.2 },
  "black-rhodium":   { name: "Black Rhodium",   color: "#1F1F22", metalness: 1.0, roughness: 0.22, density: 12.4, pricePerGram: 70 },
};

export function makeMetalMaterial(type: MetalType): THREE.MeshPhysicalMaterial {
  const spec = METAL_SPECS[type];
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color),
    metalness: spec.metalness,
    roughness: spec.roughness,
    envMapIntensity: 2.4,
    clearcoat: 0.35,
    clearcoatRoughness: 0.08,
    reflectivity: 1.0,
  });
  return mat;
}
