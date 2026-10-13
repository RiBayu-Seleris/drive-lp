import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

interface PreloaderProps {
  ready: boolean;
  onComplete: () => void;
}

const SCENE_SYSTEMS = ['Kendaraan', 'Cek asuransi', 'Penilaian kerusakan', 'Alur klaim', 'Bengkel & towing'];

/** All rows reflect rendered local scene readiness, not a live backend connection. */
export function Preloader({ ready, onComplete }: PreloaderProps) {
  const reducedMotion = useReducedMotion();
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setCanContinue(true), 12000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timeout = window.setTimeout(onComplete, reducedMotion ? 50 : 650);
    return () => window.clearTimeout(timeout);
  }, [ready, onComplete, reducedMotion]);

  return (
    <motion.div className="preloader" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.8 } }} aria-label="Memuat halaman DRIVE">
      <div className="preloader__horizon" aria-hidden="true" />
      <motion.div className="preloader__content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.55 }}>
        <img src="/assets/brand/drive-mark.svg" className="preloader__mark" alt="" width="44" height="44" />
        <p className="preloader__label mono">DRIVE</p>
        <h2>{ready ? 'Semua siap.' : 'Menyiapkan tampilan 3D…'}</h2>
        <div className="preloader__systems mono" role="status" aria-live="polite">
          {SCENE_SYSTEMS.map(system => <div key={system}><span>{system}</span><span className={ready ? 'preloader__online' : ''}>{ready ? <><Check size={12} /> SIAP</> : 'MEMUAT'}</span></div>)}
        </div>
        <div className={`preloader__track ${ready ? 'is-ready' : ''}`} aria-hidden="true"><i /></div>
        {canContinue && !ready && <div className="preloader__recovery"><p>Tampilan 3D masih dimuat. Anda bisa mulai membaca dulu.</p><button className="text-link" onClick={onComplete}>Baca tanpa menunggu <ArrowRight size={14} /></button></div>}
      </motion.div>
      <span className="preloader__foot mono">DARI INSIDEN SAMPAI KEMBALI DI JALAN</span>
    </motion.div>
  );
}
