import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Line } from '@react-three/drei';
import { Group, Material, MathUtils, Mesh, MeshBasicMaterial, PointLight } from 'three';
import { journeyRuntime } from '../runtime';
import { roadSide } from './roadPath';

/** Warning geometry lives on the same bend as the vehicle; scroll leads into identification. */
export function IncidentScene() {
  const mobile = useThree(state => state.size.width < 760);
  const warning = useRef<Group>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  const materials = useMemo(() => new WeakMap<Material, { opacity: number; depthWrite: boolean }>(), []);
  // The nearer shoulder stays inside the narrower mobile camera composition.
  const position = useMemo(() => roadSide(mobile ? .16 : .19, mobile ? -6.8 : 1.8, .12), [mobile]);
  const reflectors = useMemo(() => Array.from({length: 18}, (_, i) => roadSide(.1 + i * .012, 8.35, .7)), []);
  useFrame(() => {
    const strength = 1 - MathUtils.smoothstep(journeyRuntime.position, .65, 1.25);
    if (warning.current) {
      warning.current.visible = strength > .001;
      // Fade surfaces in place: these children already use world-space road positions.
      warning.current.traverse(object => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          let initial = materials.get(material);
          if (!initial) {
            initial = { opacity: material.opacity, depthWrite: material.depthWrite };
            materials.set(material, initial);
            if (!material.transparent) { material.transparent = true; material.needsUpdate = true; }
          }
          material.opacity = initial.opacity * strength;
          material.depthWrite = strength > .98 && initial.depthWrite;
        }
      });
    }
    if (glow.current) glow.current.opacity = (.015 + Math.sin(journeyRuntime.time * 1.8) ** 2 * .025) * strength;
    if (light.current) light.current.intensity = (mobile ? 50 : 90) * strength;
  });
  return <group ref={warning} scale={1}>
    <group position={position}>
      <Billboard position={[0, mobile ? 2.9 : 4.3, 0]} scale={mobile ? .72 : 1}>
        <Line points={[[0,2.5,0],[-2.25,-1.4,0],[2.25,-1.4,0],[0,2.5,0]]} color="#ff6a45" lineWidth={3} toneMapped={false}/>
        <Line points={[[0,1.15,0],[0,-.1,0]]} color="#ffc2a1" lineWidth={5} toneMapped={false}/>
        <mesh position={[0,-.7,0]}><circleGeometry args={[.12,16]}/><meshBasicMaterial color="#ffe0c4" toneMapped={false}/></mesh>
        <mesh><ringGeometry args={[3.1,3.14,96]}/><meshBasicMaterial color="#ff704c" transparent opacity={.3} toneMapped={false}/></mesh>
        <mesh><circleGeometry args={[3.3,64]}/><meshBasicMaterial ref={glow} color="#f54c2c" transparent opacity={.12} depthWrite={false}/></mesh>
      </Billboard>
      {(mobile ? [1.8,3,4.4] : [2.5,4.6,6.8]).map(radius => <mesh key={radius} rotation={[-Math.PI/2,0,0]}>
        <ringGeometry args={[radius,radius+.045,96]}/><meshBasicMaterial color="#ff6d4b" transparent opacity={.55} toneMapped={false} depthWrite={false}/>
      </mesh>)}
      <pointLight ref={light} position={[0,3,0]} color="#ff6038" intensity={mobile ? 50 : 90} distance={24} decay={1.5}/>
    </group>
    {reflectors.map((p,i) => <group key={i} position={p}>
      <mesh><boxGeometry args={[.15,1.35,.18]}/><meshStandardMaterial color="#29323c" metalness={.8} roughness={.28}/></mesh>
      <mesh position={[-.1,.35,.1]}><boxGeometry args={[.05,.55,.19]}/><meshBasicMaterial color={[2.5,.22,.04]} toneMapped={false}/></mesh>
    </group>)}
  </group>;
}
