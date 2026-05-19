// CSS-3D ViewCube. Click any face to snap the camera to that orthographic view —
// FRONT/BACK/LEFT/RIGHT map to the matching ortho preset; TOP snaps to top view;
// BOTTOM falls back to perspective (no dedicated bottom preset). Hover highlights
// the face in CAD blue so it's obvious it's interactive.
import { useUIStore, type ViewName } from "@/store/ui";

interface Face {
  transform: string;
  label: string;
  view: ViewName;
}

const FACES: Face[] = [
  { transform: "translateZ(32px)",                  label: "FRONT",  view: "front" },
  { transform: "rotateY(180deg) translateZ(32px)",  label: "BACK",   view: "front" },
  { transform: "rotateY(90deg) translateZ(32px)",   label: "RIGHT",  view: "right" },
  { transform: "rotateY(-90deg) translateZ(32px)",  label: "LEFT",   view: "right" },
  { transform: "rotateX(90deg) translateZ(32px)",   label: "TOP",    view: "top" },
  { transform: "rotateX(-90deg) translateZ(32px)",  label: "BOTTOM", view: "perspective" },
];

export function ViewCube() {
  const setView = useUIStore((s) => s.setView);
  const currentView = useUIStore((s) => s.view);

  return (
    <div className="absolute right-4 top-20 z-10" style={{ perspective: 600 }} data-testid="viewcube">
      <div
        className="relative h-16 w-16"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(-25deg) rotateY(35deg)",
        }}
      >
        {FACES.map((f) => {
          const active = currentView === f.view;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => setView(f.view)}
              title={`View: ${f.label}`}
              className={`absolute flex h-16 w-16 cursor-pointer items-center justify-center border text-[8px] font-bold uppercase tracking-widest backdrop-blur transition-colors ${
                active
                  ? "border-[#0066CC] bg-[#0066CC]/25 text-[#0050A0]"
                  : "border-[#909090] bg-[#E8E8E8]/85 text-zinc-700 hover:border-[#0066CC] hover:bg-[#CFE3F7]/90 hover:text-[#0050A0]"
              }`}
              style={{ transform: f.transform }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      {/* Axes */}
      <div className="pointer-events-none absolute left-[72px] top-0 flex flex-col items-start gap-0.5 font-mono text-[9px] font-bold">
        <span className="text-emerald-700">Y</span>
        <span className="text-red-400">X</span>
        <span className="text-blue-400">Z</span>
      </div>
    </div>
  );
}
