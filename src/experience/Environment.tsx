import { Environment as ReflectionEnvironment, Lightformer } from '@react-three/drei';
import { Landscape } from './world/Landscape';
import { DigitalHighway } from './world/DigitalHighway';
import { IncidentScene } from './world/IncidentScene';
import { RoadsideStories } from './world/RoadsideStories';

export function Environment({low,quality}:{low:boolean;quality:'high'|'medium'|'low'}) {
 return <>
  <color attach="background" args={['#0b182a']}/>
  <fog attach="fog" args={['#172c43',100,730]}/>
  <ambientLight intensity={.32} color="#a6c9f5"/>
  <hemisphereLight args={['#b9d6fa','#182432',.85]}/>
  <directionalLight position={[50,90,25]} color="#cce7ff" intensity={1.7}/>
  <directionalLight position={[-60,30,-80]} color="#629de7" intensity={1.05}/>
  <ReflectionEnvironment files="/assets/hdri/kloppenheim_06_puresky_1k.hdr" resolution={128} frames={1} environmentIntensity={.38}>
   <Lightformer form="rect" intensity={4} color="#b8d9ff" position={[0,8,0]} rotation={[Math.PI/2,0,0]} scale={[10,20,1]}/>
   <Lightformer form="rect" intensity={3} color="#4699ff" position={[-8,2,0]} rotation={[0,Math.PI/2,0]} scale={[4,20,1]}/>
   <Lightformer form="rect" intensity={3} color="#ffffff" position={[8,4,-4]} rotation={[0,-Math.PI/2,0]} scale={[3,20,1]}/>
  </ReflectionEnvironment>
  <Landscape quality={quality}/><DigitalHighway low={low} quality={quality}/><IncidentScene/><RoadsideStories/>

 </>;
}
