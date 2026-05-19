import * as THREE from "three";
import type { GemMaterial } from "@/store/recipe";

export interface GemSpec {
  name: string;
  color: string;
  ior: number;
  attenuationColor: string;
  pricePerCarat: number;
}

export const GEM_SPECS: Record<GemMaterial, GemSpec> = {
  diamond:   { name: "Diamond",   color: "#FFFFFF", ior: 2.42, attenuationColor: "#FFFFFF", pricePerCarat: 6000 },
  ruby:      { name: "Ruby",      color: "#E0115F", ior: 1.77, attenuationColor: "#FF335E", pricePerCarat: 1500 },
  sapphire:  { name: "Sapphire",  color: "#0F52BA", ior: 1.77, attenuationColor: "#3A6BD4", pricePerCarat: 1200 },
  emerald:   { name: "Emerald",   color: "#50C878", ior: 1.58, attenuationColor: "#7FE0A0", pricePerCarat: 2000 },
  morganite: { name: "Morganite", color: "#F4C2C2", ior: 1.58, attenuationColor: "#FFD8D8", pricePerCarat: 400 },
};

// Lightweight material used by ortho previews (no real refraction, but stable + cheap).
export function makeGemMaterial(type: GemMaterial): THREE.MeshPhysicalMaterial {
  const spec = GEM_SPECS[type];
  const isDiamond = type === "diamond";
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color),
    metalness: 0,
    roughness: 0.0,
    transmission: isDiamond ? 0.95 : 0.85,
    thickness: 1.5,
    ior: spec.ior,
    attenuationColor: new THREE.Color(spec.attenuationColor),
    attenuationDistance: isDiamond ? 6.0 : 1.4,
    envMapIntensity: 3.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    transparent: true,
    side: THREE.DoubleSide,
  });
}
