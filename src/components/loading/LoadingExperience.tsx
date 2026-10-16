import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { journeyRuntime, type EntryExperienceState } from '../../experience/runtime';
import { entry, sectionLabels, writeSession } from '../../lib/driveSession';
import './loading.css';

type EntryPhase = 'loading' | EntryExperienceState;

export function LoadingExperience({ ready, reduced, restore, onComplete }: { ready: boolean; reduced: boolean; restore: () => void; onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const introTimeline = useRef<gsap.core.Timeline | null>(null);
  const turnTimeline = useRef<gsap.core.Timeline | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [phase, setPhase] = useState<EntryPhase>('loading');
  const deadline = useRef<number | undefined>(undefined);
  const first = entry.mode === 'first-visit';
  const destinationReady = expired || (ready && fontsReady);

  useEffect(() => {
    document.getElementById('entry-cover')?.remove();
    let live = true;
    document.fonts.ready.then(() => { if (live) setFontsReady(true); });
    deadline.current = window.setTimeout(() => setExpired(true), 10000);
    return () => {
      live = false;
      clearTimeout(deadline.current);
      introTimeline.current?.kill();
      turnTimeline.current?.kill();
    };
  }, []);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.timeline()
        .fromTo('.entry-eyebrow', { opacity: 0, y: reduced ? 0 : 8 }, { opacity: 1, y: 0, duration: reduced ? .12 : .35 })
        .fromTo('.entry-brand', { opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : .97 }, { opacity: 1, y: 0, scale: 1, duration: reduced ? .16 : .62, ease: 'power2.out' }, .16)
        .fromTo('.entry-message', { opacity: 0, y: reduced ? 0 : 8 }, { opacity: 1, y: 0, duration: reduced ? .14 : .48, ease: 'power2.out' }, .54)
        .fromTo('.entry-progress', { opacity: 0 }, { opacity: 1, duration: .3 }, .72);
    }, root);
    return () => context.revert();
  }, [reduced]);

  // The approved Aventador is already mounted in the destination scene. Its opening analysis
  // changes only shared scene state; no second canvas or second model is introduced.
  useEffect(() => {
    if (!first || !destinationReady || introTimeline.current) return;
    clearTimeout(deadline.current);
    journeyRuntime.entryState = 'intro';
    journeyRuntime.entryApproach = reduced ? 1 : 0;
    journeyRuntime.entryTurn = 0;
    journeyRuntime.entryScan = 0;
    journeyRuntime.entryScanStrength = 0;
    journeyRuntime.entryDamageStrength = 0;
    setPhase('intro');
    const app = root.current?.closest<HTMLElement>('.app');
    const worldReveal = { value: 0 };
    app?.style.setProperty('--entry-world-opacity', '0');

    const context = gsap.context(() => {
      const finish = () => {
        app?.style.setProperty('--entry-world-opacity', '1');
        journeyRuntime.entryState = 'waiting';
        journeyRuntime.entryScanStrength = reduced ? .08 : .14;
        setPhase('waiting');
        requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('.entry-cta')?.focus());
      };
      const tl = gsap.timeline({ onUpdate: journeyRuntime.invalidate, onComplete: finish });
      introTimeline.current = tl;
      if (reduced) {
        tl.set(journeyRuntime, { entryApproach: 1, entryScan: .5, entryScanStrength: .25 })
          .set(app ?? [], { '--entry-world-opacity': 1 })
          .to('.entry-analysis', { opacity: 1, duration: .15 })
          .to('.entry-analysis', { opacity: 0, duration: .12 }, '+=.08')
          .to('.entry-claim', { opacity: 1, duration: .15 });
      } else {
        tl.to(worldReveal, { value: 1, duration: 1.25, ease: 'sine.inOut', onUpdate: () => app?.style.setProperty('--entry-world-opacity', String(worldReveal.value)) }, .62)
          .to(journeyRuntime, { entryApproach: 1, duration: 1.85, ease: 'power2.inOut' }, .68)
          .to('.entry-content', { y: -5, duration: 1.35, ease: 'sine.inOut' }, .72)
          .call(() => { journeyRuntime.entryState = 'analysis'; setPhase('analysis'); }, [], 1.95)
          .to(journeyRuntime, { entryScanStrength: 1, duration: .22 }, 2.02)
          .to(journeyRuntime, { entryScan: 1, duration: .88, ease: 'none' }, 2.05)
          .to('.entry-callout', { opacity: 1, duration: .24, stagger: .12 }, 2.16)
          .to('.entry-analysis', { opacity: 1, duration: .25 }, 2.72)
          .to(journeyRuntime, { entryScanStrength: .14, entryDamageStrength: .42, duration: .34 }, 2.88)
          .to('.entry-callout', { opacity: 0, y: -10, duration: .34 }, 3.0)
          .to('.entry-analysis', { opacity: 0, duration: .2 }, 3.2)
          .fromTo('.entry-claim-route', { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: .35 }, 3.12)
          .to('.entry-claim', { opacity: 1, duration: .3 }, 3.3);
      }
      tl.to('.entry-progress-fill', { scaleX: 1, duration: reduced ? .12 : .25 })
        .fromTo('.entry-cta-shell', { autoAlpha: 0, y: reduced ? 0 : 8 }, { autoAlpha: 1, y: 0, duration: reduced ? .16 : .35 });
    }, root);
    return () => {
      context.revert();
      introTimeline.current = null;
    };
  }, [destinationReady, first, reduced]);

  useEffect(() => {
    if (first || !destinationReady) return;
    clearTimeout(deadline.current);
    let cancelled = false;
    let context: gsap.Context | undefined;
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      if (cancelled) return;
      restore();
      context = gsap.context(() => {
        const finish = () => { writeSession('introSeen', '1'); onComplete(); };
        const tl = gsap.timeline({ onComplete: finish });
        tl.to('.entry-progress-fill', { scaleX: 1, duration: reduced ? .1 : .18 });
        if (reduced) tl.to(root.current, { opacity: 0, duration: .18 });
        else tl.to('.entry-completion-beam', { scaleX: 1, opacity: 1, duration: .2 })
          .to('.entry-content, .entry-footer, .signal-road', { opacity: 0, duration: .15 })
          .to('.entry-shutter--top', { yPercent: -102, duration: .45, ease: 'power3.inOut' }, '<')
          .to('.entry-shutter--bottom', { yPercent: 102, duration: .45, ease: 'power3.inOut' }, '<')
          .to('.entry-completion-beam', { opacity: 0, duration: .2 }, '<');
      }, root);
    }); });
    return () => { cancelled = true; cancelAnimationFrame(frame); context?.revert(); };
  }, [destinationReady, first, reduced, restore, onComplete]);

  useEffect(() => {
    const value = expired ? 1 : (fontsReady ? .3 : .06) + (ready ? .7 : 0);
    const tween = gsap.to(root.current?.querySelector('.entry-progress-fill') ?? [], { scaleX: value, duration: .45, ease: 'power1.out' });
    return () => { tween.kill(); };
  }, [expired, fontsReady, ready]);

  const startTurn = useCallback(() => {
    if (!first || phase !== 'waiting' || turnTimeline.current || !root.current) return;
    const app = root.current.closest<HTMLElement>('.app');
    const heroUi = { navigation: 0, content: 0 };
    setPhase('turning');
    journeyRuntime.entryState = 'turning';
    restore();
    app?.style.setProperty('--entry-nav-ui', '0');
    app?.style.setProperty('--entry-content-ui', '0');

    const finish = () => {
      journeyRuntime.entryTurn = 1;
      journeyRuntime.entryScanStrength = 0;
      journeyRuntime.entryDamageStrength = 0;
      journeyRuntime.entryState = 'hero';
      journeyRuntime.invalidate();
      setPhase('hero');
      writeSession('introSeen', '1');
      onComplete();
      requestAnimationFrame(() => {
        app?.style.removeProperty('--entry-nav-ui');
        app?.style.removeProperty('--entry-content-ui');
        app?.style.removeProperty('--entry-world-opacity');
      });
    };
    const context = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish });
      turnTimeline.current = tl;
      if (reduced) {
        tl.set(journeyRuntime, { entryTurn: 1, entryScanStrength: 0, entryDamageStrength: 0 })
          .set(heroUi, { navigation: 1, content: 1 })
          .set(app ?? [], { '--entry-nav-ui': 1, '--entry-content-ui': 1 })
          .to('.entry-cta-shell, .entry-content, .entry-footer', { opacity: 0, duration: .12 })
          .to('.entry-world-veil', { opacity: 0, duration: .18 });
        return;
      }
      tl.to('.entry-cta-arrow', { x: 7, duration: .22, ease: 'power2.out' }, 0)
        .to('.entry-cta', { scale: .985, boxShadow: '0 0 0 1px rgba(170,225,248,.45), 0 0 22px rgba(99,187,220,.08)', duration: .24 }, 0)
        .to('.entry-cta-shell', { autoAlpha: 0, y: 5, duration: .35 }, .18)
        .to('.entry-message', { opacity: 0, y: -5, duration: .65 }, .72)
        .to('.entry-eyebrow', { opacity: 0, duration: .58 }, 1.08)
        .to('.entry-brand', { opacity: 0, scale: .985, duration: .85, ease: 'sine.inOut' }, 1.45)
        .to('.entry-footer', { opacity: 0, duration: .65 }, .92)
        .to('.entry-world-veil', { opacity: 0, duration: 3.55, ease: 'power1.inOut' }, .55)
        .to(journeyRuntime, { entryTurn: 1, entryScanStrength: 0, entryDamageStrength: 0, duration: 4.4, ease: 'power2.inOut', onUpdate: journeyRuntime.invalidate }, .12)
        .to(heroUi, { navigation: 1, duration: .92, ease: 'power1.out', onUpdate: () => app?.style.setProperty('--entry-nav-ui', String(heroUi.navigation)) }, 3.18)
        .to(heroUi, { content: 1, duration: .72, ease: 'power1.out', onUpdate: () => app?.style.setProperty('--entry-content-ui', String(heroUi.content)) }, 3.7);
    }, root);
    // The timeline owns the rest of this entry; it is killed only if the component is torn down.
    void context;
  }, [first, onComplete, phase, reduced, restore]);

  return <div ref={root} className={`preloader entry-loader ${first ? 'entry-loader--first' : 'entry-loader--refresh'} ${reduced ? 'entry-loader--reduced' : ''}`} data-entry-mode={entry.mode} data-entry-phase={phase} data-expired={expired} data-destination-ready={ready} aria-label={first ? 'Selamat datang di DRIVE' : 'Memulihkan pengalaman DRIVE'} role="status" aria-live="polite" aria-busy={phase !== 'waiting'} data-lenis-prevent>
    {first ? <><div className="entry-world-veil" aria-hidden="true" /><div className="entry-callouts" aria-hidden="true"><span className="entry-callout entry-callout--lamp">HEADLAMP<i /></span><span className="entry-callout entry-callout--bumper"><i />BUMPER<span className="entry-damage" /></span></div></> : <><div className="entry-shutter entry-shutter--top" /><div className="entry-shutter entry-shutter--bottom" /><SignalRoad /><div className="entry-completion-beam" /></>}
    <div className="entry-content">
      <p className="entry-eyebrow mono">{first ? 'WELCOME TO DRIVE' : 'DRIVE SIGNAL RESTORE'}</p>
      <img className="entry-brand" src="/assets/brand/drive-logo.svg" width="904" height="181" alt="DRIVE" />
      <p className="entry-message">{first ? <>Pahami kerusakan.<br />Permudah klaim.</> : 'Memulihkan pengalaman'}</p>
      {!first && <p className="entry-restore-label mono">{sectionLabels[entry.section]}</p>}
    </div>
    <div className="entry-footer">
      {first && <div className="entry-result" aria-hidden="true"><span className="entry-analysis mono">ANALISIS SELESAI</span><span className="entry-claim"><i className="entry-claim-route" /><ShieldCheck size={21} /><span className="mono">SIAP UNTUK KLAIM</span></span></div>}
      <div className="entry-progress" aria-hidden="true"><i className="entry-progress-fill" /></div>
      <p className="entry-status mono">{first ? (phase === 'waiting' ? 'SIAP MENJELAJAH' : phase === 'turning' ? 'MEMASUKI DRIVE' : 'MENYIAPKAN DRIVE') : 'MENYAMBUNGKAN KEMBALI'}</p>
      {first && <div className="entry-cta-shell"><button className="entry-cta" type="button" onClick={startTurn} disabled={phase !== 'waiting'}><span>Mulai jelajahi</span><ArrowRight className="entry-cta-arrow" size={16} /></button></div>}
    </div>
  </div>;
}

function SignalRoad() {
  return <svg className="signal-road" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="signal-fade" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a1deff" stopOpacity=".7" /><stop offset="1" stopColor="#4d9fc8" stopOpacity="0" /></linearGradient></defs>
    <g fill="none" stroke="url(#signal-fade)" strokeWidth=".75"><path d="M 485 270 L 140 600 M 515 270 L 860 600 M 497 280 L 390 600 M 503 280 L 610 600" /><path opacity=".3" d="M 417 335 H 583 M 355 395 H 645 M 275 472 H 725 M 175 568 H 825" /></g>
    <path className="signal-road-pulse" d="M 140 600 L 485 270 M 515 270 L 860 600" fill="none" stroke="#bceeff" strokeWidth="1.6" />
    <circle className="signal-origin" cx="500" cy="266" r="2" fill="#d3f5ff" />
  </svg>;
}
