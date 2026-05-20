import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JewelryCategory } from "./recipe";

export type Mode = "design" | "render" | "analyze";

export type Section =
  // ── Shared / always visible ──
  | "dashboard" | "image2cad" | "settings"
  // ── Ring ──
  | "ring" | "centerStone" | "sideStones" | "galleryRails" | "bandDetails"
  | "pave" | "eternity" | "threeStone" | "milgrain" | "filigree" | "finish" | "engraving"
  // ── Pendant ──
  | "pendant"
  // ── Earring ──
  | "earring"
  // ── Bangle ──
  | "bangle";

export type Tool = "select" | "move" | "rotate" | "scale" | "mirror" | "measure" | "section" | "explode";
export type ViewName = "perspective" | "top" | "front" | "right";

export const CATEGORY_SECTIONS: Record<JewelryCategory, Section[]> = {
  ring: ["ring", "centerStone", "sideStones", "galleryRails", "bandDetails", "pave", "eternity", "threeStone", "milgrain", "filigree", "finish", "engraving"],
  pendant: ["pendant"],
  "earring-stud": ["earring"],
  "earring-hoop": ["earring"],
  bangle: ["bangle"],
};

interface UIState {
  designName: string;
  mode: Mode;
  section: Section;
  tool: Tool;
  view: ViewName;
  showGrid: boolean;
  showShadow: boolean;
  showWireframe: boolean;
  autoSave: boolean;
  galleryTab: "Gallery" | "Prongs" | "Settings" | "Head" | "Shoulders" | "Under Gallery" | "Band";
  editMode: boolean;
  isDragging: boolean;

  setDesignName: (n: string) => void;
  setMode: (m: Mode) => void;
  setSection: (s: Section) => void;
  setTool: (t: Tool) => void;
  setView: (v: ViewName) => void;
  toggleGrid: () => void;
  toggleShadow: () => void;
  toggleWireframe: () => void;
  toggleEditMode: () => void;
  setIsDragging: (d: boolean) => void;
  setGalleryTab: (g: UIState["galleryTab"]) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      designName: "Untitled Jewelry Design",
      mode: "design",
      section: "ring",
      tool: "select",
      view: "perspective",
      showGrid: false,
      showShadow: true,
      showWireframe: false,
      autoSave: true,
      galleryTab: "Gallery",
      editMode: false,
      isDragging: false,

      setDesignName: (designName) => set({ designName }),
      setMode: (mode) => set({ mode }),
      setSection: (section) => set({ section }),
      setTool: (tool) => set({ tool }),
      setView: (view) => set({ view }),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      toggleShadow: () => set((s) => ({ showShadow: !s.showShadow })),
      toggleWireframe: () => set((s) => ({ showWireframe: !s.showWireframe })),
      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
      setIsDragging: (isDragging) => set({ isDragging }),
      setGalleryTab: (galleryTab) => set({ galleryTab }),
    }),
    {
      name: "atelier-cad-ui-v3",
      version: 3,
      partialize: (s) => {
        const { isDragging: _i, editMode: _e, ...rest } = s as UIState & Record<string, unknown>;
        return rest as unknown as UIState;
      },
      migrate: () => {
        return {
          designName: "Untitled Jewelry Design", mode: "design", section: "ring",
          tool: "select", view: "perspective", showGrid: false, showShadow: true,
          showWireframe: false, autoSave: true, galleryTab: "Gallery",
          editMode: false, isDragging: false,
        } as UIState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) { state.editMode = false; state.isDragging = false; }
      },
    },
  ),
);
