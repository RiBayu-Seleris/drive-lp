import { useMemo, useRef, type ComponentProps, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Line } from '@react-three/drei';
import { CatmullRomCurve3, Group, MathUtils, Material, Mesh, Vector3 } from 'three';
import { journeyRuntime } from '../runtime';
import { sampleView } from '../cameraPath';
import { sampleVehicleRoadProgress, VEHICLE_CLEARANCE, VEHICLE_LANE } from '../journeyPath';
import { highway, roadSide } from './roadPath';
import { DataRoute, ScannerRing, type Point3 } from './SignalSystems';
import { JourneyPanel } from './JourneyPanel';
import { HologramPanel, type VehicleView } from './HologramPanel';
import { ServiceArchitecture } from './ServiceArchitecture';

function SceneFade({start,end,children}:{start:number;end:number;children:ReactNode}){
 const group=useRef<Group>(null);
 const materials=useMemo(()=>new WeakMap<Material,{opacity:number;depthWrite:boolean}>(),[]);
 useFrame(()=>{
  if(!group.current)return;
  const at=journeyRuntime.position;
  const a=MathUtils.smoothstep(at,start-.22,start+.08)*(1-MathUtils.smoothstep(at,end-.2,end));
  group.current.visible=a>.001;
  if(!group.current.visible)return;
  group.current.traverse(object=>{
   const mesh=object as Mesh;if(!mesh.isMesh)return;
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    let initial=materials.get(material);
    if(!initial){initial={opacity:material.opacity,depthWrite:material.depthWrite};materials.set(material,initial);if(!material.transparent){material.transparent=true;material.needsUpdate=true;}}
    material.opacity=initial.opacity*a;material.depthWrite=a>.98&&initial.depthWrite;
   }
  });
 });
 return <group ref={group} visible={false}>{children}</group>;
}

type Kind=ComponentProps<typeof JourneyPanel>['kind'];
function panelAnchor(stage:number,mobile:boolean,x:number,y:number,depth:number){
 const eye=new Vector3(),target=new Vector3();sampleView(stage,mobile,eye,target);
 const forward=target.sub(eye).normalize(),right=new Vector3().crossVectors(forward,new Vector3(0,1,0)).normalize(),up=new Vector3().crossVectors(right,forward);
 return eye.addScaledVector(forward,depth).addScaledVector(right,mobile?0:x).addScaledVector(up,mobile?1.2:y);
}
function SpatialPanel({stage,kind,x=6,y=4.2,depth=23,width=12}:{stage:number;kind:Kind;x?:number;y?:number;depth?:number;width?:number}){
 const mobile=useThree(s=>s.size.width<760);
 const anchor=useMemo(()=>panelAnchor(stage,mobile,x,y,depth),[stage,mobile,x,y,depth]);
 const foot=useMemo(()=>new Vector3(anchor.x,Math.max(0,anchor.y-8),anchor.z),[anchor]);
 return <group>
  <Line points={[foot,anchor]} color="#477b8e" transparent opacity={.3} lineWidth={.7}/>
  <mesh position={foot} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.28,.36,32]}/><meshBasicMaterial color="#80cbcf" transparent opacity={.6}/></mesh>
  <Billboard position={anchor}><JourneyPanel kind={kind} mobile={mobile} width={mobile?12:width}/></Billboard>
 </group>;
}
function carAt(stage:number){return roadSide(sampleVehicleRoadProgress(stage),VEHICLE_LANE,VEHICLE_CLEARANCE);}

function ScanField(){
 const sweep=useRef<Group>(null);
 const at=useMemo(()=>carAt(2),[]);
 useFrame(()=>{if(sweep.current)sweep.current.position.y=at.y+.3+(Math.sin(journeyRuntime.time*.8)*.5+.5)*2;});
 return <group>
  <group ref={sweep} position={at}><ScannerRing radius={3.7} rotation={[Math.PI/2,0,0]}/></group>
  {[-1,1].map(side=><group key={side} position={[at.x+side*2.1,at.y+.8,at.z-1.4]}>
   <mesh><sphereGeometry args={[.085,12,12]}/><meshBasicMaterial color="#ff8962" toneMapped={false}/></mesh>
   <Line points={[[0,0,0],[side*1.4,1.5,0],[side*3,1.5,0]]} color="#4eafcc" lineWidth={1}/>
  </group>)}
 </group>;
}

function PhotoFlow(){
 const mobile=useThree(s=>s.size.width<760);
 const start=useMemo(()=>carAt(2),[]),end=useMemo(()=>carAt(3),[]);
 const photos=useRef<(Group|null)[]>([]);
 const path=useMemo(()=>new CatmullRomCurve3([start.clone().add(new Vector3(0,3,0)),new Vector3(0,13,-145),end.clone().add(new Vector3(4,5,0))]),[start,end]);
 useFrame(()=>photos.current.forEach((photo,i)=>{
  if(photo)photo.position.copy(path.getPoint((i/4+journeyRuntime.time*.025)%1));
 }));
 const views:VehicleView[]=['front','rear','right','left'];
 return <group>{views.map((view,i)=><group ref={g=>{photos.current[i]=g;}} key={view}>
  <Billboard><HologramPanel title={['FOTO DEPAN','FOTO BELAKANG','FOTO KANAN','FOTO KIRI'][i]} kind="capture" vehicleView={view} width={mobile?2.2:3}/></Billboard>
 </group>)}{[-1,0,1].map(i=><DataRoute key={i} points={[
  [start.x+i*2,start.y+1,start.z],[-1+i*3,12,-147],[end.x+8+i*3,10,end.z-8],
 ]} color="#50cfff" width={.035} particles={mobile?6:12}/>)}</group>;
}

const workshopPositions:Point3[]=[[43,4.6,-339],[70,4.6,-354],[79,4.6,-331]];
function WorkshopBuilding({position,selected=false}:{position:Point3;selected?:boolean}){
 return <group position={position}>
  <mesh position={[0,1.7,0]}><boxGeometry args={[7,3.4,4.5]}/><meshStandardMaterial color="#23303e" metalness={.55} roughness={.34}/></mesh>
  <mesh position={[0,3.6,0]}><boxGeometry args={[7.6,.3,5]}/><meshStandardMaterial color="#43576b" metalness={.65} roughness={.25}/></mesh>
  {[-2,0,2].map(x=><mesh key={x} position={[x,1.4,2.27]}><planeGeometry args={[1.65,2.45]}/><meshBasicMaterial color={selected?'#277e7f':'#173c56'}/></mesh>)}
  <mesh position={[0,3.17,2.34]}><boxGeometry args={[6.6,.12,.07]}/><meshBasicMaterial color={selected?'#85efce':'#62b4d9'} toneMapped={false}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.03,4.6]}><planeGeometry args={[9,5]}/><meshStandardMaterial color="#213344" roughness={.7}/></mesh>
 </group>;
}

function TowingTruck(){
 const truck=useRef<Group>(null);
 useFrame(()=>{
  if(!truck.current)return;
  const at=journeyRuntime.reducedMotion?Math.min(7,Math.floor(journeyRuntime.position+.18)):journeyRuntime.position;
  const approach=1-MathUtils.smoothstep(at,6.3,6.52);
  const departure=MathUtils.smoothstep(at,7.16,7.48);
  const t=sampleVehicleRoadProgress(at)+approach*.023+departure*.025;
  truck.current.position.copy(roadSide(t,VEHICLE_LANE,.08));
  const tangent=highway.getTangentAt(t);
  truck.current.rotation.set(Math.asin(tangent.y),Math.atan2(-tangent.x,-tangent.z),0,'YXZ');
 });
 return <group ref={truck}>
  <mesh position={[0,.68,0]}><boxGeometry args={[3.1,.3,6.4]}/><meshStandardMaterial color="#394e5d" roughness={.5} metalness={.6}/></mesh>
  <mesh position={[0,1.5,-4.1]}><boxGeometry args={[2.7,2.2,2.2]}/><meshStandardMaterial color="#d5b373" roughness={.42} metalness={.45}/></mesh>
  <mesh position={[0,2,-5.22]}><planeGeometry args={[2.4,.8]}/><meshStandardMaterial color="#152b3e" roughness={.13} metalness={.7}/></mesh>
  <mesh position={[0,2.65,-4.1]}><boxGeometry args={[1.3,.14,.25]}/><meshBasicMaterial color="#ffc15b" toneMapped={false}/></mesh>
  {[-1,1].map(x=><mesh key={x} position={[x*1.46,.88,0]}><boxGeometry args={[.08,.1,6.4]}/><meshBasicMaterial color="#d4a856"/></mesh>)}
  {[-1,1].flatMap(x=>[-4.1,1.9].map(z=><mesh key={`${x}-${z}`} position={[x*1.35,.5,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.5,.5,.35,16]}/><meshStandardMaterial color="#10151a" roughness={.9}/></mesh>))}
 </group>;
}

function DispatchMap(){
 const search=useRef<Group>(null);
 useFrame(()=>{
  if(!search.current)return;
  const radius=MathUtils.lerp(.32,1,MathUtils.smoothstep(journeyRuntime.position,5.95,6.65));
  search.current.scale.set(radius,1,radius);
 });
 return <group>
  {workshopPositions.map((p,i)=><WorkshopBuilding key={i} position={p} selected={i===1}/>)}
  {workshopPositions.map((p,i)=><DataRoute key={i} points={[[58,4.5,-345],[p[0],4.5,-345],p]} width={.06} color={i===1?'#7aeac7':'#508cae'} particles={7}/>)}
  <group ref={search} position={[58,4.45,-345]}>{[6,12,18].map(radius=><mesh key={radius} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[radius,radius+.06,96]}/><meshBasicMaterial color="#69d6ec" transparent opacity={.35} depthWrite={false}/></mesh>)}</group>
 </group>;
}

export function RoadsideStories(){
 const mobile=useThree(s=>s.size.width<760);
 return <>
  <SceneFade start={.72} end={1.9}>
   <SpatialPanel stage={1} kind="coverage" width={11}/>
   <DataRoute points={[[50,2,-90],[54,4,-91],[62,6,-97]]} particles={mobile?4:8} width={.015}/>
  </SceneFade>
  <SceneFade start={1.72} end={2.9}>
   <ScanField/><SpatialPanel stage={2} kind="capture" width={10.5}/>
  </SceneFade>
  <SceneFade start={2.3} end={3.8}><PhotoFlow/></SceneFade>
  <SceneFade start={2.72} end={4.95}><ServiceArchitecture/></SceneFade>
  <SceneFade start={2.75} end={4.13}>
   <SpatialPanel stage={3} kind="locked" x={6} width={11}/>
  </SceneFade>
  <SceneFade start={4.02} end={4.95}>
   <SpatialPanel stage={4} kind="assessment" x={6} width={11}/>
  </SceneFade>
  <SceneFade start={4.72} end={5.6}>
   <SpatialPanel stage={5} kind="claim" width={11}/>
  </SceneFade>
  <SceneFade start={5.43} end={5.98}>
   <SpatialPanel stage={5.65} kind="approval" x={5} width={11}/>
  </SceneFade>
  <SceneFade start={5.75} end={7.3}>
   <DispatchMap/>
  </SceneFade>
  <SceneFade start={6.28} end={7.52}><TowingTruck/></SceneFade>
  <SceneFade start={6.8} end={7.65}><ServiceArchitecture repair/></SceneFade>
  <SceneFade start={5.78} end={6.48}>
   <SpatialPanel stage={6} kind="workshop" x={6} width={11}/>
  </SceneFade>
  <SceneFade start={6.3} end={6.95}>
   <SpatialPanel stage={6.55} kind="dispatch" x={5} width={10}/>
  </SceneFade>
  <SceneFade start={6.77} end={7.34}>
   <SpatialPanel stage={7} kind="ticket" x={6} width={9}/>
  </SceneFade>
  <SceneFade start={7.24} end={7.66}><SpatialPanel stage={7.4} kind="authorized" width={11}/></SceneFade>
 </>;
}
