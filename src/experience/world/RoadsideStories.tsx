import { useLayoutEffect, useMemo, useRef, type ComponentProps, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Line } from '@react-three/drei';
import { CatmullRomCurve3, Group, MathUtils, Material, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { journeyRuntime } from '../runtime';
import { PHOTO_ANGLES, PHOTO_CAPTURES, sampleView } from '../cameraPath';
import { createTruckPose, ROAD_LENGTH, sampleTowTruck, WORKSHOP } from '../journeyPath';
import { RECOVERY_TIMING, ROADSIDE_TIMING } from '../story';
import { roadSide } from './roadPath';
import { DataRoute, ScannerRing, type Point3 } from './SignalSystems';
import { JourneyPanel } from './JourneyPanel';
import { HologramPanel, type VehicleView } from './HologramPanel';
import { Workshop } from './ServiceArchitecture';
import { TowTruck } from './TowTruck';
import { besideParkedCar } from './incidentSite';
import { offerAccentLight } from './accentLight';
import { TOWER_PEAK, towerPeakHeight } from './terrain';
import { CITY_GROUND, DOWNTOWN } from './cityLayout';

interface FadeState { base: number; written: number; depthWrite: boolean }
/** A fade's record of a material, made on first sight (the material turns transparent then). */
function fadeState(states: WeakMap<Material, FadeState>, material: Material) {
 let state=states.get(material);
 if(!state){
  state={base:material.opacity,written:Number.NaN,depthWrite:material.depthWrite};states.set(material,state);
  if(!material.transparent){material.transparent=true;material.needsUpdate=true;}
 }
 return state;
}

/**
 * Fades a group in and out over a story window by scaling its materials' opacity. A child may
 * animate a material's opacity itself; whatever it last wrote is taken as the base. Materials
 * turn transparent when the group mounts, so their shaders are compiled with the rest of the
 * scene up front instead of when the group first appears.
 */
function SceneFade({start,end,children}:{start:number;end:number;children:ReactNode}){
 const group=useRef<Group>(null);
 const states=useRef(new WeakMap<Material,FadeState>());
 useLayoutEffect(()=>{
  group.current?.traverse(object=>{const mesh=object as Mesh;if(mesh.isMesh)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])fadeState(states.current,material);});
 },[]);
 useFrame(()=>{
  if(!group.current)return;
  const at=journeyRuntime.position;
  const a=MathUtils.smoothstep(at,start-.22,start+.08)*(1-MathUtils.smoothstep(at,end-.2,end));
  group.current.visible=a>.001;
  if(!group.current.visible)return;
  group.current.traverse(object=>{
   const mesh=object as Mesh;if(!mesh.isMesh)return;
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    const state=fadeState(states.current,material);
    if(material.opacity!==state.written)state.base=material.opacity;
    material.opacity=state.written=state.base*a;material.depthWrite=a>.98&&state.depthWrite;
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

// --- Fixed points of the roadside story --------------------------------------------------------

const toArray = (point: Vector3): Point3 => [point.x, point.y, point.z];
/** The car's roof, where data leaves and arrives. */
const CAR_TOP = besideParkedCar(0, 2.2, 0);
/** DRIVE's analysis tower on the far headland: the photos go there. */
const TOWER_TOP = new Vector3(TOWER_PEAK.x, towerPeakHeight(TOWER_PEAK.x, TOWER_PEAK.z) + 31, TOWER_PEAK.z);
/** The insurer, across the bay downtown: the claim goes there. */
const INSURER = new Vector3(DOWNTOWN.x, CITY_GROUND + 70, DOWNTOWN.z);
/** Partner workshops lit by the search; the first is the bay the car will be taken to. */
const WORKSHOPS: { position: Vector3; chosen: boolean }[] = [
  { position: roadSide(WORKSHOP.standS / ROAD_LENGTH, (WORKSHOP.building.near + WORKSHOP.building.far) / 2, 7), chosen: true },
  { position: new Vector3(-118, CITY_GROUND, -520), chosen: false },
  { position: new Vector3(86, CITY_GROUND, -526), chosen: false },
];

/** An arc between two points, high enough to clear what lies between them. */
function arc(from: Vector3, to: Vector3, lift: number) {
  const middle = from.clone().lerp(to, 0.5);
  middle.y = Math.max(from.y, to.y) + lift;
  return new CatmullRomCurve3([from.clone(), middle, to.clone()]);
}
const UPLOAD_ARC = arc(CAR_TOP, TOWER_TOP, 36);
const CLAIM_ARC = arc(CAR_TOP, INSURER, 90);

/** A bright bead travelling a curve between two story positions, scroll-driven. */
function Pulse({ curve, from, to, color, reverse = false, size = 0.9 }: { curve: CatmullRomCurve3; from: number; to: number; color: [number, number, number]; reverse?: boolean; size?: number }) {
  const bead = useRef<Mesh>(null);
  useFrame(() => {
    if (!bead.current) return;
    const at = journeyRuntime.position;
    const u = MathUtils.clamp((at - from) / (to - from), 0, 1);
    bead.current.visible = at > from && at < to;
    curve.getPoint(reverse ? 1 - u : u, bead.current.position);
  });
  return <mesh ref={bead} visible={false}><sphereGeometry args={[size, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>;
}

/** A ring that flashes out from the car when something arrives. */
function ArrivalRing({ at: moment, color }: { at: number; color: [number, number, number] }) {
  const ring = useRef<Mesh>(null);
  const centre = useMemo(() => besideParkedCar(0, 0.12, 0), []);
  useFrame(() => {
    if (!ring.current) return;
    const progress = (journeyRuntime.position - moment) / 0.1;
    ring.current.visible = progress > 0 && progress < 1;
    ring.current.scale.setScalar(1 + progress * 7);
    (ring.current.material as MeshBasicMaterial).opacity = Math.pow(1 - MathUtils.clamp(progress, 0, 1), 1.5);
  });
  return <mesh ref={ring} position={centre} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
    <ringGeometry args={[1, 1.07, 96]} />
    <meshBasicMaterial color={color} toneMapped={false} transparent depthWrite={false} />
  </mesh>;
}

// --- 03 · Photos ---------------------------------------------------------------------------------

/** The scan ring rides up and down the car while it is photographed. */
function ScanField(){
 const sweep=useRef<Group>(null);
 const centre=useMemo(()=>besideParkedCar(0,0,0),[]);
 useFrame(()=>{if(sweep.current)sweep.current.position.y=centre.y+.3+(Math.sin(journeyRuntime.time*.8)*.5+.5)*2;});
 return <group ref={sweep} position={centre}><ScannerRing radius={3.7} rotation={[Math.PI/2,0,0]}/></group>;
}

/** A phone flash from where the photographer stands, at each of the four photos. */
function CaptureFlashes() {
  const flash = useRef<Group>(null);
  const spot = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const at = journeyRuntime.position;
    let strength = 0, which = 0;
    PHOTO_CAPTURES.forEach((time, index) => {
      const pulse = Math.exp(-Math.pow((at - time) / 0.01, 2));
      if (pulse > strength) { strength = pulse; which = index; }
    });
    if (journeyRuntime.reducedMotion) strength = 0;
    const angle = PHOTO_ANGLES[which] * Math.PI / 180;
    besideParkedCar(Math.sin(angle) * 4.2, 1.5, -Math.cos(angle) * 4.2, spot);
    if (strength > 0.001) offerAccentLight(strength * 40, '#eef4ff', spot, 12);
    if (flash.current) {
      flash.current.position.copy(spot);
      flash.current.visible = strength > 0.01;
      flash.current.scale.setScalar(0.4 + strength);
    }
  });
  return <>
    <group ref={flash} visible={false}>
      <Billboard><mesh><circleGeometry args={[0.16, 16]} /><meshBasicMaterial color={[6, 6, 6]} toneMapped={false} /></mesh></Billboard>
    </group>
  </>;
}

// --- 04 · Upload and result ----------------------------------------------------------------------

const PHOTO_VIEWS: { view: VehicleView; title: string }[] = [
  { view: 'rear', title: 'FOTO BELAKANG' }, { view: 'right', title: 'FOTO KANAN' },
  { view: 'front', title: 'FOTO DEPAN' }, { view: 'left', title: 'FOTO KIRI' },
];

/** The four photos lift off the car and travel to the analysis tower, one after another. */
function PhotoUpload() {
  const mobile = useThree(s => s.size.width < 760);
  const frames = useRef<(Group | null)[]>([]);
  const paths = useMemo(() => PHOTO_VIEWS.map((_, index) => {
    const start = besideParkedCar(-3.3 + index * 2.2, 3.4, 0);
    const middle = start.clone().lerp(TOWER_TOP, 0.45);
    middle.y += 30;
    return new CatmullRomCurve3([start, middle, TOWER_TOP.clone()]);
  }), []);
  useFrame(() => {
    const at = journeyRuntime.position;
    frames.current.forEach((frame, index) => {
      if (!frame) return;
      const from = ROADSIDE_TIMING.uploadFrom + index * 0.05;
      const u = MathUtils.smootherstep(at, from, from + 0.26);
      frame.visible = at > ROADSIDE_TIMING.uploadFrom - 0.12 && u < 0.999;
      paths[index].getPoint(u, frame.position);
      frame.scale.setScalar(MathUtils.lerp(1, 0.2, u));
    });
  });
  return <group>{PHOTO_VIEWS.map((photo, index) => <group key={photo.view} ref={group => { frames.current[index] = group; }} visible={false}>
    <Billboard><HologramPanel title={photo.title} kind="capture" vehicleView={photo.view} width={mobile ? 2.2 : 2.6} /></Billboard>
  </group>)}</group>;
}

// --- 07 · Search and dispatch ------------------------------------------------------------------------

/** Rings widen from the car (nearest first), partner workshops light up, the truck's route draws in. */
function DispatchMap() {
  const rings = useRef<Group>(null);
  const centre = useMemo(() => besideParkedCar(0, 0.15, 0), []);
  // The route the accepted truck will drive, along the road from where it is to the car.
  const towRoute = useMemo(() => {
    const truck = createTruckPose();
    const points: Vector3[] = [];
    for (let at = RECOVERY_TIMING.towFrom; at <= RECOVERY_TIMING.towArrive; at += 0.004) {
      sampleTowTruck(at, truck);
      points.push(truck.position.clone().setY(truck.position.y + 0.25));
    }
    return points;
  }, []);
  useFrame(() => {
    const group = rings.current;
    if (!group) return;
    const at = journeyRuntime.position;
    group.children.forEach((ring, index) => {
      const grow = MathUtils.smoothstep(at, RECOVERY_TIMING.searchFrom + index * 0.06, RECOVERY_TIMING.searchTo + index * 0.06);
      ring.scale.setScalar(3 + grow * 70);
      ((ring as Mesh).material as MeshBasicMaterial).opacity = 0.55 * (1 - grow) * (grow > 0 ? 1 : 0);
    });
  });
  return <group>
    <group ref={rings} position={centre}>
      {[0, 1, 2].map(index => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 1.02, 128]} />
        <meshBasicMaterial color="#69d6ec" toneMapped={false} transparent depthWrite={false} />
      </mesh>)}
    </group>
    {WORKSHOPS.map((workshop, index) => <group key={index}>
      <mesh position={[workshop.position.x, workshop.position.y + 15, workshop.position.z]}>
        <cylinderGeometry args={[0.35, 0.35, 30, 8, 1, true]} />
        <meshBasicMaterial color={workshop.chosen ? [0.6, 2.4, 1.6] : [0.4, 1, 1.8]} toneMapped={false} transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <DataRoute points={[toArray(CAR_TOP), toArray(workshop.position.clone().lerp(CAR_TOP, 0.5).setY(Math.max(workshop.position.y, CAR_TOP.y) + (workshop.chosen ? 14 : 60))), toArray(workshop.position.clone().setY(workshop.position.y + 2))]}
        color={workshop.chosen ? '#7aeac7' : '#508cae'} width={workshop.chosen ? 0.08 : 0.05} particles={workshop.chosen ? 10 : 5} />
    </group>)}
    <Line points={towRoute} color="#ffb24a" lineWidth={2.2} transparent opacity={0.85} />
  </group>;
}

export function RoadsideStories(){
 const mobile=useThree(s=>s.size.width<760);
 return <>
  {/* 02 · plate and coverage: waits for Scene 01's camera handover so nothing crowds the incident. */}
  <SceneFade start={1.2} end={1.9}>
   <SpatialPanel stage={1} kind="coverage" width={11}/>
   <DataRoute points={[toArray(besideParkedCar(0,.55,2.9)),toArray(besideParkedCar(2.5,3,-4)),toArray(besideParkedCar(5,6,-14))]} particles={mobile?4:8} width={.015}/>
  </SceneFade>
  {/* 03 · four photos, one per side */}
  <SceneFade start={1.94} end={2.92}><ScanField/><CaptureFlashes/></SceneFade>
  <SceneFade start={1.72} end={2.85}><SpatialPanel stage={2} kind="capture" width={10.5}/></SceneFade>
  {/* 04 · to the analysis tower and back */}
  <SceneFade start={2.9} end={3.62}>
   <DataRoute points={[toArray(CAR_TOP),toArray(UPLOAD_ARC.getPoint(.5)),toArray(TOWER_TOP)]} color="#50cfff" width={.06} particles={mobile?8:14}/>
  </SceneFade>
  <SceneFade start={2.84} end={3.45}><PhotoUpload/></SceneFade>
  <Pulse curve={UPLOAD_ARC} from={ROADSIDE_TIMING.resultAt-.12} to={ROADSIDE_TIMING.resultAt} color={[3,1.1,.6]} reverse/>
  <ArrivalRing at={ROADSIDE_TIMING.resultAt} color={[3.4,1.2,.6]}/>
  <SceneFade start={2.75} end={4.13}><SpatialPanel stage={3} kind="locked" x={6} width={11}/></SceneFade>
  {/* 05 · details unlocked */}
  <SceneFade start={4.02} end={4.95}><SpatialPanel stage={4} kind="assessment" x={6} width={11}/></SceneFade>
  {/* 06 · the claim crosses the bay; the decision comes back */}
  <SceneFade start={4.95} end={5.7}>
   <DataRoute points={[toArray(CAR_TOP),toArray(CLAIM_ARC.getPoint(.5)),toArray(INSURER)]} color="#7fd9ff" width={.09} particles={mobile?8:16}/>
  </SceneFade>
  <Pulse curve={CLAIM_ARC} from={ROADSIDE_TIMING.claimFrom} to={ROADSIDE_TIMING.claimTo} color={[.8,2.4,3.4]} size={2.2}/>
  <Pulse curve={CLAIM_ARC} from={ROADSIDE_TIMING.claimTo+.02} to={ROADSIDE_TIMING.decisionAt} color={[.7,3.4,1.9]} size={2.2} reverse/>
  <ArrivalRing at={ROADSIDE_TIMING.decisionAt} color={[.8,3.2,1.8]}/>
  <SceneFade start={4.72} end={5.6}><SpatialPanel stage={5} kind="claim" width={11}/></SceneFade>
  <SceneFade start={5.43} end={5.98}><SpatialPanel stage={5.62} kind="approval" x={5} width={11}/></SceneFade>
  {/* 07 · search, workshop, dispatch, loading */}
  <SceneFade start={5.95} end={6.5}><DispatchMap/></SceneFade>
  <SceneFade start={5.86} end={6.32}><SpatialPanel stage={6.1} kind="workshop" x={6} width={11}/></SceneFade>
  <SceneFade start={6.1} end={6.42}><SpatialPanel stage={6.28} kind="dispatch" x={-6} width={10}/></SceneFade>
  <SceneFade start={6.4} end={6.72}><SpatialPanel stage={6.5} kind="ticket" x={6} width={9}/></SceneFade>
  {/* The truck fades in far behind, out of shot; it is never faded out (it leaves the frame, then hides itself). */}
  <SceneFade start={6} end={9.5}><TowTruck/></SceneFade>
  {/* 08 · the partner workshop beyond the bend: it comes up on the map as the chosen workshop
      (and stays out of the opening shot, where it would cover the city across the bay) */}
  <SceneFade start={6.05} end={9.5}><Workshop/></SceneFade>
  <SceneFade start={7.3} end={7.52}><SpatialPanel stage={7.4} kind="authorized" width={11}/></SceneFade>
 </>;
}
