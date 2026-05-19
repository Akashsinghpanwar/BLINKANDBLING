import * as THREE from "three";
import type { OC } from "./init";
import type { Shape } from "./ops";

// Tessellate a TopoDS_Shape into a Three.js BufferGeometry.
// Mesh deflection in mm — smaller = smoother.
export function shapeToGeometry(oc: OC, shape: Shape, deflection = 0.05, angularDeflection = 0.3): THREE.BufferGeometry {
  // Tessellate the B-Rep
  new oc.BRepMesh_IncrementalMesh_2(shape, deflection, false, angularDeflection, false);

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const explorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );

  let vertexOffset = 0;

  while (explorer.More()) {
    const face = oc.TopoDS.Face_1(explorer.Current());
    const location = new oc.TopLoc_Location_1();
    const triangulationHandle = oc.BRep_Tool.Triangulation(face, location);

    if (triangulationHandle.IsNull()) {
      explorer.Next();
      continue;
    }

    const triangulation = triangulationHandle.get();
    const transform = location.Transformation();
    const orient = face.Orientation_1();
    const reversed = orient === oc.TopAbs_Orientation.TopAbs_REVERSED;

    const nbNodes = triangulation.NbNodes();
    const localPositions: number[] = [];
    const localNormalsAccum: number[] = new Array(nbNodes * 3).fill(0);

    for (let i = 1; i <= nbNodes; i++) {
      const p = triangulation.Node(i);
      const pt = p.Transformed(transform);
      localPositions.push(pt.X(), pt.Y(), pt.Z());
    }

    const nbTri = triangulation.NbTriangles();
    for (let i = 1; i <= nbTri; i++) {
      const tri = triangulation.Triangle(i);
      let n1 = tri.Value(1), n2 = tri.Value(2), n3 = tri.Value(3);
      if (reversed) [n2, n3] = [n3, n2];

      // Compute triangle normal and accumulate per-vertex
      const ax = localPositions[(n1 - 1) * 3]!;
      const ay = localPositions[(n1 - 1) * 3 + 1]!;
      const az = localPositions[(n1 - 1) * 3 + 2]!;
      const bx = localPositions[(n2 - 1) * 3]!;
      const by = localPositions[(n2 - 1) * 3 + 1]!;
      const bz = localPositions[(n2 - 1) * 3 + 2]!;
      const cx = localPositions[(n3 - 1) * 3]!;
      const cy = localPositions[(n3 - 1) * 3 + 1]!;
      const cz = localPositions[(n3 - 1) * 3 + 2]!;
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      for (const idx of [n1, n2, n3]) {
        localNormalsAccum[(idx - 1) * 3]! += nx;
        localNormalsAccum[(idx - 1) * 3 + 1]! += ny;
        localNormalsAccum[(idx - 1) * 3 + 2]! += nz;
      }

      indices.push(vertexOffset + n1 - 1, vertexOffset + n2 - 1, vertexOffset + n3 - 1);
    }

    positions.push(...localPositions);
    // Normalize accumulated normals
    for (let i = 0; i < nbNodes; i++) {
      const nx = localNormalsAccum[i * 3]!;
      const ny = localNormalsAccum[i * 3 + 1]!;
      const nz = localNormalsAccum[i * 3 + 2]!;
      const len = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
    }
    vertexOffset += nbNodes;

    explorer.Next();
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeBoundingSphere();
  return geom;
}
