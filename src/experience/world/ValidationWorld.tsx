import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, MathUtils } from 'three';
import { Billboard } from '@react-three/drei';
import { journeyRuntime } from '../runtime';
import { HologramPanel, type PanelKind } from './HologramPanel';
import { DataRoute, NodePlatform, ScannerRing, type Point3 } from './SignalSystems';

const serviceOptions:{title:string;kind:PanelKind;position:Point3;rows:string[]}[]=[
 {title:'Perbaikan kendaraan',kind:'workshop',position:[-16,0,-7],rows:['Biaya sendiri','Pilih bengkel','Pesan towing bila perlu']},
 {title:'Pembelian polis',kind:'policy',position:[15,0,-9],rows:['Pilih produk','Lengkapi pemeriksaan','Ikuti syarat produk']},
 {title:'Pengajuan klaim',kind:'document',position:[0,0,16],rows:['Polis & bukti','Evaluasi asuransi','Pantau keputusan']},
];
function ServiceNode({index}:{index:number}) {
 const item=serviceOptions[index];const beam=useRef<Group>(null);
 useFrame(()=>{if(beam.current)beam.current.position.y=1.5+Math.sin(journeyRuntime.time*.8+index)*1.3;});
 return <group position={item.position}>
  <NodePlatform radius={3.5}/>
  <mesh position={[0,1.5,0]}><cylinderGeometry args={[.035,.06,3,8]}/><meshBasicMaterial color="#5b9bbc" toneMapped={false}/></mesh>
  <Billboard position={[0,5.7,0]} follow><HologramPanel title={item.title} kind={item.kind} rows={item.rows} width={8}/></Billboard>
  <group ref={beam}><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[2.7,2.76,48]}/><meshBasicMaterial color="#70bcff" transparent opacity={.5}/></mesh></group>
 </group>;
}
export function ServiceOptionsWorld() {
 const mobile=useThree(state=>state.size.width<760);
 const station=useRef<Group>(null);
 useFrame(()=>{
  if(station.current){station.current.visible=journeyRuntime.position>3.1;station.current.scale.setScalar((mobile?.57:1)*Math.max(.001,MathUtils.smoothstep(journeyRuntime.position,3.1,3.9)));}
 });
 return <group ref={station} position={[62,4,-345]} scale={mobile?.57:1}>
  <NodePlatform radius={25}/>
  <ScannerRing radius={4.1} position={[-4.2,.3,0]} rotation={[Math.PI/2,0,0]}/>
  <Billboard position={[0,11,0]}><HologramPanel title="Hasil pemeriksaan" kind="analysis" width={8} rows={['Rincian kerusakan','Kondisi kendaraan','Tentukan kebutuhan']}/></Billboard>
  {serviceOptions.map((item,i)=><group key={item.title}>
   <ServiceNode index={i}/>
   <DataRoute points={[[0,1,0],[item.position[0]*.6,.4,item.position[2]*.6],[...item.position] as Point3]} width={.07} color="#75cfde" particles={7}/>
  </group>)}
 </group>;
}
export function ServicesWorld() {
 const hub=useRef<Group>(null);
 useFrame(()=>{if(hub.current){const scale=MathUtils.smoothstep(journeyRuntime.position,4.63,4.96);hub.current.scale.setScalar(Math.max(.001,scale));hub.current.visible=scale>.001;}});
 return <group position={[76,17,-397]}>
  <group ref={hub}>
   <Billboard><HologramPanel title="Bengkel & towing" kind="towing" width={15} rows={['Pilih bengkel tujuan','Pantau perjalanan','Tiket layanan','Rincian biaya']}/></Billboard>
   {[0,1,2].map(i=><ScannerRing key={i} radius={10+i*2} position={[0,0,-2-i*4]} color="#80e7d1"/>)}
  </group>
 </group>;
}
const ecosystemNodes:{title:string;kind:PanelKind;position:Point3;rows:string[]}[]=[
 {title:'Pemilik kendaraan',kind:'identity',position:[-28,7,-265],rows:['Pemeriksaan & hasil','Polis & klaim','Pantau layanan']},
 {title:'Mitra bengkel',kind:'workshop',position:[-17,5,-205],rows:['Antrean kendaraan','Pekerjaan perbaikan','Serah-terima']},
 {title:'Mitra towing',kind:'towing',position:[61,5,-198],rows:['Order & armada','Penugasan sopir','Status layanan']},
 {title:'Sopir towing',kind:'identity',position:[108,8,-268],rows:['Tugas penjemputan','Lokasi perjalanan','Bukti serah-terima']},
 {title:'Perusahaan asuransi',kind:'policy',position:[116,8,-350],rows:['Produk & manfaat','Evaluasi klaim','Kemitraan layanan']},
 {title:'Biaya layanan',kind:'form',position:[71,8,-398],rows:['Sesuai pertanggungan','Porsi biaya pelanggan','Status pembayaran']},
];
export function EcosystemWorld() {
 const mobile=useThree(state=>state.size.width<760);
 const reveal=useRef<Group>(null);const center=useMemo<Point3>(()=>[40,5,-283],[]);
 useFrame(()=>{
  if(!reveal.current)return;
  reveal.current.visible=journeyRuntime.position>5.22;
  // Platforms rise from the same landscape as the camera reveals the connected network.
  reveal.current.position.y=-18*(1-MathUtils.smoothstep(journeyRuntime.position,5.22,5.94));
 });
 return <group ref={reveal} visible={false}>
  {ecosystemNodes.map((node,i)=>{const position:Point3=mobile?[40+(node.position[0]-40)*.65,node.position[1],-283+(node.position[2]+283)*.85]:node.position;return <group key={node.title}>
   <group position={position}>
    <NodePlatform radius={11}/>
    <Billboard position={[0,9,0]}><HologramPanel title={node.title} kind={node.kind} rows={node.rows} width={18}/></Billboard>
    {i===4&&[[-3,4],[-.5,7],[3,5]].map(([x,h])=><mesh key={x} position={[x,h/2,0]}><boxGeometry args={[2,h,2]}/><meshStandardMaterial color="#30709b" emissive="#164b6c" emissiveIntensity={.5} metalness={.7} roughness={.25}/></mesh>)}
   </group>
   <DataRoute points={[position,[(position[0]+center[0])*.5,11,(position[2]+center[2])*.5],center]} width={.28} particles={16}/>
  </group>;})}
  <group position={[40,8,-283]}>
   <NodePlatform radius={17}/>
   <Billboard position={[0,16,0]}><HologramPanel title="DRIVE" kind="analysis" width={21} rows={['Pemeriksaan kendaraan','Pilihan layanan','Peran yang terhubung']}/></Billboard>
  </group>
 </group>;
}
