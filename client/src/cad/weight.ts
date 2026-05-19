import * as THREE from "three";

export function computeVolume(geom: THREE.BufferGeometry): number {
  const pos = geom.attributes["position"];
  if (!pos) return 0;
  const idx = geom.index;
  let vol = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i));
      b.fromBufferAttribute(pos, idx.getX(i + 1));
      c.fromBufferAttribute(pos, idx.getX(i + 2));
      vol += a.dot(b.clone().cross(c)) / 6.0;
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      vol += a.dot(b.clone().cross(c)) / 6.0;
    }
  }
  return Math.abs(vol);
}

export function computeSurfaceArea(geom: THREE.BufferGeometry): number {
  const pos = geom.attributes["position"];
  if (!pos) return 0;
  let area = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    ab.subVectors(b, a); ac.subVectors(c, a);
    area += ab.cross(ac).length() / 2.0;
  }
  return area;
}

// Volume in mm^3 → grams using density g/cm^3
export function volumeToGrams(volumeMm3: number, densityGCm3: number): number {
  return (volumeMm3 / 1000) * densityGCm3;
}

// Stone weight: estimate carats from diameter (mm) for round brilliant
// 1ct round ≈ 6.5mm diameter; weight scales ~ d^3
export function estimateCaratsFromDiameter(d: number): number {
  return Math.pow(d / 6.5, 3);
}
