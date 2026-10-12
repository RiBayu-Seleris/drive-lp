/** Mutable render state. Scroll and Three.js communicate without per-frame React updates. */
export const journeyRuntime = {
  progress: 0,
  position: 0,
  time: 0,
  pointerX: 0,
  pointerY: 0,
  inputX: 0,
  inputY: 0,
  travel: 0,
  invalidate: () => {},
  reducedMotion: false,
  paused: false,
  active: true,
  quality: 'high' as 'high' | 'medium' | 'low',
};

export function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}
