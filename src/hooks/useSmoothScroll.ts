import { useCallback, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useSmoothScroll(enabled: boolean, reduce = false) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;

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

    const updateScrollTriggers = () => ScrollTrigger.update();
    const frame = (time: number) => lenis.raf(time * 1000);

    lenis.on('scroll', updateScrollTriggers);
    gsap.ticker.add(frame);

    const refresh = () => ScrollTrigger.refresh();
    document.fonts.ready.then(refresh).catch(() => undefined);
    window.addEventListener('load', refresh, { once: true });

    return () => {
      window.removeEventListener('load', refresh);
      gsap.ticker.remove(frame);
      lenis.off('scroll', updateScrollTriggers);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled, reduce]);

  return useCallback((target: string | number) => {
    const reducedMotion = reduce || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, {
        duration: reducedMotion ? 0 : 1.45,
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
}
