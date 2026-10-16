import { MathUtils, Vector3 } from 'three';
import { sampleFov, sampleView } from './cameraPath';
import { createPose, sampleVehiclePose, type VehiclePose } from './journeyPath';

const heroPose = createPose();
const heroEye = new Vector3();
const heroTarget = new Vector3();
const forward = new Vector3();
const right = new Vector3();
const start = new Vector3();
const middle = new Vector3();
const eyeA = new Vector3();
const eyeB = new Vector3();
const targetA = new Vector3();
const targetB = new Vector3();

const TURN_RADIUS = 3.8;
const APPROACH_DISTANCE = 12;
const smooth = (value: number) => value * value * (3 - 2 * value);

function heroFrame(mobile: boolean) {
  sampleVehiclePose(0, heroPose);
  sampleView(0, mobile, heroEye, heroTarget);
  forward.set(-Math.sin(heroPose.heading), 0, -Math.cos(heroPose.heading));
  right.set(-forward.z, 0, forward.x);
  start.copy(heroPose.position).addScaledVector(right, TURN_RADIUS * 2);
}

/**
 * One clockwise half-circle. Its tangent begins opposite the road direction, points toward the
 * vehicle's left at halfway, and ends exactly on the Hero route and heading.
 */
export function sampleEntryVehiclePose(turn: number, approach: number, out: VehiclePose) {
  heroFrame(false);
  const u = smooth(MathUtils.clamp(turn, 0, 1));
  if (u >= 1 - 1e-7) return sampleVehiclePose(0, out);
  out.position.copy(start)
    .addScaledVector(forward, -TURN_RADIUS * Math.sin(Math.PI * u))
    .addScaledVector(right, TURN_RADIUS * (Math.cos(Math.PI * u) - 1));
  if (turn <= 0) out.position.addScaledVector(forward, APPROACH_DISTANCE * (1 - approach));
  out.position.y = heroPose.position.y;
  out.heading = heroPose.heading + Math.PI * (1 - u);
  out.pitch = heroPose.pitch;
  out.progress = heroPose.progress;
  return out;
}

function entryShot(mobile: boolean, eye: Vector3, target: Vector3) {
  heroFrame(mobile);
  const distance = mobile ? 12.8 : 10.8;
  const height = mobile ? 3.15 : 2.05;
  eye.copy(start).addScaledVector(forward, -distance).setY(start.y + height);
  target.copy(start).setY(start.y + (mobile ? 1.1 : .72));
}

function middleShot(mobile: boolean, eye: Vector3, target: Vector3) {
  heroFrame(mobile);
  middle.copy(heroPose.position).addScaledVector(right, TURN_RADIUS).addScaledVector(forward, -TURN_RADIUS);
  eye.copy(middle)
    .addScaledVector(forward, -(mobile ? 14.5 : 10.5))
    .addScaledVector(right, mobile ? .2 : .8)
    .setY(middle.y + (mobile ? 4.4 : 2.9));
  target.copy(middle).setY(middle.y + (mobile ? 1.15 : .75));
}

/** The camera tracks the arc, then copies the existing Hero shot exactly at 100%. */
export function sampleEntryView(turn: number, mobile: boolean, eye: Vector3, target: Vector3) {
  heroFrame(mobile);
  const u = MathUtils.clamp(turn, 0, 1);
  if (u >= 1 - 1e-7) {
    eye.copy(heroEye);
    target.copy(heroTarget);
    return;
  }
  entryShot(mobile, eyeA, targetA);
  middleShot(mobile, eyeB, targetB);
  if (u <= .5) {
    const local = smooth(u * 2);
    eye.lerpVectors(eyeA, eyeB, local);
    target.lerpVectors(targetA, targetB, local);
    return;
  }
  const local = smooth((u - .5) * 2);
  eye.lerpVectors(eyeB, heroEye, local);
  target.lerpVectors(targetB, heroTarget, local);
}

export function sampleEntryFov(turn: number, mobile: boolean) {
  if (turn >= 1 - 1e-7) return sampleFov(0, mobile);
  const opening = mobile ? 54 : 38;
  const side = mobile ? 60 : 44;
  if (turn <= .5) return MathUtils.lerp(opening, side, smooth(turn * 2));
  return MathUtils.lerp(side, sampleFov(0, mobile), smooth((turn - .5) * 2));
}

/** Approximate tyre travel for the approach and half-circle, used only before Hero state. */
export function entryRolledDistance(approach: number, turn: number) {
  return APPROACH_DISTANCE * approach + Math.PI * TURN_RADIUS * MathUtils.clamp(turn, 0, 1);
}
