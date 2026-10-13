import { Vector3 } from 'three';
import { highway } from './world/roadPath';
import { clamp } from './runtime';
import { EPILOGUE_SPAN, INCIDENT_TIMING, JOURNEY_END, RECOVERY_TIMING } from './story';

// Lane lines sit at ±4.25 and 0 and the edge lines at ±7.9. Traffic keeps left.
/** The car travels in the inner left lane... */
export const VEHICLE_LANE = -2.125;
/** ...and pulls over into the outer left lane to stop, a little more than a metre inside the barrier. */
export const PARKED_LANE = -6.4;
export const VEHICLE_CLEARANCE = 0.08;
/** World scale applied to the 4.8-unit model; wheel spin converts road distance with it. */
export const VEHICLE_SCALE = 1.2;
/** The nose sits this far ahead of the car's centre. */
export const VEHICLE_HALF_LENGTH = 2.4 * VEHICLE_SCALE;
/** Between the axles, for the wheels' contact with a ramp. */
const VEHICLE_WHEELBASE = 2.7 * VEHICLE_SCALE;
export const ROAD_LENGTH = highway.getLength();

/** Road progress (0–1 of arc length) of the fixed points of the story. */
const START_T = 0.13;
/**
 * At rest on the short straight before the sharp left bend, nose against a fallen rock. The
 * rockfall itself lies in the bend ahead (see incidentSite.ts).
 */
export const STOP_T = 0.2585;
/** Where the journey leaves the repaired car: back on the straight beyond the bend. */
const END_T = 0.465;
/** The epilogue (the page below the story) follows it on along the coast toward the city. */
const EPILOGUE_END_T = 0.85;

const START_S = START_T * ROAD_LENGTH;
const STOP_S = STOP_T * ROAD_LENGTH;
const END_S = END_T * ROAD_LENGTH;
const EPILOGUE_END_S = EPILOGUE_END_T * ROAD_LENGTH;

/**
 * The partner workshop: a service platform on the left of the straight beyond the bend, with
 * a two-bay building. Road distances (units along the centre line) and offsets (+ is right).
 * The truck drives in through the rear door of one bay; the repaired car leaves by the front
 * door of the other and rejoins the road.
 */
export const WORKSHOP = {
  platform: { from: 218, to: 294, inner: -9.3, outer: -32 },
  building: { from: 240, to: 266, near: -14.5, far: -27.5 },
  truckBay: -17.75,
  carBay: -24.25,
  /** Where the truck stops inside, and where the car is repaired. */
  standS: 253,
} as const;

/** The flatbed in the truck's own frame: nose toward -Z, origin at the bed's centre. */
export const TOW_BED = {
  halfLength: 3.2,
  halfWidth: 1.35,
  top: 0.83,
  thickness: 0.16,
  /** To make a ramp the bed slides back, then tips about its front edge until the tail meets the road. */
  slide: 0.4,
  tilt: Math.asin((0.83 - 0.16) / 6.4),
};

// --- Road frames ----------------------------------------------------------------------------

const scratchTangent = new Vector3();

/** A point beside the road (offset + is the driver's right), without allocating. */
export function roadPoint(t: number, offset: number, height: number, out: Vector3) {
  const tangent = highway.getTangentAt(t, scratchTangent);
  highway.getPointAt(t, out);
  const length = Math.hypot(tangent.x, tangent.z) || 1;
  out.x += -tangent.z / length * offset;
  out.z += tangent.x / length * offset;
  out.y += height;
  return out;
}

const headingAt = (t: number) => {
  const tangent = highway.getTangentAt(t, scratchTangent);
  return Math.atan2(-tangent.x, -tangent.z);
};
const slopeAt = (t: number) => Math.asin(highway.getTangentAt(t, scratchTangent).y);
const forwardOf = (heading: number, out: Vector3) => out.set(-Math.sin(heading), 0, -Math.cos(heading));

/** Where the car waits, and which way it faces. Shared with the camera and the incident site. */
export const PARKED = {
  position: roadPoint(STOP_T, PARKED_LANE, 0, new Vector3()),
  heading: headingAt(STOP_T),
  forward: forwardOf(headingAt(STOP_T), new Vector3()),
};

// The bend begins a few car lengths ahead, so distances along the car's lane differ from the
// centre line's and the lane ahead starts to turn. Positions near the car are therefore
// measured in real distances, solved once here.
const NOSE = PARKED.position.clone().addScaledVector(PARKED.forward, VEHICLE_HALF_LENGTH);
/** The truck stops with its tail this far ahead of the car's nose. */
const TOW_LOAD_GAP = 1.8;
const tail = new Vector3();
function tailGap(s: number) {
  roadPoint(s / ROAD_LENGTH, PARKED_LANE, 0, tail).addScaledVector(forwardOf(headingAt(s / ROAD_LENGTH), new Vector3()), -TOW_BED.halfLength);
  return tail.sub(NOSE).dot(PARKED.forward);
}
function solveLoadS() {
  let low = STOP_S, high = STOP_S + 30;
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    if (tailGap(middle) < TOW_LOAD_GAP) low = middle; else high = middle;
  }
  return (low + high) / 2;
}
const TOW_LOAD_S = solveLoadS();
/** It overtakes the car on its right, swings into the outer lane ahead of it, stops here and backs up. */
const TOW_PULL_S = TOW_LOAD_S + 8;
const TOW_START_S = STOP_S - 160;
/**
 * Loaded, it eases out of the outer lane to take the bend wide enough for its length, keeping
 * left of the rocks in the right-hand lanes, then turns off onto the workshop platform and in
 * through the rear door of its bay.
 */
const TOW_ROUTE: [number, number][] = [
  [TOW_LOAD_S + 3, PARKED_LANE], [TOW_LOAD_S + 18, -3.4], [212, -3.4], [244, WORKSHOP.truckBay],
];
/** Empty, it leaves by its bay's front door and rejoins the road. */
const TRUCK_EXIT: [number, number][] = [[WORKSHOP.standS, WORKSHOP.truckBay], [268, WORKSHOP.truckBay], [292, PARKED_LANE]];
/** Repaired, the car leaves by the front door of its own bay and rejoins the road in the outer lane. */
const CAR_EXIT: [number, number][] = [[WORKSHOP.standS, WORKSHOP.carBay], [268, WORKSHOP.carBay], [296, PARKED_LANE]];
/**
 * Scene 01's pull-over: it starts after the knock (the car keeps its lane until the rock hits)
 * and ends a little before the stop, so the car is straight when it halts.
 */
const SWERVE: [number, number] = [START_S + incidentDistance(INCIDENT_TIMING.pullOverFrom), STOP_S - 1.5];
/** The rock landing on the front-left corner shoves the nose briefly to the right (radians). */
const IMPACT_KICK = 0.025;
const IMPACT_KICK_SPAN = 0.04;

// --- Easing -----------------------------------------------------------------------------------

const smoothstep = (u: number) => u * u * (3 - 2 * u);
const smoother = (u: number) => u * u * u * (u * (u * 6 - 15) + 10);
const smootherSlope = (u: number) => 30 * u * u * (1 - u) * (1 - u);
const window01 = (value: number, from: number, to: number) => clamp((value - from) / (to - from));

const lane = { offset: 0, yaw: 0 };
/**
 * A lane change laid out along the road, so the heading follows the path drawn on the asphalt.
 * Moving toward negative offsets (left) turns the nose left, which is +yaw.
 */
function laneChange(s: number, [fromS, toS]: [number, number], a: number, b: number) {
  const span = toS - fromS;
  const u = clamp((s - fromS) / span);
  lane.offset = a + (b - a) * smoother(u);
  lane.yaw = Math.atan(-(b - a) * smootherSlope(u) / span);
  return lane;
}

/** Several lane changes in a row, each laid out like laneChange. */
function laneRoute(s: number, route: [number, number][]) {
  if (s <= route[0][0]) return laneChange(s, [route[0][0], route[0][0] + 1], route[0][1], route[0][1]);
  for (let index = 1; index < route.length; index++) {
    if (s <= route[index][0] || index === route.length - 1) {
      return laneChange(s, [route[index - 1][0], route[index][0]], route[index - 1][1], route[index][1]);
    }
  }
  return lane;
}

// --- Planned drives ---------------------------------------------------------------------------

/**
 * Limits for anything the camera follows closely, per unit of story position, so that even a
 * quick scroll shows it travelling and turning rather than jumping: world units, radians and
 * units per unit².
 */
const MAX_SPEED = 800;
const MAX_TURN = 7;
const MAX_ACCELERATION = 3000;

interface RoutePlan { along: Float64Array; time: Float64Array; total: number }

/**
 * A speed plan along a lane route: slow where it turns (the turn rate limits the speed),
 * quicker where it runs straight, from rest to `endSpeed`. Returns time against distance.
 */
function planRoute(fromS: number, toS: number, route: [number, number][], endSpeed = 0): RoutePlan {
  const count = Math.ceil((toS - fromS) / 0.1);
  const along = new Float64Array(count + 1);
  const heading = new Float64Array(count + 1);
  const step = new Float64Array(count + 1);
  const speed = new Float64Array(count + 1);
  const time = new Float64Array(count + 1);
  const here = new Vector3(), previous = new Vector3();
  for (let index = 0; index <= count; index++) {
    along[index] = fromS + (toS - fromS) * index / count;
    const { offset, yaw } = laneRoute(along[index], route);
    heading[index] = headingAt(along[index] / ROAD_LENGTH) + yaw;
    roadPoint(along[index] / ROAD_LENGTH, offset, 0, here);
    if (index > 0) step[index] = here.distanceTo(previous);
    previous.copy(here);
  }
  // Turn rate measured over about a unit either side, which keeps the plan free of jitter.
  const reach = 10;
  for (let index = 0; index <= count; index++) {
    const before = Math.max(0, index - reach), after = Math.min(count, index + reach);
    let turn = 0;
    for (let k = before + 1; k <= after; k++) turn = Math.max(turn, Math.abs(heading[k] - heading[k - 1]) / Math.max(step[k], 1e-6));
    speed[index] = Math.min(MAX_SPEED, MAX_TURN / Math.max(turn, 1e-6));
  }
  speed[0] = 0;
  for (let index = 1; index <= count; index++) speed[index] = Math.min(speed[index], Math.sqrt(speed[index - 1] ** 2 + 2 * MAX_ACCELERATION * step[index]));
  speed[count] = Math.min(speed[count], endSpeed);
  for (let index = count - 1; index >= 0; index--) speed[index] = Math.min(speed[index], Math.sqrt(speed[index + 1] ** 2 + 2 * MAX_ACCELERATION * step[index + 1]));
  for (let index = 1; index <= count; index++) time[index] = time[index - 1] + 2 * step[index] / Math.max(speed[index - 1] + speed[index], 1e-6);
  return { along, time, total: time[count] };
}

/** Road distance covered after `fraction` (0–1) of a planned drive, stretched to its window. */
function followPlan(plan: RoutePlan, fraction: number) {
  const target = clamp(fraction) * plan.total;
  let low = 0, high = plan.time.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (plan.time[middle] <= target) low = middle; else high = middle;
  }
  const span = plan.time[high] - plan.time[low];
  const u = span > 0 ? (target - plan.time[low]) / span : 0;
  return plan.along[low] + (plan.along[high] - plan.along[low]) * u;
}

/** The ride to the workshop: round the bend, onto the platform, into the bay. */
const CARRY = planRoute(TOW_LOAD_S, WORKSHOP.standS, TOW_ROUTE);
/** The repaired car's way out, still rolling when the journey ends. */
const EXIT_SPEED = 140;
const EXIT = planRoute(WORKSHOP.standS, END_S, CAR_EXIT, EXIT_SPEED);

/** How long each planned drive takes at the limits, in story units (checks: ≤ its window). */
export const CARRY_MIN_DURATION = CARRY.total;
export const EXIT_MIN_DURATION = EXIT.total;

// --- Poses ------------------------------------------------------------------------------------

export interface VehiclePose {
  /** Under the vehicle's centre: the road (or the bed it stands on) plus any lift. */
  position: Vector3;
  /** Rotation about world Y; 0 points the nose toward -Z. */
  heading: number;
  /** + raises the nose. Includes the road's own slope. */
  pitch: number;
  /** Road progress 0–1 of the vehicle's centre. */
  progress: number;
}

export interface TowTruckPose extends VehiclePose {
  /** 0–1: how far the bed has slid back and tipped into a ramp. */
  ramp: number;
  reversing: boolean;
}

export const createPose = (): VehiclePose => ({ position: new Vector3(), heading: 0, pitch: 0, progress: 0 });
export const createTruckPose = (): TowTruckPose => ({ ...createPose(), ramp: 0, reversing: false });

function onRoad<P extends VehiclePose>(s: number, offset: number, yaw: number, lift: number, out: P): P {
  const t = clamp(s / ROAD_LENGTH);
  roadPoint(t, offset, lift, out.position);
  out.heading = headingAt(t) + yaw;
  out.pitch = slopeAt(t);
  out.progress = t;
  return out;
}

/**
 * Scene 01: a steady speed until the rock falls, then hard braking to a stop at the roadside.
 * Returns the road distance covered since the opening frame.
 */
function incidentDistance(at: number) {
  const T = INCIDENT_TIMING;
  const braking = T.stopAt - T.brakeFrom;
  const cruise = (STOP_S - START_S) / (T.brakeFrom - T.departFrom + braking / 2);
  if (at <= T.departFrom) return 0;
  if (at <= T.brakeFrom) return cruise * (at - T.departFrom);
  const since = Math.min(at, T.stopAt) - T.brakeFrom;
  return cruise * (T.brakeFrom - T.departFrom) + cruise * since - 0.5 * (cruise / braking) * since * since;
}

/** The nose is pushed right by the knock, and the driver straightens it again. */
function impactKick(at: number) {
  const since = at - INCIDENT_TIMING.impact;
  if (since <= 0 || since >= IMPACT_KICK_SPAN) return 0;
  return -IMPACT_KICK * Math.sin(Math.PI * since / IMPACT_KICK_SPAN);
}

const rampAt = (at: number) => {
  const T = RECOVERY_TIMING;
  return smoothstep(window01(at, T.reverseTo, T.tiltTo)) * (1 - smoothstep(window01(at, T.winchTo, T.levelTo)));
};

/** The tow truck's path, a pure function of story position (scrubbing back replays it). */
export function sampleTowTruck(at: number, out: TowTruckPose) {
  const T = RECOVERY_TIMING;
  out.ramp = 0;
  out.reversing = false;
  if (at < T.towArrive) {
    // From far behind in the car's old lane, decelerating; it swings left once past the car.
    const u = window01(at, T.towFrom, T.towArrive);
    const s = TOW_START_S + (TOW_PULL_S - TOW_START_S) * (1 - Math.pow(1 - u, 2.4));
    const { offset, yaw } = laneChange(s, [STOP_S - 4, TOW_PULL_S], VEHICLE_LANE, PARKED_LANE);
    return onRoad(s, offset, yaw, 0, out);
  }
  if (at < T.reverseTo) {
    out.reversing = at > T.towArrive + 0.004;
    return onRoad(TOW_PULL_S + (TOW_LOAD_S - TOW_PULL_S) * smoothstep(window01(at, T.towArrive, T.reverseTo)), PARKED_LANE, 0, 0, out);
  }
  if (at < T.carryFrom) {
    out.ramp = rampAt(at);
    return onRoad(TOW_LOAD_S, PARKED_LANE, 0, 0, out);
  }
  if (at < T.truckLeaveFrom) {
    const s = followPlan(CARRY, window01(at, T.carryFrom, T.carryTo));
    const { offset, yaw } = laneRoute(s, TOW_ROUTE);
    return onRoad(s, offset, yaw, 0, out);
  }
  // Empty again, it leaves by its bay's front door, rejoins the road and drives out of the story.
  const u = window01(at, T.truckLeaveFrom, T.truckLeaveTo);
  // Just far enough to clear the platform and pass behind the camera waiting on the road ahead.
  const s = WORKSHOP.standS + 60 * u * u;
  const { offset, yaw } = laneRoute(s, TRUCK_EXIT);
  return onRoad(s, offset, yaw, 0, out);
}

/** Height of the tipped bed's top face at a point of the truck frame (z measured backward). */
function rampSurface(z: number, tilt: number, slide: number) {
  const pivotZ = -TOW_BED.halfLength + slide;
  const pivotY = TOW_BED.top - TOW_BED.thickness;
  // The top face, extended past the tail down to the road, so the tyres climb it smoothly.
  return Math.max(0, pivotY + TOW_BED.thickness * Math.cos(tilt) - Math.tan(tilt) * (z - pivotZ - TOW_BED.thickness * Math.sin(tilt)));
}

/** Where the bed's centre is in the truck frame while the bed is tipped. */
function bedCentreZ(tilt: number, slide: number) {
  return -TOW_BED.halfLength + slide + TOW_BED.halfLength * Math.cos(tilt) + TOW_BED.thickness * Math.sin(tilt);
}

// The loading truck stands still, so its frame is fixed.
const LOADING_TRUCK = onRoad(TOW_LOAD_S, PARKED_LANE, 0, 0, createPose());
const LOADING_FORWARD = forwardOf(LOADING_TRUCK.heading, new Vector3());
const LOADING_ON_BED_Z = bedCentreZ(TOW_BED.tilt, TOW_BED.slide);
/** Winch path: a curve from the parked pose to the tipped bed, tangent to both headings. */
const WINCH_FROM = PARKED.position.clone();
const WINCH_TO = LOADING_TRUCK.position.clone().addScaledVector(LOADING_FORWARD, -LOADING_ON_BED_Z);
const WINCH_SPAN = WINCH_FROM.distanceTo(WINCH_TO);
const winchStart = PARKED.forward.clone().multiplyScalar(WINCH_SPAN);
const winchEnd = LOADING_FORWARD.clone().multiplyScalar(WINCH_SPAN);
const winchVelocity = new Vector3();
const offsetFromTruck = new Vector3();

function hermite(u: number, out: Vector3, velocity: Vector3) {
  const u2 = u * u, u3 = u2 * u;
  out.copy(WINCH_FROM).multiplyScalar(2 * u3 - 3 * u2 + 1)
    .addScaledVector(winchStart, u3 - 2 * u2 + u)
    .addScaledVector(WINCH_TO, -2 * u3 + 3 * u2)
    .addScaledVector(winchEnd, u3 - u2);
  velocity.copy(WINCH_FROM).multiplyScalar(6 * u2 - 6 * u)
    .addScaledVector(winchStart, 3 * u2 - 4 * u + 1)
    .addScaledVector(WINCH_TO, -6 * u2 + 6 * u)
    .addScaledVector(winchEnd, 3 * u2 - 2 * u);
}

const truck = createTruckPose();

/** The car's pose: driven, parked, winched, carried, moved across the workshop, repaired, driven again. */
export function sampleVehiclePose(at: number, out: VehiclePose) {
  const T = RECOVERY_TIMING;
  if (at < INCIDENT_TIMING.stopAt) {
    const s = START_S + incidentDistance(at);
    const { offset, yaw } = laneChange(s, SWERVE, VEHICLE_LANE, PARKED_LANE);
    return onRoad(s, offset, yaw + impactKick(at), 0, out);
  }
  if (at < T.tiltTo) {
    // Waiting at the roadside through chapters 02–07: it does not move until the truck takes it.
    return onRoad(STOP_S, PARKED_LANE, 0, 0, out);
  }
  if (at < T.levelTo) {
    // Winched up the ramp along a curve that ends square to the bed, then carried level.
    const ramp = rampAt(at);
    const tilt = TOW_BED.tilt * ramp;
    const slide = TOW_BED.slide * ramp;
    let z: number;
    let along: number;
    if (at < T.winchTo) {
      const u = smoothstep(window01(at, T.tiltTo, T.winchTo));
      hermite(u, out.position, winchVelocity);
      out.heading = Math.atan2(-winchVelocity.x, -winchVelocity.z);
      z = -offsetFromTruck.copy(out.position).sub(LOADING_TRUCK.position).dot(LOADING_FORWARD);
      along = u * (1 - LOADING_ON_BED_Z / WINCH_SPAN);
    } else {
      z = bedCentreZ(tilt, slide);
      out.position.copy(LOADING_TRUCK.position).addScaledVector(LOADING_FORWARD, -z);
      out.heading = LOADING_TRUCK.heading;
      along = 1 - z / WINCH_SPAN;
    }
    // Each axle stands on the road or the ramp; the body rests between them.
    const front = rampSurface(z - VEHICLE_WHEELBASE / 2, tilt, slide);
    const rear = rampSurface(z + VEHICLE_WHEELBASE / 2, tilt, slide);
    out.position.y += (front + rear) / 2;
    out.pitch = LOADING_TRUCK.pitch + Math.atan2(front - rear, VEHICLE_WHEELBASE);
    out.progress = (STOP_S + (TOW_LOAD_S - STOP_S) * along) / ROAD_LENGTH;
    return out;
  }
  if (at < T.carryTo) {
    sampleTowTruck(at, truck);
    out.position.copy(truck.position);
    out.position.y += TOW_BED.top;
    out.heading = truck.heading;
    out.pitch = truck.pitch;
    out.progress = truck.progress;
    return out;
  }
  if (at < T.exitFrom) {
    // Inside the building: lifted off the bed, across into its own bay, set down and repaired.
    const u = smoothstep(window01(at, T.transferFrom, T.transferTo));
    const lift = TOW_BED.top * (1 - u) + Math.sin(Math.PI * u) * 0.35;
    return onRoad(WORKSHOP.standS, WORKSHOP.truckBay + (WORKSHOP.carBay - WORKSHOP.truckBay) * u, 0, lift, out);
  }
  if (at <= JOURNEY_END) {
    // Repaired: out of the front door, back onto the road toward the morning.
    const s = followPlan(EXIT, window01(at, T.exitFrom, JOURNEY_END));
    const { offset, yaw } = laneRoute(s, CAR_EXIT);
    return onRoad(s, offset, yaw, 0, out);
  }
  // The epilogue: on along the coast in the outer lane, toward the city.
  return onRoad(END_S + epilogueDistance(at), PARKED_LANE, 0, 0, out);
}

/** Speed the car leaves the journey with (units per story unit), so the epilogue carries it on. */
const EXIT_LEAVING_SPEED = EXIT_SPEED * EXIT.total / (JOURNEY_END - RECOVERY_TIMING.exitFrom);

/** Road distance past the journey's end: the same speed at first, then easing on to the city. */
function epilogueDistance(at: number) {
  const since = clamp(at - JOURNEY_END, 0, EPILOGUE_SPAN);
  const acceleration = 2 * (EPILOGUE_END_S - END_S - EXIT_LEAVING_SPEED * EPILOGUE_SPAN) / (EPILOGUE_SPAN * EPILOGUE_SPAN);
  return EXIT_LEAVING_SPEED * since + 0.5 * acceleration * since * since;
}

const pose = createPose();

export function sampleVehicleRoadProgress(at: number) {
  return sampleVehiclePose(at, pose).progress;
}

/** Calm mode holds one composition per chapter; the story takes that chapter's position. */
const CALM_POSITIONS = [0, 1.1, 2.1, 3.2, 4.2, 5.2, 6.41, 7.85];

export function sampleVehicleRouteAt(position: number, reduced: boolean) {
  return reduced ? CALM_POSITIONS[Math.min(7, Math.max(0, Math.floor(position + 0.18)))] : position;
}

/**
 * Distance the tyres have actually rolled, in world units. Driving and the winch count; the
 * ride on the flatbed and the move between bays do not. It is a pure function of scroll position, so
 * scrubbing backwards turns the wheels backwards by the same amount.
 */
export function sampleVehicleRolledDistance(at: number) {
  const T = RECOVERY_TIMING;
  const driven = incidentDistance(at);
  const winched = WINCH_SPAN * smoothstep(window01(at, T.tiltTo, T.winchTo));
  const repaired = at > T.exitFrom ? followPlan(EXIT, window01(at, T.exitFrom, JOURNEY_END)) - WORKSHOP.standS : 0;
  return driven + winched + repaired + epilogueDistance(at);
}
