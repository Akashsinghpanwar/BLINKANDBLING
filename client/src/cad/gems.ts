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
  diamond:      { name: "Diamond",      color: "#FFFFFF", ior: 2.42, attenuationColor: "#FFFFFF", pricePerCarat: 6000 },
  ruby:         { name: "Ruby",         color: "#E0115F", ior: 1.77, attenuationColor: "#FF335E", pricePerCarat: 1500 },
  sapphire:     { name: "Sapphire",     color: "#0F52BA", ior: 1.77, attenuationColor: "#3A6BD4", pricePerCarat: 1200 },
  emerald:      { name: "Emerald",      color: "#50C878", ior: 1.58, attenuationColor: "#7FE0A0", pricePerCarat: 2000 },
  morganite:    { name: "Morganite",    color: "#F4C2C2", ior: 1.58, attenuationColor: "#FFD8D8", pricePerCarat: 400  },
  tanzanite:    { name: "Tanzanite",    color: "#4B0082", ior: 1.69, attenuationColor: "#7B52AB", pricePerCarat: 1800 },
  aquamarine:   { name: "Aquamarine",   color: "#7FFFD4", ior: 1.58, attenuationColor: "#AFFFFF", pricePerCarat: 300  },
  amethyst:     { name: "Amethyst",     color: "#9B59B6", ior: 1.54, attenuationColor: "#C39BD3", pricePerCarat: 80   },
  garnet:       { name: "Garnet",       color: "#8B0000", ior: 1.76, attenuationColor: "#C0392B", pricePerCarat: 200  },
  topaz:        { name: "Blue Topaz",   color: "#4CC9F0", ior: 1.62, attenuationColor: "#90E0EF", pricePerCarat: 100  },
  opal:         { name: "Opal",         color: "#FFEEDD", ior: 1.45, attenuationColor: "#FFF5EE", pricePerCarat: 500  },
  tourmaline:   { name: "Tourmaline",   color: "#1ABC9C", ior: 1.63, attenuationColor: "#2ECC71", pricePerCarat: 350  },
  alexandrite:  { name: "Alexandrite",  color: "#6A0DAD", ior: 1.75, attenuationColor: "#9B59B6", pricePerCarat: 5000 },
  spinel:       { name: "Spinel",       color: "#E91E63", ior: 1.72, attenuationColor: "#F06292", pricePerCarat: 600  },
  peridot:      { name: "Peridot",      color: "#ADFF2F", ior: 1.65, attenuationColor: "#CCFF66", pricePerCarat: 150  },
  citrine:      { name: "Citrine",      color: "#FFC107", ior: 1.55, attenuationColor: "#FFD54F", pricePerCarat: 60   },
  iolite:       { name: "Iolite",       color: "#3F51B5", ior: 1.54, attenuationColor: "#7986CB", pricePerCarat: 120  },
  labradorite:  { name: "Labradorite",  color: "#607D8B", ior: 1.56, attenuationColor: "#90A4AE", pricePerCarat: 80   },
  moonstone:    { name: "Moonstone",    color: "#E8E8FF", ior: 1.52, attenuationColor: "#F0F0FF", pricePerCarat: 200  },
  pearl:        { name: "Pearl",        color: "#F8F0E3", ior: 1.53, attenuationColor: "#FFF8F0", pricePerCarat: 100  },
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
