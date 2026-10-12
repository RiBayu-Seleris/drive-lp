import { CatmullRomCurve3, Vector3 } from 'three';
import { clamp } from './runtime';
import { roadSide } from './world/roadPath';

export const VEHICLE_LANE = -3.35;
export const VEHICLE_CLEARANCE = 0.08;

// Road arc-length stops: opening, checkup, capture, analysis, options, services, reveal.
// The same car remains on this lane throughout; the final shot pulls away from it.
const roadStops = [0.13, 0.2915, 0.2915, 0.46, 0.46, 0.66, 0.778, 0.86, 0.96];
const vehicleAnchors = new CatmullRomCurve3(
  roadStops.map(t => roadSide(t, VEHICLE_LANE, VEHICLE_CLEARANCE)), false, 'catmullrom', 0.12,
);
const anchor = new Vector3();

/** Shared holds and travel easing keep the road vehicle and camera in step. */
export function sampleChapter(at: number) {
  const clamped = clamp(at, 0, 8);
  const stage = Math.floor(clamped);
  if (stage === 8) return 8;
  const hold = stage === 7 ? .5 : stage === 4 ? 0.4 : 0.18;
  const t = clamp((clamped - stage - hold) / (1 - hold));
  return stage + t * t * (3 - 2 * t);
}

export function sampleVehicleRoadProgress(at: number) {
  const chapter = sampleChapter(at);
  const stage = Math.min(7, Math.floor(chapter));
  return roadStops[stage] + (roadStops[stage + 1] - roadStops[stage]) * (chapter - stage);
}

/** Bend correction preserves chapter compositions while the camera follows the actual road. */
export function sampleRoadBend(at: number, out: Vector3) {
  vehicleAnchors.getPoint(sampleChapter(at) / 8, anchor);
  return out.copy(roadSide(sampleVehicleRoadProgress(at), VEHICLE_LANE, VEHICLE_CLEARANCE)).sub(anchor);
}
