import { useDeferredValue, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { type ThreeElements } from '@react-three/fiber';
import { VehicleNarrative } from './world/VehicleNarrative';

type VehicleProps = ThreeElements['group'] & { low?: boolean };

/** User-supplied Aventador: 4.8m long, nose -Z, tires grounded at Y=0. */
export function Vehicle({ low = false, ...props }: VehicleProps) {
  // Keep the current mesh visible while an adaptive quality change loads the other LOD.
  const url = useDeferredValue(low ? '/assets/models/aventador-low.glb' : '/assets/models/aventador.glb');
  // Meshopt is bundled locally. Draco is explicitly disabled; no decoder CDN requests.
  const { scene } = useGLTF(url, false, true);
  const model = useMemo(() => {
    // Keep instance transforms separate from the loader cache; GPU resources survive LOD changes.
    const clone = scene.clone(true);
    clone.name = 'DRIVE Aventador Sport';
    clone.userData.vehicleAsset = url;
    return clone;
  }, [scene, url]);

  return <group {...props} name="vehicle">
    <mesh position={[0, .018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.8, 5.6]} />
      <shaderMaterial transparent depthWrite={false}
        vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}"
        fragmentShader="varying vec2 vUv;void main(){float a=(1.-smoothstep(.45,1.,length((vUv-.5)*2.)))*.6;gl_FragColor=vec4(.001,.004,.008,a);}" />
    </mesh>
    <primitive object={model} dispose={null} />
    <pointLight position={[0,.6,2]} color="#ff5032" intensity={1.8} distance={4.5} decay={1.5}/>
    <VehicleNarrative/>
  </group>;
}
