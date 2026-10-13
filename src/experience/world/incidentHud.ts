import { MathUtils } from 'three';
import type { HudAnchor } from '../HudProjector';
import { sampleVehicleRoadProgress, sampleVehicleRouteAt } from '../journeyPath';
import { journeyRuntime } from '../runtime';
import { INCIDENT_TIMING } from '../story';
import { METRES_PER_UNIT, ROAD_LENGTH, ROCKFALL_NEAR_T, warningLabelAnchor, warningLabelAnchorLeft } from './incidentSite';

/** Scene 01's label beside the warning: the rock that just fell and how far, then the knock. */
export const INCIDENT_HUD_ANCHORS: HudAnchor[] = [{
  key: 'incident-hazard',
  world: warningLabelAnchor,
  flipWorld: warningLabelAnchorLeft,
  visibility: at => MathUtils.smoothstep(at, INCIDENT_TIMING.rockfall, INCIDENT_TIMING.rockfall + 0.03) * (1 - MathUtils.smoothstep(at, 0.95, 1.05)),
  update: (element, at) => {
    const state = at >= INCIDENT_TIMING.impact ? 'impact' : 'ahead';
    if (element.dataset.state !== state) element.dataset.state = state;
    // Measured from the car as drawn (calm mode moves it chapter by chapter) to the rockfall in
    // the bend. The car pulls over and stops short of it, so the readout settles around 14 m.
    // It only shows once the rock has fallen.
    const carT = sampleVehicleRoadProgress(sampleVehicleRouteAt(at, journeyRuntime.reducedMotion));
    const metres = Math.max(0, Math.round((ROCKFALL_NEAR_T - carT) * ROAD_LENGTH * METRES_PER_UNIT));
    const field = element.querySelector<HTMLElement>('[data-distance]');
    const text = String(metres);
    if (field && field.textContent !== text) field.textContent = text;
  },
}];
