import { useRef, forwardRef, useImperativeHandle, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Edges, MeshTransmissionMaterial } from "@react-three/drei";
import { useRecipeStore } from "@/store/recipe";
import { useUIStore, type Section } from "@/store/ui";
// editMode read inside component below
import type { BuildResult } from "@/kernel/useRingBuilder";
import { makeMetalMaterial } from "@/cad/metals";
import { GEM_SPECS } from "@/cad/gems";
import { buildStone } from "@/cad/stones";
import { buildRealisticRing } from "@/cad/realisticRing";
import { getInnerRadius } from "@/cad/shank";
import { DragHandles } from "./DragHandles";

export interface RingSceneHandle {
  getGroup: () => THREE.Group | null;
}

interface Props {
  result: BuildResult | null;
  wireframe?: boolean;
}

type Part = "ring" | "centerStone" | "sideStones" | "galleryRails" | null;

export const RingScene = forwardRef<RingSceneHandle, Props>(({ result, wireframe = false }, ref) => {
  const recipe = useRecipeStore((s) => s.recipe);
  const setSection = useUIStore((s) => s.setSection);
  const editMode = useUIStore((s) => s.editMode);
  const groupRef = useRef<THREE.Group>(null);
  const turntableRef = useRef<THREE.Group>(null);
  const [hover, setHover] = useState<Part>(null);

  const metalMat = useMemo(() => {
    const m = makeMetalMaterial(recipe.metal);
    m.wireframe = wireframe;
    return m;
  }, [recipe.metal, wireframe]);

  // Presentation geometry — built entirely in Three.js so it actually looks like jewelry.
  // OpenCascade still runs in `result` for stats / STEP / IGES export.
  // Memoize on geometry-affecting recipe fields ONLY (skip renderStudio, engraving text, etc).
  const geomDeps = [
    recipe.ringBase.sizeNumber, recipe.ringBase.sizeSystem, recipe.ringBase.width,
    recipe.ringBase.thickness, recipe.ringBase.profile, recipe.ringBase.taperRatio,
    recipe.shank.style,
    recipe.centerStone.diameter, recipe.centerStone.depthRatio,
    recipe.setting.type, recipe.setting.seatDepth,
    recipe.prongs.count, recipe.prongs.style, recipe.prongs.thickness,
    recipe.halo.enabled, recipe.halo.stoneCount, recipe.halo.stoneSize, recipe.halo.spacing,
  ];
  const real = useMemo(() => {
    const innerR = getInnerRadius(recipe);
    return buildRealisticRing(recipe, innerR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, geomDeps);

  // Faceted center stone (real brilliant cut)
  const facetStone = useMemo(
    () => buildStone(recipe.centerStone.shape, recipe.centerStone.diameter, recipe.centerStone.depthRatio),
    [recipe.centerStone.shape, recipe.centerStone.diameter, recipe.centerStone.depthRatio],
  );
  const facetHalo = useMemo(
    () => buildStone("round-brilliant", recipe.halo.stoneSize, 0.61),
    [recipe.halo.stoneSize],
  );
  const facetPave = useMemo(
    () => buildStone("round-brilliant", 1.2, 0.61),
    [],
  );

  // Shared cheap "diamond-look" material for halo + pavé — no transmission ray-march.
  const accentDiamondMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FFFFFF"),
      metalness: 0,
      roughness: 0.06,
      reflectivity: 0.85,
      ior: 2.42,
      envMapIntensity: 1.6,
      clearcoat: 0.85,
      clearcoatRoughness: 0.02,
      iridescence: 0.2,
      iridescenceIOR: 1.8,
    });
  }, []);

  // Center stone material is now a `<MeshTransmissionMaterial>` JSX element below
  // (drei's component handles the per-frame scene-to-texture refraction pass).
  // We use it ONLY on the single center stone mesh so the perf cost is bounded —
  // halo + pavé still use the cheap accent material.
  const gemSpec = GEM_SPECS[recipe.centerStone.material];
  const isDiamond = recipe.centerStone.material === "diamond";

  useFrame((_, delta) => {
    if (recipe.renderStudio.turntable && turntableRef.current) {
      turntableRef.current.rotation.y += delta * recipe.renderStudio.turntableSpeed * 0.3;
    }
  });

  useImperativeHandle(ref, () => ({ getGroup: () => groupRef.current }));

  const girdleY = real.girdleY;
  const stoneR = real.stoneR;
  const outerR = real.outerR;
  const haloR = recipe.halo.enabled
    ? stoneR + recipe.halo.stoneSize / 2 + recipe.halo.spacing + 0.15
    : 0;

  const select = (s: Section) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSection(s);
  };
  const hoverIn = (p: Part) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHover(p);
    document.body.style.cursor = "pointer";
  };
  const hoverOut = () => {
    setHover(null);
    document.body.style.cursor = "default";
  };

  // Suppress unused-warning while keeping result available for future LOD swap
  void result;

  return (
    <group ref={turntableRef}>
      {/* Metal: realistic Three.js geometry (band + cathedral arms + basket + posts + prongs + halo mini-baskets) */}
      <group ref={groupRef}>
        <mesh
          geometry={real.metalGeom}
          material={metalMat}
          castShadow
          receiveShadow
          onClick={select("ring")}
          onPointerOver={hoverIn("ring")}
          onPointerOut={hoverOut}
        >
          {hover === "ring" && !wireframe && <Edges threshold={25} color="#0066CC" />}
        </mesh>
      </group>

      {/* Center stone — real refraction via MeshTransmissionMaterial (1 mesh only, perf-bounded) */}
      {!wireframe && (
        <mesh
          geometry={facetStone.geometry}
          position={[0, girdleY, 0]}
          renderOrder={2}
          onClick={select("centerStone")}
          onPointerOver={hoverIn("centerStone")}
          onPointerOut={hoverOut}
        >
          <MeshTransmissionMaterial
            samples={isDiamond ? 6 : 4}
            resolution={256}
            transmission={isDiamond ? 0.95 : 0.9}
            thickness={isDiamond ? 1.2 : 1.0}
            roughness={0.0}
            ior={gemSpec.ior}
            chromaticAberration={isDiamond ? 0.06 : 0.02}
            anisotropicBlur={0.01}
            distortion={isDiamond ? 0.04 : 0.02}
            distortionScale={0.3}
            temporalDistortion={0.0}
            color={gemSpec.color}
            attenuationColor={gemSpec.attenuationColor}
            attenuationDistance={isDiamond ? 10 : 2.5}
            backside
            backsideThickness={0.6}
          />
          {hover === "centerStone" && <Edges threshold={1} color="#0066CC" />}
        </mesh>
      )}

      {/* Halo stones — faceted brilliants in the mini-baskets */}
      {recipe.halo.enabled && !wireframe && (
        <group
          onClick={select("sideStones")}
          onPointerOver={hoverIn("sideStones")}
          onPointerOut={hoverOut}
        >
          {Array.from({ length: recipe.halo.stoneCount }).map((_, i) => {
            const a = (i / recipe.halo.stoneCount) * Math.PI * 2;
            const x = Math.cos(a) * haloR;
            const z = Math.sin(a) * haloR;
            return (
              <mesh
                key={i}
                geometry={facetHalo.geometry}
                material={accentDiamondMat}
                position={[x, girdleY - recipe.halo.stoneSize * 0.05, z]}
                renderOrder={2}
              />
            );
          })}
        </group>
      )}

      {/* Pavé accent stones embedded in cathedral shoulders */}
      {!wireframe && real.paveSpots.map((spot, i) => (
        <mesh
          key={`pave-${i}`}
          geometry={facetPave.geometry}
          material={accentDiamondMat}
          position={[spot.pos.x, spot.pos.y, spot.pos.z]}
          rotation={[0, spot.rotY, 0]}
          renderOrder={2}
        />
      ))}

      {/* Inline grips — only when user explicitly enables edit mode from the toolbar */}
      {!wireframe && editMode && (
        <DragHandles girdleY={girdleY} stoneR={stoneR} outerR={outerR} />
      )}
    </group>
  );
});
RingScene.displayName = "RingScene";
