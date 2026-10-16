import { EPILOGUE_SPAN, JOURNEY_END } from './story';
import { entry } from '../lib/driveSession';

export type EntryExperienceState = 'intro' | 'analysis' | 'waiting' | 'turning' | 'hero';

/** Mutable render state. Scroll and Three.js communicate without per-frame React updates. */
export const journeyRuntime = {
  progress: 0,
  position: 0,
  /** 0–1 through the page below the story, which carries the story on (see EPILOGUE_SPAN). */
  epilogue: 0,
  time: 0,
  pointerX: 0,
  pointerY: 0,
  inputX: 0,
  inputY: 0,
  travel: 0,
  /** performance.now() of the last scroll or pointer input; the frame rate relaxes when idle. */
  lastInput: 0,
  /** At the very end of the page the world holds its last frame instead of rendering on. */
  atPageEnd: false,
  pageEndListener: (end: boolean) => { void end; },
  invalidate: () => {},
  reducedMotion: false,
  paused: false,
  active: true,
  quality: 'high' as 'high' | 'medium' | 'low',
  /** The first visit is another state of this world, not a second WebGL scene. */
  entryState: (entry.mode === 'first-visit' ? 'intro' : 'hero') as EntryExperienceState,
  entryApproach: 0,
  entryTurn: 0,
  entryScan: 0,
  entryScanStrength: 0,
  entryDamageStrength: 0,
};

/** Story position for the 3D world: the scrubbed journey, then the epilogue below it. */
export function storyPosition() {
  return journeyRuntime.position >= JOURNEY_END - 1e-4
    ? JOURNEY_END + journeyRuntime.epilogue * EPILOGUE_SPAN
    : journeyRuntime.position;
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}
