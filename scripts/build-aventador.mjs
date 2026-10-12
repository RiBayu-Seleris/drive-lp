import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Box3, BufferGeometry, Color, Float32BufferAttribute, Matrix4, Vector3 } from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptEncoder, MeshoptSimplifier, MeshoptDecoder } from 'meshoptimizer';

// Build-time only: the browser loads local, indexed, compressed GLBs, never the 43 MB OBJ.
const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = path.resolve(root, process.argv[2] || '../3D/8hd2hnno0ayo-aventador_sport/Avent_sport.obj');
const output = path.join(root, 'public/assets/models');
const source = await readFile(sourcePath);
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready, MeshoptDecoder.ready]);

const color = (value) => [...new Color(value).toArray(), 1];
const material = (name, hex, metallicFactor, roughnessFactor, extra = {}) => ({
  name, pbrMetallicRoughness: { baseColorFactor: color(hex), metallicFactor, roughnessFactor }, ...extra,
});
const coat = { KHR_materials_clearcoat: { clearcoatFactor: 1, clearcoatRoughnessFactor: 0.16 } };
const materials = [
  material('Aventador pearl silver', '#a4b8c8', 0.7, 0.24, { extensions: coat }),
  material('Carbon and underbody', '#17212a', 0.25, 0.46),
  material('Rubber tires', '#171c22', 0, 0.88),
  material('Forged alloy wheels', '#9cabb5', 0.85, 0.26),
  material('Mechanical metal', '#5d6c78', 0.8, 0.37),
  material('Smoked glass', '#293b4a', 0.25, 0.12, { extensions: coat, alphaMode: 'BLEND' }),
  material('Cabin upholstery', '#202932', 0.05, 0.82),
  material('Blue accent', '#287eb0', 0.55, 0.25, { extensions: coat }),
  material('Brake calipers', '#b62b30', 0.35, 0.38),
  material('Headlight LEDs', '#d7eeff', 0.1, 0.2, { emissiveFactor: [0.65, 0.82, 1] }),
  material('Rear lamp lens', '#911a22', 0.15, 0.2, { emissiveFactor: [0.22, 0.005, 0.008] }),
  material('Rear LED lamps', '#f43937', 0.1, 0.2, { emissiveFactor: [1, 0.018, 0.012] }),
  material('Lamp reflectors', '#aab6c2', 0.9, 0.13),
  material('Lamp housing', '#202936', 0.35, 0.2),
  material('Gold badge and hardware', '#b99750', 0.6, 0.3),
];
materials[5].pbrMetallicRoughness.baseColorFactor[3] = 0.78;

const mapping = new Map();
const assign = (index, names) => names.split(' ').forEach(name => mapping.set(name, index));
assign(0, 'body');
assign(1, 'Default air spoil voz decal12 TEILE4 _Black_ plastik UNTERBODEN Lambo_045black spoil2 spoil1 res detals2 detals splitters spoiler2 frame kark');
assign(2, 'tire black2 REIFEN1');
assign(3, 'main');
assign(4, 'chrome black exhaust MSS01 MSS02 MSS03 ressor dvig dvig2 gl TEILE1 white lines int7');
assign(5, 'glass');
assign(6, 'interior signs speedometer');
assign(7, 'strip');
assign(8, 'g redd');
assign(9, 'LICHTER1');
assign(10, 'light');
assign(11, 'redl');
assign(12, 'TEILE2 TEILE3 FrontColor LICHTER4 LICHTER5 Mirror');
assign(13, 'LICHTER3 light3');
assign(14, 'Lambo_045yellow yellow logo');

const original = new OBJLoader().parse(source.toString('utf8'));
const bounds = new Box3().setFromObject(original);
const center = bounds.getCenter(new Vector3());
const size = bounds.getSize(new Vector3());
const scale = 4.8 / size.x;
// Source: Y-up, nose -X. Runtime: Y-up, nose -Z, tire contact at Y=0.
const transform = new Matrix4().makeScale(scale, scale, scale)
  .multiply(new Matrix4().makeRotationY(-Math.PI / 2))
  .multiply(new Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
const pieces = materials.map(() => []);
let originalTriangles = 0;
original.traverse(mesh => {
  if (!mesh.isMesh) return;
  const geometry = mesh.geometry;
  const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: geometry.attributes.position.count, materialIndex: 0 }];
  for (const group of groups) {
    const name = meshMaterials[group.materialIndex].name;
    if (!mapping.has(name)) throw new Error(`Unmapped source material: ${name}`);
    const part = new BufferGeometry();
    // MTL only references absent tire maps. Keep supplied normals; do not invent UV bindings.
    for (const attribute of ['position', 'normal']) {
      part.setAttribute(attribute, new Float32BufferAttribute(geometry.attributes[attribute].array.slice(group.start * 3, (group.start + group.count) * 3), 3));
    }
    part.applyMatrix4(transform);
    pieces[mapping.get(name)].push(part);
    originalTriangles += group.count / 3;
  }
});
const merged = pieces.map(group => {
  const joined = mergeGeometries(group);
  const welded = mergeVertices(joined, 1e-5);
  joined.dispose();
  group.forEach(geometry => geometry.dispose());
  return welded;
});

function optimizedGeometry(input, ratio, error) {
  const positions = input.attributes.position.array;
  const normals = input.attributes.normal.array;
  const originalIndices = new Uint32Array(input.index.array);
  const target = Math.max(300, Math.floor(originalIndices.length * ratio / 3) * 3);
  const [indices, actualError] = target >= originalIndices.length ? [originalIndices, 0] : MeshoptSimplifier.simplifyWithAttributes(
    originalIndices, positions, 3, normals, 3, [0.25, 0.25, 0.25], null, target, error, ['Permissive'],
  );
  const [remap, count] = MeshoptEncoder.reorderMesh(indices, true, true);
  const compact = { position: new Float32Array(count * 3), normal: new Float32Array(count * 3) };
  for (let i = 0; i < remap.length; i++) {
    if (remap[i] === 0xffffffff) continue;
    for (let axis = 0; axis < 3; axis++) {
      compact.position[remap[i] * 3 + axis] = Math.round(positions[i * 3 + axis] * 1e5) / 1e5;
      compact.normal[remap[i] * 3 + axis] = normals[i * 3 + axis];
    }
  }
  return { ...compact, indices, actualError };
}

function glb(geometries, name) {
  const json = {
    asset: { version: '2.0', generator: 'DRIVE build-aventador.mjs' },
    extensionsUsed: ['EXT_meshopt_compression', 'KHR_materials_clearcoat'], extensionsRequired: ['EXT_meshopt_compression'],
    scene: 0, scenes: [{ name, nodes: [0] }], nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: [] }], materials, accessors: [], bufferViews: [], buffers: [],
  };
  const chunks = [];
  let packedLength = 0, decodedLength = 0;
  const addAccessor = (array, type, target) => {
    const dimensions = type === 'VEC3' ? 3 : 1;
    const count = array.length / dimensions;
    const stride = dimensions * 4;
    const mode = type === 'SCALAR' ? 'TRIANGLES' : 'ATTRIBUTES';
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    const packed = MeshoptEncoder.encodeGltfBuffer(bytes, count, stride, mode);
    // Validate each encoded stream before writing it to the production asset.
    const decoded = new Uint8Array(bytes.length);
    MeshoptDecoder.decodeGltfBuffer(decoded, count, stride, packed, mode);
    if (mode === 'ATTRIBUTES' && !Buffer.from(decoded).equals(Buffer.from(bytes))) throw new Error('Attribute compression round-trip failed');
    const offset = packedLength;
    chunks.push(Buffer.from(packed));
    const padding = (4 - packed.length % 4) % 4;
    chunks.push(Buffer.alloc(padding));
    packedLength += packed.length + padding;
    const view = { buffer: 1, byteOffset: decodedLength, byteLength: bytes.length, target,
      extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: offset, byteLength: packed.length, byteStride: stride, count, mode, filter: 'NONE' } } };
    if (type === 'VEC3') view.byteStride = stride;
    json.bufferViews.push(view);
    decodedLength += bytes.length;
    const accessor = { bufferView: json.bufferViews.length - 1, byteOffset: 0, componentType: type === 'SCALAR' ? 5125 : 5126, count, type };
    if (type === 'VEC3') {
      accessor.min = [Infinity, Infinity, Infinity]; accessor.max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < array.length; i++) { const axis = i % 3; accessor.min[axis] = Math.min(accessor.min[axis], array[i]); accessor.max[axis] = Math.max(accessor.max[axis], array[i]); }
    }
    json.accessors.push(accessor);
    return json.accessors.length - 1;
  };
  geometries.forEach((geometry, index) => {
    json.meshes[0].primitives.push({
      attributes: { POSITION: addAccessor(geometry.position, 'VEC3', 34962), NORMAL: addAccessor(geometry.normal, 'VEC3', 34962) },
      indices: addAccessor(geometry.indices, 'SCALAR', 34963), material: index, mode: 4,
    });
  });
  json.buffers = [{ byteLength: packedLength }, { byteLength: decodedLength, extensions: { EXT_meshopt_compression: { fallback: true } } }];
  const text = Buffer.from(JSON.stringify(json));
  const textPadded = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
  const binary = Buffer.concat(chunks);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + textPadded.length + binary.length, 8);
  header.writeUInt32LE(textPadded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, textPadded, binHeader, binary]);
}

await mkdir(output, { recursive: true });
const report = { source: path.basename(sourcePath), sourceBytes: source.length, sha256: createHash('sha256').update(source).digest('hex'), originalTriangles, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, variants: [] };
for (const [name, ratio, error] of [['aventador', 0.19, 0.0015], ['aventador-low', 0.065, 0.004]]) {
  const geometries = merged.map(geometry => optimizedGeometry(geometry, ratio, error));
  const data = glb(geometries, name);
  await writeFile(path.join(output, `${name}.glb`), data);
  const info = { file: `${name}.glb`, bytes: data.length, triangles: geometries.reduce((sum, geometry) => sum + geometry.indices.length / 3, 0), primitives: geometries.length };
  report.variants.push(info);
  console.log(info);
}
await writeFile(path.join(output, 'aventador-build.json'), JSON.stringify(report, null, 2) + '\n');
merged.forEach(geometry => geometry.dispose());
