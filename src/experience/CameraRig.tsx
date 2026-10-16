import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector3, type Mesh, type Object3D } from 'three';
import { sampleFov, sampleView } from './cameraPath';
import { journeyRuntime, storyPosition } from './runtime';
import { sampleVehicleRouteAt } from './journeyPath';
import { sampleEntryFov, sampleEntryView } from './entryTransition';

const diagnostics=import.meta.env.DEV || new URLSearchParams(window.location.search).has('scene-diagnostics');
export function CameraRig({reduced}:{reduced:boolean}) {
 const positionRef=useRef(new Vector3()),targetRef=useRef(new Vector3());
 const metrics=useRef({frames:0,elapsed:0,total:0});
 const width=useThree(s=>s.size.width);
 useFrame(({camera,gl,scene},dt)=>{
  const position=positionRef.current,target=targetRef.current;
  const delta=Math.min(dt,.05);const still=reduced||journeyRuntime.paused;
  if(!still)journeyRuntime.time+=delta;
  // Calm mode holds one composition per chapter, the same one the car and the truck take.
  const mobile=width<760;
  const entryActive=journeyRuntime.entryState!=='hero';
  const at=sampleVehicleRouteAt(storyPosition(),reduced);
  if(entryActive) sampleEntryView(journeyRuntime.entryTurn,mobile,position,target);
  else sampleView(at,mobile,position,target);
  if(entryActive && !reduced && journeyRuntime.entryState!=='turning') position.y+=Math.sin(journeyRuntime.time*.7)*.025;
  journeyRuntime.pointerX=still?0:MathUtils.damp(journeyRuntime.pointerX,journeyRuntime.inputX,2.4,delta);
  journeyRuntime.pointerY=still?0:MathUtils.damp(journeyRuntime.pointerY,journeyRuntime.inputY,2.4,delta);
  position.x+=journeyRuntime.pointerX*.5;position.y+=journeyRuntime.pointerY*.15;
  camera.position.copy(position);camera.lookAt(target);
  const perspective=camera as PerspectiveCamera;
  const fov=entryActive?sampleEntryFov(journeyRuntime.entryTurn,mobile):sampleFov(at,mobile);
  if(Math.abs(perspective.fov-fov)>.001){perspective.fov=fov;perspective.updateProjectionMatrix();}
  camera.updateMatrixWorld();
  if(diagnostics){
   if(dt>.25){metrics.current.elapsed=0;metrics.current.frames=0;}
   metrics.current.frames++;metrics.current.total++;metrics.current.elapsed+=dt>.25?0:dt;
   const data=gl.domElement.dataset;
   data.renderedFrames=String(metrics.current.total);
   if(metrics.current.elapsed>=1){data.fps=String(Math.round(metrics.current.frames/metrics.current.elapsed));metrics.current.frames=0;metrics.current.elapsed=0;}
   data.camera=camera.position.toArray().map(n=>n.toFixed(2)).join(',');
   data.target=target.toArray().map(n=>n.toFixed(2)).join(',');data.fov=String(fov);
   data.progress=journeyRuntime.progress.toFixed(4);data.worldPosition=journeyRuntime.position.toFixed(4);
   data.drawCalls=String(gl.info.render.calls);data.triangles=String(gl.info.render.triangles);data.geometries=String(gl.info.memory.geometries);
   if(metrics.current.total<3 || metrics.current.total%30===0 || reduced){
    const vehicles:Object3D[]=[];
    scene.traverse(object=>{if(object.userData.vehicleAsset)vehicles.push(object);});
    const geometries=new Set<string>();let meshes=0;
    vehicles.forEach(vehicle=>vehicle.traverse(object=>{if((object as Mesh).isMesh){meshes++;geometries.add((object as Mesh).geometry.uuid);}}));
    data.vehicleCount=String(vehicles.length);
    data.vehicleAssets=[...new Set(vehicles.map(vehicle=>vehicle.userData.vehicleAsset))].join(',');
    data.vehicleMeshes=String(meshes);data.vehicleGeometries=String(geometries.size);
   }
  }
  gl.info.reset();
 },-2);
 return null;
}
