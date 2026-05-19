// Live spot price hook — fetches real metal market prices from a free public
// API (gold-api.com, no key required) and caches them in localStorage so we
// don't re-hit the network on every recipe tweak. Diamond pricing uses a
// realistic Rapaport-style per-carat curve since there's no truly free
// real-time diamond spot API.

import { useEffect, useState } from "react";

export interface SpotPrices {
  // USD per troy ounce (raw spot)
  goldOzUsd: number;
  silverOzUsd: number;
  platinumOzUsd: number;
  // ISO timestamp of last successful fetch
  fetchedAt: string;
  // True if these are baked-in fallback values (network failed / first load)
  isLive: boolean;
}

// Realistic mid-2026 fallback values (used while live fetch is in flight, or
// if the network is offline). These are conservative wholesale spot prices.
const FALLBACK: SpotPrices = {
  goldOzUsd: 2650,
  silverOzUsd: 31,
  platinumOzUsd: 980,
  fetchedAt: new Date(0).toISOString(),
  isLive: false,
};

const CACHE_KEY = "bbcad-spot-prices-v1";
const CACHE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes — spot prices don't move that fast

function readCache(): SpotPrices | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SpotPrices;
    const age = Date.now() - new Date(v.fetchedAt).getTime();
    if (age < CACHE_MAX_AGE_MS) return v;
  } catch { /* ignore */ }
  return null;
}

function writeCache(p: SpotPrices) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

async function fetchOne(symbol: "XAU" | "XAG" | "XPT"): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://api.gold-api.com/price/${symbol}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json() as { price?: number };
    if (typeof j.price !== "number" || !isFinite(j.price)) throw new Error("invalid price");
    return j.price;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSpotPrices(): Promise<SpotPrices> {
  const [g, s, p] = await Promise.allSettled([
    fetchOne("XAU"),
    fetchOne("XAG"),
    fetchOne("XPT"),
  ]);
  const next: SpotPrices = {
    goldOzUsd:     g.status === "fulfilled" ? g.value : FALLBACK.goldOzUsd,
    silverOzUsd:   s.status === "fulfilled" ? s.value : FALLBACK.silverOzUsd,
    platinumOzUsd: p.status === "fulfilled" ? p.value : FALLBACK.platinumOzUsd,
    fetchedAt: new Date().toISOString(),
    isLive: g.status === "fulfilled" || s.status === "fulfilled" || p.status === "fulfilled",
  };
  writeCache(next);
  return next;
}

/** React hook — returns latest spot prices, fetching on mount and refreshing every 15 min. */
export function useSpotPrices(): SpotPrices {
  const [prices, setPrices] = useState<SpotPrices>(() => readCache() ?? FALLBACK);

  useEffect(() => {
    let alive = true;
    fetchSpotPrices().then((p) => { if (alive) setPrices(p); }).catch(() => { /* stay on fallback */ });
    const id = setInterval(() => {
      fetchSpotPrices().then((p) => { if (alive) setPrices(p); }).catch(() => { /* ignore */ });
    }, CACHE_MAX_AGE_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return prices;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert raw spot prices to per-gram pricing for our specific alloys.
// 1 troy oz = 31.1034768 grams. Karat purity: 24k = 100%, 18k = 75%, 14k = 58.5%.
// We add a 25% retail markup on top of pure-metal cost to cover refining,
// alloying, casting, and finishing.
// ─────────────────────────────────────────────────────────────────────────────

const GRAMS_PER_OZ = 31.1034768;
const MARKUP = 1.25;

import type { MetalType } from "@/store/recipe";

export function metalPricePerGramUSD(metal: MetalType, prices: SpotPrices): number {
  const goldGram = (prices.goldOzUsd / GRAMS_PER_OZ);
  const silverGram = (prices.silverOzUsd / GRAMS_PER_OZ);
  const platGram = (prices.platinumOzUsd / GRAMS_PER_OZ);

  switch (metal) {
    case "18k-yellow":
    case "rose-gold":
    case "white-gold":
      // 18k = 75% gold; the remainder (alloy) costs ~$1/g — negligible vs gold.
      return goldGram * 0.75 * MARKUP;
    case "14k-yellow":
      return goldGram * 0.585 * MARKUP;
    case "platinum":
      // 950 platinum (95% pure)
      return platGram * 0.95 * MARKUP;
    case "sterling-silver":
      // 925 silver (92.5% pure)
      return silverGram * 0.925 * MARKUP;
    case "black-rhodium":
      // Black rhodium plating is applied over white gold or silver; price like 18k white gold.
      return goldGram * 0.75 * MARKUP * 1.1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Diamond pricing — Rapaport-style per-carat curve. Diamond price-per-carat
// rises non-linearly with size (a 2ct stone is way more than 2× a 1ct).
// These are wholesale-ish 2026 numbers for G-VS2 round brilliant.
// ─────────────────────────────────────────────────────────────────────────────
export function diamondPricePerCaratUSD(carats: number): number {
  if (carats < 0.05) return 200;
  if (carats < 0.10) return 800;
  if (carats < 0.25) return 1600;
  if (carats < 0.50) return 2800;
  if (carats < 0.75) return 4500;
  if (carats < 1.00) return 5800;
  if (carats < 1.50) return 7200;
  if (carats < 2.00) return 9500;
  if (carats < 3.00) return 13500;
  if (carats < 4.00) return 18000;
  return 24000;
}

// Coloured stone pricing — per-carat varies by gem type. Non-diamond stones
// scale roughly linearly so a single per-carat is a reasonable approximation.
export function gemPricePerCaratUSD(material: string, carats: number): number {
  if (material === "diamond") return diamondPricePerCaratUSD(carats);
  const base: Record<string, number> = {
    ruby:      carats < 1 ? 800  : carats < 2 ? 1800 : 3500,
    sapphire:  carats < 1 ? 600  : carats < 2 ? 1400 : 2800,
    emerald:   carats < 1 ? 900  : carats < 2 ? 2200 : 4500,
    morganite: carats < 1 ? 250  : carats < 2 ? 400  : 700,
  };
  return base[material] ?? 500;
}

/** Estimate making/labour charges based on metal weight and complexity (halo/prongs). */
export function makingChargeUSD(grams: number, prongCount: number, haloEnabled: boolean): number {
  const baseLabour = 80;          // setup + casting setup
  const perGram    = 18;          // hand-finishing labour scales with metal weight
  const settingFee = prongCount * 25; // per-prong setting labour
  const haloFee    = haloEnabled ? 150 : 0;
  return baseLabour + grams * perGram + settingFee + haloFee;
}
