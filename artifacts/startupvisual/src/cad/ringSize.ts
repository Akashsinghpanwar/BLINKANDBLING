export type SizeSystem = "US" | "UK" | "ISO" | "Indian";

const US_TO_DIAMETER_MM: Record<number, number> = {
  3: 14.0, 3.5: 14.4, 4: 14.8, 4.5: 15.2, 5: 15.7, 5.5: 16.1,
  6: 16.5, 6.5: 16.9, 7: 17.3, 7.5: 17.7, 8: 18.1, 8.5: 18.5,
  9: 19.0, 9.5: 19.4, 10: 19.8, 10.5: 20.2, 11: 20.6, 11.5: 21.0,
  12: 21.4, 12.5: 21.8, 13: 22.2,
};

const UK_TO_US: Record<string, number> = {
  F: 3, "F.5": 3.5, G: 3.75, "G.5": 4, H: 4.25, "H.5": 4.5,
  I: 4.75, J: 5, "J.5": 5.25, K: 5.5, "K.5": 5.75, L: 6,
  "L.5": 6.25, M: 6.5, "M.5": 6.75, N: 7, "N.5": 7.25, O: 7.5,
  "O.5": 7.75, P: 8, "P.5": 8.25, Q: 8.5, "Q.5": 8.75, R: 9,
  "R.5": 9.25, S: 9.5, "S.5": 9.75, T: 10, U: 10.5, V: 11,
  W: 11.5, X: 12, Y: 12.5, Z: 13,
};

export function getInnerDiameter(
  system: SizeSystem,
  size: number,
  comfortFit: boolean,
): number {
  let mm: number;
  if (system === "US") {
    mm = US_TO_DIAMETER_MM[size] ?? 14 + (size - 3) * 0.41;
  } else if (system === "ISO") {
    mm = size / Math.PI;
  } else if (system === "Indian") {
    mm = 13.5 + (size - 1) * 0.4;
  } else {
    const us = Object.values(UK_TO_US)[Math.min(Math.max(0, Math.round(size)), Object.values(UK_TO_US).length - 1)] ?? 7;
    mm = US_TO_DIAMETER_MM[us] ?? 17.3;
  }
  if (comfortFit) mm += 0.1;
  return mm;
}

export function getUSSizeFromDiameter(mm: number): number {
  let closest = 7;
  let best = Infinity;
  for (const [s, d] of Object.entries(US_TO_DIAMETER_MM)) {
    const diff = Math.abs(d - mm);
    if (diff < best) { best = diff; closest = parseFloat(s); }
  }
  return closest;
}

export function getUKSizeFromUS(usSize: number): string {
  let closest = "N";
  let best = Infinity;
  for (const [uk, us] of Object.entries(UK_TO_US)) {
    const diff = Math.abs(us - usSize);
    if (diff < best) { best = diff; closest = uk; }
  }
  return closest;
}
