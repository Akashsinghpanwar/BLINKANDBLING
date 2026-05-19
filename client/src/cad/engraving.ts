import * as THREE from "three";

// Returns simple text plane geometries placed inside the band.
// Real text engraving requires loaded fonts; we approximate with thin notches.
export function buildEngravingMarkers(text: string, innerR: number): THREE.BufferGeometry[] {
  if (!text) return [];
  const out: THREE.BufferGeometry[] = [];
  const chars = text.slice(0, 24);
  const span = (chars.length * 0.6) / innerR;
  const startA = -span / 2;
  for (let i = 0; i < chars.length; i++) {
    const a = startA + (i / Math.max(1, chars.length - 1)) * span - Math.PI / 2;
    const x = Math.cos(a) * (innerR + 0.05);
    const z = Math.sin(a) * (innerR + 0.05);
    const notch = new THREE.BoxGeometry(0.15, 0.25, 0.05);
    notch.translate(x, 0, z);
    notch.rotateY(-a);
    out.push(notch);
  }
  return out;
}
