import { Vector3 } from 'three';
import { highway, roadSide } from './roadPath';
import { createPose, PARKED, ROAD_LENGTH, sampleVehiclePose, STOP_T, VEHICLE_HALF_LENGTH, VEHICLE_SCALE } from '../journeyPath';
import { INCIDENT_TIMING } from '../story';

/** Where things are on the incident bend. Shared by the scene, the camera and the HUD. */
export { ROAD_LENGTH, STOP_T };
/** The 4.8 m car is VEHICLE_SCALE × 4.8 units long, which fixes metres per world unit. */
export const METRES_PER_UNIT = 1 / VEHICLE_SCALE;

/** A point in the parked car's own frame: x to its right, y up, z behind it. */
export function besideParkedCar(x: number, y: number, z: number, out = new Vector3()) {
  const forward = PARKED.forward;
  return out.copy(PARKED.position)
    .addScaledVector(forward, -z)
    .add(new Vector3(-forward.z * x, y, forward.x * x));
}

/** Road progress level with the car's nose (the bend makes this differ from centre + half length). */
export const NOSE_T = (() => {
  const nose = besideParkedCar(0, 0, -VEHICLE_HALF_LENGTH);
  let best = STOP_T, bestDistance = Infinity;
  const point = new Vector3();
  for (let t = STOP_T; t < STOP_T + 0.02; t += 0.00002) {
    highway.getPointAt(t, point);
    const distance = Math.hypot(point.x - nose.x, point.z - nose.z);
    if (distance < bestDistance) { bestDistance = distance; best = t; }
  }
  return best;
})();

// The rock hits the car before it pulls over, so the knock is placed on the car where it was
// at that moment, in its lane, not where it ends up parked.
const AT_IMPACT = sampleVehiclePose(INCIDENT_TIMING.impact, createPose());
const impactForward = new Vector3(-Math.sin(AT_IMPACT.heading), 0, -Math.cos(AT_IMPACT.heading));

/** A point in the car's own frame at the moment of the knock: x to its right, y up, z behind. */
function besideCarAtImpact(x: number, y: number, z: number) {
  return AT_IMPACT.position.clone()
    .addScaledVector(impactForward, -z)
    .add(new Vector3(-impactForward.z * x, y, impactForward.x * x));
}

/** Where the rock lands on the car: the top of the front-left wing, above the wheel. */
export const IMPACT_POINT = besideCarAtImpact(-0.85, 0.95, -1.9);
/** The rock's centre as it strikes, resting on the wing for that instant. */
export const IMPACT_CONTACT = besideCarAtImpact(-0.78, 1.3, -1.95);
/** It glances off hard to the left and drops to the road beside the car (road level)... */
export const IMPACT_DROP = besideCarAtImpact(-3.2, 0, -3.4);
/**
 * ...and rolls on to the barrier on the left (road level), well clear of the line the car
 * takes when it pulls over, and some way behind where it stops.
 */
export const IMPACT_ROCK = besideCarAtImpact(-5.7, 0, -5.2);
/** Ahead and to the right of the knock: the cliff it fell from, and its one bounce on the road. */
export const IMPACT_FROM = besideCarAtImpact(23, 0, -6);
export const IMPACT_BOUNCE = besideCarAtImpact(6.5, 0, -4);

/**
 * The rockfall came down from the cliff on the right into the sharp left bend ahead and lies
 * across the right-hand lanes. The left lanes stay open: passing traffic squeezes through
 * beside the parked car, and the tow truck takes the bend there.
 */
export const BEND_T = 0.2915;
export const ROCKFALL_T = BEND_T + 2.5 / ROAD_LENGTH;
/** Where the first rocks of the fall begin, for the distance readout. */
export const ROCKFALL_NEAR_T = BEND_T - 4.5 / ROAD_LENGTH;
export const ROCKFALL_POINT = roadSide(ROCKFALL_T, 3.6, 0.05);
/** The warning hangs over the rockfall. */
export const WARNING_HEIGHT = 7.6;
export const WARNING_POINT = roadSide(BEND_T + 3 / ROAD_LENGTH, 3.4, WARNING_HEIGHT);
/**
 * The warning's screen-right and screen-left edges, refreshed each frame by the hologram (it
 * scales with distance), so the DOM label beside it never overlaps the triangle.
 */
export const warningLabelAnchor = new Vector3().copy(WARNING_POINT);
export const warningLabelAnchorLeft = new Vector3().copy(WARNING_POINT);
