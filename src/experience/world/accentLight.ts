import { PointLight, type ColorRepresentation, type Vector3 } from 'three';

/**
 * One point light shared by the short-lived effects: the plate scan, the photo flashes and the
 * tow truck's beacon. A light that comes and goes changes three's light count, and every lit
 * material then compiles a new shader: a visible stall the first time it happens, several at
 * once on a fast scroll. This light never leaves the scene. Each frame it starts dark and the
 * brightest effect that asks for it takes it (in the story they do not overlap).
 */
export const accentLight = new PointLight('#ffffff', 0, 12, 1.6);

/** Runs first in every frame. */
export function resetAccentLight() {
  accentLight.intensity = 0;
}

/** An effect asks for the light this frame; the brightest request wins. */
export function offerAccentLight(intensity: number, color: ColorRepresentation, position: Vector3, distance: number, decay = 1.6) {
  if (intensity <= accentLight.intensity) return;
  accentLight.intensity = intensity;
  accentLight.color.set(color);
  accentLight.position.copy(position);
  accentLight.distance = distance;
  accentLight.decay = decay;
}
