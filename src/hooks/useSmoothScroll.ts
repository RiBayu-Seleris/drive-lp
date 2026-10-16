import { useCallback, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';

const easeInOutSine = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

export function useSmoothScroll(enabled: boolean, reduce = false) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reducedMotion = reduce || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: !reducedMotion,
      lerp: reducedMotion ? 1 : 0.085,
      wheelMultiplier: 0.9,
      touchMultiplier: 0.9,
      syncTouch: false,
    });
    lenisRef.current = lenis;
    lenis.stop();

    // Lenis runs on GSAP's ticker; the journey timeline reads the scroll on the same ticker.
    const frame = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(frame);

    return () => {
      gsap.ticker.remove(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduce]);

  useEffect(() => {
    if (enabled) lenisRef.current?.start();
    else lenisRef.current?.stop();
  }, [enabled, reduce]);

  const restoreScroll = useCallback((top: number) => {
    lenisRef.current?.resize();
    if (lenisRef.current) lenisRef.current.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top, behavior: 'instant' });
  }, []);

  const scrollTo = useCallback((target: string | number) => {
    const reducedMotion = reduce || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lenisRef.current) {
      const destination = typeof target === 'number' ? target : (document.querySelector(target)?.getBoundingClientRect().top ?? 0) + window.scrollY;
      const screens = Math.abs(destination - window.scrollY) / window.innerHeight;
      lenisRef.current.scrollTo(target, {
        // Longer trips take a little longer, and every trip starts and ends gently: the story
        // behind the page plays through on the way, so the scroll must not lurch.
        duration: reducedMotion ? 0 : Math.min(2, Math.max(1.1, 0.95 + 0.12 * screens)),
        easing: easeInOutSine,
        immediate: reducedMotion,
        // Lenis reads the root scroll-padding; avoid applying the header offset twice.
        force: true,
      });
      return;
    }

    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }

    document.querySelector(target)?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [reduce]);
  return { scrollTo, restoreScroll };
}
