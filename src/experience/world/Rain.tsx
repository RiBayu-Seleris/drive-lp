import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, PlaneGeometry, type InstancedMesh, type ShaderMaterial } from 'three';
import { journeyRuntime } from '../runtime';
import { sampleRain } from '../story';
import { seeded } from './roadPath';
import { createRainMaterial } from '../materials/atmospherics';

/** Light rain close to the lens. Drops wrap around the camera, so the field never runs out. */
export function Rain({ count = 1400 }: { count?: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(() => createRainMaterial(), []);
  const geometry = useMemo(() => new PlaneGeometry(1, 1), []);
  useEffect(() => () => { material.dispose(); geometry.dispose(); }, [material, geometry]);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const seed = new Object3D();
    for (let index = 0; index < count; index++) {
      // The matrix only stores a position inside a unit box; the shader does the rest.
      seed.position.set(seeded(index * 3 + 1), seeded(index * 3 + 2), seeded(index * 3 + 3));
      seed.updateMatrix();
      mesh.current.setMatrixAt(index, seed.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  useFrame(({ camera }) => {
    const rain = mesh.current;
    if (!rain) return;
    // It eases while the car waits and has stopped by the time the tow truck arrives.
    const drops = Math.round(count * sampleRain(journeyRuntime.position));
    rain.visible = !journeyRuntime.reducedMotion && drops > 0;
    rain.count = drops;
    const uniforms = (rain.material as ShaderMaterial).uniforms;
    uniforms.time.value = journeyRuntime.time;
    uniforms.focus.value.copy(camera.position);
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} renderOrder={5} />;
}
