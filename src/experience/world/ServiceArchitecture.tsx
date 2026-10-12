import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Group, MathUtils, SRGBColorSpace } from 'three';
import { journeyRuntime } from '../runtime';
import { sampleVehicleRoadProgress, VEHICLE_LANE } from '../journeyPath';
import { highway, roadSide } from './roadPath';

/** Open roadside structures keep inspection and repair grounded in the same world. */
export function ServiceArchitecture({ repair = false }: { repair?: boolean }) {
  const sweep = useRef<Group>(null);
  const at = repair ? 7 : 3;
  const route = sampleVehicleRoadProgress(at);
  const position = useMemo(() => roadSide(route, VEHICLE_LANE, .03), [route]);
  const tangent = highway.getTangentAt(route);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#102432'; ctx.fillRect(0, 0, 768, 128);
    ctx.fillStyle = repair ? '#a5e9d6' : '#a2d7e8'; ctx.font = '600 45px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(repair ? 'DRIVE / MITRA PERBAIKAN' : 'DRIVE / ANALISIS KERUSAKAN', 384, 80);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, [repair]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => {
    if (sweep.current) {
      sweep.current.position.z = repair ? MathUtils.lerp(3, -3, MathUtils.smoothstep(journeyRuntime.position, 7.12, 7.42)) : Math.sin(journeyRuntime.time * .45) * 3;
    }
  });
  const color = repair ? '#86d7bc' : '#72b7d4';
  return <group position={position} rotation={[Math.asin(tangent.y), Math.atan2(-tangent.x, -tangent.z), 0]}>
    {[-4.4, 4.4].map(x => <group key={x}>
      {[-5, 5].map(z => <group key={z} position={[x, 3, z]}>
        <mesh><boxGeometry args={[.55, 6, .65]}/><meshStandardMaterial color="#2b3a48" metalness={.7} roughness={.32}/></mesh>
        <mesh position={[x > 0 ? -.29 : .29, 0, .01]}><boxGeometry args={[.025, 4.8, .14]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>
      </group>)}
      <mesh position={[x, 6.15, 0]}><boxGeometry args={[.9, .45, 11.4]}/><meshStandardMaterial color="#596672" roughness={.4} metalness={.65}/></mesh>
      <mesh position={[x, .17, 0]}><boxGeometry args={[.6, .3, 11.5]}/><meshStandardMaterial color="#293b48" roughness={.6}/></mesh>
      {repair && <mesh position={[x * .96, 1.2, -1.8]}><boxGeometry args={[.8, 2.4, 2]}/><meshStandardMaterial color="#395569" metalness={.5} roughness={.42}/></mesh>}
    </group>)}
    {[-5, 5].map(z => <mesh key={z} position={[0, 6.12, z]}><boxGeometry args={[9.6, .4, .8]}/><meshStandardMaterial color="#4d606c" metalness={.7} roughness={.32}/></mesh>)}
    <mesh position={[0, 5.82, 5.43]}><planeGeometry args={[7.4, 1.23]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>
    <group ref={sweep}>
      <mesh position={[0, 4.8, 0]}><boxGeometry args={[7.5, .045, .045]}/><meshBasicMaterial color={color} transparent opacity={.65}/></mesh>
      {[-3.75, 3.75].map(x => <mesh key={x} position={[x, 2.6, 0]}><boxGeometry args={[.035, 4.4, .035]}/><meshBasicMaterial color={color} transparent opacity={.65}/></mesh>)}
    </group>
  </group>;
}

export function CoastalArchitecture() {
  return <group position={[81, 1, -117]} rotation={[0, -.35, 0]}>
    {[-5, 5].map(x => <mesh key={x} position={[x, 7, 0]}><boxGeometry args={[1.5, 37, 5]}/><meshStandardMaterial color="#27394a" metalness={.5} roughness={.55}/></mesh>)}
    {[0, 1, 2].map(i => <group key={i} position={[i * 1.7, 17 + i * 5, 0]}>
      <mesh><boxGeometry args={[18 - i * 3, 3.7, 9]}/><meshStandardMaterial color="#364e62" metalness={.7} roughness={.35}/></mesh>
      <mesh position={[0, 0, 4.53]}><planeGeometry args={[16 - i * 3, 2.4]}/><meshStandardMaterial color="#193444" emissive="#7aa4ba" emissiveIntensity={.13} metalness={.75} roughness={.18}/></mesh>
      <mesh position={[0, -1.85, 4.57]}><boxGeometry args={[17 - i * 3, .055, .06]}/><meshBasicMaterial color="#8ec8dd" toneMapped={false}/></mesh>
    </group>)}
  </group>;
}
