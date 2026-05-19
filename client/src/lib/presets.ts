import type { ParametricRecipe, SettingType, ProngStyle, ShankStyle } from "@/store/recipe";

export interface Preset {
  id: string;
  name: string;
  category: "Gallery" | "Prongs" | "Settings" | "Head" | "Shoulders" | "Under Gallery" | "Band";
  apply: (r: ParametricRecipe) => void;
}

export const PRESETS: Preset[] = [
  // GALLERY (full ring styles)
  {
    id: "solitaire", name: "Solitaire", category: "Gallery",
    apply: (r) => {
      r.setting.type = "solitaire" as SettingType;
      r.shank.style = "straight" as ShankStyle;
      r.halo.enabled = false;
      r.prongs.count = 4; r.prongs.style = "round" as ProngStyle;
    },
  },
  {
    id: "cathedral", name: "Cathedral", category: "Gallery",
    apply: (r) => {
      r.setting.type = "cathedral-solitaire" as SettingType;
      r.shank.style = "cathedral" as ShankStyle;
      r.halo.enabled = false;
      r.prongs.count = 6; r.prongs.style = "claw" as ProngStyle;
    },
  },
  {
    id: "basket", name: "Basket", category: "Gallery",
    apply: (r) => {
      r.setting.type = "solitaire" as SettingType;
      r.shank.style = "straight" as ShankStyle;
      r.prongs.count = 4; r.prongs.style = "round" as ProngStyle;
      r.prongs.thickness = 0.6;
      r.halo.enabled = false;
    },
  },
  {
    id: "pegHead", name: "Peg Head", category: "Gallery",
    apply: (r) => {
      r.setting.type = "cathedral-solitaire" as SettingType;
      r.shank.style = "straight" as ShankStyle;
      r.prongs.count = 6; r.prongs.style = "claw" as ProngStyle;
    },
  },
  {
    id: "flushFit", name: "Flush Fit", category: "Gallery",
    apply: (r) => {
      r.setting.type = "bezel" as SettingType;
      r.shank.style = "straight" as ShankStyle;
      r.ringBase.profile = "flat";
    },
  },
  {
    id: "tension", name: "Tension", category: "Gallery",
    apply: (r) => {
      r.setting.type = "tension" as SettingType;
      r.shank.style = "bypass" as ShankStyle;
      r.ringBase.thickness = 2.4;
    },
  },
  {
    id: "bezel", name: "Bezel", category: "Gallery",
    apply: (r) => {
      r.setting.type = "bezel" as SettingType;
      r.shank.style = "straight" as ShankStyle;
    },
  },
  {
    id: "halo", name: "Halo", category: "Gallery",
    apply: (r) => {
      r.setting.type = "cathedral-solitaire" as SettingType;
      r.halo.enabled = true; r.halo.stoneCount = 18; r.halo.stoneSize = 1.0;
    },
  },

  // ── SHOWCASE PRESETS (match the gallery photos) ──────────────────────────────
  {
    id: "classicSolitaire", name: "Classic Solitaire", category: "Gallery",
    apply: (r) => {
      // 18k yellow gold, knife-edge band, single round brilliant in 4-claw — like the top-left photo.
      r.metal = "18k-yellow";
      r.ringBase.profile = "knife-edge";
      r.ringBase.width = 1.8; r.ringBase.thickness = 1.7; r.ringBase.taperRatio = 0.2;
      r.shank.style = "straight";
      r.setting.type = "solitaire";
      r.prongs.count = 4; r.prongs.style = "claw"; r.prongs.thickness = 0.7;
      r.centerStone.shape = "round-brilliant";
      r.centerStone.diameter = 6.5; r.centerStone.material = "diamond";
      r.halo.enabled = false;
    },
  },
  {
    id: "eternityBand", name: "Eternity Band", category: "Gallery",
    apply: (r) => {
      // Full pavé eternity in white gold — like the top-right photo. No center stone.
      r.metal = "white-gold";
      r.ringBase.profile = "dome";
      r.ringBase.width = 2.6; r.ringBase.thickness = 1.8; r.ringBase.taperRatio = 0;
      r.shank.style = "straight";
      r.setting.type = "bezel";
      r.centerStone.shape = "round-brilliant";
      r.centerStone.diameter = 0.1; r.centerStone.material = "diamond"; // hide center
      r.prongs.count = 4; r.prongs.thickness = 0.0;
      r.halo.enabled = true; r.halo.stoneCount = 30; r.halo.stoneSize = 1.6; r.halo.spacing = 0.04;
    },
  },
  {
    id: "yellowHalo", name: "Yellow Halo", category: "Gallery",
    apply: (r) => {
      // Cushion yellow diamond + diamond halo, rose gold split shoulders — bottom-left photo.
      r.metal = "rose-gold";
      r.ringBase.profile = "comfort-dome";
      r.ringBase.width = 2.2; r.ringBase.thickness = 1.8;
      r.shank.style = "split-shank";
      r.setting.type = "cathedral-solitaire";
      r.prongs.count = 4; r.prongs.style = "claw"; r.prongs.thickness = 0.7;
      r.centerStone.shape = "cushion";
      r.centerStone.diameter = 7.0; r.centerStone.material = "morganite"; // amber-ish proxy for fancy yellow
      r.halo.enabled = true; r.halo.stoneCount = 22; r.halo.stoneSize = 1.1; r.halo.spacing = 0.08;
    },
  },
  {
    id: "princessTrio", name: "Princess Trio", category: "Gallery",
    apply: (r) => {
      // Princess center + side accents in white gold — bottom-right photo.
      r.metal = "platinum";
      r.ringBase.profile = "comfort-dome";
      r.ringBase.width = 2.4; r.ringBase.thickness = 1.9;
      r.shank.style = "cathedral";
      r.setting.type = "cathedral-solitaire";
      r.prongs.count = 4; r.prongs.style = "V"; r.prongs.thickness = 0.7;
      r.centerStone.shape = "princess";
      r.centerStone.diameter = 6.2; r.centerStone.material = "diamond";
      r.halo.enabled = true; r.halo.stoneCount = 6; r.halo.stoneSize = 2.4; r.halo.spacing = 0.3;
    },
  },
  {
    id: "vintageSapphire", name: "Vintage Sapphire", category: "Gallery",
    apply: (r) => {
      // Oval blue sapphire with diamond halo, ornate gold — inspired by the pendant photo.
      r.metal = "18k-yellow";
      r.ringBase.profile = "comfort-dome";
      r.ringBase.width = 2.2; r.ringBase.thickness = 1.9;
      r.shank.style = "cathedral";
      r.setting.type = "cathedral-solitaire";
      r.prongs.count = 6; r.prongs.style = "claw"; r.prongs.thickness = 0.75;
      r.centerStone.shape = "oval";
      r.centerStone.diameter = 7.5; r.centerStone.material = "sapphire";
      r.halo.enabled = true; r.halo.stoneCount = 18; r.halo.stoneSize = 1.2; r.halo.spacing = 0.08;
    },
  },

  // PRONGS
  { id: "p4round", name: "4 Round", category: "Prongs",
    apply: (r) => { r.prongs.count = 4; r.prongs.style = "round"; } },
  { id: "p6round", name: "6 Round", category: "Prongs",
    apply: (r) => { r.prongs.count = 6; r.prongs.style = "round"; } },
  { id: "p4claw", name: "4 Claw", category: "Prongs",
    apply: (r) => { r.prongs.count = 4; r.prongs.style = "claw"; } },
  { id: "p6claw", name: "6 Claw", category: "Prongs",
    apply: (r) => { r.prongs.count = 6; r.prongs.style = "claw"; } },
  { id: "pV", name: "V-Prong", category: "Prongs",
    apply: (r) => { r.prongs.count = 4; r.prongs.style = "V"; } },

  // SETTINGS
  { id: "sSol", name: "Solitaire", category: "Settings",
    apply: (r) => { r.setting.type = "solitaire"; } },
  { id: "sCath", name: "Cathedral", category: "Settings",
    apply: (r) => { r.setting.type = "cathedral-solitaire"; } },
  { id: "sBezel", name: "Bezel", category: "Settings",
    apply: (r) => { r.setting.type = "bezel"; } },
  { id: "sHalfBez", name: "Half Bezel", category: "Settings",
    apply: (r) => { r.setting.type = "half-bezel"; } },
  { id: "sTen", name: "Tension", category: "Settings",
    apply: (r) => { r.setting.type = "tension"; } },

  // HEAD (center stone shapes)
  { id: "hRound", name: "Round", category: "Head",
    apply: (r) => { r.centerStone.shape = "round-brilliant"; } },
  { id: "hOval", name: "Oval", category: "Head",
    apply: (r) => { r.centerStone.shape = "oval"; } },
  { id: "hPrincess", name: "Princess", category: "Head",
    apply: (r) => { r.centerStone.shape = "princess"; } },
  { id: "hEmerald", name: "Emerald", category: "Head",
    apply: (r) => { r.centerStone.shape = "emerald"; } },
  { id: "hPear", name: "Pear", category: "Head",
    apply: (r) => { r.centerStone.shape = "pear"; } },
  { id: "hCushion", name: "Cushion", category: "Head",
    apply: (r) => { r.centerStone.shape = "cushion"; } },
  { id: "hMarq", name: "Marquise", category: "Head",
    apply: (r) => { r.centerStone.shape = "marquise"; } },

  // SHOULDERS (shank styles)
  { id: "shStraight", name: "Straight", category: "Shoulders",
    apply: (r) => { r.shank.style = "straight"; } },
  { id: "shCathedral", name: "Cathedral", category: "Shoulders",
    apply: (r) => { r.shank.style = "cathedral"; } },
  { id: "shSplit", name: "Split", category: "Shoulders",
    apply: (r) => { r.shank.style = "split-shank"; } },
  { id: "shBypass", name: "Bypass", category: "Shoulders",
    apply: (r) => { r.shank.style = "bypass"; } },
  { id: "shTwist", name: "Twisted", category: "Shoulders",
    apply: (r) => { r.shank.style = "twisted"; } },

  // UNDER GALLERY (halo / pavé presets)
  { id: "ugNone", name: "None", category: "Under Gallery",
    apply: (r) => { r.halo.enabled = false; } },
  { id: "ugHalo16", name: "Halo 16", category: "Under Gallery",
    apply: (r) => { r.halo.enabled = true; r.halo.stoneCount = 16; r.halo.stoneSize = 1.2; } },
  { id: "ugHalo24", name: "Halo 24", category: "Under Gallery",
    apply: (r) => { r.halo.enabled = true; r.halo.stoneCount = 24; r.halo.stoneSize = 1.0; } },
  { id: "ugMicro", name: "Micro Pavé", category: "Under Gallery",
    apply: (r) => { r.halo.enabled = true; r.halo.stoneCount = 24; r.halo.stoneSize = 0.8; r.halo.spacing = 0.05; } },

  // BAND
  { id: "bFlat", name: "Flat", category: "Band",
    apply: (r) => { r.ringBase.profile = "flat"; } },
  { id: "bDome", name: "Dome", category: "Band",
    apply: (r) => { r.ringBase.profile = "dome"; } },
  { id: "bComfort", name: "Comfort", category: "Band",
    apply: (r) => { r.ringBase.profile = "comfort-dome"; r.ringBase.comfortFit = true; } },
  { id: "bKnife", name: "Knife Edge", category: "Band",
    apply: (r) => { r.ringBase.profile = "knife-edge"; } },
  { id: "bThin", name: "Thin", category: "Band",
    apply: (r) => { r.ringBase.width = 1.6; r.ringBase.thickness = 1.4; } },
  { id: "bWide", name: "Wide", category: "Band",
    apply: (r) => { r.ringBase.width = 4.0; r.ringBase.thickness = 2.0; } },
];

export function presetsByCategory(cat: Preset["category"]) {
  return PRESETS.filter((p) => p.category === cat);
}
