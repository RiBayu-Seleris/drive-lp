import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PlanarReflection } from './reflection';
import type { RoadReflectionUniforms } from '../materials/road';

/**
 * Keeps a planar reflection of the road up to date and hands its uniforms to the road
 * material. Runs before the main render (priority -1) and after the camera rig (-2).
 * Returns null when disabled, so the material compiles without the reflection code.
 */
export function useRoadReflection(enabled: boolean, resolutionScale: number, planeHeight: () => number): RoadReflectionUniforms | null {
  const reflection = useMemo(() => (enabled ? new PlanarReflection() : null), [enabled]);
  const uniforms = useMemo<RoadReflectionUniforms | null>(() => reflection && {
    texture: { value: reflection.target.texture },
    matrix: { value: reflection.matrix },
    strength: reflection.strength,
  }, [reflection]);
  const width = useThree(state => state.size.width);
  const height = useThree(state => state.size.height);
  const dpr = useThree(state => state.viewport.dpr);

  useEffect(() => {
    reflection?.setSize(width * dpr * resolutionScale, height * dpr * resolutionScale);
  }, [reflection, width, height, dpr, resolutionScale]);
  useEffect(() => () => reflection?.dispose(), [reflection]);

  useFrame(({ gl, scene, camera }) => {
    reflection?.update(gl, scene, camera, planeHeight());
  }, -1);

  return uniforms;
}
