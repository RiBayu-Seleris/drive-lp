import { Color, LinearSRGBColorSpace, Vector3 } from 'three';

/**
 * One night, shared by every part of the world: the sky, the moonlight, the fog and the
 * water all read these values so their colours meet at the horizon without a seam.
 * Colours are linear (the renderer's working space), not CSS hex.
 */

/** Points from the scene toward the moon: ahead of the opening shot, up and to the right. */
export const MOON_DIRECTION = new Vector3(0.4, 0.3, -0.84).normalize();
/**
 * First sun, just above the horizon, ahead and a little right of the repaired car as it leaves
 * the workshop: the story ends driving into the morning.
 */
export const SUN_DIRECTION = new Vector3(-0.497, 0.105, -0.861).normalize();

/** A direction as a GLSL vec3 literal, for constants shared with the shaders. */
export const glslVec3 = (vector: Vector3) => `vec3(${vector.x.toFixed(4)}, ${vector.y.toFixed(4)}, ${vector.z.toFixed(4)})`;

const linear = (r: number, g: number, b: number) => new Color().setRGB(r, g, b, LinearSRGBColorSpace);

export const NIGHT = {
  zenith: linear(0.0035, 0.0065, 0.016),
  horizon: linear(0.03, 0.045, 0.075),
  /** Haze between the camera and the far coast. Slightly darker than the sky behind it. */
  fog: linear(0.022, 0.034, 0.058),
  moonlight: linear(0.62, 0.72, 1),
  water: linear(0.004, 0.009, 0.018),
};

export const DAWN = {
  fog: linear(0.16, 0.13, 0.13),
  sunlight: linear(1, 0.78, 0.55),
};

/** Exponential-squared density: ~10% haze at 200 units, about half by the far shore. */
export const FOG_DENSITY = 0.0016;

/** Height of the bay's surface. Roads, cliffs and the city all stand above it. */
export const WATER_LEVEL = -13;
