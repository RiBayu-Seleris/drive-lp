import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { journeyRuntime } from '../experience/runtime';
import { stages } from '../experience/stages';

gsap.registerPlugin(ScrollTrigger);
export const JOURNEY_DURATION = 7.98;

export function useJourneyTimeline(root: RefObject<HTMLElement | null>, reduced: boolean, onStage: (stage: number) => void) {
  const callback = useRef(onStage);
  useEffect(() => { callback.current = onStage; }, [onStage]);
  useEffect(() => {
    if (!root.current) return;
    let previousStage = -1;
    const element = root.current;
    let timeline: gsap.core.Timeline;
    const syncToScroll = () => {
      const start = element.getBoundingClientRect().top + window.scrollY;
      const distance = element.offsetHeight - window.innerHeight;
      timeline.progress(Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(1, distance))), false);
    };
    journeyRuntime.reducedMotion = reduced;
    const context = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>('.story-panel');
      gsap.set(panels, { autoAlpha: 0, y: reduced ? 0 : 26 });
      gsap.set(panels[0], { autoAlpha: 1, y: 0 });
      timeline = gsap.timeline({
        scrollTrigger: {
          trigger: element, start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.7,
        },
        onUpdate: () => {
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
      timeline.scrollTrigger?.refresh();
      // Rebuilding for calm mode preserves the currently scrolled chapter.
      syncToScroll();
    }, element);
    const refresh = () => { ScrollTrigger.refresh(); syncToScroll(); };
    let disposed = false;
    const initialFrame = requestAnimationFrame(refresh);
    document.fonts.ready.then(() => { if (!disposed) refresh(); });
    return () => { disposed = true; cancelAnimationFrame(initialFrame); context.revert(); };
  }, [root, reduced]);
}
