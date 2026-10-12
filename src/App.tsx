import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, SlidersHorizontal, X } from 'lucide-react';
import AOS from 'aos';
import { Preloader } from './components/Preloader';
import { ScrollProgress } from './components/ScrollProgress';
import { ProductContent } from './components/ProductContent';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { useMediaQuery } from './hooks/useMediaQuery';
import { JOURNEY_DURATION, useJourneyTimeline } from './hooks/useJourneyTimeline';
import { stages } from './experience/stages';
import { DRIVE_LINKS } from './lib/links';

const Experience = lazy(() => import('./experience/Experience'));
const navigation = [{ label: 'Cara kerja', target: 1 }, { label: 'Pilihan layanan', target: '#services' }, { label: 'Untuk mitra', target: '#roles' }, { label: 'Tanya jawab', target: '#perspective' }];

export function App() {
  const [booted, setBooted] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reduceOverride, setReduceOverride] = useState(false);
  const reducedSystem = useMediaQuery('(prefers-reduced-motion: reduce)');
  const reduced = reducedSystem || reduceOverride;
  const journeyRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const scrollTo = useSmoothScroll(booted, reduced);
  useJourneyTimeline(journeyRef, reduced, setActiveStage);
  const completeBoot = useCallback(() => setBooted(true), []);
  const completeScene = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    AOS.init({ duration: 650, once: true, offset: 35, easing: 'ease-out-cubic', disable: reduced });
    AOS.refresh();
  }, [reduced]);

  useEffect(() => {
    document.documentElement.classList.toggle('is-booting', !booted);
    return () => document.documentElement.classList.remove('is-booting');
  }, [booted]);

  useEffect(() => {
    if (!menuOpen) return;
    const menuButton = menuButtonRef.current;
    mobileMenuRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButtonRef.current?.focus(); }
      if (event.key !== 'Tab') return;
      const buttons = mobileMenuRef.current?.querySelectorAll<HTMLElement>('button, a');
      if (!buttons?.length) return;
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      requestAnimationFrame(() => menuButton?.focus());
    };
  }, [menuOpen]);

  const goStage = (stage: number) => {
    setMenuOpen(false);
    const element = journeyRef.current;
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY;
    const length = element.offsetHeight - window.innerHeight;
    scrollTo(top + ((stage + (stage === 0 ? 0 : 0.08)) / JOURNEY_DURATION) * length);
  };

  const goTo = (target: string | number) => {
    setMenuOpen(false);
    if (typeof target === 'number') goStage(target);
    else scrollTo(target);
  };

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <div className={`app ${reduced ? 'reduced-motion' : ''}`}>
        <AnimatePresence>{!booted && <Preloader ready={sceneReady} onComplete={completeBoot} />}</AnimatePresence>
        <ScrollProgress />
        <header className="site-header" inert={menuOpen || !booted}>
          <a className="brand" href="#journey" aria-label="DRIVE — kembali ke awal" onClick={(event) => { event.preventDefault(); goStage(0); }}>
            <img className="brand-logo" src="/assets/brand/drive-logo.svg" width="150" height="30" alt="DRIVE" />
          </a>
          <nav className="desktop-nav" aria-label="Navigasi utama">
            {navigation.map((item) => <button key={item.label} onClick={() => goTo(item.target)}>{item.label}</button>)}
          </nav>
          {DRIVE_LINKS.scan ? <motion.a className="button button--outline desktop-explore" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} href={DRIVE_LINKS.scan}>Mulai pemeriksaan <ArrowUpRight size={14} /></motion.a> : <motion.button className="button button--outline desktop-explore" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => goStage(1)}>Lihat cara kerja <ArrowUpRight size={14} /></motion.button>}
          <button className="menu-toggle" ref={menuButtonRef} aria-label="Buka navigasi" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
        </header>

        <AnimatePresence>{menuOpen && <motion.div id="mobile-menu" className="mobile-menu" ref={mobileMenuRef} role="dialog" aria-modal="true" aria-label="Navigasi DRIVE" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="menu-close" aria-label="Tutup navigasi" onClick={() => { setMenuOpen(false); menuButtonRef.current?.focus(); }}><X /></button>
          <div className="mobile-menu-content">
          <span className="eyebrow">KENALI DRIVE</span>
          {stages.map((stage, index) => <button key={stage.id} onClick={() => { goStage(index); menuButtonRef.current?.focus(); }}><span className="mono">0{index + 1}</span>{stage.short}<ArrowUpRight size={19} /></button>)}
          <div className="mobile-product-links"><button onClick={() => goTo('#services')}>Pilihan layanan</button><button onClick={() => goTo('#roles')}>Untuk mitra</button><button onClick={() => goTo('#perspective')}>Tanya jawab</button>{DRIVE_LINKS.scan && <a href={DRIVE_LINKS.scan}>Mulai pemeriksaan <ArrowUpRight size={14} /></a>}</div>
          </div>
        </motion.div>}</AnimatePresence>

        <main id="main-content" tabIndex={-1} inert={menuOpen || !booted}>
          <section id="journey" className="journey" ref={journeyRef} aria-label="Dari insiden hingga kembali ke jalan bersama DRIVE" data-stage={activeStage}>
            <div className="journey-viewport">
              <Suspense fallback={<div className="canvas-loading" />}><Experience activeStage={activeStage} reduced={reduced} onReady={completeScene} /></Suspense>
              <div className="scene-scrim" aria-hidden="true" />
              <div className="scene-grain" aria-hidden="true" />
              <div className="story-panels">
                {stages.map((stage, index) => <article className={`story-panel ${index === 0 ? 'story-panel--hero' : ''}`} key={stage.id} aria-labelledby={`stage-title-${index}`} style={{ '--stage-accent': stage.color } as CSSProperties}>
                  <p className="eyebrow story-eyebrow"><span className="eyebrow-line" />{stage.code}</p>
                  {index === 0 ? <h1 id={`stage-title-${index}`} className="story-title">{stage.headline.map((line, part) => <span key={line} className={part === stage.accent ? 'accent-line' : ''}>{line}</span>)}</h1> : <h2 id={`stage-title-${index}`} className="story-title">{stage.headline.map((line, part) => <span key={line} className={part === stage.accent ? 'accent-line' : ''}>{line}</span>)}</h2>}
                  <p className="story-description">{stage.description}</p>
                  {index === 0 && <motion.button className="enter-journey" whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }} onClick={() => goStage(1)}><span>Lihat cara kerjanya</span><ArrowRight size={15} /></motion.button>}
                  {stage.detail && <p className="stage-note">{stage.detail}</p>}
                  {index === 4 && <button className="enter-journey" onClick={() => scrollTo('#services')}>Kenali pilihan layanan <ArrowDown size={15} /></button>}
                  {index === 7 && <button className="enter-journey" onClick={() => scrollTo('#perspective')}>Mulai bersama DRIVE <ArrowDown size={15} /></button>}
                </article>)}
              </div>
              <div className="journey-bottom">
                <button className="scroll-invitation" onClick={() => activeStage < stages.length - 1 ? goStage(activeStage + 1) : scrollTo('#services')}><span className="scroll-icon"><ArrowDown size={14} /></span><span className="mono">GULIR UNTUK MENJELAJAH</span></button>
                <div className="chapter-controller">
                  <span className="chapter-current mono" aria-live="polite">{stages[activeStage].short}</span>
                  <nav className="chapter-nav" aria-label="Tahap perjalanan">{stages.map((stage, index) => <button key={stage.id} aria-label={`Tahap ${index + 1}: ${stage.short}`} aria-current={index === activeStage ? 'step' : undefined} onClick={() => goStage(index)}><span className="chapter-tooltip">{stage.short}</span><span className="chapter-number mono">0{index + 1}</span><span className="chapter-marker" /></button>)}</nav>
                </div>
                <button className={`motion-control ${reduced ? 'is-reduced' : ''}`} aria-pressed={reduced} aria-label={reduced ? 'Gerakan minimal aktif' : 'Aktifkan gerakan minimal'} onClick={() => setReduceOverride(!reduceOverride)} disabled={reducedSystem}><SlidersHorizontal size={14} /><span className="mono">{reduced ? 'GERAKAN MINIMAL' : 'ANIMASI AKTIF'}</span></button>
              </div>
              {!sceneReady && booted && <p className="scene-loading-label mono" role="status">Menyiapkan ruang 3D…</p>}
            </div>
          </section>

          <ProductContent reduced={reduced} onExplore={() => goStage(1)} />
        </main>
        <footer className="site-footer section-shell" inert={menuOpen || !booted}><span className="mono">© {new Date().getFullYear()} DRIVE</span><span>Pemeriksaan, perlindungan, dan layanan kendaraan.</span><button onClick={() => goStage(0)}>Kembali ke awal <ArrowUpRight size={13} /></button></footer>
      </div>
    </MotionConfig>
  );
}
