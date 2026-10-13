import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';
import { highway } from './roadPath';
import { WATER_LEVEL } from './atmosphere';

/**
 * Procedural landforms around the bay. Everything here is plain geometry generation so the
 * same functions can be checked outside the browser.
 */

function hash(x: number, z: number) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  let fx = x - ix, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fz = fz * fz * (3 - 2 * fz);
  const top = hash(ix, iz) * (1 - fx) + hash(ix + 1, iz) * fx;
  const bottom = hash(ix, iz + 1) * (1 - fx) + hash(ix + 1, iz + 1) * fx;
  return top * (1 - fz) + bottom * fz;
}

export function fbm(x: number, z: number, octaves = 5) {
  let value = 0, amplitude = 0.5, frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    value += noise(x * frequency + octave * 17.3, z * frequency - octave * 9.1) * amplitude;
    frequency *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

/** Sharp crests: folded noise reads as eroded ridgelines rather than soft hills. */
function ridged(x: number, z: number) {
  let value = 0, amplitude = 0.55, frequency = 1;
  for (let octave = 0; octave < 5; octave++) {
    const n = 1 - Math.abs(noise(x * frequency + 3.1 * octave, z * frequency) * 2 - 1);
    value += n * n * amplitude;
    frequency *= 2.05;
    amplitude *= 0.48;
  }
  return value;
}

interface GridOptions {
  minX: number; maxX: number; minZ: number; maxZ: number; step: number;
  height: (x: number, z: number) => number;
  color?: (x: number, y: number, z: number) => Color;
}

/** Regular grid in XZ with one height per vertex; triangles are skipped where both sides are underwater. */
export function heightfield({ minX, maxX, minZ, maxZ, step, height, color }: GridOptions) {
  const columns = Math.ceil((maxX - minX) / step);
  const rows = Math.ceil((maxZ - minZ) / step);
  const positions: number[] = [];
  const colors: number[] = [];
  const heights = new Float32Array((columns + 1) * (rows + 1));
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const x = minX + column * step, z = minZ + row * step;
      const y = height(x, z);
      heights[row * (columns + 1) + column] = y;
      positions.push(x, y, z);
      const c = color ? color(x, y, z) : new Color(1, 1, 1);
      colors.push(c.r, c.g, c.b);
    }
  }
  const indices: number[] = [];
  const below = WATER_LEVEL - 0.5;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
      if (Math.max(heights[a], heights[b], heights[c], heights[d]) < below) continue;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// --- Road-relative coastal wall ------------------------------------------------------------

const ROAD_SAMPLES = Array.from({ length: 361 }, (_, index) => {
  const t = index / 360 * 0.62;
  return { t, point: highway.getPointAt(t), tangent: highway.getTangentAt(t) };
});

/** Distance from the road centre line, signed: positive on the driver's right. */
export function roadOffset(x: number, z: number) {
  let best = ROAD_SAMPLES[0], bestDistance = Infinity;
  for (const sample of ROAD_SAMPLES) {
    const dx = x - sample.point.x, dz = z - sample.point.z;
    const distance = dx * dx + dz * dz;
    if (distance < bestDistance) { bestDistance = distance; best = sample; }
  }
  const dx = x - best.point.x, dz = z - best.point.z;
  // Right of travel = tangent rotated a quarter turn clockwise seen from above.
  const side = Math.sign(dx * -best.tangent.z + dz * best.tangent.x) || 1;
  return { offset: side * Math.sqrt(bestDistance), t: best.t, roadY: best.point.y };
}

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Headland on the inside of the opening right-hand curve: a near-vertical rock wall that
 * keeps 12+ units from the centre line, with a wooded shoulder behind. It ends at the
 * incident bend — the rocks on the road came off its last buttress — so the view past the
 * bend stays open to the bay, as in the reference.
 */
export function coastalWallHeight(x: number, z: number) {
  const { offset, t } = roadOffset(x, z);
  if (offset < 11) return WATER_LEVEL - 4;
  const along = smooth(0.02, 0.1, t) * (1 - smooth(0.255, 0.3, t));
  const face = smooth(12, 30, offset);
  const crown = 72 + fbm(x * 0.018, z * 0.018) * 46 + smooth(30, 90, offset) * 24;
  const crags = (fbm(x * 0.09, z * 0.09, 4) - 0.5) * 14 * face;
  return WATER_LEVEL + Math.max(0, along * face * crown + crags * along);
}

/**
 * The promontory carrying the disc tower. From the opening shot it rises just left of the
 * coastal wall, so the two read as one dark mass on the right with the tower on top.
 */
export const TOWER_PEAK = new Vector3(162, 0, -277);

export function towerPeakHeight(x: number, z: number) {
  const dx = (x - TOWER_PEAK.x) / 46, dz = (z - TOWER_PEAK.z) / 62;
  const radial = Math.sqrt(dx * dx + dz * dz);
  // A low exponent keeps the flanks steep, like a sea stack rather than a dome.
  const body = Math.pow(Math.max(0, 1 - radial), 0.32);
  // Ridged noise breaks the top into crags; the summit stays level enough for the tower.
  const crags = ridged(x * 0.02 + 5, z * 0.02) * (1 - Math.max(0, 1 - radial * 2.4));
  return WATER_LEVEL + body * (44 + crags * 26) + (fbm(x * 0.12, z * 0.12, 3) - 0.5) * 8 * body;
}

/** Low wooded island that frames the left edge of the opening view without hiding the city. */
export const ISLAND = new Vector3(-92, 0, -150);

export function islandHeight(x: number, z: number) {
  const dx = (x - ISLAND.x) / 42, dz = (z - ISLAND.z) / 28;
  const radial = Math.sqrt(dx * dx + dz * dz);
  const body = Math.max(0, 1 - radial);
  return WATER_LEVEL - 3 + Math.pow(body, 0.8) * (24 + fbm(x * 0.05, z * 0.05) * 12);
}

// --- Far snow ranges -----------------------------------------------------------------------

export interface Range { x: number; z: number; width: number; depth: number; peak: number; seed: number }

/** Behind the city and around the bay; all 800+ units from the opening camera. */
export const FAR_RANGES: Range[] = [
  { x: -560, z: -1080, width: 760, depth: 300, peak: 330, seed: 3 },
  { x: 70, z: -1290, width: 860, depth: 320, peak: 390, seed: 11 },
  { x: 660, z: -1040, width: 640, depth: 300, peak: 310, seed: 23 },
  { x: -1020, z: -640, width: 420, depth: 560, peak: 260, seed: 31 },
  { x: 980, z: -540, width: 380, depth: 560, peak: 240, seed: 47 },
];

export function rangeHeight(range: Range, x: number, z: number) {
  const u = (x - range.x) / (range.width / 2), v = (z - range.z) / (range.depth / 2);
  const envelope = Math.pow(Math.max(0, 1 - u * u), 0.9) * Math.pow(Math.max(0, 1 - v * v), 0.6);
  const crest = ridged(x * 0.004 + range.seed, z * 0.004);
  return WATER_LEVEL + envelope * range.peak * (0.35 + crest * 0.95);
}
