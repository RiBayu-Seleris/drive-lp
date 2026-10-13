import { seeded } from './roadPath';
import { CITY_STYLE } from '../materials/city';
import { WATER_LEVEL } from './atmosphere';

export interface Building { x: number; z: number; width: number; depth: number; height: number; style: number }

/** The city stands on a low shore across the bay, its towers clustered downtown. */
export const CITY_GROUND = WATER_LEVEL + 1;
// Across the bay, ahead and a little left of the opening shot; the road ends 15 units short.
export const CITY_BOUNDS = { minX: -250, maxX: 118, nearZ: -506, farZ: -740 };
export const DOWNTOWN = { x: -32, z: -612 };

// Landmark towers stay put whatever the quality tier, so every device sees the same skyline.
// Heights stay well under the snow ranges behind, as in the reference skyline.
const LANDMARKS: Building[] = [
  { x: -42, z: -606, width: 8, depth: 8, height: 96, style: CITY_STYLE.fins },
  { x: 0, z: -632, width: 7, depth: 7, height: 84, style: CITY_STYLE.fins },
  { x: -84, z: -644, width: 10, depth: 9, height: 74, style: CITY_STYLE.crown },
  { x: 40, z: -588, width: 11, depth: 9, height: 62, style: CITY_STYLE.crown },
  { x: -126, z: -620, width: 10, depth: 8, height: 66, style: CITY_STYLE.plain },
  { x: -18, z: -576, width: 13, depth: 10, height: 52, style: CITY_STYLE.plain },
];

export function cityLayout(count: number): Building[] {
  const buildings = [...LANDMARKS];
  for (let attempt = 0; buildings.length < count && attempt < count * 6; attempt++) {
    const angle = seeded(attempt * 3 + 1) * Math.PI * 2;
    const radius = Math.sqrt(seeded(attempt * 3 + 2));
    const x = DOWNTOWN.x + Math.cos(angle) * radius * 190;
    const z = DOWNTOWN.z + Math.sin(angle) * radius * 110;
    if (x < CITY_BOUNDS.minX || x > CITY_BOUNDS.maxX || z > CITY_BOUNDS.nearZ || z < CITY_BOUNDS.farZ) continue;
    const downtown = Math.exp(-(radius * radius) / 0.16);
    const height = 6 + seeded(attempt * 7 + 5) * 14 + downtown * (18 + Math.pow(seeded(attempt * 13 + 3), 1.6) * 52);
    const styleRoll = seeded(attempt * 17 + 9);
    buildings.push({
      x, z,
      width: 6 + seeded(attempt * 5 + 7) * 10,
      depth: 6 + seeded(attempt * 11 + 2) * 10,
      height,
      style: height > 40 && styleRoll > 0.82 ? CITY_STYLE.fins : height > 30 && styleRoll > 0.64 ? CITY_STYLE.crown : CITY_STYLE.plain,
    });
  }
  return buildings;
}
