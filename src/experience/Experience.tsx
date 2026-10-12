import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { CameraRig } from './CameraRig';
import { Environment } from './Environment';
import { journeyRuntime } from './runtime';
import { useMediaQuery } from '../hooks/useMediaQuery';


const Effects = lazy(() => import('./Effects'));

function RenderLifecycle({ onReady, onFailure }: { onReady: () => void; onFailure: () => void }) {
  const { gl, invalidate } = useThree();
  const readyFrame = useRef(0);
  const sentReady = useRef(false);
  useFrame(() => { if (!sentReady.current) { sentReady.current = true; readyFrame.current = requestAnimationFrame(onReady); } });
  useEffect(() => {
    journeyRuntime.invalidate = invalidate;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    invalidate();
    return () => {
      cancelAnimationFrame(readyFrame.current);
      journeyRuntime.invalidate = () => {};
      gl.domElement.removeEventListener('webglcontextlost', lost);
    };
  }, [gl, invalidate, onFailure, onReady]);
  return null;
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function Experience({ reduced, onReady }: { activeStage: number; reduced: boolean; onReady: () => void }) {
  const mobile = useMediaQuery('(max-width: 760px)');
  const [tier, setTier] = useState<'high' | 'medium' | 'low'>(() => navigator.hardwareConcurrency <= 4 ? 'medium' : 'high');
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const quality = mobile || reduced ? 'low' : tier;
  const lowQuality = quality === 'low';

  useEffect(() => {
    let intersecting = true;
    const visibility = () => setVisible(intersecting && !document.hidden);
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(([entry]) => {
      journeyRuntime.active = entry.isIntersecting;
      intersecting = entry.isIntersecting;
      setVisible(entry.isIntersecting && !document.hidden);
    }, { threshold: 0 });
    const element = document.querySelector('#journey');
    if (element) observer.observe(element);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    const viewport = wrapper.current?.closest('.journey-viewport');
    if (!viewport) return;
    const move = (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.pointerType === 'touch' || reduced) return;
      const rect = viewport.getBoundingClientRect();
      journeyRuntime.inputX = (pointer.clientX - rect.left) / rect.width * 2 - 1;
      journeyRuntime.inputY = 1 - (pointer.clientY - rect.top) / rect.height * 2;
    };
    const leave = () => { journeyRuntime.inputX = 0; journeyRuntime.inputY = 0; };
    viewport.addEventListener('pointermove', move, { passive: true });
    viewport.addEventListener('pointerleave', leave);
    return () => { viewport.removeEventListener('pointermove', move); viewport.removeEventListener('pointerleave', leave); leave(); };
  }, [reduced]);

  useEffect(() => { journeyRuntime.quality = quality; }, [quality]);

  const handleFailure = useCallback(() => { setFailed(true); onReady(); }, [onReady]);
  return (
    <div ref={wrapper} className={`experience ${failed ? 'experience--fallback' : ''}`} aria-hidden="true" data-quality={quality} data-render-mode={visible ? (reduced ? 'demand' : 'always') : 'never'}>
      <div className="scene-fallback">
        <div className="fallback-orbit" /><div className="fallback-orbit fallback-orbit--two" />
        <img src="/assets/brand/drive-mark.svg" alt="" />
      </div>
      {!failed && <SceneBoundary onFailure={handleFailure}>
        <Canvas
          camera={{ position: [5, 8.5, 27], fov: 57, near: 0.2, far: 4000 }}
          dpr={lowQuality ? 1 : quality === 'medium' ? [1, 1.25] : [1, 1.5]}
          onCreated={({gl}) => { gl.info.autoReset = false; }}
          frameloop={visible ? (reduced ? 'demand' : 'always') : 'never'}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          fallback={<CanvasFallback onReady={onReady} />}
        >
          {!reduced && <PerformanceMonitor ms={500} iterations={10} bounds={() => [32, 55]} onDecline={() => setTier(previous => previous === 'high' ? 'medium' : 'low')} flipflops={3} onFallback={() => setTier('low')} />}
          <CameraRig reduced={reduced} />
          <Suspense fallback={null}>
            <Environment low={lowQuality} quality={quality} />
            <RenderLifecycle onReady={onReady} onFailure={handleFailure} />

          </Suspense>
          {!lowQuality && <Suspense fallback={null}><Effects /></Suspense>}
        </Canvas>
      </SceneBoundary>}
    </div>
  );
}

function CanvasFallback({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return <div className="webgl-fallback-message">Explore the DRIVE journey</div>;
}
