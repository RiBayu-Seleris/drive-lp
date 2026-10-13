import { CatmullRomCurve3, Vector3, BufferGeometry, Float32BufferAttribute } from 'three';

export const highway = new CatmullRomCurve3([
  new Vector3(-12, 0, 85), new Vector3(-4, 0, 35), new Vector3(0, 0, 0),
  new Vector3(26, 0.4, -60), new Vector3(55, 1.3, -98), new Vector3(8, 2.2, -155),
  new Vector3(-30, 2.5, -200), new Vector3(20, 3, -235), new Vector3(48, 3.5, -280),
  new Vector3(60, 4, -340), new Vector3(76, 4.5, -415), new Vector3(80, 5, -490),
]);
highway.arcLengthDivisions = 1500;
export const roadSide = (t: number, offset: number, height = 0) => {
  const p = highway.getPointAt(t);
  const d = highway.getTangentAt(t);
  return p.add(new Vector3(-d.z, 0, d.x).normalize().multiplyScalar(offset)).add(new Vector3(0, height, 0));
};
export function stripGeometry(offset: number, width: number, height: number, segments = 600, from = 0, to = 1) {
  const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = from + i / segments * (to - from);
    for (const side of [-1, 1]) {
      const p = roadSide(t, offset + side * width / 2, height);
      vertices.push(p.x, p.y, p.z); uv.push(side === -1 ? 0 : 1, t * highway.getLength() / width);
    }
    if (i < segments) { const k = i*2; indices.push(k,k+1,k+2,k+1,k+3,k+2); }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(vertices,3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv,2));
  geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}
/** Upright band that follows the road at a fixed offset: guardrails, barrier faces. */
export function ribbonGeometry(offset: number, bottom: number, top: number, segments = 600, from = 0, to = 1) {
  const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
  const length = highway.getLength();
  for (let i = 0; i <= segments; i++) {
    const t = from + i / segments * (to - from);
    const low = roadSide(t, offset, bottom), high = roadSide(t, offset, top);
    vertices.push(low.x, low.y, low.z, high.x, high.y, high.z);
    uv.push(t * length, 0, t * length, 1);
    if (i < segments) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}
export function seeded(i: number) { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453123; return n - Math.floor(n); }
