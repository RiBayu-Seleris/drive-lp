import { Environment as ReflectionEnvironment, Lightformer } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type DirectionalLight, type HemisphereLight } from 'three';
import { journeyRuntime } from './runtime';
import { sampleDawn } from './story';
import { DAWN, FOG_DENSITY, MOON_DIRECTION, NIGHT, SUN_DIRECTION } from './world/atmosphere';
import { Landscape } from './world/Landscape';
import { DigitalHighway } from './world/DigitalHighway';
import { IncidentScene } from './world/IncidentScene';
import { RoadsideStories } from './world/RoadsideStories';
import { Rain } from './world/Rain';
import { accentLight, resetAccentLight } from './world/accentLight';

/** Moonlight through the night; on the way to the workshop the same light becomes first sun. */
function SkyLight() {
  const key = useRef<DirectionalLight>(null);
  const fill = useRef<HemisphereLight>(null);
  useFrame(({ scene }) => {
    const dawn = sampleDawn(journeyRuntime.position);
    if (key.current) {
      key.current.position.copy(MOON_DIRECTION).lerp(SUN_DIRECTION, dawn).normalize().multiplyScalar(400);
      key.current.color.copy(NIGHT.moonlight).lerp(DAWN.sunlight, dawn);
      key.current.intensity = MathUtils.lerp(1.8, 2.6, dawn);
    }
    if (fill.current) fill.current.intensity = MathUtils.lerp(0.9, 1.3, dawn);
    scene.fog?.color.copy(NIGHT.fog).lerp(DAWN.fog, dawn);
  });
  return <>
    <hemisphereLight ref={fill} args={['#2b416b', '#05070b', 0.9]} />
    <directionalLight ref={key} position={MOON_DIRECTION.clone().multiplyScalar(400)} intensity={1.8} />
  </>;
}

/**
 * Reflections for paint and glass. A night street has no softboxes, so the environment is a
 * dark dome with a ring of warm and cool city light on the horizon, two lamp strips, the
 * moon and a low red band behind: the highlights a car picks up on a coast road at night.
 */
function NightReflections() {
  const strips = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const angle = index / 12 * Math.PI * 2;
    return {
      position: [Math.sin(angle) * 12, 0.7 + (index % 3) * 0.35, Math.cos(angle) * 12] as [number, number, number],
      color: index % 2 ? '#ffd2a1' : '#cddcff',
      intensity: 2.2 + (index % 4) * 0.6,
    };
  }), []);
  const moon = useMemo(() => MOON_DIRECTION.clone().multiplyScalar(16).toArray(), []);
  return <ReflectionEnvironment resolution={256} frames={1} environmentIntensity={1}>
    <color attach="background" args={['#03060c']} />
    <Lightformer form="circle" color="#22385f" intensity={0.7} position={[0, 14, 0]} scale={30} />
    {strips.map((strip, index) => <Lightformer key={index} form="rect" color={strip.color} intensity={strip.intensity} position={strip.position} scale={[5.5, 0.16, 1]} />)}
    <Lightformer form="rect" color="#e4ecff" intensity={2.4} position={[-9, 4, -7]} scale={[0.35, 5, 1]} />
    <Lightformer form="rect" color="#e4ecff" intensity={2.4} position={[9, 4, -5]} scale={[0.35, 5, 1]} />
    <Lightformer form="circle" color="#f2f5ff" intensity={14} position={moon} scale={1.1} />
    <Lightformer form="rect" color="#ff2a18" intensity={2.4} position={[0, 0.25, 10]} scale={[11, 0.4, 1]} />
  </ReflectionEnvironment>;
}

/** The shared light of the short-lived effects; dark unless one of them asks for it this frame. */
function AccentLight() {
  useFrame(resetAccentLight, -3);
  return <primitive object={accentLight} />;
}

export function Environment({ low, quality }: { low: boolean; quality: 'high' | 'medium' | 'low' }) {
  return <>
    <color attach="background" args={[NIGHT.horizon]} />
    <fogExp2 attach="fog" args={[NIGHT.fog, FOG_DENSITY]} />
    <SkyLight />
    <AccentLight />
    <NightReflections />
    <Landscape quality={quality} />
    <DigitalHighway low={low} quality={quality} />
    <IncidentScene />
    <RoadsideStories />
    {quality === 'high' && <Rain />}
  </>;
}
