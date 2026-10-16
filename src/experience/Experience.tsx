import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { WebGLRenderTarget, type Material, type Texture } from 'three';
import { CameraRig } from './CameraRig';
import { HudProjector } from './HudProjector';
import { INCIDENT_HUD_ANCHORS } from './world/incidentHud';
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
    sentReady.current = false;
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
  const [visible, setVisible] = useState(() => !document.hidden);
  const [atPageEnd, setAtPageEnd] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const quality = mobile || reduced ? 'low' : tier;
  const lowQuality = quality === 'low';

  useEffect(() => {
    // The world is the backdrop of the whole page. It stops only when the tab is hidden, or at
    // the very end of the page, where it holds its last frame.
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    journeyRuntime.pageEndListener = setAtPageEnd;
    return () => { document.removeEventListener('visibilitychange', visibility); journeyRuntime.pageEndListener = () => {}; };
  }, []);

  useEffect(() => {
    // The pointer nudges the camera only while the story itself is on screen.
    const viewport = document.querySelector('.journey-viewport');
    if (!viewport) return;
    const move = (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.pointerType === 'touch' || reduced) return;
      journeyRuntime.lastInput = performance.now();
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
  const decline = useCallback(() => setTier(previous => previous === 'high' ? 'medium' : 'low'), []);
  const running = visible && !atPageEnd;
  // Multisampling lives in the post-processing chain on desktop; the canvas only needs its own
  // when it starts without one (phones, calm mode).
  const [canvasAntialias] = useState(lowQuality);
  return (
    <div ref={wrapper} className={`experience ${failed ? 'experience--fallback' : ''}`} aria-hidden="true" data-quality={quality} data-render-mode={running ? (reduced ? 'demand' : 'always') : 'never'}>
      <div className="scene-fallback">
        <div className="fallback-orbit" /><div className="fallback-orbit fallback-orbit--two" />
        <img src="/assets/brand/drive-mark.svg" alt="" />
      </div>
      {!failed && <SceneBoundary onFailure={handleFailure}>
        <Canvas
          camera={{ position: [5, 8.5, 27], fov: 57, near: 0.2, far: 4000 }}
          dpr={lowQuality ? 1 : quality === 'medium' ? [1, 1.15] : [1, 1.25]}
          onCreated={({gl}) => { gl.info.autoReset = false; }}
          frameloop={running ? 'demand' : 'never'}
          gl={{ antialias: canvasAntialias, alpha: false, powerPreference: 'high-performance' }}
          fallback={<CanvasFallback />}
        >
          {running && !reduced && <FrameGovernor />}
          {!reduced && <QualityMonitor onDecline={decline} />}
          <CameraRig reduced={reduced} />
          <HudProjector anchors={INCIDENT_HUD_ANCHORS} />
          <Suspense fallback={null}>
            <Environment low={lowQuality} quality={quality} />
            <RenderLifecycle onReady={onReady} onFailure={handleFailure} />
            <ShaderWarmup composer={!lowQuality} />

          </Suspense>
          {!lowQuality && <Suspense fallback={null}><Effects quality={quality === 'high' ? 'high' : 'medium'} /></Suspense>}
        </Canvas>
      </SceneBoundary>}
    </div>
  );
}

/**
 * Compiles every shader and uploads every texture in the scene just after it is first ready,
 * behind the preloader, so the first visit to a chapter (or a fling through several) does not
 * stall on a compile. It waits a few frames for the reflection environment, which changes the
 * shaders. Shaders also depend on where they draw: the post-processing buffer (a render target)
 * or, without it, the screen.
 */
function ShaderWarmup({ composer }: { composer: boolean }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const target = composer ? new WebGLRenderTarget(1, 1) : null;
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      gl.compileAsync(scene, camera).catch(() => undefined);
      gl.setRenderTarget(previous);
      target?.dispose();
      const textures = new Set<Texture>();
      const collect = (value: unknown) => { if ((value as Texture | null)?.isTexture) textures.add(value as Texture); };
      scene.traverse(object => {
        const material = (object as { material?: Material | Material[] }).material;
        for (const entry of Array.isArray(material) ? material : material ? [material] : []) {
          Object.values(entry).forEach(collect);
          const uniforms = (entry as { uniforms?: Record<string, { value: unknown }> }).uniforms;
          if (uniforms) Object.values(uniforms).forEach(uniform => collect(uniform?.value));
        }
      });
      textures.forEach(texture => gl.initTexture(texture));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [gl, scene, camera, composer]);
  return null;
}

/**
 * Continuous rendering, relaxed when nothing is happening: every display frame while the page
 * scrolls or the pointer moves, 30 fps otherwise (rain, lights and water still move, at less
 * cost to the battery). Calm mode renders only on demand and does not use this.
 */
function FrameGovernor() {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const busy = now - journeyRuntime.lastInput < 700;
      if (busy || now - last >= 1000 / 30 - 2) {
        last = now;
        invalidate();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [invalidate]);
  return null;
}

/**
 * Steps the quality tier down when the scene cannot hold 32 fps while it is actually moving.
 * Idle frames are rendered at 30 fps on purpose, so only busy frames are measured.
 */
function QualityMonitor({ onDecline }: { onDecline: () => void }) {
  const sample = useRef({ time: 0, frames: 0, slow: 0 });
  useFrame((_, delta) => {
    if (performance.now() - journeyRuntime.lastInput > 700 || delta > 0.25) return;
    const current = sample.current;
    current.time += delta;
    current.frames++;
    if (current.time < 1.5) return;
    const fps = current.frames / current.time;
    current.time = 0;
    current.frames = 0;
    current.slow = fps < 32 ? current.slow + 1 : 0;
    if (current.slow >= 2) {
      current.slow = 0;
      onDecline();
    }
  });
  return null;
}

function CanvasFallback() {
  return <div className="webgl-fallback-message">Tampilan 3D tidak bisa dimuat di perangkat ini. Ceritanya tetap bisa Anda baca.</div>;
}
