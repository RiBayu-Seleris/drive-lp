import { useEffect, useRef } from 'react';
import { registerHudElement } from '../experience/hudAnchors';

// Conditions only: the road is wet and the zone is rockfall-prone, as its signs say. Nothing
// here predicts the incident; the alert appears when the rock actually falls.
const METERS = [
  { label: 'CUACA', value: 'Hujan', level: 0.72 },
  { label: 'JALAN', value: 'Basah', level: 0.58 },
  { label: 'ZONA', value: 'Rawan longsor', level: 0.3, hazard: true },
  { label: 'LALU LINTAS', value: 'Lancar', level: 0.24 },
];

function WarningGlyph() {
  return <svg className="hud-glyph" viewBox="0 0 24 22" aria-hidden="true">
    <path d="M12 2 22.5 20H1.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 8.2v5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="16.6" r="1.05" fill="currentColor" />
  </svg>;
}

/**
 * Scene 01 heads-up layer: the road conditions on the left, the alert on the right, and a
 * label the canvas pins beside the warning hologram. Decorative only — the story panel
 * carries the readable content — and driven by the journey timeline, not by React state.
 */
export function IncidentHud() {
  const hazardLabel = useRef<HTMLDivElement>(null);
  useEffect(() => (hazardLabel.current ? registerHudElement('incident-hazard', hazardLabel.current) : undefined), []);

  return <div className="incident-hud" aria-hidden="true">
    <div className="hud-panel hud-route">
      <p className="hud-panel__head"><span>RUTE · JALAN PANTAI</span><WarningGlyph /></p>
      <svg className="hud-route__profile" viewBox="0 0 180 40" preserveAspectRatio="none">
        <path className="hud-route__trace" d="M0 30 L18 28 L30 31 L46 24 L60 26 L74 17 L88 21 L100 12 L114 18 L128 15 L140 22" />
        <path className="hud-route__ahead" d="M140 22 L152 19 L164 27 L180 25" />
        <circle className="hud-route__marker" cx="152" cy="19" r="2.6" />
      </svg>
      <dl className="hud-meters">
        {METERS.map(meter => <div key={meter.label} className={`hud-meter ${meter.hazard ? 'hud-meter--hazard' : ''}`}>
          <dt>{meter.label}</dt>
          <dd><i data-level={meter.level} /></dd>
          <span>{meter.value}</span>
        </div>)}
      </dl>
    </div>

    <div className="hud-panel hud-alert">
      <div className="hud-alert__state hud-alert__state--ahead">
        <p className="hud-alert__title"><b />BATU JATUH</p>
        <ul><li>Runtuh dari tebing kanan</li><li>Rem sekarang</li><li>Jalan licin</li></ul>
      </div>
      <div className="hud-alert__state hud-alert__state--impact">
        <p className="hud-alert__title"><b />INSIDEN TERJADI</p>
        <ul><li>21.47 · Jalan pantai</li><li>Mobil menepi, hazard menyala</li><li>Berikutnya: buka DRIVE</li></ul>
      </div>
    </div>

    <svg className="hud-radar" viewBox="0 0 220 440">
      <path d="M210 40 A190 190 0 0 0 210 400" />
      <path d="M210 92 A138 138 0 0 0 210 348" />
      <path d="M210 140 A90 90 0 0 0 210 300" />
      <path className="hud-radar__sweep" d="M210 220 L40 120" />
    </svg>

    <div className="hud-anchor" ref={hazardLabel} data-state="ahead">
      <i className="hud-anchor__leader" />
      <div className="hud-anchor__body">
        <span className="hud-anchor__caption hud-anchor__caption--ahead">BATU JATUH</span>
        <span className="hud-anchor__caption hud-anchor__caption--impact">BENTURAN · SUDUT DEPAN KIRI</span>
        <strong className="hud-anchor__distance"><span data-distance>40</span><small>M</small></strong>
      </div>
    </div>

    <div className="incident-flash" />
  </div>;
}
