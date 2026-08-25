import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@/lib/drei";
import { useRecipeStore } from "@/store/recipe";
import { makeMetalMaterial } from "@/cad/metals";
import { GEM_SPECS } from "@/cad/gems";
import { buildStone } from "@/cad/stones";

// ─── Pendant scene ────────────────────────────────────────────────────────────
export function PendantScene({ wireframe = false }: { wireframe?: boolean }) {
  const recipe = useRecipeStore((s) => s.recipe);
  const turntableRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (recipe.renderStudio.turntable && turntableRef.current) {
      turntableRef.current.rotation.y += delta * recipe.renderStudio.turntableSpeed * 0.3;
    }
  });

  const metalMat = useMemo(() => {
    const m = makeMetalMaterial(recipe.metal);
    m.wireframe = wireframe;
    return m;
  }, [recipe.metal, wireframe]);

  const p = recipe.pendant;
  const hw = p.widthMm / 2;
  const hh = p.heightMm / 2;
  const ht = p.thicknessMm / 2;

  // Build pendant body geometry based on shape
  const bodyGeom = useMemo(() => {
    const shape = new THREE.Shape();
    switch (p.shape) {
      case "round":
        shape.absarc(0, 0, hw, 0, Math.PI * 2);
        break;
      case "oval":
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          if (i === 0) shape.moveTo(Math.cos(a) * hw, Math.sin(a) * hh);
          else shape.lineTo(Math.cos(a) * hw, Math.sin(a) * hh);
        }
        break;
      case "teardrop":
        shape.moveTo(0, hh);
        shape.quadraticCurveTo(hw * 1.1, 0, hw * 0.9, -hh * 0.5);
        shape.quadraticCurveTo(hw * 0.5, -hh, 0, -hh);
        shape.quadraticCurveTo(-hw * 0.5, -hh, -hw * 0.9, -hh * 0.5);
        shape.quadraticCurveTo(-hw * 1.1, 0, 0, hh);
        break;
      case "heart": {
        const s = hw;
        shape.moveTo(0, -hh * 0.8);
        shape.bezierCurveTo(-s * 1.2, -hh * 0.3, -s * 1.5, hh * 0.3, 0, hh);
        shape.bezierCurveTo(s * 1.5, hh * 0.3, s * 1.2, -hh * 0.3, 0, -hh * 0.8);
        break;
      }
      default:
        shape.moveTo(-hw, -hh);
        shape.lineTo(hw, -hh);
        shape.lineTo(hw, hh);
        shape.lineTo(-hw, hh);
        shape.closePath();
    }
    const extrudeSettings = { depth: p.thicknessMm, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.4, bevelSegments: 4 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.shape, p.widthMm, p.heightMm, p.thicknessMm]);

  // Bail (pendant loop)
  const bailGeom = useMemo(() => {
    const curve = new THREE.TorusGeometry(p.bail.innerDiameterMm / 2, p.bail.widthMm / 2, 12, 32, Math.PI * 1.5);
    return curve;
  }, [p.bail.innerDiameterMm, p.bail.widthMm]);

  const stoneGeom = useMemo(() => {
    if (!p.stone.enabled) return null;
    return buildStone(p.stone.shape, p.stone.diameter, 0.61);
  }, [p.stone.enabled, p.stone.shape, p.stone.diameter]);

  const gemSpec = GEM_SPECS[p.stone.material] ?? GEM_SPECS["diamond"]!;

  return (
    <group ref={turntableRef} position={[0, 0, 0]}>
      {/* Pendant body */}
      <mesh
        geometry={bodyGeom}
        material={metalMat}
        position={[0, 0, -ht]}
        castShadow
        receiveShadow
      />
      {/* Bail */}
      <mesh geometry={bailGeom} material={metalMat} position={[0, hh + p.bail.innerDiameterMm / 2, 0]} rotation={[0, 0, Math.PI / 4]} castShadow />
      {/* Center stone */}
      {stoneGeom && !wireframe && (
        <mesh geometry={stoneGeom.geometry} position={[0, 0, ht * 0.2]} renderOrder={2}>
          <MeshTransmissionMaterial
            samples={4} resolution={256} transmission={0.9} thickness={1.0}
            roughness={0.0} ior={gemSpec.ior} chromaticAberration={0.04}
            color={gemSpec.color} attenuationColor={gemSpec.attenuationColor}
            attenuationDistance={2.5} backside backsideThickness={0.5}
          />
        </mesh>
      )}
    </group>
  );
}

// ─── Earring Stud scene ───────────────────────────────────────────────────────
export function EarringStudScene({ wireframe = false }: { wireframe?: boolean }) {
  const recipe = useRecipeStore((s) => s.recipe);
  const metalMat = useMemo(() => {
    const m = makeMetalMaterial(recipe.metal);
    m.wireframe = wireframe;
    return m;
  }, [recipe.metal, wireframe]);

  const stud = recipe.earring.stud;
  const stoneGeom = useMemo(
    () => buildStone(stud.stone.shape, stud.stone.diameter, 0.61),
    [stud.stone.shape, stud.stone.diameter],
  );
  const gemSpec = GEM_SPECS[stud.stone.material] ?? GEM_SPECS["diamond"]!;
  const r = stud.stone.diameter / 2;

  // Simple prong basket for stud
  const basketGeom = useMemo(() => {
    const geoms: THREE.BufferGeometry[] = [];
    // Ring basket at base of stone
    geoms.push(new THREE.TorusGeometry(r * 1.05, 0.4, 8, 32));
    // Post
    const post = new THREE.CylinderGeometry(stud.postDiameterMm / 2, stud.postDiameterMm / 2, 12, 12);
    post.translate(0, -6, 0);
    geoms.push(post);
    return geoms;
  }, [r, stud.postDiameterMm]);

  return (
    <group>
      {basketGeom.map((g, i) => (
        <mesh key={i} geometry={g} material={metalMat} castShadow />
      ))}
      {!wireframe && (
        <mesh geometry={stoneGeom.geometry} position={[0, r * 0.4, 0]} renderOrder={2}>
          <MeshTransmissionMaterial
            samples={6} resolution={256} transmission={0.95} thickness={1.2}
            roughness={0.0} ior={gemSpec.ior} chromaticAberration={0.06}
            color={gemSpec.color} attenuationColor={gemSpec.attenuationColor}
            attenuationDistance={10} backside backsideThickness={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

// ─── Earring Hoop scene ───────────────────────────────────────────────────────
export function EarringHoopScene({ wireframe = false }: { wireframe?: boolean }) {
  const recipe = useRecipeStore((s) => s.recipe);
  const metalMat = useMemo(() => {
    const m = makeMetalMaterial(recipe.metal);
    m.wireframe = wireframe;
    return m;
  }, [recipe.metal, wireframe]);

  const hoop = recipe.earring.hoop;
  const tubeR = hoop.tubeWidthMm / 2;

  const hoopGeom = useMemo(() => {
    return new THREE.TorusGeometry(hoop.innerDiameterMm / 2 + tubeR, tubeR, 16, 64, Math.PI * 1.85);
  }, [hoop.innerDiameterMm, tubeR]);

  return (
    <group rotation={[Math.PI * 0.15, 0, 0]}>
      <mesh geometry={hoopGeom} material={metalMat} castShadow receiveShadow />
    </group>
  );
}

// ─── Bangle scene ─────────────────────────────────────────────────────────────
export function BangleScene({ wireframe = false }: { wireframe?: boolean }) {
  const recipe = useRecipeStore((s) => s.recipe);
  const turntableRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (recipe.renderStudio.turntable && turntableRef.current) {
      turntableRef.current.rotation.y += delta * recipe.renderStudio.turntableSpeed * 0.3;
    }
  });

  const metalMat = useMemo(() => {
    const m = makeMetalMaterial(recipe.metal);
    m.wireframe = wireframe;
    return m;
  }, [recipe.metal, wireframe]);

  const b = recipe.bangle;
  const innerR = b.innerDiameterMm / 2;
  const outerR = innerR + b.thicknessMm;
  const tubeR = b.widthMm / 2;

  const bangleGeom = useMemo(() => {
    // Main torus — the bangle band
    const mainR = (innerR + outerR) / 2;
    return new THREE.TorusGeometry(mainR, tubeR, 24, 80);
  }, [innerR, outerR, tubeR]);

  return (
    <group ref={turntableRef} rotation={[Math.PI * 0.3, 0.3, 0]}>
      <mesh geometry={bangleGeom} material={metalMat} castShadow receiveShadow />
    </group>
  );
}
