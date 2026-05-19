// Thin wrappers over OpenCascade.js B-Rep operations.
// All inputs in millimetres. All shapes returned as TopoDS_Shape handles.
import type { OC } from "./init";

export type Shape = any;

export function pnt(oc: OC, x: number, y: number, z: number) {
  return new oc.gp_Pnt_3(x, y, z);
}

export function dir(oc: OC, x: number, y: number, z: number) {
  return new oc.gp_Dir_4(x, y, z);
}

export function ax1(oc: OC, origin: [number, number, number], direction: [number, number, number]) {
  return new oc.gp_Ax1_2(pnt(oc, ...origin), dir(oc, ...direction));
}

export function ax2(oc: OC, origin: [number, number, number], direction: [number, number, number]) {
  return new oc.gp_Ax2_3(pnt(oc, ...origin), dir(oc, ...direction));
}

// ---------- Sketch helpers ----------

export function makeWireFromPoints(oc: OC, points: [number, number, number][], closed = true): Shape {
  const wireMaker = new oc.BRepBuilderAPI_MakeWire_1();
  for (let i = 0; i < points.length - 1; i++) {
    const e = new oc.BRepBuilderAPI_MakeEdge_3(pnt(oc, ...points[i]!), pnt(oc, ...points[i + 1]!)).Edge();
    wireMaker.Add_1(e);
  }
  if (closed) {
    const last = points[points.length - 1]!;
    const first = points[0]!;
    const e = new oc.BRepBuilderAPI_MakeEdge_3(pnt(oc, ...last), pnt(oc, ...first)).Edge();
    wireMaker.Add_1(e);
  }
  return wireMaker.Wire();
}

export function makeFaceFromWire(oc: OC, wire: Shape): Shape {
  return new oc.BRepBuilderAPI_MakeFace_15(wire, true).Face();
}

// ---------- Primitives ----------

// Build a Trsf that maps the world-Z gp_Ax2 (origin,+Z) onto the target gp_Ax2.
// Used to position primitives that we always construct at origin/Z (because the
// axis-overloaded primitive ctors have inconsistent signatures across opencascade.js builds).
function trsfFromZAx2(oc: OC, target: any) {
  const fromAx2 = new oc.gp_Ax3_2(new oc.gp_Ax2_3(pnt(oc, 0, 0, 0), dir(oc, 0, 0, 1)));
  const toAx2 = new oc.gp_Ax3_2(target);
  const trsf = new oc.gp_Trsf_1();
  trsf.SetDisplacement(fromAx2, toAx2);
  return trsf;
}

function placeOnAxis(oc: OC, shape: Shape, axis: any): Shape {
  const trsf = trsfFromZAx2(oc, axis);
  return new oc.BRepBuilderAPI_Transform_2(shape, trsf, true).Shape();
}

export function makeBox(oc: OC, dx: number, dy: number, dz: number, center = false): Shape {
  const box = new oc.BRepPrimAPI_MakeBox_2(dx, dy, dz).Shape();
  if (!center) return box;
  return translate(oc, box, [-dx / 2, -dy / 2, -dz / 2]);
}

export function makeCylinder(oc: OC, radius: number, height: number, axis?: any): Shape {
  const cyl = new oc.BRepPrimAPI_MakeCylinder_1(radius, height).Shape();
  return axis ? placeOnAxis(oc, cyl, axis) : cyl;
}

export function makeSphere(oc: OC, radius: number, center?: [number, number, number]): Shape {
  const sphere = new oc.BRepPrimAPI_MakeSphere_1(radius).Shape();
  if (!center || (center[0] === 0 && center[1] === 0 && center[2] === 0)) return sphere;
  return translate(oc, sphere, center);
}

export function makeCone(oc: OC, r1: number, r2: number, h: number, axis?: any): Shape {
  const cone = new oc.BRepPrimAPI_MakeCone_1(r1, r2, h).Shape();
  return axis ? placeOnAxis(oc, cone, axis) : cone;
}

export function makeTorus(oc: OC, R: number, r: number, axis?: any): Shape {
  const torus = new oc.BRepPrimAPI_MakeTorus_1(R, r).Shape();
  return axis ? placeOnAxis(oc, torus, axis) : torus;
}

// ---------- 3D feature operations ----------

// Revolve a face around an axis (full 360° if angle omitted)
export function revolve(oc: OC, face: Shape, axis: any, angleRad?: number): Shape {
  if (angleRad !== undefined) {
    return new oc.BRepPrimAPI_MakeRevol_1(face, axis, angleRad, false).Shape();
  }
  return new oc.BRepPrimAPI_MakeRevol_2(face, axis, false).Shape();
}

// Linear extrude (prism) a face along a vector
export function extrude(oc: OC, face: Shape, vec: [number, number, number]): Shape {
  const v = new oc.gp_Vec_4(...vec);
  return new oc.BRepPrimAPI_MakePrism_1(face, v, false, true).Shape();
}

// Sweep a profile along a wire path
export function sweep(oc: OC, profile: Shape, path: Shape): Shape {
  const pipe = new oc.BRepOffsetAPI_MakePipe_1(path, profile);
  const pr = defaultProgress(oc);
  if (pr) pipe.Build(pr); else pipe.Build();
  return pipe.Shape();
}

// ---------- Boolean operations ----------

function defaultProgress(oc: OC) {
  // Older/newer opencascade.js bindings differ — try unsuffixed first.
  if (oc.Message_ProgressRange) return new oc.Message_ProgressRange();
  if (oc.Message_ProgressRange_1) return new oc.Message_ProgressRange_1();
  return undefined;
}

function shapeIsValid(shape: Shape): boolean {
  if (!shape) return false;
  try { return !shape.IsNull(); } catch { return true; }
}

export function fuse(oc: OC, a: Shape, b: Shape): Shape {
  if (!shapeIsValid(a)) return b;
  if (!shapeIsValid(b)) return a;
  const op = new oc.BRepAlgoAPI_Fuse_3(a, b);
  const pr = defaultProgress(oc);
  if (pr) op.Build(pr); else op.Build();
  if (!op.IsDone || !op.IsDone()) return a;
  const result = op.Shape();
  return shapeIsValid(result) ? result : a;
}

export function fuseAll(oc: OC, shapes: Shape[]): Shape {
  if (shapes.length === 0) throw new Error("fuseAll: no shapes");
  let result = shapes[0]!;
  for (let i = 1; i < shapes.length; i++) result = fuse(oc, result, shapes[i]!);
  return result;
}

export function cut(oc: OC, a: Shape, b: Shape): Shape {
  if (!shapeIsValid(a)) return a;
  if (!shapeIsValid(b)) return a;
  const op = new oc.BRepAlgoAPI_Cut_3(a, b);
  const pr = defaultProgress(oc);
  if (pr) op.Build(pr); else op.Build();
  if (!op.IsDone || !op.IsDone()) return a;
  const result = op.Shape();
  return shapeIsValid(result) ? result : a;
}

export function common(oc: OC, a: Shape, b: Shape): Shape {
  if (!shapeIsValid(a) || !shapeIsValid(b)) return a;
  const op = new oc.BRepAlgoAPI_Common_3(a, b);
  const pr = defaultProgress(oc);
  if (pr) op.Build(pr); else op.Build();
  if (!op.IsDone || !op.IsDone()) return a;
  const result = op.Shape();
  return shapeIsValid(result) ? result : a;
}

// ---------- Transforms ----------

export function translate(oc: OC, shape: Shape, [x, y, z]: [number, number, number]): Shape {
  const trsf = new oc.gp_Trsf_1();
  trsf.SetTranslation_1(new oc.gp_Vec_4(x, y, z));
  return new oc.BRepBuilderAPI_Transform_2(shape, trsf, true).Shape();
}

export function rotate(oc: OC, shape: Shape, axis: any, angleRad: number): Shape {
  const trsf = new oc.gp_Trsf_1();
  trsf.SetRotation_1(axis, angleRad);
  return new oc.BRepBuilderAPI_Transform_2(shape, trsf, true).Shape();
}

export function scale(oc: OC, shape: Shape, center: [number, number, number], factor: number): Shape {
  const trsf = new oc.gp_Trsf_1();
  trsf.SetScale(pnt(oc, ...center), factor);
  return new oc.BRepBuilderAPI_Transform_2(shape, trsf, true).Shape();
}

// Polar array around an axis (first instance is original)
export function polarArray(oc: OC, shape: Shape, axis: any, count: number): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    out.push(rotate(oc, shape, axis, a));
  }
  return out;
}

// Mirror across a plane (defined by axis whose Direction is the plane normal)
export function mirror(oc: OC, shape: Shape, planeNormal: any): Shape {
  const trsf = new oc.gp_Trsf_1();
  trsf.SetMirror_2(planeNormal);
  return new oc.BRepBuilderAPI_Transform_2(shape, trsf, true).Shape();
}

// ---------- Fillet / Chamfer ----------

export function filletAllEdges(oc: OC, shape: Shape, radius: number): Shape {
  const fillet = new oc.BRepFilletAPI_MakeFillet(shape, oc.ChFi3d_FilletShape.ChFi3d_Rational);
  const explorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let added = 0;
  while (explorer.More()) {
    const edge = oc.TopoDS.Edge_1(explorer.Current());
    try {
      fillet.Add_2(radius, edge);
      added++;
    } catch { /* skip non-fillable edges */ }
    explorer.Next();
  }
  if (added === 0) return shape;
  try {
    const pr = defaultProgress(oc);
    if (pr) fillet.Build(pr); else fillet.Build();
    if (fillet.IsDone()) return fillet.Shape();
  } catch { /* fall back */ }
  return shape;
}

export function chamferAllEdges(oc: OC, shape: Shape, distance: number): Shape {
  const ch = new oc.BRepFilletAPI_MakeChamfer(shape);
  const explorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let added = 0;
  while (explorer.More()) {
    const edge = oc.TopoDS.Edge_1(explorer.Current());
    try {
      ch.Add_2(distance, edge);
      added++;
    } catch { /* skip */ }
    explorer.Next();
  }
  if (added === 0) return shape;
  try {
    const pr = defaultProgress(oc);
    if (pr) ch.Build(pr); else ch.Build();
    if (ch.IsDone()) return ch.Shape();
  } catch { /* fall back */ }
  return shape;
}

// ---------- Measurement ----------

export function volumeOf(oc: OC, shape: Shape): number {
  const props = new oc.GProp_GProps_1();
  oc.BRepGProp.VolumeProperties_1(shape, props, false, false, false);
  return props.Mass();
}

export function surfaceAreaOf(oc: OC, shape: Shape): number {
  const props = new oc.GProp_GProps_1();
  oc.BRepGProp.SurfaceProperties_1(shape, props, false, false);
  return props.Mass();
}
