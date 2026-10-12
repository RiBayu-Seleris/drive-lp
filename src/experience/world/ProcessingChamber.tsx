import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, InstancedMesh, Object3D, MathUtils } from 'three';
import { HologramPanel, type VehicleView } from './HologramPanel';
import { DataRoute, NodePlatform, ScannerRing, type Point3 } from './SignalSystems';
import { journeyRuntime } from '../runtime';

function ServerArchitecture({low}:{low:boolean}) {
 const towers=useRef<InstancedMesh>(null),lights=useRef<InstancedMesh>(null);const count=low?24:48;
 useEffect(()=>{
  if(!towers.current||!lights.current)return;const d=new Object3D();
  for(let i=0;i<count;i++){
   const angle=2.9+i/count*3.68;const r=22;
   const h=angle>5.12&&angle<5.7 ? .001 : 27+(i%5)*4;
   d.position.set(Math.cos(angle)*r,h/2,Math.sin(angle)*r);d.rotation.set(0,-angle,0);d.scale.set(.8,h,1.9);d.updateMatrix();towers.current.setMatrixAt(i,d.matrix);
   for(let j=0;j<9;j++){d.position.y=h<1?-30:3+j*3.5;d.scale.set(.87,.12,2);d.updateMatrix();lights.current.setMatrixAt(i*9+j,d.matrix);}
  }
  towers.current.instanceMatrix.needsUpdate=true;lights.current.instanceMatrix.needsUpdate=true;
 },[count]);
 return <group>
 <instancedMesh ref={towers} args={[undefined,undefined,count]}><boxGeometry/><meshStandardMaterial color="#122940" metalness={.85} roughness={.28}/></instancedMesh>
 <instancedMesh ref={lights} args={[undefined,undefined,count*9]}><boxGeometry/><meshBasicMaterial color={[.12,.5,1.4]} toneMapped={false}/></instancedMesh>
 </group>;
}
function EngineCore() {
 const core=useRef<Group>(null);
 useFrame(()=>{if(core.current)core.current.rotation.y=journeyRuntime.time*.13;});
 return <group position={[0,14,0]}>
 <group ref={core}><mesh><icosahedronGeometry args={[4,2]}/><meshBasicMaterial color="#75d8ff" wireframe transparent opacity={.5}/></mesh>
 <mesh><icosahedronGeometry args={[2.3,1]}/><meshStandardMaterial color="#c6f1ff" emissive="#2caaff" emissiveIntensity={1.3} roughness={.25} metalness={.5}/></mesh></group>
 <ScannerRing radius={5.5} rotation={[0,.2,0]}/>
 <ScannerRing radius={5.7} rotation={[Math.PI/2,0,.3]}/>
 <mesh position={[0,5,0]}><cylinderGeometry args={[.08,.15,45,12]}/><meshBasicMaterial color={[.7,1.8,3]} toneMapped={false}/></mesh>
 <pointLight color="#72caff" intensity={120} distance={30} decay={1.5}/>
 </group>;
}
function FileStream({side}:{side:number}) {
 const group=useRef<Group>(null);
 useFrame(()=>{
  if(!group.current)return;
  group.current.children.forEach((child,i)=>{const t=(i/5+journeyRuntime.time*.035)%1;child.position.set(side*(12+Math.sin(t*Math.PI)*3),5+t*9,24-t*39);child.rotation.set(0,side*-.35,0);});
 });
 const views:VehicleView[]=['front','rear','right','left','preview'];
 return <group ref={group}>{['FOTO DEPAN','FOTO BELAKANG','FOTO KANAN','FOTO KIRI','HASIL ANALISIS'].map((title,index)=><HologramPanel key={title} title={title} kind={title==='HASIL ANALISIS'?'analysis':'capture'} vehicleView={views[index]} width={3.4} rows={['Rincian kerusakan','Estimasi tersedia']}/>)}</group>;
}
export function ProcessingChamber({low}:{low:boolean}) {
 const architecture=useRef<Group>(null),routes=useRef<Group>(null);
 useFrame(()=>{
  const scale=(.08+.92*MathUtils.smoothstep(journeyRuntime.position,1.85,2.7))*(1-.8*MathUtils.smoothstep(journeyRuntime.position,5.3,5.98));
  if(architecture.current)architecture.current.scale.y=scale;
  if(routes.current)routes.current.scale.y=scale;
 });
 const spirals=useMemo(()=>[-1,1].map(side=>Array.from({length:44},(_,i)=>{const t=i/43,angle=t*Math.PI*3+side;return [Math.sin(angle)*(17-t*3),1.5+t*37,Math.cos(angle)*(17-t*3)] as Point3;})),[]);
 return <group>
 <group ref={architecture} position={[40,3.5,-273]}>
 <NodePlatform radius={24}/><ServerArchitecture low={low}/><EngineCore/>
 {[1,11,23,35,46].map((y,i)=><group key={y} position={[0,y,0]}>
  <mesh rotation={[Math.PI/2,0,2.9]}><torusGeometry args={[22.8,.38,8,120,3.68]}/><meshStandardMaterial color="#1c3449" metalness={.9} roughness={.2}/></mesh>
  <mesh rotation={[Math.PI/2,0,2.9]}><torusGeometry args={[23.2,.06,5,120,3.68]}/><meshBasicMaterial color={[.3,1.05,2]} toneMapped={false}/></mesh>
  {i<4&&<mesh><cylinderGeometry args={[23,23,2,96,1,true,1.25,3.8]}/><meshStandardMaterial color="#19364e" metalness={.7} roughness={.2} transparent opacity={.5} side={2}/></mesh>}
 </group>)}
 <FileStream side={-1}/><FileStream side={1}/>
 </group>
 <group ref={routes} position={[40,3.5,-273]}>{spirals.map((points,i)=><DataRoute key={i} points={points} width={.08} particles={low?18:40} speed={.7}/>)}</group>
 {[-1,0,1].map(side=><DataRoute key={side} points={[[14+side*4,4,-213],[18+side*4,4,-232],[32+side*4,6,-252],[40+side*4,14,-273],[50+side*5,8,-305],[62+side*4,4,-328]]} width={.11} particles={low?16:30}/>)}
 <HologramPanel title="Analisis kerusakan" kind="analysis" rows={['Bagian terdampak','Tingkat kerusakan','Rincian temuan','Estimasi bila tersedia']} width={10} position={[58,18,-276]} rotation={[0,-.42,0]}/>
 <HologramPanel title="Kualitas foto" kind="document" rows={['Sudut kendaraan','Kejelasan gambar','Foto ulang bila perlu','Status pemeriksaan']} width={10} position={[13,13,-262]} rotation={[0,.35,0]}/>
 </group>;
}
