import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { CanvasTexture, Group, MathUtils, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { journeyRuntime } from '../runtime';

export function VehicleNarrative(){
 const plateTexture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const c=canvas.getContext('2d')!;c.fillStyle='#09121b';c.fillRect(0,0,512,160);c.strokeStyle='#c7d5dc';c.lineWidth=6;c.strokeRect(7,7,498,146);
  c.font='bold 78px monospace';c.textAlign='center';c.fillStyle='#e0e6e8';c.fillText('B 1234 ABC',256,101);c.font='20px monospace';c.fillText('10 • 29',256,135);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
 },[]);
 useEffect(()=>()=>plateTexture.dispose(),[plateTexture]);
 const scan=useRef<Group>(null),damage=useRef<Group>(null),beam=useRef<MeshBasicMaterial>(null);
 useFrame(()=>{
  const at=journeyRuntime.position;
  if(scan.current){const a=MathUtils.smoothstep(at,.5,.85)*(1-MathUtils.smoothstep(at,1.55,1.9));scan.current.visible=a>.001;scan.current.scale.setScalar(Math.max(.001,a));}
  if(damage.current){damage.current.visible=at<7.45;damage.current.scale.setScalar(Math.max(.001,1-MathUtils.smoothstep(at,7.15,7.45)));}
  if(beam.current)beam.current.opacity=.25+.2*Math.sin(journeyRuntime.time*1.2)**2;
 });
 return <>
  <mesh position={[0,.46,2.35]}><planeGeometry args={[.65,.21]}/><meshBasicMaterial map={plateTexture} toneMapped={false}/></mesh>
  <group ref={scan} position={[0,.46,2.37]}>
   <Line points={[[-.45,.17,0],[-.45,-.17,0],[.45,-.17,0],[.45,.17,0],[-.45,.17,0]]} color="#71e8ff" lineWidth={2}/>
   <mesh><planeGeometry args={[.92,.018]}/><meshBasicMaterial ref={beam} color="#2ae8ff" transparent opacity={.4} depthWrite={false}/></mesh>
   <pointLight color="#55dfff" intensity={2} distance={1.4}/>
  </group>
  <group ref={damage}>
   <Line points={[[-.96,.46,-2.12],[-.81,.48,-2.26],[-.65,.43,-2.31],[-.45,.47,-2.34]]} color="#dd8e76" lineWidth={1.5}/>
   <Line points={[[-1.04,.56,-1.9],[-.95,.42,-2.03],[-1,.3,-1.97]]} color="#805857" lineWidth={2}/>
  </group>
 </>;
}
