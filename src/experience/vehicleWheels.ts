import { Box3, BufferGeometry, CanvasTexture, CircleGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3, type Material, type Object3D } from 'three';

/**
 * The converted Aventador stores all four tyres in one mesh and all four rims in another,
 * so they cannot turn on their own. This module cuts both meshes into four wheels, each on
 * a pivot at its axle, and leaves rubber body parts (trim that shares the tyre material)
 * where they are.
 */

const TIRE_MATERIAL = 'Rubber tires';
const RIM_MATERIAL = 'Forged alloy wheels';
// A tyre piece is concentric with its axle; body trim that shares the rubber material is not.
const AXLE_TOLERANCE = 0.02;
const AXLE_SIDE_MARGIN = 0.15;

export interface Wheel {
  pivot: Group;
  /** Rolling radius in model units (before the vehicle's world scale). */
  radius: number;
}

export interface WheelRig {
  wheels: Wheel[];
  /**
   * Shared "spinning rim" disc material. Its opacity rises with wheel speed so very fast
   * rotation reads as motion blur instead of strobing spokes. Null when the asset has no rig.
   */
  blur: MeshStandardMaterial | null;
}

interface WheelSplit {
  hubs: Vector3[];
  radii: number[];
  tires: BufferGeometry[];
  rims: BufferGeometry[];
  /** Rubber pieces that are part of the body, not a wheel. They stay still. */
  bodyRubber: BufferGeometry;
  /** Blur discs, already turned to face outward and placed on each rim's outer lip. */
  blurDiscs: BufferGeometry[];
  blur: MeshStandardMaterial;
}

// Both LODs share their GPU geometry between clones, so each split is computed once.
const splitCache = new WeakMap<BufferGeometry, WheelSplit | null>();

function triangleVertex(geometry: BufferGeometry, triangle: number, corner: number) {
  return geometry.getIndex()!.getX(triangle * 3 + corner);
}

function triangleBounds(geometry: BufferGeometry, triangles: number[]) {
  const position = geometry.getAttribute('position');
  const box = new Box3();
  const point = new Vector3();
  for (const triangle of triangles) {
    for (let corner = 0; corner < 3; corner++) box.expandByPoint(point.fromBufferAttribute(position, triangleVertex(geometry, triangle, corner)));
  }
  return box;
}

/** Groups triangles that share vertices, so a tyre's tread and sidewalls stay together. */
function connectedParts(geometry: BufferGeometry) {
  const parent = new Int32Array(geometry.getAttribute('position').count).map((_, vertex) => vertex);
  const root = (vertex: number) => {
    while (parent[vertex] !== vertex) {
      parent[vertex] = parent[parent[vertex]];
      vertex = parent[vertex];
    }
    return vertex;
  };
  const triangles = geometry.getIndex()!.count / 3;
  for (let triangle = 0; triangle < triangles; triangle++) {
    const first = root(triangleVertex(geometry, triangle, 0));
    parent[root(triangleVertex(geometry, triangle, 1))] = first;
    parent[root(triangleVertex(geometry, triangle, 2))] = first;
  }
  const parts = new Map<number, number[]>();
  for (let triangle = 0; triangle < triangles; triangle++) {
    const key = root(triangleVertex(geometry, triangle, 0));
    const part = parts.get(key);
    if (part) part.push(triangle);
    else parts.set(key, [triangle]);
  }
  return [...parts.values()];
}

/** Copies the chosen triangles into a new geometry whose origin is `origin`. */
function extract(source: BufferGeometry, triangles: number[], origin: Vector3) {
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const remap = new Map<number, number>();
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (const triangle of triangles) {
    for (let corner = 0; corner < 3; corner++) {
      const vertex = triangleVertex(source, triangle, corner);
      let local = remap.get(vertex);
      if (local === undefined) {
        local = remap.size;
        remap.set(vertex, local);
        positions.push(position.getX(vertex) - origin.x, position.getY(vertex) - origin.y, position.getZ(vertex) - origin.z);
        normals.push(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex));
      }
      indices.push(local);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Radial coverage of a blurred rim: solid hub cap, half-covered spoke area, solid outer lip. */
function blurCoverage() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#d9d9d9');
  gradient.addColorStop(.2, '#d0d0d0');
  gradient.addColorStop(.3, '#8c8c8c');
  gradient.addColorStop(.78, '#808080');
  gradient.addColorStop(.88, '#e6e6e6');
  gradient.addColorStop(.97, '#e6e6e6');
  gradient.addColorStop(1, '#000000');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

function blurMaterial(rimMaterial: Material) {
  const source = rimMaterial as MeshStandardMaterial;
  return new MeshStandardMaterial({
    name: 'Spinning rim blur',
    color: source.color?.clone(),
    metalness: source.metalness ?? .85,
    roughness: Math.max(.35, source.roughness ?? .35),
    alphaMap: blurCoverage(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
}

function splitWheels(tire: BufferGeometry, rim: BufferGeometry, rimMaterial: Material): WheelSplit | null {
  if (!tire.getIndex() || !rim.getIndex() || !tire.getAttribute('normal') || !rim.getAttribute('normal')) return null;

  // The rim mesh contains only rims: sort its triangles into four corners by centroid.
  const rimBox = triangleBounds(rim, Array.from({ length: rim.getIndex()!.count / 3 }, (_, triangle) => triangle));
  const midZ = (rimBox.min.z + rimBox.max.z) / 2;
  const rimTriangles: number[][] = [[], [], [], []];
  const rimPosition = rim.getAttribute('position');
  const centroid = new Vector3();
  const corner = new Vector3();
  for (let triangle = 0; triangle < rim.getIndex()!.count / 3; triangle++) {
    centroid.set(0, 0, 0);
    for (let k = 0; k < 3; k++) centroid.add(corner.fromBufferAttribute(rimPosition, triangleVertex(rim, triangle, k)));
    centroid.divideScalar(3);
    // 0 front-left, 1 front-right, 2 rear-left, 3 rear-right (the nose points to -Z).
    rimTriangles[(centroid.x < 0 ? 0 : 1) + (centroid.z < midZ ? 0 : 2)].push(triangle);
  }
  if (rimTriangles.some(list => list.length === 0)) return null;
  const hubBoxes = rimTriangles.map(list => triangleBounds(rim, list));
  const hubs = hubBoxes.map(box => box.getCenter(new Vector3()));

  // Tyre pieces centred on an axle belong to that wheel; anything off-axis is body trim.
  const tireTriangles: number[][] = [[], [], [], []];
  const bodyTriangles: number[] = [];
  const radii = [0, 0, 0, 0];
  for (const part of connectedParts(tire)) {
    const box = triangleBounds(tire, part);
    const center = box.getCenter(new Vector3());
    const wheel = hubs.findIndex((hub, index) => Math.abs(center.y - hub.y) < AXLE_TOLERANCE
      && Math.abs(center.z - hub.z) < AXLE_TOLERANCE
      && center.x > hubBoxes[index].min.x - AXLE_SIDE_MARGIN
      && center.x < hubBoxes[index].max.x + AXLE_SIDE_MARGIN);
    if (wheel < 0) {
      bodyTriangles.push(...part);
      continue;
    }
    tireTriangles[wheel].push(...part);
    radii[wheel] = Math.max(radii[wheel], (box.max.y - box.min.y) / 2, (box.max.z - box.min.z) / 2);
  }
  if (radii.some(radius => radius === 0)) return null;

  const blurDiscs = hubBoxes.map((box, wheel) => {
    const outward = hubs[wheel].x < 0 ? -1 : 1;
    const rimRadius = Math.max(box.max.y - box.min.y, box.max.z - box.min.z) / 2;
    const lip = (outward < 0 ? box.min.x : box.max.x) - hubs[wheel].x + outward * .004;
    // CircleGeometry faces +Z; a quarter turn about Y makes it face along the axle.
    return new CircleGeometry(rimRadius * .97, 40).rotateY(outward * Math.PI / 2).translate(lip, 0, 0);
  });

  return {
    hubs,
    radii,
    tires: tireTriangles.map((list, wheel) => extract(tire, list, hubs[wheel])),
    rims: rimTriangles.map((list, wheel) => extract(rim, list, hubs[wheel])),
    bodyRubber: extract(tire, bodyTriangles, new Vector3()),
    blurDiscs,
    blur: blurMaterial(rimMaterial),
  };
}

function findMesh(model: Object3D, materialName: string) {
  let found: Mesh | undefined;
  model.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.isMesh && !Array.isArray(mesh.material) && (mesh.material as Material).name === materialName) found = mesh;
  });
  return found;
}

const identity = new Matrix4();

/**
 * Replaces the shared tyre/rim meshes of a cloned model with four wheel pivots.
 * Returns no wheels (and leaves the model untouched) if the asset does not match.
 */
export function rigWheels(model: Object3D): WheelRig {
  const none: WheelRig = { wheels: [], blur: null };
  const tireMesh = findMesh(model, TIRE_MATERIAL);
  const rimMesh = findMesh(model, RIM_MATERIAL);
  if (!tireMesh?.parent || !rimMesh?.parent || tireMesh.parent !== rimMesh.parent) return none;
  tireMesh.updateMatrix();
  rimMesh.updateMatrix();
  // The converter bakes every transform into the vertices; anything else is a different asset.
  if (!tireMesh.matrix.equals(identity) || !rimMesh.matrix.equals(identity)) return none;

  let split = splitCache.get(tireMesh.geometry);
  if (split === undefined) {
    split = splitWheels(tireMesh.geometry, rimMesh.geometry, rimMesh.material as Material);
    splitCache.set(tireMesh.geometry, split);
  }
  if (!split) return none;

  const parent = tireMesh.parent;
  tireMesh.geometry = split.bodyRubber;
  rimMesh.removeFromParent();
  const wheels = split.hubs.map((hub, wheel) => {
    const pivot = new Group();
    pivot.name = `wheel-${wheel}`;
    pivot.position.copy(hub);
    const blur = new Mesh(split.blurDiscs[wheel], split.blur);
    blur.name = 'rim-motion-blur';
    pivot.add(new Mesh(split.tires[wheel], tireMesh.material), new Mesh(split.rims[wheel], rimMesh.material), blur);
    parent.add(pivot);
    return { pivot, radius: split.radii[wheel] };
  });
  return { wheels, blur: split.blur };
}
