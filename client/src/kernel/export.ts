// Export real CAD formats from OpenCascade B-Rep shapes.
import type { OC } from "./init";
import type { Shape } from "./ops";

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

function readEmscriptenFile(oc: OC, path: string): ArrayBuffer {
  // Copy into a fresh, dedicated ArrayBuffer so the Blob constructor is happy
  // under TS strict mode (Emscripten's FS may hand back a view backed by
  // SharedArrayBuffer or a transient HEAP slice).
  const raw = oc.FS.readFile(path) as Uint8Array;
  const buf = new ArrayBuffer(raw.byteLength);
  new Uint8Array(buf).set(raw);
  return buf;
}

function deleteEmscriptenFile(oc: OC, path: string) {
  try { oc.FS.unlink(path); } catch { /* ignore */ }
}

function progressRange(oc: OC) {
  if (oc.Message_ProgressRange) return new oc.Message_ProgressRange();
  if (oc.Message_ProgressRange_1) return new oc.Message_ProgressRange_1();
  return undefined;
}

export function exportSTEP(oc: OC, shapes: Shape[], filename = "atelier-ring.step") {
  const writer = new oc.STEPControl_Writer_1();
  for (const s of shapes) {
    const pr = progressRange(oc);
    if (pr) writer.Transfer(s, oc.STEPControl_StepModelType.STEPControl_AsIs, true, pr);
    else writer.Transfer(s, oc.STEPControl_StepModelType.STEPControl_AsIs, true);
  }
  const tmp = "/tmp_export.step";
  writer.Write(tmp);
  const data = readEmscriptenFile(oc, tmp);
  deleteEmscriptenFile(oc, tmp);
  downloadBlob(new Blob([data], { type: "application/step" }), filename);
}

export function exportIGES(oc: OC, shapes: Shape[], filename = "atelier-ring.iges") {
  const writer = new oc.IGESControl_Writer_1();
  for (const s of shapes) writer.AddShape(s, true);
  writer.ComputeModel();
  const tmp = "/tmp_export.iges";
  writer.Write_2(tmp, false);
  const data = readEmscriptenFile(oc, tmp);
  deleteEmscriptenFile(oc, tmp);
  downloadBlob(new Blob([data], { type: "application/iges" }), filename);
}

export function exportSTL(oc: OC, shape: Shape, filename = "atelier-ring.stl", deflection = 0.05) {
  // Make sure the shape is tessellated — without an active triangulation
  // StlAPI_Writer.Write returns false silently and writes a 0-byte file.
  try {
    new oc.BRepMesh_IncrementalMesh_2(shape, deflection, false, 0.3, false);
  } catch (e) {
    throw new Error("Failed to tessellate shape for STL: " + (e as Error).message);
  }

  const writer = new oc.StlAPI_Writer();
  // ASCII output is more compatible with slicers (and easier to inspect).
  // The opencascade.js binding exposes ASCIIMode either as a setter method or
  // a public field — try both, ignore if neither works.
  try { if (typeof writer.SetASCIIMode === "function") writer.SetASCIIMode(true); } catch { /* ignore */ }
  try { writer.ASCIIMode = true; } catch { /* ignore */ }

  const tmp = "/tmp_export.stl";

  // The Write method has several overload variants in opencascade.js — try them
  // in order of likelihood until one returns true.
  const writeAttempts: Array<() => unknown> = [
    () => writer.Write(shape, tmp),
    () => writer.Write_1?.(shape, tmp),
    () => oc.StlAPI?.Write?.(shape, tmp, true),
  ];
  let ok: unknown = false;
  let lastErr: Error | null = null;
  for (const attempt of writeAttempts) {
    try {
      const r = attempt();
      if (r === undefined) continue; // method didn't exist
      ok = r;
      if (ok !== false) break;
    } catch (e) {
      lastErr = e as Error;
    }
  }
  if (ok === false) {
    throw new Error(
      "StlAPI_Writer.Write returned false — the shape probably has no triangulation. " +
      (lastErr ? `Last error: ${lastErr.message}` : ""),
    );
  }

  let data: ArrayBuffer;
  try {
    data = readEmscriptenFile(oc, tmp);
  } catch (e) {
    throw new Error("STL file was not produced by the kernel: " + (e as Error).message);
  }
  deleteEmscriptenFile(oc, tmp);

  if (data.byteLength === 0) {
    throw new Error("STL writer produced an empty file (no triangles emitted).");
  }
  console.info(`[BBCad] STL written — ${data.byteLength.toLocaleString()} bytes`);
  downloadBlob(new Blob([data], { type: "application/sla" }), filename);
}
