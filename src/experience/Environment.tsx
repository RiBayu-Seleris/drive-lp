import { Environment as ReflectionEnvironment, Lightformer } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DirectionalLight, MathUtils } from 'three';
import { journeyRuntime } from './runtime';
import { Landscape } from './world/Landscape';
import { DigitalHighway } from './world/DigitalHighway';
import { IncidentScene } from './world/IncidentScene';
import { RoadsideStories } from './world/RoadsideStories';
import { CoastalArchitecture } from './world/ServiceArchitecture';

function JourneyLight() {
 const sun=useRef<DirectionalLight>(null);
 const colors=useMemo(()=>({cool:new Color('#cce7ff'),warm:new Color('#ffe4b0'),fogCool:new Color('#172c43'),fogWarm:new Color('#635a54')}),[]);
 useFrame(({scene})=>{
  const dawn=MathUtils.smoothstep(journeyRuntime.position,7.3,7.9);
  if(sun.current){sun.current.color.copy(colors.cool).lerp(colors.warm,dawn);sun.current.intensity=1.7+dawn*.35;}
  if(scene.fog)scene.fog.color.copy(colors.fogCool).lerp(colors.fogWarm,dawn*.55);
 });
 return <directionalLight ref={sun} position={[50,90,25]} color="#cce7ff" intensity={1.7}/>;
}

export function Environment({low,quality}:{low:boolean;quality:'high'|'medium'|'low'}) {
 return <>
  <color attach="background" args={['#0b182a']}/>
  <fog attach="fog" args={['#172c43',100,730]}/>
  <ambientLight intensity={.32} color="#a6c9f5"/>
  <hemisphereLight args={['#b9d6fa','#182432',.85]}/>
  <JourneyLight/>
  <directionalLight position={[-60,30,-80]} color="#629de7" intensity={1.05}/>
  <ReflectionEnvironment files="/assets/hdri/kloppenheim_06_puresky_1k.hdr" resolution={128} frames={1} environmentIntensity={.3}>
   <Lightformer form="rect" intensity={1.5} color="#b8d9ff" position={[0,8,0]} rotation={[Math.PI/2,0,0]} scale={[10,20,1]}/>
   <Lightformer form="rect" intensity={1} color="#4699ff" position={[-8,2,0]} rotation={[0,Math.PI/2,0]} scale={[4,20,1]}/>
   <Lightformer form="rect" intensity={1} color="#ffffff" position={[8,4,-4]} rotation={[0,-Math.PI/2,0]} scale={[3,20,1]}/>
  </ReflectionEnvironment>
  <Landscape quality={quality}/><CoastalArchitecture/><DigitalHighway low={low} quality={quality}/><IncidentScene/><RoadsideStories/>

 </>;
}
