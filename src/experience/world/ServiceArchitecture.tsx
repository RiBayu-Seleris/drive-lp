import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, MathUtils, Object3D, SRGBColorSpace, type Group, type InstancedMesh, type MeshBasicMaterial } from 'three';
import { journeyRuntime, storyPosition } from '../runtime';
import { ROAD_LENGTH, WORKSHOP } from '../journeyPath';
import { RECOVERY_TIMING } from '../story';
import { highway, ribbonGeometry, roadSide, stripGeometry } from './roadPath';
import { WATER_LEVEL } from './atmosphere';
import { markReflected } from './reflection';

const { platform, building } = WORKSHOP;
/** The building's frame: centred on its footprint, x toward the road, z backward along it. */
const CENTRE_S = (building.from + building.to) / 2;
const CENTRE_OFFSET = (building.near + building.far) / 2;
const HALF_LENGTH = (building.to - building.from) / 2;
const HALF_DEPTH = (building.near - building.far) / 2;
const HEIGHT = 6.4;
const DOOR_HEIGHT = 4.6;
/** Bay centres in the building frame (x), from their road offsets. */
const TRUCK_BAY_X = WORKSHOP.truckBay - CENTRE_OFFSET;
const CAR_BAY_X = WORKSHOP.carBay - CENTRE_OFFSET;
const BAY_WIDTH = 5.7;

const concrete = { color: '#262d35', roughness: 0.62, metalness: 0.05 };
const facade = { color: '#141a21', roughness: 0.4, metalness: 0.55 };
const trim = { color: '#2f3a46', roughness: 0.35, metalness: 0.7 };

function signTexture(text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#071019';
  context.fillRect(0, 0, 1024, 128);
  context.fillStyle = '#a0f1dc';
  context.font = '600 58px sans-serif';
  context.textAlign = 'center';
  context.fillText(text, 512, 84);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A wall panel between two x positions of the building frame, on one end (z) or side. */
const panel = (x0: number, x1: number, y0: number, y1: number) => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, width: x1 - x0, height: y1 - y0 });

/**
 * The partner workshop: a service platform on the left of the straight beyond the bend, and a
 * low two-bay building on it with doors at both ends. The tow truck drives in through the rear
 * door of its bay; the repaired car rolls out of the front door of the other.
 */
export function Workshop() {
  const glow = useRef<MeshBasicMaterial>(null);
  const scan = useRef<Group>(null);
  const piers = useRef<InstancedMesh>(null);
  const group = useRef<Group>(null);
  const deck = useMemo(() => stripGeometry((platform.inner + platform.outer) / 2 + 0.4, platform.inner - platform.outer + 0.8, 0.005, 48, platform.from / ROAD_LENGTH, platform.to / ROAD_LENGTH), []);
  const curb = useMemo(() => ribbonGeometry(platform.outer, 0, 0.9, 48, platform.from / ROAD_LENGTH, platform.to / ROAD_LENGTH), []);
  const sign = useMemo(() => signTexture('DRIVE · MITRA BENGKEL'), []);
  useEffect(() => () => { deck.dispose(); curb.dispose(); sign.dispose(); }, [deck, curb, sign]);
  const frame = useMemo(() => {
    const tangent = highway.getTangentAt(CENTRE_S / ROAD_LENGTH);
    return { position: roadSide(CENTRE_S / ROAD_LENGTH, CENTRE_OFFSET, 0), heading: Math.atan2(-tangent.x, -tangent.z) };
  }, []);

  useLayoutEffect(() => {
    if (group.current) markReflected(group.current);
    if (!piers.current) return;
    const placement = new Object3D();
    let index = 0;
    for (const s of [platform.from + 8, (platform.from + platform.to) / 2, platform.to - 8]) {
      for (const offset of [-16, -28]) {
        const top = roadSide(s / ROAD_LENGTH, offset, -0.4);
        placement.position.set(top.x, (top.y + WATER_LEVEL) / 2, top.z);
        placement.scale.set(1.6, top.y - WATER_LEVEL, 1.6);
        placement.updateMatrix();
        piers.current.setMatrixAt(index++, placement.matrix);
      }
    }
    piers.current.instanceMatrix.needsUpdate = true;
    piers.current.computeBoundingSphere();
  }, []);

  useFrame(() => {
    const at = storyPosition();
    const T = RECOVERY_TIMING;
    // The bays light up brighter while the work goes on; a scan bar sweeps the car's bay.
    const working = MathUtils.smoothstep(at, T.repairFrom - 0.03, T.repairFrom) * (1 - MathUtils.smoothstep(at, T.repairTo, T.repairTo + 0.04));
    if (glow.current) glow.current.color.setRGB(2.6 + 1.6 * working, 2.1 + 1.2 * working, 1.4 + 0.6 * working);
    if (scan.current) {
      const sweep = MathUtils.smoothstep(at, T.repairFrom, T.repairTo);
      scan.current.visible = working > 0.01 && !journeyRuntime.reducedMotion;
      scan.current.position.z = MathUtils.lerp(HALF_LENGTH - 3, -HALF_LENGTH + 3, sweep);
    }
  });

  const rearPanels = [panel(-HALF_DEPTH, TRUCK_BAY_X - BAY_WIDTH / 2, 0, HEIGHT), panel(TRUCK_BAY_X + BAY_WIDTH / 2, HALF_DEPTH, 0, HEIGHT), panel(TRUCK_BAY_X - BAY_WIDTH / 2, TRUCK_BAY_X + BAY_WIDTH / 2, DOOR_HEIGHT, HEIGHT)];
  const frontPanels = [
    panel(-HALF_DEPTH, CAR_BAY_X - BAY_WIDTH / 2, 0, HEIGHT), panel(CAR_BAY_X + BAY_WIDTH / 2, TRUCK_BAY_X - BAY_WIDTH / 2, 0, HEIGHT),
    panel(TRUCK_BAY_X + BAY_WIDTH / 2, HALF_DEPTH, 0, HEIGHT), panel(-HALF_DEPTH, HALF_DEPTH, DOOR_HEIGHT, HEIGHT),
  ];

  return <group ref={group}>
    {/* Platform: deck joined to the road's left edge, a low parapet, piers to the water */}
    <mesh geometry={deck}><meshStandardMaterial {...concrete} /></mesh>
    <mesh geometry={curb}><meshStandardMaterial {...trim} side={2} /></mesh>
    <instancedMesh ref={piers} args={[undefined, undefined, 6]}>
      <boxGeometry />
      <meshStandardMaterial color="#141b23" roughness={0.9} />
    </instancedMesh>
    <group position={frame.position} rotation={[0, frame.heading, 0]}>
      {/* Floor and roof */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[HALF_DEPTH * 2, HALF_LENGTH * 2]} /><meshStandardMaterial color="#39424c" roughness={0.5} metalness={0.1} /></mesh>
      <mesh position={[0, HEIGHT + 0.2, 0]}><boxGeometry args={[HALF_DEPTH * 2 + 1.6, 0.4, HALF_LENGTH * 2 + 1.6]} /><meshStandardMaterial {...trim} /></mesh>
      {/* Long walls: the far one plain, the road side with a lit glass band and the sign */}
      <mesh position={[-HALF_DEPTH, HEIGHT / 2, 0]}><boxGeometry args={[0.3, HEIGHT, HALF_LENGTH * 2]} /><meshStandardMaterial {...facade} /></mesh>
      <mesh position={[HALF_DEPTH, HEIGHT / 2, 0]}><boxGeometry args={[0.3, HEIGHT, HALF_LENGTH * 2]} /><meshStandardMaterial {...facade} /></mesh>
      <mesh position={[HALF_DEPTH + 0.17, 3.3, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[HALF_LENGTH * 2 - 2, 1.2]} /><meshBasicMaterial ref={glow} color={[2.6, 2.1, 1.4]} toneMapped={false} /></mesh>
      <mesh position={[HALF_DEPTH + 0.18, 5.35, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[11, 1.4]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      {/* Rear end: one door, for the truck's bay */}
      {rearPanels.map((part, index) => <mesh key={`rear-${index}`} position={[part.x, part.y, HALF_LENGTH]}><boxGeometry args={[part.width, part.height, 0.3]} /><meshStandardMaterial {...facade} /></mesh>)}
      {/* Front end: a door for each bay */}
      {frontPanels.map((part, index) => <mesh key={`front-${index}`} position={[part.x, part.y, -HALF_LENGTH]}><boxGeometry args={[part.width, part.height, 0.3]} /><meshStandardMaterial {...facade} /></mesh>)}
      <mesh position={[0, DOOR_HEIGHT + 0.85, -HALF_LENGTH - 0.17]} rotation={[0, Math.PI, 0]}><planeGeometry args={[9, 1.1]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      {/* Inside: pillars between the bays at each end (the middle stays open for the car's move across) and warm ceiling strips */}
      {[-1, 1].map(end => <mesh key={end} position={[(TRUCK_BAY_X + CAR_BAY_X) / 2, HEIGHT / 2, end * (HALF_LENGTH - 0.6)]}><boxGeometry args={[0.6, HEIGHT, 0.6]} /><meshStandardMaterial {...trim} /></mesh>)}
      {[TRUCK_BAY_X, CAR_BAY_X].map(x => <mesh key={x} position={[x, HEIGHT - 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, HALF_LENGTH * 1.8]} /><meshBasicMaterial color={[3, 2.6, 2]} toneMapped={false} /></mesh>)}
      {/* Light spilling onto the apron from the open doors */}
      {[TRUCK_BAY_X, CAR_BAY_X].map(x => <mesh key={`spill-${x}`} position={[x, 0.03, -HALF_LENGTH - 2.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[BAY_WIDTH, 5]} /><meshBasicMaterial color={[0.5, 0.42, 0.3]} transparent opacity={0.35} depthWrite={false} /></mesh>)}
      <mesh position={[TRUCK_BAY_X, 0.03, HALF_LENGTH + 2.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[BAY_WIDTH, 5]} /><meshBasicMaterial color={[0.5, 0.42, 0.3]} transparent opacity={0.35} depthWrite={false} /></mesh>
      {/* Repair scan across the car's bay */}
      <group ref={scan} visible={false}>
        <mesh position={[CAR_BAY_X, 2.2, 0]}><boxGeometry args={[BAY_WIDTH - 0.4, 0.04, 0.04]} /><meshBasicMaterial color={[0.6, 2.8, 2.2]} toneMapped={false} /></mesh>
        {[-1, 1].map(side => <mesh key={side} position={[CAR_BAY_X + side * (BAY_WIDTH / 2 - 0.2), 1.1, 0]}><boxGeometry args={[0.04, 2.2, 0.04]} /><meshBasicMaterial color={[0.6, 2.8, 2.2]} toneMapped={false} /></mesh>)}
      </group>
    </group>
  </group>;
}
