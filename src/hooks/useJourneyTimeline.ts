import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { journeyRuntime } from '../experience/runtime';
import { stages } from '../experience/stages';
import { addIncidentHud } from '../animations/incidentTimeline';
import { EPILOGUE_SPAN, JOURNEY_END } from '../experience/story';

export const JOURNEY_DURATION = JOURNEY_END;

/**
 * How the story follows the scroll. The scroll position says where the story should be; the
 * story moves there like a critically damped spring, so a hard flick, a dragged scrollbar or a
 * jump from the menu plays through smoothly instead of lurching. LAG is how far (in seconds) it
 * trails a steady scroll; MAX_SPEED caps the pace of long trips, in story units a second.
 */
const LAG = 0.35;
const MAX_SPEED = 6;
/** Faster than this (story units a second) the story cards and the HUD step aside until it slows. */
const TRAVEL_FADE: [number, number] = [2.2, 3.8];

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Unity-style SmoothDamp: one step of a critically damped spring toward the target. */
function follow(current: number, target: number, motion: { velocity: number }, dt: number) {
  const omega = 2 / LAG;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const limit = MAX_SPEED * LAG;
  const change = Math.max(-limit, Math.min(limit, current - target));
  const temp = (motion.velocity + omega * change) * dt;
  motion.velocity = (motion.velocity - omega * temp) * decay;
  let next = current - change + (change + temp) * decay;
  // Never overshoot the scroll position.
  if ((target - current > 0) === (next > target)) {
    next = target;
    motion.velocity = 0;
  }
  return next;
}

export function useJourneyTimeline(root: RefObject<HTMLElement | null>, reduced: boolean, onStage: (stage: number) => void) {
  const callback = useRef(onStage);
  useEffect(() => { callback.current = onStage; }, [onStage]);
  useEffect(() => {
    if (!root.current) return;
    let previousStage = -1;
    const element = root.current;
    const cards = element.querySelector<HTMLElement>('.story-panels');
    const hud = element.querySelector<HTMLElement>('.incident-hud');
    let timeline: gsap.core.Timeline;
    journeyRuntime.reducedMotion = reduced;

    // Where the scroll is, in story units: the journey section, then the page below it.
    const geometry = { top: 0, length: 1, below: 1 };
    const measure = () => {
      geometry.top = element.getBoundingClientRect().top + window.scrollY;
      geometry.length = Math.max(1, element.offsetHeight - window.innerHeight);
      const end = geometry.top + geometry.length;
      geometry.below = Math.max(1, document.documentElement.scrollHeight - window.innerHeight - end);
    };
    const scrolled = () => clamp((window.scrollY - geometry.top) / geometry.length);
    const target = () => {
      const journey = scrolled();
      const epilogue = clamp((window.scrollY - geometry.top - geometry.length) / geometry.below);
      return journey * JOURNEY_END + epilogue * EPILOGUE_SPAN;
    };

    const context = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>('.story-panel');
      gsap.set(panels, { autoAlpha: 0, y: reduced ? 0 : 26 });
      gsap.set(panels[0], { autoAlpha: 1, y: 0 });
      timeline = gsap.timeline({
        paused: true,
        onUpdate: () => {
          journeyRuntime.lastInput = performance.now();
          journeyRuntime.progress = timeline.progress();
          const local = journeyRuntime.position % 1;
          journeyRuntime.travel = reduced ? 0 : Math.sin(Math.PI * Math.max(0, Math.min(1, (local - 0.34) / 0.66)));
          journeyRuntime.invalidate();
          const stage = Math.min(stages.length - 1, Math.floor(journeyRuntime.position + 0.18));
          element.style.setProperty('--journey-progress', String(timeline.progress()));
          element.style.setProperty('--travel', String(journeyRuntime.travel));
          if (stage !== previousStage) {
            previousStage = stage;
            callback.current(stage);
            panels.forEach((panel, index) => { panel.inert = index !== stage; panel.setAttribute('aria-hidden', String(index !== stage)); });
          }
        },
      });
      timeline.fromTo(journeyRuntime, { position: 0 }, { position: JOURNEY_DURATION, duration: JOURNEY_DURATION, ease: 'none' }, 0);
      panels.forEach((panel, index) => {
        if (index > 0) timeline.fromTo(panel, { autoAlpha: 0, y: reduced ? 0 : 26 }, { autoAlpha: 1, y: 0, duration: reduced ? 0.001 : 0.18, ease: 'power2.out' }, index - (reduced ? 0.18 : 0.12));
        if (index < stages.length - 1) timeline.to(panel, { autoAlpha: 0, y: reduced ? 0 : -20, duration: reduced ? 0.001 : 0.18, ease: 'power1.in' }, index + (reduced ? 0.819 : 0.47));
      });
      panels.forEach((panel, index) => { panel.inert = index !== 0; panel.setAttribute('aria-hidden', String(index !== 0)); });
      addIncidentHud(timeline, element, reduced);
    }, element);

    // The story position drives the timeline (cards, HUD, car, camera) and, past the end of the
    // journey, the epilogue: the page below carries the story on (see EPILOGUE_SPAN).
    const apply = (story: number) => {
      const journey = Math.min(story, JOURNEY_END);
      if (Math.abs(timeline.time() - journey) > 1e-6) timeline.time(journey);
      const epilogue = clamp((story - JOURNEY_END) / EPILOGUE_SPAN);
      if (epilogue !== journeyRuntime.epilogue) {
        journeyRuntime.epilogue = epilogue;
        journeyRuntime.lastInput = performance.now();
        journeyRuntime.invalidate();
        const end = epilogue > 0.995;
        if (end !== journeyRuntime.atPageEnd) {
          journeyRuntime.atPageEnd = end;
          journeyRuntime.pageEndListener(end);
        }
      }
    };
    let fade = 1;
    const setFade = (value: number) => {
      const next = Math.round(value * 50) / 50;
      if (next === fade) return;
      fade = next;
      if (next === 1) cards?.style.removeProperty('--travel-fade');
      else cards?.style.setProperty('--travel-fade', String(next));
      // Opacity below 1 isolates the HUD's glass panels, so it is only set while travelling.
      if (hud) hud.style.opacity = next === 1 ? '' : String(next);
    };

    measure();
    let current = target();
    const motion = { velocity: 0 };
    apply(current);
    let pastJourney = false;
    const tick = (_time: number, deltaMs: number) => {
      // Past the journey the header needs its own backdrop; it follows the page, not the story.
      const past = scrolled() > 0.995;
      if (past !== pastJourney) {
        pastJourney = past;
        document.documentElement.classList.toggle('is-past-journey', past);
      }
      const goal = target();
      if (reduced) {
        if (goal !== current) apply(current = goal);
        return;
      }
      if (Math.abs(goal - current) < 1e-4 && Math.abs(motion.velocity) < 1e-3) {
        if (goal !== current) {
          motion.velocity = 0;
          apply(current = goal);
        }
        setFade(1);
        return;
      }
      current = follow(current, goal, motion, Math.min(deltaMs / 1000, 0.05));
      apply(current);
      const speed = Math.abs(motion.velocity);
      const t = clamp((speed - TRAVEL_FADE[0]) / (TRAVEL_FADE[1] - TRAVEL_FADE[0]));
      setFade(1 - t * t * (3 - 2 * t));
    };
    const restore = () => {
      measure();
      motion.velocity = 0;
      apply(current = target());
      setFade(1);
      journeyRuntime.invalidate();
    };
    window.addEventListener('drive:restore', restore);
    gsap.ticker.add(tick);

    // Layout can change under the story: fonts, a resized window, an opened answer below.
    let pending = 0;
    const remeasure = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(remeasure);
    resize.observe(document.body);
    window.addEventListener('resize', remeasure);
    let disposed = false;
    document.fonts.ready.then(() => { if (!disposed) remeasure(); });
    return () => {
      disposed = true;
      cancelAnimationFrame(pending);
      resize.disconnect();
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('drive:restore', restore);
      gsap.ticker.remove(tick);
      setFade(1);
      context.revert();
      document.documentElement.classList.remove('is-past-journey');
    };
  }, [root, reduced]);
}
