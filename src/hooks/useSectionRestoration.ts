import { useCallback, useEffect } from 'react';
import { entry, writeSession } from '../lib/driveSession';
import { stages } from '../experience/stages';
import { journeyRuntime } from '../experience/runtime';
import { JOURNEY_DURATION } from './useJourneyTimeline';

export function useSectionRestoration(booted: boolean, activeStage: number, restoreScroll: (top: number) => void) {
  useEffect(() => {
    if (!booted) return;
    let timer = 0;
    let last = '';
    const save = () => {
      const journey = document.getElementById('journey');
      if (!journey) return;
      let section: string = stages[Math.min(stages.length - 1, Math.floor(journeyRuntime.position + .18))].id;
      const below = ['services', 'roles', 'perspective'].filter(id => {
        const element = document.getElementById(id);
        return element && element.getBoundingClientRect().top <= window.innerHeight * .4;
      });
      if (below.length) section = `page:${below[below.length - 1]}`;
      else {
        const progress = Math.min(JOURNEY_DURATION, window.scrollY / Math.max(1, journey.offsetHeight - innerHeight) * JOURNEY_DURATION);
        // Do not record a chapter while the story is still travelling toward it.
        if (Math.abs(progress - journeyRuntime.position) > .08) {
          // Native/instant scroll can stop emitting before the story spring settles.
          // Recheck without writing pixels or attaching another animation loop.
          clearTimeout(timer);
          timer = window.setTimeout(save, 150);
          return;
        }
        const local = journeyRuntime.position % 1;
        if (local > .45 && local < .88) return;
      }
      if (section !== last) { last = section; writeSession('lastSection', section); }
    };
    const schedule = () => { clearTimeout(timer); timer = window.setTimeout(save, 300); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('pagehide', save);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', schedule); window.removeEventListener('pagehide', save); };
  }, [booted, activeStage]);

  return useCallback(() => {
    const journey = document.getElementById('journey');
    let top = 0;
    if (entry.section.startsWith('page:')) {
      const element = document.getElementById(entry.section.slice(5));
      if (element) top = element.getBoundingClientRect().top + window.scrollY - 82;
    } else if (journey) {
      const index = Math.max(0, stages.findIndex(stage => stage.id === entry.section));
      top = journey.getBoundingClientRect().top + window.scrollY +
        (index === 0 ? 0 : (index + .08) / JOURNEY_DURATION) * (journey.offsetHeight - innerHeight);
    }
    restoreScroll(top);
    // The existing GSAP story owns geometry and camera state; snap its spring under the cover.
    window.dispatchEvent(new Event('drive:restore'));
    journeyRuntime.invalidate();
  }, [restoreScroll]);
}
