import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { CanvasTexture, Group, MathUtils, Matrix4, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial, SRGBColorSpace, Vector3 } from 'three';
import { journeyRuntime } from '../runtime';
import { ROADSIDE_TIMING } from '../story';
import { offerAccentLight } from './accentLight';

/** Where the plate scan's glow comes from (one car in the story, so module scratch is fine). */
const plateGlow = new Vector3();

const surfaceVertex = `
varying vec3 vSurfacePosition;
varying vec3 vSurfaceNormal;
void main() {
  vSurfacePosition = position;
  vSurfaceNormal = normalize(normal);
  // A slight surface-normal offset prevents z-fighting without moving the scan off the body.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normalize(normal) * .003, 1.);
}`;

const surfaceFragment = `
uniform float scanStrength;
uniform float heatStrength;
uniform float scanPosition;
varying vec3 vSurfacePosition;
varying vec3 vSurfaceNormal;
void main() {
  vec3 cells = vSurfacePosition * vec3(5., 7., 5.);
  vec3 width = max(fwidth(cells), vec3(.001));
  vec3 edge = 1. - smoothstep(width * .7, width * 1.65, abs(fract(cells + .5) - .5));
  vec3 weights = pow(abs(normalize(vSurfaceNormal)), vec3(4.));
  weights /= max(dot(weights, vec3(1.)), .001);
  float grid = dot(weights, vec3(max(edge.y, edge.z), max(edge.x, edge.z), max(edge.x, edge.y)));
  float separation = abs(vSurfacePosition.z - scanPosition);
  float sweep = exp(-separation * separation / .018);
  float halo = exp(-separation * 2.8);
  float scanAlpha = scanStrength * (.11 * grid + .42 * sweep + .04 * halo);

  // Damage is localized to the same front-left bumper/fender as the physical marks.
  vec3 component = (vSurfacePosition - vec3(-.79, .45, -2.07)) / vec3(.46, .38, .56);
  float heat = 1. - smoothstep(.25, 1., length(component));
  heat *= 1. - smoothstep(-.35, -.1, vSurfacePosition.x);
  float heatAlpha = heatStrength * heat * (.43 + .16 * grid);
  float alpha = min(.64, scanAlpha + heatAlpha);
  if (alpha < .002) discard;
  vec3 cyan = vec3(.19, .72, .94);
  vec3 warm = mix(vec3(.95, .37, .12), vec3(1., .65, .29), heat);
  vec3 color = (cyan * scanAlpha + warm * heatAlpha) / max(scanAlpha + heatAlpha, .001);
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`;

function SurfaceAnalysis({ model }: { model: Object3D }) {
 const surface=useRef<Group>(null);
 const panels=useMemo(()=>{
  const pieces:{key:string;geometry:Mesh['geometry'];matrix:Matrix4}[]=[];
  model.traverse(object=>{
   const mesh=object as Mesh;
   if(!mesh.isMesh || Array.isArray(mesh.material) || mesh.material.name!=='Aventador pearl silver')return;
   // Preserve the loaded hierarchy's local transforms while sharing its cached vertex buffers.
   const matrix=new Matrix4();
   let node:Object3D|null=mesh;
   while(node && node!==model.parent){
    if(node.matrixAutoUpdate)node.updateMatrix();
    matrix.premultiply(node.matrix);
    node=node.parent;
   }
   pieces.push({key:mesh.uuid,geometry:mesh.geometry,matrix});
  });
  return pieces;
 },[model]);
 const material=useMemo(()=>new ShaderMaterial({
  name:'DRIVE surface analysis',
  vertexShader:surfaceVertex,fragmentShader:surfaceFragment,
  uniforms:{scanStrength:{value:0},heatStrength:{value:0},scanPosition:{value:0}},
  transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
 }),[]);
 useEffect(()=>()=>material.dispose(),[material]);
 useFrame(()=>{
  const at=journeyRuntime.position;
  // The grid scans while the photos are taken; the damage glows once the result returns
  // and through the unlocked details, then is gone with the repair.
  const entry=journeyRuntime.entryState!=='hero';
  const scan=entry?journeyRuntime.entryScanStrength:MathUtils.smoothstep(at,ROADSIDE_TIMING.orbitFrom-.04,ROADSIDE_TIMING.orbitFrom+.08)*(1-MathUtils.smoothstep(at,ROADSIDE_TIMING.orbitTo,ROADSIDE_TIMING.orbitTo+.14));
  const heat=entry?journeyRuntime.entryDamageStrength:MathUtils.smoothstep(at,ROADSIDE_TIMING.resultAt-.02,ROADSIDE_TIMING.resultAt+.12)*(1-MathUtils.smoothstep(at,4.82,5.02));
  // Every overlay shares one material; the frame loop reaches it through the rendered mesh.
  const overlay=surface.current?.children[0] as Mesh|undefined;
  const uniforms=(overlay?.material as ShaderMaterial|undefined)?.uniforms;
  if(uniforms){
   uniforms.scanStrength.value=scan;
   uniforms.heatStrength.value=heat;
   uniforms.scanPosition.value=entry?MathUtils.lerp(-2.5,2.5,journeyRuntime.entryScan):(journeyRuntime.reducedMotion?-.9:Math.sin(journeyRuntime.time*.65)*2.5);
  }
  if(surface.current)surface.current.visible=scan+heat>.001;
 });
 return <group ref={surface} name="vehicle-surface-analysis" visible={false}>
  {panels.map(panel=><mesh key={panel.key} name="body-analysis-overlay" geometry={panel.geometry} material={material}
   matrix={panel.matrix} matrixAutoUpdate={false} dispose={null}/>) }
 </group>;
}

export function VehicleNarrative({model}:{model:Object3D}){
 const plateTexture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const c=canvas.getContext('2d')!;c.fillStyle='#09121b';c.fillRect(0,0,512,160);c.strokeStyle='#c7d5dc';c.lineWidth=6;c.strokeRect(7,7,498,146);
  c.font='bold 78px monospace';c.textAlign='center';c.fillStyle='#e0e6e8';c.fillText('B 1234 ABC',256,101);c.font='20px monospace';c.fillText('10 • 29',256,135);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
 },[]);
 useEffect(()=>()=>plateTexture.dispose(),[plateTexture]);
 const scan=useRef<Group>(null),beam=useRef<MeshBasicMaterial>(null);
 useFrame(()=>{
  const at=journeyRuntime.position;
  // The plate is read after the car has stopped (chapter 2), not while it is still braking.
  if(scan.current){const a=MathUtils.smoothstep(at,1.02,1.25)*(1-MathUtils.smoothstep(at,1.55,1.9));scan.current.visible=a>.001;scan.current.scale.setScalar(Math.max(.001,a));if(scan.current.visible)offerAccentLight(2,'#55dfff',scan.current.getWorldPosition(plateGlow),1.4,2);}
  if(beam.current)beam.current.opacity=.25+.2*Math.sin(journeyRuntime.time*1.2)**2;
 });
 return <>
  <SurfaceAnalysis model={model}/>
  <mesh position={[0,.46,2.35]}><planeGeometry args={[.65,.21]}/><meshBasicMaterial map={plateTexture} toneMapped={false}/></mesh>
  <group ref={scan} position={[0,.46,2.37]}>
   <Line points={[[-.45,.17,0],[-.45,-.17,0],[.45,-.17,0],[.45,.17,0],[-.45,.17,0]]} color="#71e8ff" lineWidth={2}/>
   <mesh><planeGeometry args={[.92,.018]}/><meshBasicMaterial ref={beam} color="#2ae8ff" transparent opacity={.4} depthWrite={false}/></mesh>
  </group>
 </>;
}
