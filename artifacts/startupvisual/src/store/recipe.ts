import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SizeSystem = "US" | "UK" | "ISO" | "Indian";
export type ShankStyle = "straight" | "cathedral" | "split-shank" | "bypass" | "twisted";
export type RingProfile = "flat" | "dome" | "comfort-dome" | "knife-edge";
export type StoneShape = "round-brilliant" | "oval" | "pear" | "princess" | "emerald" | "cushion" | "marquise";
export type GemMaterial = "diamond" | "ruby" | "sapphire" | "emerald" | "morganite";
export type SettingType = "solitaire" | "bezel" | "half-bezel" | "cathedral-solitaire" | "tension";
export type ProngStyle = "round" | "claw" | "V";
export type MetalType = "14k-yellow" | "18k-yellow" | "rose-gold" | "white-gold" | "platinum" | "sterling-silver" | "black-rhodium";

export interface ParametricRecipe {
  ringBase: {
    sizeSystem: SizeSystem;
    sizeNumber: number;
    comfortFit: boolean;
    width: number;
    thickness: number;
    profile: RingProfile;
    taperRatio: number;
  };
  shank: {
    style: ShankStyle;
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
  };
  prongs: {
    count: 4 | 6;
    style: ProngStyle;
    thickness: number;
  };
  halo: {
    enabled: boolean;
    stoneCount: number;
    stoneSize: number;
    spacing: number;
  };
  engraving: {
    text: string;
    font: "serif" | "sans" | "script";
    placement: "inner-band" | "top";
  };
  metal: MetalType;
  renderStudio: {
    hdri: string;
    exposure: number;
    bloomIntensity: number;
    turntable: boolean;
    turntableSpeed: number;
  };
}

export const defaultRecipe: ParametricRecipe = {
  ringBase: {
    sizeSystem: "US",
    sizeNumber: 7,
    comfortFit: true,
    width: 2.0,
    thickness: 1.8,
    profile: "comfort-dome",
    taperRatio: 0.15,
  },
  shank: {
    style: "cathedral",
  },
  centerStone: {
    shape: "round-brilliant",
    diameter: 6.5,
    depthRatio: 0.61,
    material: "diamond",
  },
  setting: {
    type: "cathedral-solitaire",
    seatDepth: 1.2,
  },
  prongs: {
    count: 6,
    style: "claw",
    thickness: 0.8,
  },
  halo: {
    enabled: false,
    stoneCount: 16,
    stoneSize: 1.2,
    spacing: 0.1,
  },
  engraving: {
    text: "",
    font: "serif",
    placement: "inner-band",
  },
  metal: "18k-yellow",
  renderStudio: {
    hdri: "studio",
    exposure: 0.8,
    bloomIntensity: 0.0,
    turntable: false,
    turntableSpeed: 1.0,
  }
};

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

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      recipe: defaultRecipe,
      history: [defaultRecipe],
      historyIndex: 0,
      
      update: (updater) => {
        set((state) => {
          // simple deep clone for state mutation
          const newRecipe = JSON.parse(JSON.stringify(state.recipe));
          updater(newRecipe);
          
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newRecipe);
          if (newHistory.length > 30) newHistory.shift();
          
          return {
            recipe: newRecipe,
            history: newHistory,
            historyIndex: newHistory.length - 1
          };
        });
      },
      
      reset: () => {
        set({
          recipe: defaultRecipe,
          history: [defaultRecipe],
          historyIndex: 0
        });
      },
      
      load: (recipe) => {
        set({
          recipe,
          history: [recipe],
          historyIndex: 0
        });
      },
      
      undo: () => {
        set((state) => {
          if (state.historyIndex > 0) {
            return {
              historyIndex: state.historyIndex - 1,
              recipe: state.history[state.historyIndex - 1]
            };
          }
          return state;
        });
      },
      
      redo: () => {
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            return {
              historyIndex: state.historyIndex + 1,
              recipe: state.history[state.historyIndex + 1]
            };
          }
          return state;
        });
      }
    }),
    {
      name: 'atelier-cad-v1'
    }
  )
);
