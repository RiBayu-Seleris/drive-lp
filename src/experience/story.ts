/**
 * Story beats, in journey position units (chapter n spans n-1 to n; the journey ends at
 * JOURNEY_END). Scroll is time: the car, its lights, the tow truck, the camera and the
 * on-screen readouts all key off these same numbers, so they cannot drift apart.
 */

/** Length of the scrubbed journey; the page timeline uses the same value. */
export const JOURNEY_END = 7.98;
/**
 * The page below the story continues it: scrolling those sections moves the story on by this
 * much past JOURNEY_END (the repaired car drives on along the coast toward the city).
 */
export const EPILOGUE_SPAN = 1;

/**
 * Chapter 01. Night, rain, a coast road under a cliff. Nothing is wrong until it is: rock
 * breaks off the cliff on the right ahead of the car and the driver brakes. One rock bounces
 * across the road and comes down on the car's front-left corner while it is still in its lane.
 * Only then does the driver pull over to the left and stop at the roadside, hazards on.
 */
export const INCIDENT_TIMING = {
  /** Already rolling at a steady speed from the first frame. */
  departFrom: 0,
  /** Rock breaks off the cliff ahead. Until this moment there is no warning of any kind. */
  rockfall: 0.27,
  /** The driver sees it and brakes, staying in the lane. */
  brakeFrom: 0.34,
  /** A bouncing rock comes down on the front-left corner while the car is still moving. */
  impact: 0.41,
  /** After the knock the driver steers to the roadside while still braking. */
  pullOverFrom: 0.42,
  /** Hazards go on as the car pulls over. */
  hazardsFrom: 0.55,
  /** At rest at the roadside. */
  stopAt: 0.84,
  /** The camera leaves the chase for chapter 2's shot. */
  handoverFrom: 0.88,
  /** Hazards stay on while the car waits at the roadside, until it is winched onto the tow truck. */
  hazardsUntil: 6.5,
  /** The warning clears once identification begins. */
  clearFrom: 1.15,
  clearTo: 1.5,
} as const;

/**
 * Chapters 02–06. The car does not move: it waits where it stopped while DRIVE works around
 * it. The camera and the data do the travelling.
 */
export const ROADSIDE_TIMING = {
  /** Chapter 03: the camera walks once around the car, one photo per side. */
  orbitFrom: 2,
  orbitTo: 2.8,
  /** Chapter 04: the photos travel to DRIVE's analysis tower; the general result comes back. */
  uploadFrom: 2.86,
  uploadTo: 3.3,
  resultAt: 3.42,
  /** Chapter 06: the claim crosses the bay to the insurer; the decision returns to the car. */
  claimFrom: 4.95,
  claimTo: 5.3,
  decisionAt: 5.45,
} as const;

/**
 * Chapters 07–08. The nearest tow truck comes to the car, winches it onto its bed and carries
 * it round the bend to the partner workshop. Night ends on the way; the repaired car drives
 * off at dawn.
 */
export const RECOVERY_TIMING = {
  /** The search widens from the car: nearest providers first. */
  searchFrom: 5.98,
  searchTo: 6.26,
  /** The accepted truck sets off from far behind and pulls up ahead of the car. */
  towFrom: 6,
  towArrive: 6.34,
  /** It backs up to the car, tips its bed into a ramp and winches the car aboard. */
  reverseTo: 6.39,
  tiltTo: 6.42,
  winchTo: 6.5,
  levelTo: 6.53,
  /** To the workshop beyond the bend: a time skip from night into dawn. */
  carryFrom: 6.55,
  carryTo: 7.34,
  dawnFrom: 6.66,
  dawnTo: 7.3,
  /** Inside, out of sight: the car is lifted off the bed into its own bay and repaired. */
  transferFrom: 7.34,
  transferTo: 7.39,
  repairFrom: 7.34,
  repairTo: 7.44,
  /** The empty truck leaves by the front door and drives on. */
  truckLeaveFrom: 7.39,
  truckLeaveTo: 7.53,
  /** The repaired car rolls out and rejoins the road. */
  exitFrom: 7.44,
  /** The rain eases while the car waits and has stopped by the time the truck arrives. */
  rainEaseFrom: 5.5,
  rainEaseTo: 6.3,
} as const;

const smooth = (value: number, from: number, to: number) => {
  const u = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return u * u * (3 - 2 * u);
};

/** 0 at night, 1 at sunrise. */
export const sampleDawn = (at: number) => smooth(at, RECOVERY_TIMING.dawnFrom, RECOVERY_TIMING.dawnTo);

/** 1 in the opening rain, 0 once it has stopped. */
export const sampleRain = (at: number) => 1 - smooth(at, RECOVERY_TIMING.rainEaseFrom, RECOVERY_TIMING.rainEaseTo);
