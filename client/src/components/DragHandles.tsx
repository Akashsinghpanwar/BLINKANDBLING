// CAD-style inline grips. Each grip is a small camera-facing square (5px-ish on
// screen) anchored exactly on the geometry edge it controls — like AutoCAD's
// blue square grips. Click + drag along the constrained axis to update one
// parameter live; a thin dashed guide line shows the drag direction; a small
// HUD tooltip near the cursor shows the current numeric value while dragging.
//
// Visibility model: grips for each section auto-appear when that section is
// the current selection (Ring → band grips, Center Stone → stone grips, etc).
// The "edit handles" toggle in the viewport toolbar shows ALL grips at once
// (power-user mode).
import { useRef, useMemo, useCallback, useState } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, Billboard } from "@/lib/drei";
import { useRecipeStore, type ParametricRecipe } from "@/store/recipe";
import { useUIStore } from "@/store/ui";

type Axis = "x" | "y" | "z" | "radial";

interface GripProps {
  position: [number, number, number];
  axis: Axis;
  /** Tooltip header shown while hovering / dragging (e.g. "Band Width") */
  label: string;
  /** Function: given the current recipe value, format for display (e.g. (v) => `${v.toFixed(2)} mm`) */
  format: (recipe: ParametricRecipe) => string;
  onDrag: (deltaMm: number, draft: ParametricRecipe) => void;
  /** Optional: anchor point for the dashed guide line (shows what the grip controls) */
  anchor?: [number, number, number];
}

function getAxisVec(axis: Axis, handlePos: THREE.Vector3): THREE.Vector3 {
  if (axis === "x") return new THREE.Vector3(1, 0, 0);
  if (axis === "y") return new THREE.Vector3(0, 1, 0);
  if (axis === "z") return new THREE.Vector3(0, 0, 1);
  const r = new THREE.Vector3(handlePos.x, 0, handlePos.z);
  if (r.lengthSq() < 1e-6) return new THREE.Vector3(1, 0, 0);
  return r.normalize();
}

const GRIP_BLUE = "#0066CC";
const GRIP_BLUE_HOVER = "#1A7DD8";
const GRIP_AMBER = "#E89500";

function Grip({ position, axis, label, format, onDrag, anchor }: GripProps) {
  const { camera, gl } = useThree();
  const recipe = useRecipeStore((s) => s.recipe);
  const update = useRecipeStore((s) => s.update);
  const setIsDragging = useUIStore((s) => s.setIsDragging);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{
    startWorld: THREE.Vector3;
    axisVec: THREE.Vector3;
    plane: THREE.Plane;
    raycaster: THREE.Raycaster;
    pointerId: number | null;
    rect: DOMRect | null;
    accumulated: number;
  } | null>(null);

  const handlePos = useMemo(() => new THREE.Vector3(...position), [position]);
  const axisVec = useMemo(() => getAxisVec(axis, handlePos), [axis, handlePos]);

  // Long axis guide line endpoints — shown only while dragging, like AutoCAD's tracking line
  const guidePts = useMemo<[[number, number, number], [number, number, number]]>(() => {
    const a = handlePos.clone().add(axisVec.clone().multiplyScalar(20));
    const b = handlePos.clone().add(axisVec.clone().multiplyScalar(-20));
    return [[a.x, a.y, a.z], [b.x, b.y, b.z]];
  }, [handlePos, axisVec]);

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const canvas = gl.domElement as HTMLCanvasElement;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    const planeNormal = camForward.clone().sub(axisVec.clone().multiplyScalar(camForward.dot(axisVec))).normalize();
    if (planeNormal.lengthSq() < 0.1) {
      planeNormal.set(0, 1, 0).sub(axisVec.clone().multiplyScalar(axisVec.y)).normalize();
    }
    const plane = new THREE.Plane(planeNormal, -planeNormal.dot(handlePos));
    dragState.current = {
      startWorld: handlePos.clone(),
      axisVec,
      plane,
      raycaster: new THREE.Raycaster(),
      pointerId: e.pointerId,
      rect: gl.domElement.getBoundingClientRect(),
      accumulated: 0,
    };
    setDragging(true);
    setIsDragging(true);
    document.body.style.cursor = "grabbing";
  }, [axisVec, camera, gl, handlePos, setIsDragging]);

  const onPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    const st = dragState.current;
    if (!st || st.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const rect = st.rect ?? gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    st.raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (!st.raycaster.ray.intersectPlane(st.plane, hit)) return;
    const offset = hit.clone().sub(st.startWorld);
    const delta = offset.dot(st.axisVec);
    if (Math.abs(delta - st.accumulated) < 0.005) return;
    st.accumulated = delta;
    update((draft) => onDrag(delta, draft));
  }, [camera, gl, onDrag, update]);

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    const st = dragState.current;
    if (!st || st.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const canvas = gl.domElement as HTMLCanvasElement;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    dragState.current = null;
    setDragging(false);
    setIsDragging(false);
    document.body.style.cursor = hover ? "grab" : "default";
  }, [gl, setIsDragging, hover]);

  const showTooltip = hover || dragging;
  const color = dragging ? GRIP_AMBER : (hover ? GRIP_BLUE_HOVER : GRIP_BLUE);

  return (
    <group>
      {/* Dashed guide line along drag axis — only while dragging */}
      {dragging && (
        <Line points={guidePts} color={GRIP_AMBER} lineWidth={1} transparent opacity={0.55} dashed dashScale={20} />
      )}
      {/* Anchor tether (faint) — shows what this grip controls. Visible on hover/drag only. */}
      {anchor && showTooltip && (
        <Line points={[anchor, position]} color={color} lineWidth={1} transparent opacity={0.4} dashed dashScale={12} />
      )}

      {/* Camera-facing flat square — sized in screen-space via Billboard so it stays ~5-6px regardless of zoom */}
      <Billboard position={position} follow>
        <mesh
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "grab"; }}
          onPointerOut={() => { setHover(false); if (!dragState.current) document.body.style.cursor = "default"; }}
          renderOrder={999}
        >
          <planeGeometry args={[0.55, 0.55]} />
          <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
        {/* White outline ring for contrast against gold/diamond */}
        <mesh renderOrder={998}>
          <planeGeometry args={[0.78, 0.78]} />
          <meshBasicMaterial color="#FFFFFF" depthTest={false} transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>

      {/* Live value tooltip near the grip — appears on hover or while dragging */}
      {showTooltip && (
        <Html position={position} center distanceFactor={18} style={{ pointerEvents: "none" }}>
          <div style={{
            background: "rgba(255,255,255,0.97)",
            color: "#0B1220",
            border: `1px solid ${color}`,
            fontSize: 10,
            fontFamily: "Segoe UI, system-ui, sans-serif",
            fontWeight: 500,
            padding: "3px 7px",
            borderRadius: 3,
            whiteSpace: "nowrap",
            boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
            transform: "translate(0, -22px)",
          }}>
            <div style={{ fontSize: 9, color: "#5A6B7C", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 1 }}>{label}</div>
            <div style={{ color, fontWeight: 600 }}>{format(recipe)}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

interface Props {
  girdleY: number;
  stoneR: number;
  outerR: number;
}

export function DragHandles({ girdleY, stoneR, outerR }: Props) {
  const editMode = useUIStore((s) => s.editMode);
  const section = useUIStore((s) => s.section);
  const recipe = useRecipeStore((s) => s.recipe);

  // Grips only render at all when the toolbar's edit-mode toggle is on.
  if (!editMode) return null;
  const showBand = true;
  const showStone = true;
  const showProngs = true;
  void section;

  const w = recipe.ringBase.width;

  return (
    <group>
      {/* ───── BAND (Ring section) ───── */}
      {showBand && (
        <>
          {/* Band width — grip on the front edge of the band's top, drag along Z to widen the wire */}
          <Grip
            position={[0, outerR + 0.4, w / 2]}
            axis="z"
            label="Band Width"
            anchor={[0, outerR, 0]}
            format={(r) => `${r.ringBase.width.toFixed(2)} mm`}
            onDrag={(delta, draft) => {
              draft.ringBase.width = Math.max(1.0, Math.min(8.0, recipe.ringBase.width + delta * 2));
            }}
          />
          {/* Band thickness — grip on the topmost outer point, drag UP to thicken */}
          <Grip
            position={[0, outerR + 0.05, 0]}
            axis="y"
            label="Band Thickness"
            anchor={[0, outerR - recipe.ringBase.thickness, 0]}
            format={(r) => `${r.ringBase.thickness.toFixed(2)} mm`}
            onDrag={(delta, draft) => {
              draft.ringBase.thickness = Math.max(0.8, Math.min(4.0, recipe.ringBase.thickness + delta));
            }}
          />
          {/* Inner radius — grip on the bottom of the band's underside, drag DOWN to enlarge ring size */}
          <Grip
            position={[0, -outerR + recipe.ringBase.thickness, 0]}
            axis="y"
            label="Ring Size"
            format={(r) => `US ${r.ringBase.sizeNumber.toFixed(2)}`}
            onDrag={(delta, draft) => {
              // 1 US ring size ≈ 0.83 mm change in inner Ø, so 0.4 mm Y delta ≈ 1 size step
              draft.ringBase.sizeNumber = Math.max(3, Math.min(13, recipe.ringBase.sizeNumber - delta * 2.5));
            }}
          />
        </>
      )}

      {/* ───── CENTER STONE ───── */}
      {showStone && (
        <>
          {/* Stone diameter — grip on the +X girdle, drag radially outward to enlarge */}
          <Grip
            position={[stoneR, girdleY, 0]}
            axis="x"
            label="Stone Diameter"
            anchor={[0, girdleY, 0]}
            format={(r) => `${r.centerStone.diameter.toFixed(2)} mm`}
            onDrag={(delta, draft) => {
              draft.centerStone.diameter = Math.max(2, Math.min(20, recipe.centerStone.diameter + delta * 2));
            }}
          />
          {/* Stone diameter — mirrored grip on -X for symmetric drag */}
          <Grip
            position={[-stoneR, girdleY, 0]}
            axis="x"
            label="Stone Diameter"
            anchor={[0, girdleY, 0]}
            format={(r) => `${r.centerStone.diameter.toFixed(2)} mm`}
            onDrag={(delta, draft) => {
              draft.centerStone.diameter = Math.max(2, Math.min(20, recipe.centerStone.diameter - delta * 2));
            }}
          />
          {/* Crown height (depth ratio) — grip above the table, drag UP to make crown taller */}
          <Grip
            position={[0, girdleY + recipe.centerStone.diameter * recipe.centerStone.depthRatio * 0.42, 0]}
            axis="y"
            label="Crown Height"
            format={(r) => `${(r.centerStone.depthRatio * 100).toFixed(1)} %`}
            onDrag={(delta, draft) => {
              draft.centerStone.depthRatio = Math.max(0.45, Math.min(0.78, recipe.centerStone.depthRatio + delta * 0.08));
            }}
          />
          {/* Pavilion depth — grip at the culet, drag DOWN to deepen pavilion */}
          <Grip
            position={[0, girdleY - recipe.centerStone.diameter * recipe.centerStone.depthRatio * 0.58, 0]}
            axis="y"
            label="Pavilion Depth"
            format={(r) => `${(r.centerStone.depthRatio * 100).toFixed(1)} %`}
            onDrag={(delta, draft) => {
              draft.centerStone.depthRatio = Math.max(0.45, Math.min(0.78, recipe.centerStone.depthRatio - delta * 0.08));
            }}
          />
        </>
      )}

      {/* ───── PRONGS / GALLERY ───── */}
      {showProngs && (
        <>
          {/* Prong thickness — grip on +X bead, drag along Y to fatten/thin the prong */}
          <Grip
            position={[stoneR + 0.2, girdleY + 0.7, 0]}
            axis="y"
            label="Prong Thickness"
            format={(r) => `${r.prongs.thickness.toFixed(2)} mm`}
            onDrag={(delta, draft) => {
              draft.prongs.thickness = Math.max(0.4, Math.min(1.6, recipe.prongs.thickness + delta * 0.4));
            }}
          />
          {/* Halo size (when enabled) — grip just outside the halo ring */}
          {recipe.halo.enabled && (
            <Grip
              position={[stoneR + recipe.halo.stoneSize + recipe.halo.spacing + 0.4, girdleY, 0]}
              axis="x"
              label="Halo Stone Size"
              anchor={[stoneR + 0.2, girdleY, 0]}
              format={(r) => `${r.halo.stoneSize.toFixed(2)} mm`}
              onDrag={(delta, draft) => {
                draft.halo.stoneSize = Math.max(0.4, Math.min(2.5, recipe.halo.stoneSize + delta * 0.6));
              }}
            />
          )}
        </>
      )}
    </group>
  );
}
