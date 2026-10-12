import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { CanvasTexture, Group, MathUtils, Matrix4, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial, SRGBColorSpace } from 'three';
import { journeyRuntime } from '../runtime';

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
  const scan=MathUtils.smoothstep(at,1.82,2.05)*(1-MathUtils.smoothstep(at,3.35,3.6));
  const heat=MathUtils.smoothstep(at,4.05,4.22)*(1-MathUtils.smoothstep(at,4.62,4.8));
  material.uniforms.scanStrength.value=scan;
  material.uniforms.heatStrength.value=heat;
  material.uniforms.scanPosition.value=journeyRuntime.reducedMotion?-.9:Math.sin(journeyRuntime.time*.65)*2.5;
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
 const scan=useRef<Group>(null),damage=useRef<Group>(null),beam=useRef<MeshBasicMaterial>(null);
 useFrame(()=>{
  const at=journeyRuntime.position;
  if(scan.current){const a=MathUtils.smoothstep(at,.5,.85)*(1-MathUtils.smoothstep(at,1.55,1.9));scan.current.visible=a>.001;scan.current.scale.setScalar(Math.max(.001,a));}
  if(damage.current){
   const opacity=1-MathUtils.smoothstep(at,7.4,7.65);
   damage.current.visible=opacity>.001;
   damage.current.traverse(object=>{
    const mesh=object as Mesh;if(!mesh.isMesh)return;
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.opacity=opacity;
   });
  }
  if(beam.current)beam.current.opacity=.25+.2*Math.sin(journeyRuntime.time*1.2)**2;
 });
 return <>
  <SurfaceAnalysis model={model}/>
  <mesh position={[0,.46,2.35]}><planeGeometry args={[.65,.21]}/><meshBasicMaterial map={plateTexture} toneMapped={false}/></mesh>
  <group ref={scan} position={[0,.46,2.37]}>
   <Line points={[[-.45,.17,0],[-.45,-.17,0],[.45,-.17,0],[.45,.17,0],[-.45,.17,0]]} color="#71e8ff" lineWidth={2}/>
   <mesh><planeGeometry args={[.92,.018]}/><meshBasicMaterial ref={beam} color="#2ae8ff" transparent opacity={.4} depthWrite={false}/></mesh>
   <pointLight color="#55dfff" intensity={2} distance={1.4}/>
  </group>
  <group ref={damage} scale={1}>
   <Line points={[[-.96,.46,-2.12],[-.81,.48,-2.26],[-.65,.43,-2.31],[-.45,.47,-2.34]]} color="#dd8e76" lineWidth={1.5} transparent/>
   <Line points={[[-1.04,.56,-1.9],[-.95,.42,-2.03],[-1,.3,-1.97]]} color="#805857" lineWidth={2} transparent/>
  </group>
 </>;
}
