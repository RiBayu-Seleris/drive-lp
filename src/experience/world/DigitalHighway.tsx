import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  CanvasTexture, DoubleSide, Object3D, Quaternion, RepeatWrapping, SRGBColorSpace, Vector3,
  type Group, type InstancedMesh, type Texture,
} from 'three';
import { highway, ribbonGeometry, roadSide, seeded, stripGeometry } from './roadPath';
import { journeyRuntime, storyPosition } from '../runtime';
import { Vehicle } from '../Vehicle';
import { createPose, sampleVehiclePose, sampleVehicleRoadProgress, sampleVehicleRouteAt, STOP_T, VEHICLE_CLEARANCE, WORKSHOP } from '../journeyPath';
import { INCIDENT_TIMING, RECOVERY_TIMING } from '../story';
import { createRoadMaterial, LAMP_ARM_OFFSET, LAMP_SPACING, ROAD_WIDTH } from '../materials/road';
import { useRoadReflection } from './useRoadReflection';
import { markReflected } from './reflection';
import { WATER_LEVEL } from './atmosphere';

type Quality = 'high' | 'medium' | 'low';

const diagnostics = import.meta.env.DEV || new URLSearchParams(window.location.search).has('scene-diagnostics');
const ROAD_LENGTH = highway.getLength();
const RAIL_OFFSET = 8.55;
/** Road progress where the left rail is open for the workshop platform. */
const RAIL_GAP = [WORKSHOP.platform.from / ROAD_LENGTH, WORKSHOP.platform.to / ROAD_LENGTH] as const;
const inRailGap = (t: number, side: number) => side < 0 && t > RAIL_GAP[0] && t < RAIL_GAP[1];

function prepareRoadTexture(texture: Texture, color: boolean) {
  texture.wrapS = texture.wrapT = RepeatWrapping;
  // The asphalt scan is ~3 m across; repeat it so its grain reads at true scale.
  texture.repeat.set(4.5, 4.5);
  texture.anisotropy = 8;
  if (color) texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
}

const roadPoint = new Vector3();
/** The mirror plane follows the road under the car, wherever the story has taken it. */
function roadHeightUnderCar() {
  const t = sampleVehicleRoadProgress(sampleVehicleRouteAt(storyPosition(), journeyRuntime.reducedMotion));
  return highway.getPointAt(t, roadPoint).y;
}

function RoadSurface({ quality }: { quality: Quality }) {
  const [asphalt, normal] = useTexture(['/assets/textures/asphalt_02_diff_1k.jpg', '/assets/textures/asphalt_02_nor_gl_1k.jpg']);
  useLayoutEffect(() => {
    prepareRoadTexture(asphalt, true);
    prepareRoadTexture(normal, false);
  }, [asphalt, normal]);
  // Low quality skips the mirror pass; the wet look then comes from the environment alone.
  const reflection = useRoadReflection(quality !== 'low', quality === 'high' ? 0.5 : 0.35, roadHeightUnderCar);
  const material = useMemo(() => createRoadMaterial(asphalt, normal, reflection), [asphalt, normal, reflection]);
  const geometry = useMemo(() => stripGeometry(0, ROAD_WIDTH, 0), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} />;
}

/** Deck edge and piers: the road is a viaduct along the cliff, high above the water. */
function RoadStructure() {
  const piers = useRef<InstancedMesh>(null);
  const [deck, leftFace, rightFace] = useMemo(() => [
    stripGeometry(0, ROAD_WIDTH + 1.6, -0.32),
    ribbonGeometry(-(ROAD_WIDTH / 2 + 0.8), -1.5, -0.3),
    ribbonGeometry(ROAD_WIDTH / 2 + 0.8, -1.5, -0.3),
  ], []);
  useEffect(() => () => { deck.dispose(); leftFace.dispose(); rightFace.dispose(); }, [deck, leftFace, rightFace]);
  const count = 66;
  useLayoutEffect(() => {
    if (!piers.current) return;
    const placement = new Object3D();
    for (let index = 0; index < count; index++) {
      const t = (index + 0.5) / count;
      const top = roadSide(t, 0, -1.4);
      const height = top.y - WATER_LEVEL;
      const tangent = highway.getTangentAt(t);
      placement.position.set(top.x, WATER_LEVEL + height / 2, top.z);
      placement.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
      placement.scale.set(5.5, height, 1.8);
      placement.updateMatrix();
      piers.current.setMatrixAt(index, placement.matrix);
    }
    piers.current.instanceMatrix.needsUpdate = true;
    piers.current.computeBoundingSphere();
  }, []);
  return <group>
    <mesh geometry={deck}><meshStandardMaterial color="#1a222c" roughness={0.85} /></mesh>
    {[leftFace, rightFace].map((face, index) => <mesh key={index} geometry={face}>
      <meshStandardMaterial color="#2a333e" roughness={0.8} side={DoubleSide} />
    </mesh>)}
    <instancedMesh ref={piers} args={[undefined, undefined, count]}>
      <boxGeometry />
      <meshStandardMaterial color="#141b23" roughness={0.9} />
    </instancedMesh>
  </group>;
}

/** Steel guardrails with posts, and amber reflectors that trace both edges into the distance. */
function Guardrails() {
  const posts = useRef<InstancedMesh>(null);
  const reflectors = useRef<InstancedMesh>(null);
  // The left rail opens where the workshop platform joins the road.
  const rails = useMemo(() => [
    ribbonGeometry(-RAIL_OFFSET, 0.58, 0.92, 220, 0, RAIL_GAP[0]),
    ribbonGeometry(-RAIL_OFFSET, 0.58, 0.92, 380, RAIL_GAP[1], 1),
    ribbonGeometry(RAIL_OFFSET, 0.58, 0.92),
  ], []);
  useEffect(() => () => rails.forEach(rail => rail.dispose()), [rails]);
  const postCount = Math.floor(ROAD_LENGTH / 4) * 2;
  const reflectorCount = Math.floor(ROAD_LENGTH / 8) * 2;
  useLayoutEffect(() => {
    if (!posts.current || !reflectors.current) return;
    const placement = new Object3D();
    for (let index = 0; index < postCount; index++) {
      const side = index % 2 ? 1 : -1;
      const t = Math.floor(index / 2) * 4 / ROAD_LENGTH;
      placement.position.copy(roadSide(t, side * (RAIL_OFFSET + 0.12), 0.46));
      placement.scale.set(0.13, inRailGap(t, side) ? 0.0001 : 0.92, 0.13);
      placement.updateMatrix();
      posts.current.setMatrixAt(index, placement.matrix);
    }
    for (let index = 0; index < reflectorCount; index++) {
      const side = index % 2 ? 1 : -1;
      const t = (Math.floor(index / 2) * 8 + 2) / ROAD_LENGTH;
      const tangent = highway.getTangentAt(t);
      placement.position.copy(roadSide(t, side * (RAIL_OFFSET - 0.05), 0.76));
      placement.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
      placement.scale.set(0.06, inRailGap(t, side) ? 0.0001 : 0.12, 0.05);
      placement.updateMatrix();
      reflectors.current.setMatrixAt(index, placement.matrix);
    }
    posts.current.instanceMatrix.needsUpdate = true;
    reflectors.current.instanceMatrix.needsUpdate = true;
    posts.current.computeBoundingSphere();
    reflectors.current.computeBoundingSphere();
    markReflected(reflectors.current);
  }, [postCount, reflectorCount]);
  return <group>
    {rails.map((rail, index) => <mesh key={index} geometry={rail}>
      <meshStandardMaterial color="#8d99a6" metalness={0.85} roughness={0.32} side={DoubleSide} />
    </mesh>)}
    <instancedMesh ref={posts} args={[undefined, undefined, postCount]}>
      <boxGeometry />
      <meshStandardMaterial color="#5b6672" metalness={0.7} roughness={0.4} />
    </instancedMesh>
    <instancedMesh ref={reflectors} args={[undefined, undefined, reflectorCount]}>
      <boxGeometry />
      <meshBasicMaterial color={[2.2, 1.1, 0.25]} toneMapped={false} />
    </instancedMesh>
  </group>;
}

/** Tall lamps over the right-hand lanes. The road shader paints their pools at the same spots. */
function StreetLamps() {
  const poles = useRef<InstancedMesh>(null);
  const arms = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const count = Math.floor(ROAD_LENGTH / LAMP_SPACING) + 1;
  useLayoutEffect(() => {
    if (!poles.current || !arms.current || !heads.current) return;
    const placement = new Object3D();
    const up = new Vector3(0, 1, 0);
    for (let index = 0; index < count; index++) {
      const t = Math.min(0.999, index * LAMP_SPACING / ROAD_LENGTH);
      const tangent = highway.getTangentAt(t);
      const heading = Math.atan2(tangent.x, tangent.z);
      const base = roadSide(t, RAIL_OFFSET + 0.7, 0);
      placement.position.copy(base).addScaledVector(up, 4.6);
      placement.rotation.set(0, heading, 0);
      placement.scale.set(0.16, 9.2, 0.16);
      placement.updateMatrix();
      poles.current.setMatrixAt(index, placement.matrix);
      const head = roadSide(t, LAMP_ARM_OFFSET, 9);
      placement.position.copy(base).lerp(head, 0.5).setY(head.y + 0.15);
      placement.scale.set(0.12, 0.12, 1);
      placement.rotation.set(0, heading + Math.PI / 2, 0);
      placement.updateMatrix();
      arms.current.setMatrixAt(index, placement.matrix);
      placement.scale.set(1.3, 0.14, 0.5);
      placement.position.copy(head);
      placement.rotation.set(0, heading, 0);
      placement.updateMatrix();
      heads.current.setMatrixAt(index, placement.matrix);
    }
    for (const mesh of [poles.current, arms.current, heads.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    markReflected(heads.current);
  }, [count]);
  const armLength = RAIL_OFFSET + 0.7 - LAMP_ARM_OFFSET;
  return <group>
    <instancedMesh ref={poles} args={[undefined, undefined, count]}>
      <cylinderGeometry args={[0.5, 0.7, 1, 8]} />
      <meshStandardMaterial color="#3a4450" metalness={0.75} roughness={0.38} />
    </instancedMesh>
    <instancedMesh ref={arms} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, armLength]} />
      <meshStandardMaterial color="#3a4450" metalness={0.75} roughness={0.38} />
    </instancedMesh>
    <instancedMesh ref={heads} args={[undefined, undefined, count]}>
      <boxGeometry />
      <meshBasicMaterial color={[3.4, 3.6, 4]} toneMapped={false} />
    </instancedMesh>
  </group>;
}

function chevronTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#050608';
  context.fillRect(0, 0, 256, 128);
  context.strokeStyle = '#ff3b24';
  context.lineWidth = 22;
  context.lineCap = 'square';
  context.lineJoin = 'miter';
  for (const x of [70, 150]) {
    context.beginPath();
    context.moveTo(x + 38, 18);
    context.lineTo(x - 8, 64);
    context.lineTo(x + 38, 110);
    context.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Red chevrons on the outside of the sharp left bend where the traffic has stopped. */
function CurveChevrons() {
  const group = useRef<Group>(null);
  const texture = useMemo(() => chevronTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const signs = useMemo(() => [0.3, 0.312, 0.324, 0.336, 0.348, 0.36].map(t => {
    const tangent = highway.getTangentAt(t);
    return { position: roadSide(t, RAIL_OFFSET + 0.9, 1.75), heading: Math.atan2(-tangent.x, -tangent.z) };
  }), []);
  useLayoutEffect(() => { if (group.current) markReflected(group.current); }, []);
  return <group ref={group}>
    {signs.map((sign, index) => <group key={index} position={sign.position} rotation={[0, sign.heading, 0]}>
      <mesh position={[0, 0, -0.04]}><boxGeometry args={[2.5, 1.35, 0.06]} /><meshStandardMaterial color="#0d1014" metalness={0.5} roughness={0.5} /></mesh>
      <mesh><planeGeometry args={[2.3, 1.15]} /><meshBasicMaterial map={texture} color={[2.6, 2.6, 2.6]} toneMapped={false} /></mesh>
      <mesh position={[0, -1.15, -0.05]}><boxGeometry args={[0.1, 1.2, 0.1]} /><meshStandardMaterial color="#3a4450" metalness={0.7} roughness={0.4} /></mesh>
    </group>)}
  </group>;
}

const TRAIL_LANES = [-6.375, 2.125, 6.375];
/** Lane traffic uses to squeeze past while the car waits (its own lane before it pulled over). */
const PASSING_LANE = -2.125;
// Around the incident the outer left lane holds the parked car and the right-hand lanes the rocks.
const INCIDENT_FROM = STOP_T - 0.03;
const INCIDENT_TO = 0.345;

/**
 * Long-exposure tail-light trails. Away from the incident they flow in their own lanes; there,
 * once the car has stopped, a few slow ones file past it in the one lane still open.
 */
function TrafficTrails({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const placement = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => { if (mesh.current) markReflected(mesh.current); }, []);
  useFrame(() => {
    const trails = mesh.current;
    if (!trails) return;
    trails.visible = !journeyRuntime.reducedMotion;
    const at = journeyRuntime.position;
    // Only while the car waits: not past the car while it is still driving, nor through the tow truck.
    const passing = at > INCIDENT_TIMING.stopAt && at < RECOVERY_TIMING.searchFrom;
    for (let index = 0; index < count; index++) {
      const t = (seeded(index + 91) + journeyRuntime.time * (0.03 + seeded(index + 7) * 0.012)) % 1;
      const atIncident = t > INCIDENT_FROM && t < INCIDENT_TO;
      const squeezes = atIncident && passing && index % 3 === 0;
      const lane = squeezes ? PASSING_LANE : TRAIL_LANES[index % TRAIL_LANES.length];
      const tangent = highway.getTangentAt(t);
      placement.position.copy(roadSide(t, lane + (squeezes ? 0 : (seeded(index) - 0.5) * 0.9), 0.62));
      placement.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
      // Shorter streaks read as slower traffic edging past.
      placement.scale.set(0.09, 0.05, atIncident ? (squeezes ? 2.2 : 0.0001) : 5 + seeded(index + 3) * 10);
      placement.updateMatrix();
      trails.setMatrixAt(index, placement.matrix);
    }
    trails.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
    <boxGeometry />
    <meshBasicMaterial color={[3.4, 0.16, 0.07]} toneMapped={false} />
  </instancedMesh>;
}

/** Places the one physical car for the current story position: road, ramp, flatbed or hoist. */
function VehicleCarrier({ low }: { low: boolean }) {
  const vehicle = useRef<Group>(null);
  const pose = useMemo(() => createPose(), []);
  const metrics = useMemo(() => ({ position: new Vector3(), quaternion: new Quaternion() }), []);
  useFrame(({ gl }) => {
    const carrier = vehicle.current;
    if (!carrier) return;
    const routeAt = sampleVehicleRouteAt(storyPosition(), journeyRuntime.reducedMotion);
    sampleVehiclePose(routeAt, pose);
    carrier.position.copy(pose.position);
    carrier.position.y += VEHICLE_CLEARANCE;
    carrier.rotation.set(pose.pitch, pose.heading, 0, 'YXZ');
    if (diagnostics) {
      carrier.getWorldPosition(metrics.position);
      carrier.getWorldQuaternion(metrics.quaternion);
      const data = gl.domElement.dataset;
      data.vehicleCarrier = carrier.uuid;
      data.vehicleWorldPosition = metrics.position.toArray().join(',');
      data.vehicleWorldQuaternion = metrics.quaternion.toArray().join(',');
      data.vehicleVisible = String(carrier.visible);
      data.vehicleRoadProgress = String(pose.progress);
      data.vehicleRouteAt = String(routeAt);
    }
  });
  return <group ref={vehicle} name="journey-vehicle"><Vehicle low={low} /></group>;
}

export function DigitalHighway({ low, quality }: { low: boolean; quality: Quality }) {
  return <group>
    <RoadSurface quality={quality} />
    <RoadStructure />
    <Guardrails />
    <StreetLamps />
    <CurveChevrons />
    <TrafficTrails count={low ? 24 : quality === 'medium' ? 40 : 60} />
    <VehicleCarrier low={low} />
  </group>;
}
