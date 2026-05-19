import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import type { ParametricRecipe } from "@/store/recipe";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportGLB(group: THREE.Group, name = "atelier-ring.glb") {
  const exporter = new GLTFExporter();
  return new Promise<void>((resolve, reject) => {
    exporter.parse(
      group,
      (result) => {
        if (result instanceof ArrayBuffer) {
          downloadBlob(new Blob([result], { type: "model/gltf-binary" }), name);
          resolve();
        } else {
          downloadBlob(new Blob([JSON.stringify(result)], { type: "application/json" }), name.replace(".glb", ".gltf"));
          resolve();
        }
      },
      (e) => reject(e),
      { binary: true, embedImages: true },
    );
  });
}

export function exportSTL(group: THREE.Group, name = "atelier-ring.stl") {
  const exporter = new STLExporter();
  const data = exporter.parse(group, { binary: true });
  const blob = data instanceof DataView
    ? new Blob([data], { type: "application/sla" })
    : new Blob([data as unknown as string], { type: "application/sla" });
  downloadBlob(blob, name);
}

export function exportRecipeJSON(recipe: ParametricRecipe, name = "atelier-recipe.json") {
  const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
  downloadBlob(blob, name);
}

export function importRecipeJSON(file: File): Promise<ParametricRecipe> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as ParametricRecipe;
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
