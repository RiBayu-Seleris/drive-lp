import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, MathUtils } from 'three';
import { Line } from '@react-three/drei';
import { journeyRuntime } from '../runtime';
import { HologramPanel } from './HologramPanel';
import { DataRoute, NodePlatform, ScannerRing } from './SignalSystems';

export function IncidentSignal() {
 const group=useRef<Group>(null);
 useFrame(()=>{if(!group.current)return;const a=journeyRuntime.position;const strength=MathUtils.smoothstep(a,.6,1)* (1-MathUtils.smoothstep(a,1.45,1.95));group.current.scale.setScalar(Math.max(.001,strength));group.current.visible=strength>.001;});
 return <group ref={group} position={[51,7,-93]} rotation={[0,-.2,0]}>
 <ScannerRing color="#ff7958" radius={4.5}/>
 <Line points={[[0,2.9,0],[-2.65,-1.8,0],[2.65,-1.8,0],[0,2.9,0]]} color="#ffa274" lineWidth={3} toneMapped={false}/>
 <Line points={[[0,1.5,0],[0,-.2,0]]} color="#ffe7ca" lineWidth={5}/>
 <mesh position={[0,-.95,0]}><sphereGeometry args={[.14,12,12]}/><meshBasicMaterial color="#ffe7ca"/></mesh>
 <pointLight color="#ff5337" intensity={70} distance={26} decay={1.5}/>
 {[-1,1].map(s=><group key={s} position={[s*6,-4.5,0]}><mesh><coneGeometry args={[.3,1.6,12]}/><meshStandardMaterial color="#f79452" emissive="#d94522" emissiveIntensity={.7}/></mesh></group>)}
 </group>;
}
export function VehicleCapture() {
 const mobile=useThree(state=>state.size.width<760);
 const arrival=useRef<Group>(null);
 useFrame(()=>{if(arrival.current){arrival.current.visible=journeyRuntime.position>1.4;arrival.current.position.y=-18*(1-MathUtils.smoothstep(journeyRuntime.position,1.4,1.95));}});
 return <group ref={arrival}>
 <HologramPanel title="Foto kendaraan" kind="capture" position={mobile?[-15,8,-177]:[-28,10,-169]} rotation={[0,.32,0]} width={mobile?8:12}/>
 <HologramPanel title="Data kendaraan" kind="form" rows={['Nomor plat','Merek dan model','Tahun kendaraan','Periksa sebelum kirim']} position={mobile?[0,14,-184]:[-6,13,-182]} width={mobile?10:14}/>
 <HologramPanel title="Foto empat sisi" kind="document" rows={['Depan','Belakang','Kanan','Kiri']} position={mobile?[3,4,-172]:[13,8,-173]} rotation={[0,-.25,0]} width={mobile?8:11}/>
 {!mobile&&<HologramPanel title="Pratinjau foto" kind="vehicle" position={[-16,3.5,-160]} rotation={[0,.12,0]} width={8}/>}
 <NodePlatform position={[-7,2.6,-196]} radius={8}/>
 <group position={[-7,8,-196]}><ScannerRing radius={3}/><mesh rotation={[0,0,Math.PI/4]}><octahedronGeometry args={[2.4,0]}/><meshStandardMaterial color="#a1d9ff" emissive="#2c77bd" emissiveIntensity={.7} metalness={.8} roughness={.2}/></mesh></group>
 <DataRoute points={[[-26,5,-165],[-25,2,-178],[-7,3,-195],[4,4,-218],[25,5,-245]]}/>
 <DataRoute points={[[13,6,-173],[10,3,-186],[-7,3,-195],[0,5,-219],[24,6,-245]]}/>
 <DataRoute points={[[-6,10,-182],[-4,5,-189],[-7,3,-195],[2,7,-220],[25,8,-245]]}/>
 </group>;
}
