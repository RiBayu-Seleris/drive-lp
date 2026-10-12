import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { CatmullRomCurve3, Color, Group, InstancedMesh, Object3D, TubeGeometry, Vector3 } from 'three';
import { journeyRuntime } from '../runtime';

export type Point3=[number,number,number];
export function DataRoute({points,color='#71caff',width=.065,particles=12,speed=1}:{points:Point3[];color?:string;width?:number;particles?:number;speed?:number}) {
 const key=JSON.stringify(points);
 const curve=useMemo(()=>new CatmullRomCurve3((JSON.parse(key) as Point3[]).map(p=>new Vector3(...p))),[key]);
 const geometry=useMemo(()=>new TubeGeometry(curve,90,width,5,false),[curve,width]);
 const mesh=useRef<InstancedMesh>(null),dummy=useMemo(()=>new Object3D(),[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(()=>{if(!mesh.current)return;for(let i=0;i<particles;i++){
  const t=(i/particles+journeyRuntime.time*.07*speed)%1;dummy.position.copy(curve.getPoint(t));dummy.scale.setScalar(i%3===0?.13:.07);dummy.updateMatrix();mesh.current.setMatrixAt(i,dummy.matrix);
 }mesh.current.instanceMatrix.needsUpdate=true;});
 return <group><mesh geometry={geometry}><meshBasicMaterial color={color} transparent opacity={.4} toneMapped={false}/></mesh>
 <instancedMesh ref={mesh} args={[undefined,undefined,particles]} frustumCulled={false}><sphereGeometry args={[1,5,4]}/><meshBasicMaterial color={new Color(color).multiplyScalar(3)} toneMapped={false}/></instancedMesh></group>;
}
export function ScannerRing({radius=4,color='#7acbff',...props}:ThreeElements['group']&{radius?:number;color?:string}) {
 const ring=useRef<Group>(null),ticks=useRef<InstancedMesh>(null);
 useEffect(()=>{if(!ticks.current)return;const dummy=new Object3D();for(let i=0;i<24;i++){
 const angle=i/24*Math.PI*2;dummy.position.set(-Math.sin(angle)*radius*1.17,Math.cos(angle)*radius*1.17,0);dummy.rotation.z=angle;dummy.scale.set(.04,.16,.04);dummy.updateMatrix();ticks.current.setMatrixAt(i,dummy.matrix);
 }ticks.current.instanceMatrix.needsUpdate=true;},[radius]);
 useFrame(()=>{if(ring.current)ring.current.rotation.z=journeyRuntime.time*.08;});
 return <group {...props}><group ref={ring}>
 {[1,1.12,1.24].map((s,i)=><mesh key={s} rotation={[0,0,i*.9]}><torusGeometry args={[radius*s,i===0?.055:.025,6,100,i===1?5.5:Math.PI*2]}/><meshBasicMaterial color={new Color(color).multiplyScalar(i===0?2:1)} transparent opacity={i===2?.3:.9} toneMapped={false}/></mesh>)}
 <instancedMesh ref={ticks} args={[undefined,undefined,24]}><boxGeometry/><meshBasicMaterial color={color}/></instancedMesh>
 </group></group>;
}
export function NodePlatform({radius=4,color='#76caff',...props}:ThreeElements['group']&{radius?:number;color?:string}) {
 return <group {...props}>
 <mesh position={[0,-.45,0]}><cylinderGeometry args={[radius,radius*1.04,.9,64]}/><meshStandardMaterial color="#102337" roughness={.48} metalness={.55}/></mesh>
 <mesh position={[0,.04,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[radius*.68,radius*.95,64]}/><meshStandardMaterial color="#19374e" metalness={.5} roughness={.4}/></mesh>
 {[.45,.75,.99].map((s,i)=><mesh key={s} rotation={[-Math.PI/2,0,0]} position={[0,.09,0]}><torusGeometry args={[radius*s,i===2?.055:.035,6,80]}/><meshBasicMaterial color={new Color(color).multiplyScalar(1.7)} toneMapped={false}/></mesh>)}
 <mesh position={[0,1.8,0]}><cylinderGeometry args={[radius*.35,radius*.12,3.6,40,1,true]}/><meshBasicMaterial color={color} transparent opacity={.07} depthWrite={false} side={2}/></mesh>
 </group>;
}
