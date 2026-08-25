import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@/lib/drei";
import { useEffect, useState } from "react";
import { useRecipeStore } from "@/store/recipe";
import { makeMetalMaterial } from "@/cad/metals";
import { makeGemMaterial } from "@/cad/gems";
import type { BuildResult } from "@/kernel/useRingBuilder";

interface Props {
  axis: "top" | "front" | "right";
  label: string;
}

const POSITIONS: Record<Props["axis"], [number, number, number]> = {
  top: [0, 60, 0.001],
  front: [0, 0, 60],
  right: [60, 0, 0],
};
const UPS: Record<Props["axis"], [number, number, number]> = {
  top: [0, 0, -1],
  front: [0, 1, 0],
  right: [0, 1, 0],
};

export function OrthoPreview({ axis, label }: Props) {
  const recipe = useRecipeStore((s) => s.recipe);
  const [result, setResult] = useState<BuildResult | null>(null);
  const metalMat = makeMetalMaterial(recipe.metal);
  const gemMat = makeGemMaterial(recipe.centerStone.material);

  useEffect(() => {
    const t = setInterval(() => {
      const b = (window as unknown as { __ringBuilder?: { result: BuildResult | null } }).__ringBuilder;
      setResult(b?.result ?? null);
    }, 300);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative h-[96px] overflow-hidden rounded-md border border-[#B8B8B8] bg-gradient-to-b from-[#F4F4F4] to-[#E0E0E0]" data-testid={`ortho-${axis}`}>
      <div className="absolute left-1.5 top-1 z-10 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}>
        <OrthographicCamera makeDefault position={POSITIONS[axis]} zoom={6} up={UPS[axis]} near={0.1} far={500} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={0.9} />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} color="#0066CC" />
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {result?.metalGeom && <mesh geometry={result.metalGeom} material={metalMat} />}
          {result?.stoneGeom && <mesh geometry={result.stoneGeom} material={gemMat} />}
          {result?.haloGeom && <mesh geometry={result.haloGeom} material={gemMat} />}
        </group>
      </Canvas>
    </div>
  );
}
