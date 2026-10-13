import gsap from 'gsap';
import { INCIDENT_TIMING } from '../experience/story';

/**
 * Adds Scene 01's heads-up layer to the scrubbed journey timeline. Timeline time is story
 * position (chapter 1 = 0–1), so these beats line up with the car, lights and camera.
 */
export function addIncidentHud(timeline: gsap.core.Timeline, root: HTMLElement, reduced: boolean) {
  const select = gsap.utils.selector(root);
  const route = select('.hud-route');
  const alert = select('.hud-alert');
  const radar = select('.hud-radar');
  const ahead = select('.hud-alert__state--ahead');
  const occurred = select('.hud-alert__state--impact');
  const flash = select('.incident-flash');
  const meters = select('.hud-meter i');
  const hazardMeter = select('.hud-meter--hazard i');
  const span = (value: number) => (reduced ? 0.001 : value);

  gsap.set([route, alert, radar, occurred, flash], { autoAlpha: 0 });
  gsap.set(meters, { scaleX: 0 });

  const { rockfall, impact } = INCIDENT_TIMING;
  timeline
    .to(route, { autoAlpha: 1, duration: span(0.08) }, 0.03)
    .to(meters, { scaleX: (_: number, element: HTMLElement) => Number(element.dataset.level), duration: span(0.12), stagger: span(0.02) }, 0.05)
    // Nothing is wrong until the rock falls; then the zone reading jumps and the alert comes up.
    .to(hazardMeter, { scaleX: 1, duration: span(0.04), ease: 'power2.out' }, rockfall)
    .to(alert, { autoAlpha: 1, duration: span(0.03) }, rockfall)
    .to(radar, { autoAlpha: 1, duration: span(0.04) }, rockfall)
    .to(ahead, { autoAlpha: 0, duration: span(0.03) }, impact)
    .to(occurred, { autoAlpha: 1, duration: span(0.04) }, impact + 0.01)
    .to(route, { autoAlpha: 0, duration: span(0.06) }, impact + 0.04)
    .to([alert, radar], { autoAlpha: 0, duration: span(0.06) }, 0.96);

  // The knock: a red edge-glow that blooms and fades. Calm mode leaves it out.
  if (!reduced) {
    timeline.to(flash, { keyframes: [{ autoAlpha: 1, duration: 0.015, ease: 'power2.out' }, { autoAlpha: 0, duration: 0.09, ease: 'power1.in' }] }, INCIDENT_TIMING.impact);
  }
}
