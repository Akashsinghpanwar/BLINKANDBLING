import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Jewelry Category ────────────────────────────────────────────────────────
export type JewelryCategory = "ring" | "pendant" | "earring-stud" | "earring-hoop" | "bangle";

// ─── Shared ──────────────────────────────────────────────────────────────────
export type MetalType =
  | "14k-yellow" | "18k-yellow" | "22k-yellow"
  | "rose-gold" | "white-gold" | "platinum"
  | "sterling-silver" | "black-rhodium" | "palladium";

export type StoneShape =
  | "round-brilliant" | "oval" | "pear" | "princess" | "emerald" | "cushion"
  | "marquise" | "asscher" | "radiant" | "heart" | "trillion" | "baguette"
  | "briolette" | "cabochon" | "rose-cut";

export type GemMaterial =
  | "diamond" | "ruby" | "sapphire" | "emerald" | "morganite"
  | "tanzanite" | "aquamarine" | "amethyst" | "garnet" | "topaz"
  | "opal" | "tourmaline" | "alexandrite" | "spinel" | "peridot"
  | "citrine" | "iolite" | "labradorite" | "moonstone" | "pearl";

export type SettingType =
  | "solitaire" | "cathedral-solitaire" | "bezel" | "half-bezel" | "tension"
  | "pave" | "micro-pave" | "french-pave"
  | "channel" | "bar" | "flush" | "invisible" | "burnish"
  | "east-west" | "prong-basket" | "split-prong";

export type ProngStyle = "round" | "claw" | "V" | "square" | "pointed" | "eagle-claw";
export type SurfaceFinish =
  | "high-polish" | "matte" | "brushed" | "hammered"
  | "florentine" | "sandblast" | "satin" | "pebble" | "bark";

// ─── Ring-specific ───────────────────────────────────────────────────────────
export type SizeSystem = "US" | "UK" | "ISO" | "Indian";
export type ShankStyle =
  | "straight" | "cathedral" | "split-shank" | "bypass" | "twisted"
  | "trellis" | "peg-head" | "double-bypass" | "euro-shank";

export type RingProfile =
  | "flat" | "dome" | "comfort-dome" | "knife-edge"
  | "square" | "d-shape" | "oval-section" | "barrel";

// ─── Pendant-specific ────────────────────────────────────────────────────────
export type BailStyle = "round-tube" | "flat" | "fancy-fleur" | "split" | "hinged" | "omega";
export type PendantShape =
  | "round" | "oval" | "teardrop" | "square" | "heart"
  | "marquise" | "cross" | "star" | "hexagon" | "freeform";

// ─── Earring-specific ────────────────────────────────────────────────────────
export type EarringBacking =
  | "butterfly" | "screw-back" | "lever-back" | "omega-back" | "latch-back" | "threaded-nut";
export type EarringHoopProfile =
  | "round-wire" | "flat-inside" | "D-shape" | "square-tube" | "rectangular";
export type HoopClosure = "click-top" | "hinge-snap" | "continuous" | "huggie";

// ─── Bangle-specific ─────────────────────────────────────────────────────────
export type BangleProfile = "flat" | "dome" | "D-shape" | "oval-section" | "square";
export type BangleOpening = "full-round" | "hinged-box" | "hinged-toggle" | "open-cuff" | "expandable";

// ─── Full Recipe ──────────────────────────────────────────────────────────────
export interface ParametricRecipe {
  jewelryCategory: JewelryCategory;
  metal: MetalType;

  // ── RING ──
  ringBase: {
    sizeSystem: SizeSystem;
    sizeNumber: number;
    comfortFit: boolean;
    width: number;
    thickness: number;
    profile: RingProfile;
    taperRatio: number;
    surfaceFinish: SurfaceFinish;
    fingerGroove: boolean;
  };
  shank: {
    style: ShankStyle;
    splitGapMm: number;
    twistTurns: number;
    galleryRail: boolean;
    undergalleryStyle: "open" | "solid" | "filigree";
  };
  centerStone: {
    shape: StoneShape;
    diameter: number;
    depthRatio: number;
    material: GemMaterial;
  };
  setting: {
    type: SettingType;
    seatDepth: number;
    colletHeight: number;
    bezelWallThickness: number;
    eastWest: boolean;
  };
  prongs: {
    count: 4 | 6 | 8;
    style: ProngStyle;
    thickness: number;
    height: number;
    tipStyle: "round" | "flat" | "pointed" | "split";
  };
  halo: {
    enabled: boolean;
    stoneCount: number;
    stoneSize: number;
    spacing: number;
    doubleHalo: boolean;
    floatingHalo: boolean;
  };
  pave: {
    enabled: boolean;
    coverage: "none" | "quarter" | "half" | "three-quarter" | "full-eternity";
    stoneSize: number;
    stoneSpacing: number;
    rows: 1 | 2 | 3;
    setStyle: "pave" | "micro-pave" | "french-pave";
    startAngleDeg: number;
  };
  channel: {
    enabled: boolean;
    stoneShape: StoneShape;
    stoneSize: number;
    rows: 1 | 2;
    wallThickness: number;
  };
  threeStone: {
    enabled: boolean;
    sideShape: StoneShape;
    sideDiameterMm: number;
    sideOffsetMm: number;
    sideSetting: SettingType;
  };
  eternity: {
    enabled: boolean;
    stoneShape: StoneShape;
    stoneSize: number;
    totalCount: number;
    coverage: "half" | "three-quarter" | "full";
    setStyle: "prong" | "channel" | "bezel" | "pave" | "shared-prong";
  };
  milgrain: {
    enabled: boolean;
    widthMm: number;
    placement: "both-edges" | "outer-edge" | "inner-edge" | "bezel-border";
  };
  filigree: {
    enabled: boolean;
    pattern: "scroll" | "lattice" | "vine" | "geometric";
    density: "light" | "medium" | "dense";
  };
  engraving: {
    text: string;
    font: "serif" | "sans" | "script" | "block" | "roman";
    placement: "inner-band" | "outer-band" | "both";
    depth: number;
  };

  // ── PENDANT ──
  pendant: {
    shape: PendantShape;
    widthMm: number;
    heightMm: number;
    thicknessMm: number;
    stone: {
      enabled: boolean;
      shape: StoneShape;
      diameter: number;
      material: GemMaterial;
      settingType: SettingType;
    };
    halo: { enabled: boolean; stoneSize: number; stoneCount: number; };
    bail: {
      style: BailStyle;
      innerDiameterMm: number;
      widthMm: number;
    };
    surfaceFinish: SurfaceFinish;
    openwork: boolean;
    filigree: boolean;
    milgrain: boolean;
  };

  // ── EARRING ──
  earring: {
    style: "stud" | "hoop" | "drop";
    stud: {
      stone: { shape: StoneShape; diameter: number; material: GemMaterial; };
      setting: SettingType;
      backing: EarringBacking;
      halo: { enabled: boolean; stoneSize: number; stoneCount: number; };
      postDiameterMm: number;
      jacketEnabled: boolean;
    };
    hoop: {
      innerDiameterMm: number;
      tubeWidthMm: number;
      profile: EarringHoopProfile;
      paveOutside: boolean;
      paveInside: boolean;
      stoneSize: number;
      closure: HoopClosure;
    };
    drop: {
      totalLengthMm: number;
      topSetting: SettingType;
      bottomShape: StoneShape;
      bottomDiameterMm: number;
      bottomSetting: SettingType;
      linkStyle: "cable" | "box" | "singapore" | "rope" | "bar" | "figaro";
      linkLengthMm: number;
      swingEnabled: boolean;
    };
  };

  // ── BANGLE ──
  bangle: {
    innerDiameterMm: number;
    widthMm: number;
    thicknessMm: number;
    profile: BangleProfile;
    opening: BangleOpening;
    surfaceFinish: SurfaceFinish;
    pave: {
      enabled: boolean;
      stoneSize: number;
      coverage: "outside" | "inside" | "both" | "top-row";
      stoneCount: number;
    };
    channel: {
      enabled: boolean;
      stoneShape: StoneShape;
      stoneSize: number;
      count: number;
    };
    milgrain: { enabled: boolean; widthMm: number; };
    engraving: string;
  };

  // ── RENDER STUDIO ──
  renderStudio: {
    hdri: string;
    exposure: number;
    bloomIntensity: number;
    turntable: boolean;
    turntableSpeed: number;
    background: "transparent" | "white" | "black" | "gradient" | "velvet";
    focalLength: number;
    dof: { enabled: boolean; fStop: number; };
  };
}

// ─── Default recipe ───────────────────────────────────────────────────────────
export const defaultRecipe: ParametricRecipe = {
  jewelryCategory: "ring",
  metal: "18k-yellow",

  ringBase: {
    sizeSystem: "US", sizeNumber: 7, comfortFit: true,
    width: 2.0, thickness: 1.8, profile: "comfort-dome", taperRatio: 0.15,
    surfaceFinish: "high-polish", fingerGroove: false,
  },
  shank: {
    style: "cathedral", splitGapMm: 1.2, twistTurns: 1.5,
    galleryRail: true, undergalleryStyle: "open",
  },
  centerStone: { shape: "round-brilliant", diameter: 6.5, depthRatio: 0.61, material: "diamond" },
  setting: {
    type: "cathedral-solitaire", seatDepth: 1.2,
    colletHeight: 0.8, bezelWallThickness: 0.5, eastWest: false,
  },
  prongs: { count: 6, style: "claw", thickness: 0.8, height: 1.2, tipStyle: "round" },
  halo: {
    enabled: false, stoneCount: 16, stoneSize: 1.2,
    spacing: 0.1, doubleHalo: false, floatingHalo: false,
  },
  pave: {
    enabled: false, coverage: "half", stoneSize: 1.0,
    stoneSpacing: 0.12, rows: 1, setStyle: "pave", startAngleDeg: 45,
  },
  channel: { enabled: false, stoneShape: "baguette", stoneSize: 1.8, rows: 1, wallThickness: 0.4 },
  threeStone: {
    enabled: false, sideShape: "oval", sideDiameterMm: 4.0,
    sideOffsetMm: 0.2, sideSetting: "bezel",
  },
  eternity: {
    enabled: false, stoneShape: "round-brilliant", stoneSize: 2.0,
    totalCount: 20, coverage: "full", setStyle: "shared-prong",
  },
  milgrain: { enabled: false, widthMm: 0.5, placement: "both-edges" },
  filigree: { enabled: false, pattern: "scroll", density: "medium" },
  engraving: { text: "", font: "serif", placement: "inner-band", depth: 0.3 },

  pendant: {
    shape: "teardrop", widthMm: 12, heightMm: 18, thicknessMm: 4,
    stone: { enabled: true, shape: "pear", diameter: 8, material: "sapphire", settingType: "bezel" },
    halo: { enabled: false, stoneSize: 1.0, stoneCount: 18 },
    bail: { style: "round-tube", innerDiameterMm: 2.5, widthMm: 4 },
    surfaceFinish: "high-polish", openwork: false, filigree: false, milgrain: false,
  },

  earring: {
    style: "stud",
    stud: {
      stone: { shape: "round-brilliant", diameter: 5.0, material: "diamond" },
      setting: "prong-basket", backing: "butterfly",
      halo: { enabled: false, stoneSize: 1.0, stoneCount: 14 },
      postDiameterMm: 0.8, jacketEnabled: false,
    },
    hoop: {
      innerDiameterMm: 18, tubeWidthMm: 2, profile: "round-wire",
      paveOutside: false, paveInside: false, stoneSize: 1.0, closure: "click-top",
    },
    drop: {
      totalLengthMm: 35, topSetting: "prong-basket",
      bottomShape: "pear", bottomDiameterMm: 8, bottomSetting: "bezel",
      linkStyle: "cable", linkLengthMm: 10, swingEnabled: true,
    },
  },

  bangle: {
    innerDiameterMm: 58, widthMm: 6, thicknessMm: 3.5,
    profile: "dome", opening: "full-round", surfaceFinish: "high-polish",
    pave: { enabled: false, stoneSize: 1.2, coverage: "outside", stoneCount: 30 },
    channel: { enabled: false, stoneShape: "baguette", stoneSize: 1.8, count: 12 },
    milgrain: { enabled: false, widthMm: 0.5 },
    engraving: "",
  },

  renderStudio: {
    hdri: "studio", exposure: 0.8, bloomIntensity: 0.0,
    turntable: false, turntableSpeed: 1.0,
    background: "white", focalLength: 85,
    dof: { enabled: false, fStop: 2.8 },
  },
};

// ─── Store ────────────────────────────────────────────────────────────────────
interface RecipeStore {
  recipe: ParametricRecipe;
  history: ParametricRecipe[];
  historyIndex: number;
  update: (updater: (draft: ParametricRecipe) => void) => void;
  reset: () => void;
  load: (recipe: ParametricRecipe) => void;
  undo: () => void;
  redo: () => void;
}

// Deep-merge stored recipe with the default so missing / new fields always have values.
// One level deep is enough because all nested objects are plain objects (no arrays to worry about).
function mergeRecipe(stored: Partial<ParametricRecipe>): ParametricRecipe {
  const base = JSON.parse(JSON.stringify(defaultRecipe)) as ParametricRecipe;
  for (const k of Object.keys(stored) as (keyof ParametricRecipe)[]) {
    const sv = stored[k];
    const bv = base[k];
    if (sv === null || sv === undefined) continue;
    if (typeof sv === "object" && !Array.isArray(sv) && typeof bv === "object" && bv !== null) {
      (base as unknown as Record<string, unknown>)[k] = { ...bv as object, ...sv as object };
    } else {
      (base as unknown as Record<string, unknown>)[k] = sv;
    }
  }
  return base;
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      recipe: defaultRecipe,
      history: [defaultRecipe],
      historyIndex: 0,

      update: (updater) => {
        set((state) => {
          const newRecipe: ParametricRecipe = JSON.parse(JSON.stringify(state.recipe));
          updater(newRecipe);
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newRecipe);
          if (newHistory.length > 30) newHistory.shift();
          return { recipe: newRecipe, history: newHistory, historyIndex: newHistory.length - 1 };
        });
      },

      reset: () => set({ recipe: defaultRecipe, history: [defaultRecipe], historyIndex: 0 }),

      load: (recipe) => set({ recipe, history: [recipe], historyIndex: 0 }),

      undo: () => {
        set((state) => {
          if (state.historyIndex > 0) {
            return { historyIndex: state.historyIndex - 1, recipe: state.history[state.historyIndex - 1]! };
          }
          return state;
        });
      },

      redo: () => {
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            return { historyIndex: state.historyIndex + 1, recipe: state.history[state.historyIndex + 1]! };
          }
          return state;
        });
      },
    }),
    {
      name: "atelier-cad-v3",
      partialize: (s) => ({ recipe: s.recipe }),
      merge: (persisted, current) => {
        const stored = (persisted as { recipe?: Partial<ParametricRecipe> }).recipe;
        return {
          ...(current as RecipeStore),
          recipe: stored ? mergeRecipe(stored) : defaultRecipe,
        };
      },
    },
  ),
);
