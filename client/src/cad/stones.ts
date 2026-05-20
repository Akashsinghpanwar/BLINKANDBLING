import * as THREE from "three";
import type { StoneShape } from "@/store/recipe";

interface StoneGeometry {
  geometry: THREE.BufferGeometry;
  height: number;
  girdleRadius: number;
}

function pushTri(verts: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  verts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

export function buildRoundBrilliant(diameter: number, depthRatio: number): StoneGeometry {
  const r = diameter / 2;
  // GIA "ideal" Tolkowsky proportions
  const tableRatio = 0.55;
  const crownHeight = diameter * depthRatio * 0.165;
  const pavilionDepth = diameter * depthRatio * 0.43;
  const girdleHeight = diameter * 0.025;

  const tableR = r * tableRatio;
  const crownR = r;
  const culet = new THREE.Vector3(0, -pavilionDepth - girdleHeight / 2, 0);

  // 32 segments for sharp brilliant-cut sparkle (vs 16 before)
  const N = 32;
  const tablePts: THREE.Vector3[] = [];
  const upperGirdlePts: THREE.Vector3[] = [];
  const lowerGirdlePts: THREE.Vector3[] = [];
  const girdleTopPts: THREE.Vector3[] = [];
  const girdleBotPts: THREE.Vector3[] = [];

  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    tablePts.push(new THREE.Vector3(ca * tableR, crownHeight + girdleHeight / 2, sa * tableR));
    girdleTopPts.push(new THREE.Vector3(ca * crownR, girdleHeight / 2, sa * crownR));
    girdleBotPts.push(new THREE.Vector3(ca * crownR, -girdleHeight / 2, sa * crownR));
    const ua = a + Math.PI / N;
    // Upper girdle facets sit between the bezel kites at ~80% depth into the crown
    upperGirdlePts.push(new THREE.Vector3(Math.cos(ua) * crownR * 0.97, girdleHeight / 2 + crownHeight * 0.55, Math.sin(ua) * crownR * 0.97));
    // Lower girdle facets sit between pavilion mains (the prized "fish-eye" facets)
    lowerGirdlePts.push(new THREE.Vector3(Math.cos(ua) * crownR * 0.78, -girdleHeight / 2 - pavilionDepth * 0.62, Math.sin(ua) * crownR * 0.78));
  }

  const verts: number[] = [];
  // Table (octagon-like, faceted)
  for (let i = 0; i < N; i++) {
    const a = tablePts[i]!;
    const b = tablePts[(i + 1) % N]!;
    const center = new THREE.Vector3(0, crownHeight + girdleHeight / 2, 0);
    pushTri(verts, center, a, b);
  }
  // Crown facets: star + bezel + upper girdle
  for (let i = 0; i < N; i++) {
    const t1 = tablePts[i]!;
    const t2 = tablePts[(i + 1) % N]!;
    const u = upperGirdlePts[i]!;
    const g1 = girdleTopPts[i]!;
    const g2 = girdleTopPts[(i + 1) % N]!;
    pushTri(verts, t1, u, t2);          // star
    pushTri(verts, t1, g1, u);          // upper girdle left
    pushTri(verts, t2, u, g2);          // upper girdle right
    pushTri(verts, u, g1, g2);          // bezel
  }
  // Girdle (cylinder)
  for (let i = 0; i < N; i++) {
    const a1 = girdleTopPts[i]!;
    const a2 = girdleTopPts[(i + 1) % N]!;
    const b1 = girdleBotPts[i]!;
    const b2 = girdleBotPts[(i + 1) % N]!;
    pushTri(verts, a1, b1, a2);
    pushTri(verts, a2, b1, b2);
  }
  // Pavilion: lower girdle + main pavilion
  for (let i = 0; i < N; i++) {
    const g1 = girdleBotPts[i]!;
    const g2 = girdleBotPts[(i + 1) % N]!;
    const l = lowerGirdlePts[i]!;
    pushTri(verts, g1, l, g2);
    pushTri(verts, g1, culet, l);
    pushTri(verts, g2, l, culet);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  return { geometry: geom, height: crownHeight + pavilionDepth + girdleHeight, girdleRadius: r };
}

export function buildPrincess(diameter: number, depthRatio: number): StoneGeometry {
  const r = diameter / 2;
  const h = diameter * depthRatio;
  const verts: number[] = [];
  const top = [
    new THREE.Vector3(-r, h * 0.2, -r),
    new THREE.Vector3(r, h * 0.2, -r),
    new THREE.Vector3(r, h * 0.2, r),
    new THREE.Vector3(-r, h * 0.2, r),
  ];
  const tableR = r * 0.7;
  const table = [
    new THREE.Vector3(-tableR, h * 0.3, -tableR),
    new THREE.Vector3(tableR, h * 0.3, -tableR),
    new THREE.Vector3(tableR, h * 0.3, tableR),
    new THREE.Vector3(-tableR, h * 0.3, tableR),
  ];
  const culet = new THREE.Vector3(0, -h * 0.7, 0);
  // table
  pushTri(verts, table[0]!, table[1]!, table[2]!);
  pushTri(verts, table[0]!, table[2]!, table[3]!);
  // crown
  for (let i = 0; i < 4; i++) {
    pushTri(verts, table[i]!, top[i]!, table[(i + 1) % 4]!);
    pushTri(verts, top[i]!, top[(i + 1) % 4]!, table[(i + 1) % 4]!);
  }
  // pavilion
  for (let i = 0; i < 4; i++) {
    pushTri(verts, top[i]!, culet, top[(i + 1) % 4]!);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  return { geometry: geom, height: h, girdleRadius: r * Math.SQRT2 };
}

export function buildEmerald(diameter: number, depthRatio: number): StoneGeometry {
  const w = diameter / 2;
  const l = w * 1.35;
  const h = diameter * depthRatio;
  const c = w * 0.18; // corner cut
  const verts: number[] = [];
  const ring = (y: number, scale: number): THREE.Vector3[] => {
    const W = w * scale, L = l * scale, C = c * scale;
    return [
      new THREE.Vector3(-W + C, y, -L), new THREE.Vector3(W - C, y, -L),
      new THREE.Vector3(W, y, -L + C),  new THREE.Vector3(W, y, L - C),
      new THREE.Vector3(W - C, y, L),   new THREE.Vector3(-W + C, y, L),
      new THREE.Vector3(-W, y, L - C),  new THREE.Vector3(-W, y, -L + C),
    ];
  };
  const top = ring(h * 0.3, 0.78);
  const girdle = ring(h * 0.0, 1.0);
  const bot = ring(-h * 0.45, 0.55);
  const culet = new THREE.Vector3(0, -h * 0.7, 0);
  // table
  for (let i = 1; i < 7; i++) pushTri(verts, top[0]!, top[i]!, top[i + 1]!);
  // crown sides
  for (let i = 0; i < 8; i++) {
    const a = top[i]!, b = top[(i + 1) % 8]!;
    const c1 = girdle[i]!, c2 = girdle[(i + 1) % 8]!;
    pushTri(verts, a, c1, b); pushTri(verts, b, c1, c2);
  }
  // pavilion sides
  for (let i = 0; i < 8; i++) {
    const a = girdle[i]!, b = girdle[(i + 1) % 8]!;
    const c1 = bot[i]!, c2 = bot[(i + 1) % 8]!;
    pushTri(verts, a, c1, b); pushTri(verts, b, c1, c2);
  }
  // pavilion to culet
  for (let i = 0; i < 8; i++) pushTri(verts, bot[i]!, culet, bot[(i + 1) % 8]!);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  return { geometry: geom, height: h, girdleRadius: Math.max(w, l) };
}

export function buildOval(diameter: number, depthRatio: number, ratio: number = 1.5): StoneGeometry {
  const result = buildRoundBrilliant(diameter, depthRatio);
  result.geometry.scale(1, 1, ratio);
  result.girdleRadius = (diameter / 2) * ratio;
  return result;
}

export function buildPear(diameter: number, depthRatio: number): StoneGeometry {
  const result = buildRoundBrilliant(diameter, depthRatio);
  // taper one side to a point
  const pos = result.geometry.attributes["position"]!;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const x = pos.getX(i);
    if (z > 0) {
      const factor = 1 + (z / (diameter / 2)) * 0.5;
      pos.setZ(i, z * factor);
      pos.setX(i, x * (1 - z / (diameter)));
    }
  }
  result.geometry.computeVertexNormals();
  return result;
}

export function buildMarquise(diameter: number, depthRatio: number): StoneGeometry {
  const result = buildOval(diameter, depthRatio, 2.0);
  // sharpen ends
  const pos = result.geometry.attributes["position"]!;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const absZ = Math.abs(z);
    if (absZ > diameter * 0.5) {
      pos.setX(i, pos.getX(i) * 0.3);
    }
  }
  result.geometry.computeVertexNormals();
  return result;
}

export function buildCushion(diameter: number, depthRatio: number): StoneGeometry {
  const result = buildPrincess(diameter, depthRatio);
  // round corners by softening the geometry
  const pos = result.geometry.attributes["position"]!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.sqrt(x * x + z * z);
    if (d > 0) {
      const r = diameter / 2;
      const blend = 0.3;
      const cornerR = Math.min(d, r);
      pos.setX(i, (x / d) * (cornerR * (1 - blend) + r * blend * Math.cos(Math.atan2(z, x))));
      pos.setZ(i, (z / d) * (cornerR * (1 - blend) + r * blend * Math.sin(Math.atan2(z, x))));
    }
  }
  result.geometry.computeVertexNormals();
  return result;
}

export function buildStone(shape: StoneShape, diameter: number, depthRatio: number): StoneGeometry {
  switch (shape) {
    case "round-brilliant": return buildRoundBrilliant(diameter, depthRatio);
    case "oval":            return buildOval(diameter, depthRatio, 1.4);
    case "pear":            return buildPear(diameter, depthRatio);
    case "princess":        return buildPrincess(diameter, depthRatio);
    case "emerald":         return buildEmerald(diameter, depthRatio);
    case "cushion":         return buildCushion(diameter, depthRatio);
    case "marquise":        return buildMarquise(diameter, depthRatio);
    // New shapes — approximate with closest existing geometry
    case "asscher":         return buildEmerald(diameter, depthRatio);         // square emerald cut
    case "radiant":         return buildCushion(diameter, depthRatio);         // rounded rectangle brilliant
    case "heart":           return buildOval(diameter, depthRatio, 0.95);      // approximate heart silhouette
    case "trillion":        return buildPrincess(diameter, depthRatio);        // triangular brilliant
    case "baguette":        return buildEmerald(diameter * 0.55, depthRatio);  // narrow rectangle step cut
    case "briolette":       return buildOval(diameter, depthRatio, 0.58);      // tall narrow teardrop
    case "cabochon":        return buildRoundBrilliant(diameter, 0.30);        // dome, no facets
    case "rose-cut":        return buildRoundBrilliant(diameter, 0.22);        // flat-bottom dome
    default:                return buildRoundBrilliant(diameter, depthRatio);
  }
}
