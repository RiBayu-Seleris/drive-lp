import { MathUtils, Vector3 } from 'three';
import { clamp } from './runtime';
import { createPose, createTruckPose, PARKED, ROAD_LENGTH, sampleTowTruck, sampleVehiclePose, WORKSHOP } from './journeyPath';
import { highway, roadSide } from './world/roadPath';
import { EPILOGUE_SPAN, INCIDENT_TIMING, JOURNEY_END, RECOVERY_TIMING, ROADSIDE_TIMING } from './story';
import { CITY_GROUND, DOWNTOWN } from './world/cityLayout';

/**
 * The camera tells the story. Chapter 01 chases the car to its stop. From then until the tow
 * truck takes it the car does not move, so the camera moves around it instead: low at the
 * plate, once round the car for the photos, up toward the analysis tower, close on the damage,
 * wide across the bay for the claim, overhead for the search, beside the truck for the loading.
 * It rides along to the workshop as night turns to dawn, watches the truck drive in and the
 * repaired car roll out, and follows it on along the coast while the page below is read.
 * Every shot keeps the car clear of the story card: the left third of a wide screen, the top
 * half of a phone.
 */

interface Shot { eye: Vector3; look: Vector3; fov: number }
type ShotFn = (at: number, mobile: boolean, out: Shot) => Shot;

/** A local frame on the ground: x to the right, y up, z behind (−z is ahead). */
interface Frame { origin: Vector3; forward: Vector3; right: Vector3 }

const frame = (origin: Vector3, heading: number, out?: Frame): Frame => {
  const target = out ?? { origin: new Vector3(), forward: new Vector3(), right: new Vector3() };
  target.origin.copy(origin);
  target.forward.set(-Math.sin(heading), 0, -Math.cos(heading));
  target.right.set(-target.forward.z, 0, target.forward.x);
  return target;
};

function place(base: Frame, x: number, y: number, z: number, out: Vector3) {
  return out.copy(base.origin).addScaledVector(base.right, x).addScaledVector(base.forward, -z).setY(base.origin.y + y);
}

const PARK = frame(PARKED.position, PARKED.heading);
/** The workshop building's frame: its centre, x toward the road, z back along it. */
const SHOP_S = (WORKSHOP.building.from + WORKSHOP.building.to) / 2;
const SHOP_OFFSET = (WORKSHOP.building.near + WORKSHOP.building.far) / 2;
const shopTangent = highway.getTangentAt(SHOP_S / ROAD_LENGTH);
const SHOP = frame(roadSide(SHOP_S / ROAD_LENGTH, SHOP_OFFSET, 0), Math.atan2(-shopTangent.x, -shopTangent.z));
/** The building's half length, so shots can name its rear (+) and front (−) ends. */
const SHOP_END = (WORKSHOP.building.to - WORKSHOP.building.from) / 2;
const TRUCK_BAY = WORKSHOP.truckBay - SHOP_OFFSET;
const CAR_BAY = WORKSHOP.carBay - SHOP_OFFSET;
/** The road's centre line, in the building frame. */
const ROAD_X = -SHOP_OFFSET;
const CITY = new Vector3(DOWNTOWN.x, CITY_GROUND + 30, DOWNTOWN.z);

const smooth = (u: number) => u * u * (3 - 2 * u);
const smoother = (u: number) => u * u * u * (u * (u * 6 - 15) + 10);
const local = (at: number, from: number, to: number) => clamp((at - from) / (to - from));
const DEG = Math.PI / 180;

function set(out: Shot, base: Frame, eye: [number, number, number], look: [number, number, number], fov: number) {
  place(base, eye[0], eye[1], eye[2], out.eye);
  place(base, look[0], look[1], look[2], out.look);
  out.fov = fov;
  return out;
}

// --- Chapter 02–07: around the parked car ----------------------------------------------------

/** 02 · low behind the car at its plate, the bend and the tower ahead; a slow push in. */
const plate: ShotFn = (at, mobile, out) => {
  const push = smooth(local(at, 1, 1.62));
  return mobile
    ? set(out, PARK, [0.5, 1.9, 12 - push], [-0.6, 1.8, -30], 64)
    : set(out, PARK, [1.6, 1.3, 8.8 - 0.8 * push], [-1.5, 2.2, -30], 44);
};

/** Azimuth of the photo walk: 0 is in front of the car, +90 its right side. */
const orbitAzimuth = (at: number) => 168 - 360 * smoother(local(at, ROADSIDE_TIMING.orbitFrom, ROADSIDE_TIMING.orbitTo));

/** 03 · once round the car, one photo per side; it rises over the barrier on the car's left. */
const photos: ShotFn = (at, mobile, out) => {
  const azimuth = orbitAzimuth(at) * DEG;
  const overBarrier = Math.max(0, -Math.sin(azimuth));
  const radius = mobile ? 13.5 : 7.6;
  const height = (mobile ? 3.2 : 2) + 1.6 * overBarrier;
  return set(out, PARK, [Math.sin(azimuth) * radius, height, -Math.cos(azimuth) * radius], [0, 0.75, 0], mobile ? 62 : 46);
};

function solveAzimuth(target: number) {
  let low: number = ROADSIDE_TIMING.orbitFrom, high: number = ROADSIDE_TIMING.orbitTo;
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    if (orbitAzimuth(middle) > target) low = middle; else high = middle;
  }
  return (low + high) / 2;
}
/** When each of the four photos is taken: rear, right side, front, left side. */
export const PHOTO_CAPTURES = [ROADSIDE_TIMING.orbitFrom + 0.04, solveAzimuth(90), solveAzimuth(0), solveAzimuth(-90)];
/** Where the photographer stands for each (in the parked car's frame), for the flash. */
export const PHOTO_ANGLES = [168, 90, 0, -90];

/** 04 · behind the car, looking up the line its photos take to the analysis tower. */
const tower: ShotFn = (at, mobile, out) => {
  const rise = smooth(local(at, 3, 3.62));
  return mobile
    ? set(out, PARK, [1.6, 1.6 + 0.6 * rise, 11.5], [-6.5, 9 + rise, -30], 64)
    : set(out, PARK, [2.4, 1.2 + 0.5 * rise, 8.4], [-7, 4.8 + rise, -28], 50);
};

/** 05 · close on the front-left corner from beyond the barrier, drifting round it. */
const damage: ShotFn = (at, mobile, out) => {
  const drift = smooth(local(at, 4, 4.62)) * 6 * DEG;
  const azimuth = -37 * DEG + drift;
  const radius = mobile ? 11.5 : 7.3;
  return set(out, PARK, [Math.sin(azimuth) * radius, mobile ? 3.9 : 3.1, -Math.cos(azimuth) * radius - 0.8], [-0.9, mobile ? 3.2 : 0.55, -2.1], mobile ? 58 : 40);
};

/**
 * 06 · wide and high: the car, the bay, and the city across it where the claim goes. A tall
 * screen cannot hold both side by side, so there the camera lines them up instead.
 */
const claim: ShotFn = (at, mobile, out) => {
  const back = smooth(local(at, 5, 5.62));
  return mobile
    ? set(out, PARK, [19.4 + back, 16 + 2 * back, 14.1 + back], [-12, 3, -8.7], 66)
    : set(out, PARK, [8, 11 + 1.5 * back, 28 + 3 * back], [-14.1, 4.7, -4.8], 50);
};

/**
 * 07 · overhead, the car near the top, the road it came along running down the frame. On a
 * phone the card covers the top, so the camera tilts ahead and the car sits low instead.
 */
const search: ShotFn = (at, mobile, out) => {
  const settle = smooth(local(at, 6, 6.3));
  return mobile
    ? set(out, PARK, [1, 92 - 4 * settle, 10], [0, 0, -30], 64)
    : set(out, PARK, [2, 78 - 4 * settle, 18], [0, 0, 12], 50);
};

/** 07 · beside the loading: the truck backs up, tips its bed and winches the car aboard. */
const loading: ShotFn = (at, mobile, out) => {
  const drift = smooth(local(at, 6.4, 6.6));
  return mobile
    ? set(out, PARK, [10, 10, 22 - drift], [-1.2, 8, -2], 64)
    : set(out, PARK, [10, 4, 9 - 0.8 * drift], [-9, 2, -4], 50);
};

// --- Chapter 08: the ride, the bay, the road -------------------------------------------------

const truckPose = createTruckPose();
const lagPose = createTruckPose();
const carPose = createPose();
const ride = frame(new Vector3(), 0);

/** 08 · riding behind and above the truck; it climbs as the sky turns from night to dawn. */
const carry: ShotFn = (at, mobile, out) => {
  sampleTowTruck(at, truckPose);
  // The frame turns with where the truck was a moment ago, so the bend swings in gently.
  sampleTowTruck(at - 0.05, lagPose);
  frame(truckPose.position, lagPose.heading, ride);
  ride.origin.y = truckPose.position.y;
  const rise = smooth(local(at, RECOVERY_TIMING.carryFrom, RECOVERY_TIMING.carryTo));
  return mobile
    ? set(out, ride, [2, 10 + 14 * rise, 20 + 8 * rise], [-1, 0.5 + 2 * rise, -22], 66)
    : set(out, ride, [4, 7 + 12 * rise, 16 + 10 * rise], [-2, 0.5 + 2 * rise, -22], 50);
};

/** 08 · from the road behind the workshop: the truck turns off and drives in at the rear door. */
const arrival: ShotFn = (_at, mobile, out) => (mobile
  ? set(out, SHOP, [ROAD_X + 1, 7, SHOP_END + 18], [TRUCK_BAY, 8, SHOP_END - 2], 64)
  : set(out, SHOP, [ROAD_X + 2, 5, SHOP_END + 15], [TRUCK_BAY - 2, 2.4, SHOP_END - 4], 48));

/** 08 · tracking along the building from across the road while the work is done; the truck leaves ahead. */
const repair: ShotFn = (at, mobile, out) => {
  const along = smooth(local(at, RECOVERY_TIMING.transferFrom, RECOVERY_TIMING.exitFrom + 0.04));
  return mobile
    ? set(out, SHOP, [ROAD_X + 9, 11, 10 - 8 * along], [-1, 7, -2 - 6 * along], 64)
    : set(out, SHOP, [ROAD_X + 10, 4.5, 18 - 10 * along], [-8, 3, 6 - 6 * along], 48);
};

/** 08 · on the road ahead, looking back at the front doors as the repaired car rolls out. */
const leaving: ShotFn = (_at, mobile, out) => (mobile
  ? set(out, SHOP, [ROAD_X + 2, 3.4, -SHOP_END - 28], [CAR_BAY + 2, 7, -SHOP_END], 62)
  : set(out, SHOP, [ROAD_X + 1, 3.5, -SHOP_END - 28], [CAR_BAY + 3, 1.6, -SHOP_END - 2], 46));

const drive = frame(new Vector3(), 0);
/** 08 · following the repaired car down the coast road toward the morning. */
const away: ShotFn = (at, mobile, out) => {
  sampleVehiclePose(at, carPose);
  frame(carPose.position, carPose.heading, drive);
  return mobile
    ? set(out, drive, [-0.4, 4, 12.5], [1.5, 2.4, -30], 66)
    : set(out, drive, [-2.6, 2.3, 10.5], [7, 2, -30], 50);
};

// --- The epilogue: the page below the story ----------------------------------------------------

const ahead = new Vector3();
const flight = frame(new Vector3(), 0);
/**
 * Above and behind the car as it drives on along the coast, turning with the road a long way
 * ahead rather than with the car, so the hairpin swings the view slowly. Toward the end of the
 * page it climbs into a wide view of the bay and the city in the morning sun.
 */
const coast: ShotFn = (at, mobile, out) => {
  sampleVehiclePose(at, carPose);
  const t = carPose.progress;
  ahead.copy(roadSide(Math.min(1, t + 60 / ROAD_LENGTH), 0, 0)).sub(carPose.position).setY(0);
  frame(carPose.position, Math.atan2(-ahead.x, -ahead.z), flight);
  const climb = smooth(local(at, JOURNEY_END + EPILOGUE_SPAN * 0.55, JOURNEY_END + EPILOGUE_SPAN));
  set(out, flight, mobile ? [2, 16 + 34 * climb, 30 + 34 * climb] : [6, 12 + 26 * climb, 26 + 30 * climb], [0, 2, -34], mobile ? 64 : 50);
  // At the top the view opens toward the city across the water, the car still small below it.
  out.look.lerp(CITY, climb * (mobile ? 0.14 : 0.32));
  return out;
};

interface Key { at: number; shot: ShotFn; path?: 'orbit' | 'crane' | 'swing' }

/**
 * Keys hold a shot (two keys with the same shot) or move between two shots. Orbit moves
 * swing round the parked car rather than through it; swing moves do the same round the car
 * as it drives; crane moves lift as they travel.
 */
const KEYS: Key[] = [
  { at: 1, shot: plate },
  { at: 1.62, shot: plate },
  { at: ROADSIDE_TIMING.orbitFrom, shot: photos },
  { at: ROADSIDE_TIMING.orbitTo, shot: photos },
  { at: 3, shot: tower },
  { at: 3.62, shot: tower },
  { at: 4, shot: damage, path: 'orbit' },
  { at: 4.62, shot: damage },
  { at: 5, shot: claim, path: 'orbit' },
  { at: 5.62, shot: claim },
  { at: 6, shot: search, path: 'crane' },
  { at: 6.28, shot: search },
  { at: 6.38, shot: loading },
  { at: 6.54, shot: loading },
  { at: 6.66, shot: carry },
  { at: RECOVERY_TIMING.carryTo - 0.16, shot: carry },
  { at: RECOVERY_TIMING.carryTo - 0.06, shot: arrival },
  { at: RECOVERY_TIMING.transferFrom, shot: arrival },
  { at: RECOVERY_TIMING.transferFrom + 0.04, shot: repair },
  { at: RECOVERY_TIMING.exitFrom + 0.02, shot: repair },
  { at: RECOVERY_TIMING.exitFrom + 0.08, shot: leaving },
  { at: RECOVERY_TIMING.exitFrom + 0.2, shot: leaving },
  // The car drives straight at the leaving shot, so the camera swings round it to follow.
  { at: RECOVERY_TIMING.exitFrom + 0.32, shot: away, path: 'swing' },
  { at: JOURNEY_END, shot: away },
  { at: JOURNEY_END + EPILOGUE_SPAN * 0.18, shot: coast },
  { at: JOURNEY_END + EPILOGUE_SPAN, shot: coast },
];

const shotA: Shot = { eye: new Vector3(), look: new Vector3(), fov: 50 };
const shotB: Shot = { eye: new Vector3(), look: new Vector3(), fov: 50 };
const pivot = new Vector3();
const swingPose = createPose();
const aim = new Vector3();

/** Swing an eye position around a centre (a car): angle, distance and height each ease. */
function orbitBlend(a: Vector3, b: Vector3, u: number, out: Vector3, centre: Vector3) {
  pivot.copy(centre);
  const ax = a.x - pivot.x, az = a.z - pivot.z, bx = b.x - pivot.x, bz = b.z - pivot.z;
  const angleA = Math.atan2(ax, az);
  let turn = Math.atan2(bx, bz) - angleA;
  if (turn > Math.PI) turn -= Math.PI * 2;
  if (turn < -Math.PI) turn += Math.PI * 2;
  const angle = angleA + turn * u;
  const radius = MathUtils.lerp(Math.hypot(ax, az), Math.hypot(bx, bz), u);
  return out.set(pivot.x + Math.sin(angle) * radius, MathUtils.lerp(a.y, b.y, u), pivot.z + Math.cos(angle) * radius);
}

function sampleKeys(at: number, mobile: boolean, out: Shot) {
  if (at <= KEYS[0].at) return KEYS[0].shot(at, mobile, out);
  for (let index = 1; index < KEYS.length; index++) {
    const from = KEYS[index - 1], to = KEYS[index];
    if (at > to.at && index < KEYS.length - 1) continue;
    if (from.shot === to.shot) return to.shot(at, mobile, out);
    const u = smoother(local(at, from.at, to.at));
    from.shot(at, mobile, shotA);
    to.shot(at, mobile, shotB);
    // Orbit and swing moves circle the car (parked, or driving off) instead of passing it.
    const centre = to.path === 'orbit' ? PARK.origin : to.path === 'swing' ? sampleVehiclePose(at, swingPose).position : null;
    if (centre) orbitBlend(shotA.eye, shotB.eye, u, out.eye, centre);
    else out.eye.lerpVectors(shotA.eye, shotB.eye, u);
    // A crane rises a little higher than either end on the way.
    if (to.path === 'crane') out.eye.y += Math.sin(u * Math.PI) * 0.12 * shotA.eye.distanceTo(shotB.eye);
    out.look.lerpVectors(shotA.look, shotB.look, u);
    // On the way round the camera looks at the car itself (aimed above it on a phone, so the car
    // stays below the card): it never slides out of the frame.
    if (centre) out.look.lerp(aim.copy(centre).setY(centre.y + (mobile ? 4.5 : 1.2)), Math.min(1, 1.6 * Math.sin(u * Math.PI)));
    out.fov = MathUtils.lerp(shotA.fov, shotB.fov, u);
    return out;
  }
  return KEYS[KEYS.length - 1].shot(at, mobile, out);
}

// --- Chapter 01: chase camera ------------------------------------------------------------------

/**
 * Offsets in the car's own frame: x to its right, y up, z behind it (negative z is ahead).
 * Opening with the car a third in from the left, the coast city behind it and the warning
 * right of centre. As the car brakes and pulls over, the camera eases toward the bend, so at
 * rest the warning hangs upper right over the rockfall and the tower stands over the car.
 */
const CHASE = {
  desktop: { open: { eye: [2.75, 2.4, 10], look: [-0.73, 1, -29.8], fov: 44 }, close: { eye: [3, 2, 9.5], look: [-1.2, 2.6, -30], fov: 44 } },
  mobile: { open: { eye: [0.25, 3, 11], look: [0.95, 3.35, -29], fov: 62 }, close: { eye: [1.5, 4, 12.5], look: [-2, 2.6, -26], fov: 62 } },
} as const;

const car = createPose();
const chaseFrame = frame(new Vector3(), 0);
const eyeOffset = new Vector3();
const lookOffset = new Vector3();
const closeOffset = new Vector3();
const chase: Shot = { eye: new Vector3(), look: new Vector3(), fov: 44 };
const handover: Shot = { eye: new Vector3(), look: new Vector3(), fov: 44 };

/** Camera for chapter 1 (0 ≤ at < 1). Hands over to chapter 2's plate shot at the end. */
function sampleChase(at: number, mobile: boolean, out: Shot) {
  sampleVehiclePose(at, car);
  // The frame follows the road's heading, not the car's, so the pull-over reads on screen.
  const tangent = highway.getTangentAt(car.progress);
  frame(car.position, Math.atan2(-tangent.x, -tangent.z), chaseFrame);

  const shot = mobile ? CHASE.mobile : CHASE.desktop;
  const close = MathUtils.smoothstep(at, 0.25, INCIDENT_TIMING.stopAt);
  eyeOffset.fromArray(shot.open.eye).lerp(closeOffset.fromArray(shot.close.eye), close);
  lookOffset.fromArray(shot.open.look).lerp(closeOffset.fromArray(shot.close.look), close);
  place(chaseFrame, eyeOffset.x, eyeOffset.y, eyeOffset.z, chase.eye);
  place(chaseFrame, lookOffset.x, lookOffset.y, lookOffset.z, chase.look);
  chase.fov = MathUtils.lerp(shot.open.fov, shot.close.fov, close);

  // A short jolt at the knock: scroll-keyed, so scrubbing back and forth replays it exactly.
  const jolt = Math.exp(-Math.pow((at - INCIDENT_TIMING.impact) / 0.012, 2)) * (at > INCIDENT_TIMING.impact - 0.03 ? 1 : 0);
  chase.eye.y += Math.sin(at * 900) * 0.05 * jolt;
  chase.eye.addScaledVector(chaseFrame.right, Math.sin(at * 640) * 0.04 * jolt);

  const blend = smooth(local(at, INCIDENT_TIMING.handoverFrom, 1));
  if (blend > 0) {
    plate(1, mobile, handover);
    chase.eye.lerp(handover.eye, blend);
    chase.look.lerp(handover.look, blend);
    chase.fov = MathUtils.lerp(chase.fov, handover.fov, blend);
  }
  out.eye.copy(chase.eye);
  out.look.copy(chase.look);
  out.fov = chase.fov;
  return out;
}

// --- Public API ----------------------------------------------------------------------------------

const sampled: Shot = { eye: new Vector3(), look: new Vector3(), fov: 50 };
let sampledAt = Number.NaN;
let sampledMobile = false;

function sampleShot(at: number, mobile: boolean) {
  if (at === sampledAt && mobile === sampledMobile) return sampled;
  sampledAt = at;
  sampledMobile = mobile;
  return at < 1 ? sampleChase(Math.max(0, at), mobile, sampled) : sampleKeys(at, mobile, sampled);
}

export function sampleView(at: number, mobile: boolean, position: Vector3, target: Vector3) {
  const shot = sampleShot(at, mobile);
  position.copy(shot.eye);
  target.copy(shot.look);
}

/** Lens for a story position; long for the chase and the close-ups, wide for the overviews. */
export function sampleFov(at: number, mobile: boolean) {
  return sampleShot(at, mobile).fov;
}
