import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { AdditiveBlending, BackSide, BufferGeometry, Color, Float32BufferAttribute, InstancedMesh, Object3D, ShaderMaterial, Group, MathUtils, RepeatWrapping, Vector2 } from 'three';
import { journeyRuntime } from '../runtime';
import { seeded } from './roadPath';

function hash(x:number,z:number){return seeded(x*19.19+z*73.73);}
function noise(x:number,z:number) {
 const ix=Math.floor(x),iz=Math.floor(z);let fx=x-ix,fz=z-iz;fx=fx*fx*(3-2*fx);fz=fz*fz*(3-2*fz);
 return (hash(ix,iz)*(1-fx)+hash(ix+1,iz)*fx)*(1-fz)+(hash(ix,iz+1)*(1-fx)+hash(ix+1,iz+1)*fx)*fz;
}
function fbm(x:number,z:number){return noise(x,z)*.55+noise(x*2.1+31,z*2.1)*.26+noise(x*4.3,z*4.3)*.13+noise(x*8.8,z*8.8)*.06;}
function terrain(cx:number,cz:number,sx:number,sz:number,height:number,seed:number,n:number) {
 const vertices:number[]=[],colors:number[]=[],uv:number[]=[],idx:number[]=[];
 for(let z=0;z<=n;z++) for(let x=0;x<=n;x++) {
  const u=x/n*2-1,v=z/n*2-1;
  const ridge=Math.pow(Math.max(0,1-Math.abs(u)),1.25)*Math.pow(Math.max(0,1-v*v),.8);
  const rough=fbm(u*4+seed,v*5);
  const facets=fbm(u*10+seed*2,v*9);
  const y=-15+ridge*height*(.4+rough*.75)+ridge*facets*8;
  vertices.push(cx+u*sx,y,cz+v*sz);uv.push((u*sx+v*sz*.2)/18,y/18);
  const c=new Color().setRGB(.06+rough*.065,.082+rough*.078,.11+rough*.09);
  colors.push(c.r,c.g,c.b);
  if(x<n&&z<n){const k=z*(n+1)+x;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
const ridges = [
 [-150,-42,70,135,100,12],[-190,-180,85,180,122,56],[-140,-315,54,80,94,18],
 [110,-50,32,125,85,42],
 [150,-120,53,66,74,83],[170,-230,54,78,67,14],[213,-340,75,140,100,24],
 [-150,-490,130,150,130,44],[-12,-605,115,100,86,75],[158,-620,160,80,100,65],
 [130,-392,35,46,29,82],
];
function Mountains({detail}:{detail:number}) {
 const [diffuse,normal]=useTexture(['/assets/textures/cliff_side_diff_1k.jpg','/assets/textures/cliff_side_nor_gl_1k.jpg']);
 useEffect(()=>{[diffuse,normal].forEach(t=>{t.wrapS=t.wrapT=RepeatWrapping;t.anisotropy=4;t.needsUpdate=true;});},[diffuse,normal]);
 const geometries=useMemo(()=>ridges.map(p=>terrain(...p as [number,number,number,number,number,number],detail)),[detail]);
 useEffect(()=>()=>geometries.forEach(g=>g.dispose()),[geometries]);
 return <group>{geometries.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial map={diffuse} normalMap={normal} normalScale={new Vector2(.45,.45)} color="#293746" roughness={.88} metalness={.02}/></mesh>)}</group>;
}
const skyVertex=`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const skyFragment=`varying vec3 vP;uniform float success;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=noise(p)*a;p=p*2.13+vec2(13.,4.);a*=.5;}return n;}
void main(){vec3 d=normalize(vP);float h=max(0.,d.y);vec3 col=mix(vec3(.038,.068,.105),vec3(.004,.011,.024),pow(h,.5));
vec2 p=d.xz/(abs(d.y)+.23)*2.7;float cloud=fbm(p+fbm(p*.7)*2.);float light=pow(max(0.,dot(d,normalize(vec3(-.35,.24,-.7)))),8.);
float rim=smoothstep(.4,.55,cloud)*(1.-smoothstep(.55,.64,cloud));
col=mix(col,vec3(.008,.018,.032),smoothstep(.4,.67,cloud)*.8);col+=vec3(.11,.16,.2)*rim*light;
col+=vec3(.16,.13,.08)*success*pow(1.-h,5.);gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const waterFragment=`varying vec3 vP;uniform float time;void main(){vec2 p=vP.xz;float ripple=sin(p.y*3.+sin(p.x*.13)*2.+time*.3)*.25+.75;float horizon=exp(-abs(p.y+400.)*.009);float reflection=exp(-abs(p.x-70.)*.012);float stripe=pow(max(0.,sin(p.x*1.1+sin(p.y*.07)*.15)),15.);vec3 col=vec3(.008,.022,.044)+ripple*.003;col+=vec3(.11,.20,.32)*reflection*horizon*(.1+stripe*.3)*ripple;float haze=1.-exp(-length(cameraPosition-vP)*.0014);col=mix(col,vec3(.023,.051,.095),haze);gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const waterVertex=`varying vec3 vP;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}`;
const fogFragment=`varying vec2 vUv; uniform float time; float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}void main(){vec2 p=vUv*8.+vec2(time*.01,0.);float n=noise(p)*.5+noise(p*2.3)*.3+noise(p*5.)*.2;float edge=pow(max(0.,1.-length((vUv-.5)*2.)),1.2);gl_FragColor=vec4(.27,.43,.60,edge*smoothstep(.22,.8,n)*.46);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
function Mist() {
 const materials=useRef<(ShaderMaterial|null)[]>([]);
 useFrame(()=>materials.current.forEach(m=>{if(m)m.uniforms.time.value=journeyRuntime.time;}));
 return <group>{[[-68,-3,-62,175,120],[25,-5,-128,190,145],[-25,-4,-247,200,160],[90,-2,-390,250,180]].map((p,i)=><mesh key={i} position={[p[0],p[1],p[2]]} rotation={[-Math.PI/2,0,i*.63]}>
 <planeGeometry args={[p[3],p[4]]}/><shaderMaterial ref={m=>{materials.current[i]=m;}} uniforms={{time:{value:0}}} vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader={fogFragment} transparent depthWrite={false}/>
 </mesh>)}</group>;
}
function City({count}:{count:number}) {
 const buildings=useRef<InstancedMesh>(null);const windows=useRef<InstancedMesh>(null);
 const dummy=useMemo(()=>new Object3D(),[]);
 useEffect(()=>{
  if(!buildings.current||!windows.current)return;
  const color=new Color();
  for(let i=0;i<count;i++){
   let x=-30+(seeded(i+20)-.5)*210;const z=-360-seeded(i+680)*190;
   const h=4+Math.pow(seeded(i+224),2)*47;const w=1.2+seeded(i+2345)*4;
   // Reserve the actual approach corridor in every density tier.
   const roadX=60+Math.min(20,(-z-340)*.16);
   if(Math.abs(x-roadX)<20+w)x=roadX+Math.sign(x-roadX||1)*(21+w);
   dummy.position.set(x,h/2-11,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,w);dummy.updateMatrix();buildings.current.setMatrixAt(i,dummy.matrix);
   buildings.current.setColorAt(i,color.setHSL(.59,.20,.06+seeded(i)*.08));
   for(let j=0;j<10;j++){
    dummy.position.set(x+(seeded(i*10+j)-.5)*w*.8,-10+seeded(j*20+i)*h,z+w*.505);
    dummy.scale.set(.15+seeded(j+i)*.15,.25,.04);dummy.updateMatrix();windows.current.setMatrixAt(i*10+j,dummy.matrix);
    windows.current.setColorAt(i*10+j,color.set(j%3?'#ffe0ae':'#91cfff'));
   }
  }
  buildings.current.instanceMatrix.needsUpdate=true;windows.current.instanceMatrix.needsUpdate=true;
 },[count,dummy]);
 return <group>
 <instancedMesh ref={buildings} args={[undefined,undefined,count]}><boxGeometry/><meshStandardMaterial roughness={.3} metalness={.6}/></instancedMesh>
 <instancedMesh ref={windows} args={[undefined,undefined,count*10]}><boxGeometry/><meshBasicMaterial toneMapped={false} color={[1.5,1.5,1.5]}/></instancedMesh>
 <mesh position={[55,-12,-420]}><cylinderGeometry args={[80,90,1,64]}/><meshStandardMaterial color="#081a2c" roughness={.8} metalness={.15}/></mesh>
 </group>;
}
function Gateway() {
 const crystal=useRef<Group>(null);
 useFrame(()=>{if(crystal.current)crystal.current.scale.setScalar(Math.max(.001,1-MathUtils.smoothstep(journeyRuntime.position,4.5,4.95)));});
 return <group position={[76,5,-415]} scale={1.2}>
  {[-1,1].map(side=><group key={side} position={[side*10,16,0]} rotation={[0,0,side*.48]}>
   <mesh><boxGeometry args={[4.5,38,5]}/><meshStandardMaterial color="#24486a" emissive="#216baa" emissiveIntensity={.3} roughness={.24} metalness={.65}/></mesh>
   <mesh position={[side*2.3,0,2.6]}><boxGeometry args={[.16,38,.16]}/><meshBasicMaterial color={[1.5,2.5,4]} toneMapped={false}/></mesh>
  </group>)}
  <group ref={crystal}><mesh position={[0,8,0]}><octahedronGeometry args={[7,0]}/><meshStandardMaterial color="#8ccaff" emissive="#448bcc" emissiveIntensity={.7} metalness={.8} roughness={.2}/></mesh></group>
  <mesh position={[0,74,0]}><cylinderGeometry args={[.035,.06,90,8]}/><meshBasicMaterial color="#70b9ff" transparent opacity={.5}/></mesh>
  {[39,46].map((r,i)=><mesh key={r} position={[0,34+i*4,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[r,.045,5,180]}/><meshBasicMaterial color="#6fb7e7" transparent opacity={.45}/></mesh>)}
 </group>;
}
function Atmosphere({count}:{count:number}) {
 const particles=useMemo(()=>{
  const g=new BufferGeometry(),p=[];for(let i=0;i<count;i++)p.push((seeded(i+21)-.5)*500,seeded(i+131)*140,60-seeded(i+890)*660);
  g.setAttribute('position',new Float32BufferAttribute(p,3));return g;
 },[count]);
 useEffect(()=>()=>particles.dispose(),[particles]);
 return <points geometry={particles}><pointsMaterial color="#cbe6ff" size={.12} transparent opacity={.52} depthWrite={false} blending={AdditiveBlending}/></points>;
}
export function Landscape({quality}:{quality:'high'|'medium'|'low'}) {
 const sky=useRef<ShaderMaterial>(null),water=useRef<ShaderMaterial>(null);
 const skyUniforms=useMemo(()=>({success:{value:0}}),[]),waterUniforms=useMemo(()=>({time:{value:0}}),[]);
 useFrame(()=>{if(water.current)water.current.uniforms.time.value=journeyRuntime.time;if(sky.current)sky.current.uniforms.success.value=Math.max(0,Math.min(1,journeyRuntime.position-4.7));});
 return <>
  <mesh><sphereGeometry args={[3500,32,20]}/><shaderMaterial ref={sky} vertexShader={skyVertex} fragmentShader={skyFragment} uniforms={skyUniforms} side={BackSide} depthWrite={false}/></mesh>
  <mesh position={[0,-13,-240]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[8000,8000]}/><shaderMaterial ref={water} vertexShader={waterVertex} fragmentShader={waterFragment} uniforms={waterUniforms}/></mesh>
  <Mountains detail={quality==='low'?48:quality==='medium'?72:100}/><City count={quality==='low'?80:quality==='medium'?130:190}/><Gateway/><Mist/><Atmosphere count={quality==='low'?100:quality==='medium'?240:420}/>
 </>;
}
