import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Group, InstancedMesh, MathUtils, Object3D, Quaternion, RepeatWrapping, Vector2, Vector3 } from 'three';
import { useTexture } from '@react-three/drei';
import { highway, roadSide, seeded, stripGeometry } from './roadPath';
import { journeyRuntime } from '../runtime';
import { Vehicle } from '../Vehicle';
import { sampleVehicleRoadProgress, VEHICLE_CLEARANCE, VEHICLE_LANE } from '../journeyPath';

const diagnostics=import.meta.env.DEV || new URLSearchParams(window.location.search).has('scene-diagnostics');

function Strip({ offset, width, height, color }: {offset:number; width:number; height:number; color:string}) {
 const geometry=useMemo(()=>stripGeometry(offset,width,height),[offset,width,height]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry}><meshBasicMaterial color={new Color(color).multiplyScalar(2)} toneMapped={false}/></mesh>;
}

export function DigitalHighway({low,quality}:{low:boolean;quality:'high'|'medium'|'low'}) {
 const [asphalt,normalMap]=useTexture(['/assets/textures/asphalt_02_diff_1k.jpg','/assets/textures/asphalt_02_nor_gl_1k.jpg']);
 useEffect(()=>{for(const texture of [asphalt,normalMap]){texture.wrapS=texture.wrapT=RepeatWrapping;texture.anisotropy=4;texture.needsUpdate=true;}},[asphalt,normalMap]);
 const surface=useMemo(()=>stripGeometry(0,17,0),[]);
 const foundation=useMemo(()=>stripGeometry(0,18.4,-.32),[]);
 const posts=useRef<InstancedMesh>(null);
 const legs=useRef<InstancedMesh>(null);
 const streaks=useRef<InstancedMesh>(null);
 const scratch=useMemo(()=>new Object3D(),[]);
 const vehicle=useRef<Group>(null);
 const vehicleMetrics=useMemo(()=>({position:new Vector3(),quaternion:new Quaternion()}),[]);
 const count=low?28:quality==='medium'?48:72;
 const uniforms=useMemo(()=>({time:{value:0},signal:{value:new Color('#4eacff')},asphalt:{value:asphalt},normalMap:{value:normalMap}}),[asphalt,normalMap]);
 useEffect(()=>()=>{surface.dispose();foundation.dispose();},[surface,foundation]);
 useEffect(()=>{
  if(!posts.current||!legs.current)return;
  for(let i=0;i<160;i++) {
   const p=roadSide(i/160, i%2?8.75:-8.75,.45);
   scratch.position.copy(p);scratch.scale.set(.10,.9,.10);scratch.rotation.set(0,0,0);scratch.updateMatrix();posts.current.setMatrixAt(i,scratch.matrix);
  }
  for(let i=0;i<65;i++) {
   const p=roadSide(i/65,0,-7.6); scratch.position.copy(p); scratch.scale.set(2.6,14,1.5);scratch.updateMatrix(); legs.current.setMatrixAt(i,scratch.matrix);
  }
  posts.current.instanceMatrix.needsUpdate=true;legs.current.instanceMatrix.needsUpdate=true;
 },[scratch]);
 useFrame(({gl})=>{
  const at=journeyRuntime.position;
  uniforms.time.value=journeyRuntime.time;uniforms.signal.value.set(at>4.65?'#5beac7':'#4eacff').lerp(new Color('#ff674c'),1-MathUtils.smoothstep(at,.65,1.3));
  if(vehicle.current){
   const routeAt=journeyRuntime.reducedMotion?Math.min(7,Math.floor(at+.18)):at;
   const t=sampleVehicleRoadProgress(routeAt);
   const p=roadSide(t,VEHICLE_LANE,VEHICLE_CLEARANCE);const tangent=highway.getTangentAt(t);
   vehicle.current.position.copy(p);
   vehicle.current.rotation.set(Math.asin(tangent.y),Math.atan2(-tangent.x,-tangent.z),0,'YXZ');
   if(diagnostics){
    vehicle.current.getWorldPosition(vehicleMetrics.position);vehicle.current.getWorldQuaternion(vehicleMetrics.quaternion);
    const data=gl.domElement.dataset;
    data.vehicleCarrier=vehicle.current.uuid;
    data.vehicleWorldPosition=vehicleMetrics.position.toArray().join(',');
    data.vehicleWorldQuaternion=vehicleMetrics.quaternion.toArray().join(',');
    data.vehicleVisible=String(vehicle.current.visible);
    data.vehicleRoadProgress=String(t);data.vehicleRouteAt=String(routeAt);
   }
  }
  if(streaks.current) {
   for(let i=0;i<count;i++) {
    const t=(seeded(i+91)+journeyRuntime.time*.018)%1;const p=roadSide(t,[-7.9,-6,-1.2,3.6,7.9][i%5],.065);
    const tangent=highway.getTangentAt(t);scratch.position.copy(p);scratch.rotation.set(0,Math.atan2(tangent.x,tangent.z),0);
    scratch.scale.set(i%3===0?.085:.04,.035,2+seeded(i)*9);scratch.updateMatrix();streaks.current.setMatrixAt(i,scratch.matrix);
   }
   streaks.current.instanceMatrix.needsUpdate=true;
  }
 });
 return <group>
  <mesh geometry={foundation}><meshStandardMaterial color="#152436" roughness={.4} metalness={.65}/></mesh>
  <mesh geometry={surface}><meshPhysicalMaterial map={asphalt} normalMap={normalMap} normalScale={new Vector2(.32,.32)}
   color="#647381" roughness={.23} metalness={.65} clearcoat={1} clearcoatRoughness={.14} envMapIntensity={.65}
   onBeforeCompile={shader=>{
    shader.uniforms.roadSignal=uniforms.signal;
    shader.vertexShader='varying vec2 vRoadUv;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvRoadUv=uv;');
    shader.fragmentShader='varying vec2 vRoadUv;uniform vec3 roadSignal;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
     float lane=(1.-smoothstep(.002,.006,min(abs(vRoadUv.x-.25),abs(vRoadUv.x-.75))))*step(.55,fract(vRoadUv.y*3.4));
     float edge=exp(-abs(vRoadUv.x-.035)*15.)+exp(-abs(vRoadUv.x-.965)*15.);
     float ripple=pow(.5+.5*sin(vRoadUv.y*470.+sin(vRoadUv.x*260.)*2.),3.);
     totalEmissiveRadiance+=vec3(.25,.29,.31)*lane+roadSignal*edge*ripple*.055;
    `);
   }}/></mesh>
  {[-8.6,8.6].map((offset)=><group key={offset}>
   <Strip offset={offset} width={.1} height={.08} color="#839fb3"/>
   <Strip offset={offset} width={.06} height={.92} color="#668399"/>
   <Strip offset={offset+Math.sign(offset)*.25} width={.23} height={.06} color="#255c91"/>
   <Strip offset={offset-Math.sign(offset)*.2} width={.65} height={.015} color="#163450"/>
  </group>)}
  <Strip offset={0} width={.06} height={.035} color="#6792bb"/>
  <instancedMesh ref={posts} args={[undefined,undefined,160]}><boxGeometry/><meshStandardMaterial color="#6287a7" metalness={.8} roughness={.3}/></instancedMesh>
  <instancedMesh ref={legs} args={[undefined,undefined,65]}><boxGeometry/><meshStandardMaterial color="#24384b" roughness={.8}/></instancedMesh>
  <instancedMesh ref={streaks} args={[undefined,undefined,count]} frustumCulled={false}><boxGeometry/><meshBasicMaterial color={[1.1,2.2,3.5]} toneMapped={false}/></instancedMesh>
  <group ref={vehicle} name="journey-vehicle"><Vehicle low={low} scale={1.2}/></group>
 </group>;
}
