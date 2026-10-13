import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, useTexture } from '@react-three/drei';
import {
  AdditiveBlending, BufferAttribute, DoubleSide, IcosahedronGeometry, MathUtils, Object3D, Quaternion, RepeatWrapping, Shape,
  SRGBColorSpace, Vector3, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial, type PointLight, type Texture,
} from 'three';
import { journeyRuntime, storyPosition } from '../runtime';
import { highway, roadSide, seeded } from './roadPath';
import { markReflected } from './reflection';
import { coastalWallHeight, fbm } from './terrain';
import { createCliffMaterial } from '../materials/cliff';
import { INCIDENT_TIMING } from '../story';
import { sampleVehicleRouteAt } from '../journeyPath';
import {
  BEND_T, IMPACT_BOUNCE, IMPACT_CONTACT, IMPACT_DROP, IMPACT_FROM, IMPACT_POINT, IMPACT_ROCK, ROAD_LENGTH, ROCKFALL_POINT, WARNING_HEIGHT, WARNING_POINT,
  warningLabelAnchor, warningLabelAnchorLeft,
} from './incidentSite';

const UP = new Vector3(0, 1, 0);

const WARNING_ROAD_Y = WARNING_POINT.y - WARNING_HEIGHT;
// Bottom edge of the 6.4-unit triangle sits a third of its height below its centre.
const BEAM_TOP = WARNING_POINT.y - 6.4 * Math.sqrt(3) / 6 - 0.1;

const visibleUntilCleared = (at: number) => 1 - MathUtils.smoothstep(at, INCIDENT_TIMING.clearFrom, INCIDENT_TIMING.clearTo);

// --- Rockfall ------------------------------------------------------------------------------

/**
 * Each rock falls from the cliff on the right when the incident starts and travels a few legs:
 * off the face, a bounce, and rolling to where it rests. Nothing lies on the road beforehand.
 */
interface Leg {
  to: Vector3; at: number;
  /** fall: accelerates down; arc: thrown up and over; roll: settles with small bounces. */
  kind: 'fall' | 'arc' | 'roll'; lift: number;
}
interface Rock { start: Vector3; from: number; legs: Leg[]; heading: number; radius: number; squash: number; seed: number }

const restHeight = (radius: number, squash: number) => radius * squash * 0.62;
const raised = (point: Vector3, height: number) => point.clone().setY(point.y + height);

/** A point up on the cliff face beside the road (the face ends at the bend). */
function onCliff(point: Vector3, radius: number) {
  return point.setY(Math.max(point.y + 4, coastalWallHeight(point.x, point.z) + radius));
}

/** A rock that ends up in the bend, across the right-hand lanes; sizes are noise-scaled by up to ~1.35. */
function bendRock(along: number, offset: number, radius: number, squash: number, seed: number, order: number): Rock {
  const t = BEND_T + along / ROAD_LENGTH;
  const tangent = highway.getTangentAt(t);
  const height = restHeight(radius, squash);
  const from = INCIDENT_TIMING.rockfall + 0.012 * order;
  return {
    start: onCliff(roadSide(t - 9 / ROAD_LENGTH, 20 + (order % 3) * 2.5, 0), radius), from,
    legs: [
      { to: roadSide(t - 3 / ROAD_LENGTH, 7.2, height), at: from + 0.06, kind: 'fall', lift: 1.2 },
      { to: roadSide(t, offset, height), at: from + 0.2, kind: 'roll', lift: 0.9 },
    ],
    heading: Math.atan2(tangent.x, tangent.z) + seed, radius, squash, seed,
  };
}

const IMPACT_HEIGHT = restHeight(0.42, 0.78);
const T = INCIDENT_TIMING;
// The first rock comes off the cliff ahead of the car, bounces once in the right-hand lane and
// comes down on the car's front-left wing while the car is still in its lane. It glances off
// hard to the left and rolls to the barrier; the car pulls over after it, stopping further on.
// The rest settle in the bend between 0.4 and 7.7 right of the centre line, so the left lanes
// stay open for traffic and the tow truck.
const ROCKS: Rock[] = [
  {
    start: onCliff(IMPACT_FROM.clone(), 0.42), from: T.rockfall,
    legs: [
      { to: raised(IMPACT_BOUNCE, IMPACT_HEIGHT), at: T.impact - 0.06, kind: 'fall', lift: 1.2 },
      { to: IMPACT_CONTACT, at: T.impact, kind: 'arc', lift: 2.4 },
      { to: raised(IMPACT_DROP, IMPACT_HEIGHT), at: T.impact + 0.025, kind: 'fall', lift: 0.45 },
      { to: raised(IMPACT_ROCK, IMPACT_HEIGHT), at: T.impact + 0.11, kind: 'roll', lift: 0.35 },
    ],
    heading: 1, radius: 0.42, squash: 0.78, seed: 1,
  },
  bendRock(-3, 2, 1, 0.66, 2, 1),
  bendRock(-0.5, 5.2, 1.15, 0.64, 4, 2),
  bendRock(1.5, 1.8, 0.85, 0.62, 3, 3),
  bendRock(4, 3.6, 1.1, 0.6, 7, 4),
  bendRock(6.5, 6.4, 0.7, 0.68, 5, 5),
  bendRock(8.5, 2.6, 0.6, 0.7, 6, 6),
];

const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
const restOf = (rock: Rock) => rock.legs[rock.legs.length - 1].to;

/** Where a rock is at a story position, and how far it has tumbled (for its spin). */
function placeRock(rock: Rock, at: number, out: Vector3) {
  let from = rock.start, since = rock.from, travelled = 0;
  if (at <= since) { out.copy(from); return 0; }
  for (const leg of rock.legs) {
    const length = from.distanceTo(leg.to);
    if (at < leg.at) {
      const raw = (at - since) / (leg.at - since);
      const u = leg.kind === 'roll' ? easeOut(raw) : raw;
      out.lerpVectors(from, leg.to, u);
      if (leg.kind === 'fall') out.y = MathUtils.lerp(from.y, leg.to.y, u * u) + Math.sin(Math.PI * u) * leg.lift;
      else if (leg.kind === 'arc') out.y += Math.sin(Math.PI * u) * leg.lift;
      else out.y += Math.abs(Math.sin(Math.PI * 3 * u)) * leg.lift * (1 - u) * (1 - u);
      return travelled + u * length;
    }
    travelled += length;
    from = leg.to;
    since = leg.at;
  }
  out.copy(from);
  return travelled;
}

/** Rough boulder: an icosphere pushed in and out by noise, flattened where it rests. */
function boulderGeometry(seed: number) {
  const geometry = new IcosahedronGeometry(1, 3);
  const position = geometry.getAttribute('position');
  const point = new Vector3();
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index);
    const n = fbm(point.x * 1.6 + seed * 7.1, point.z * 1.6 + point.y * 1.3, 4);
    point.multiplyScalar(0.72 + n * 0.62);
    if (point.y < -0.35) point.y = -0.35 - (point.y + 0.35) * 0.15;
    position.setXYZ(index, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  // The cliff material shades with vertex colours; rocks fresh off the face are a shade lighter.
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(position.count * 3).fill(0.62), 3));
  return geometry;
}

function prepareRock(texture: Texture, color: boolean) {
  texture.wrapS = texture.wrapT = RepeatWrapping;
  if (color) texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
}

function Rockfall() {
  const [diffuse, normal] = useTexture(['/assets/textures/cliff_side_diff_1k.jpg', '/assets/textures/cliff_side_nor_gl_1k.jpg']);
  useLayoutEffect(() => {
    prepareRock(diffuse, true);
    prepareRock(normal, false);
  }, [diffuse, normal]);
  const material = useMemo(() => createCliffMaterial(diffuse, normal, 0.35), [diffuse, normal]);
  const boulders = useMemo(() => ROCKS.map(rock => boulderGeometry(rock.seed)), []);
  const rocks = useRef<Group>(null);
  const gravel = useRef<InstancedMesh>(null);
  const gravelGeometry = useMemo(() => boulderGeometry(9), []);
  useEffect(() => () => { material.dispose(); boulders.forEach(geometry => geometry.dispose()); gravelGeometry.dispose(); }, [material, boulders, gravelGeometry]);

  // Chips shaken loose with the fall: a few by the rock the car met, the rest through the bend.
  const gravelCount = 70;
  const chips = useMemo(() => Array.from({ length: gravelCount }, (_, index) => {
    const byCar = index < 8;
    const size = 0.08 + Math.pow(seeded(index * 3 + 2), 2) * (byCar ? 0.16 : 0.32);
    const position = byCar
      // Chips knocked off where the rock hit the car and dropped, around where it lies.
      ? IMPACT_ROCK.clone().add(new Vector3((seeded(index * 3 + 1) - 0.5) * 3, size * 0.4, (seeded(index * 3 + 3) - 0.5) * 3))
      : roadSide(BEND_T + (-7 + seeded(index * 3 + 1) * 19) / ROAD_LENGTH, 0.4 + seeded(index * 3 + 3) * 7.4, size * 0.4);
    return { position, size, spin: [seeded(index) * 3, seeded(index + 5) * 3] as const, from: byCar ? INCIDENT_TIMING.impact + 0.05 : INCIDENT_TIMING.rockfall + 0.07 + seeded(index * 7) * 0.12 };
  }), []);
  const scratch = useRef({ point: new Vector3(), axis: new Vector3(), spin: new Quaternion(), heading: new Quaternion(), placement: new Object3D(), shownAt: Number.NaN });

  useFrame(() => {
    const at = sampleVehicleRouteAt(storyPosition(), journeyRuntime.reducedMotion);
    const state = scratch.current;
    rocks.current?.children.forEach((mesh, index) => {
      const rock = ROCKS[index];
      mesh.visible = at > rock.from - 0.004;
      if (!mesh.visible) return;
      const rolled = placeRock(rock, at, state.point);
      mesh.position.copy(state.point);
      // Tumble about the horizontal axis across its overall line of travel.
      const rest = restOf(rock);
      state.axis.set(rest.z - rock.start.z, 0, rock.start.x - rest.x).normalize();
      state.heading.setFromAxisAngle(UP, rock.heading);
      mesh.quaternion.setFromAxisAngle(state.axis, rolled / rock.radius).multiply(state.heading);
    });
    const field = gravel.current;
    if (!field) return;
    // Only touch the instances while they are appearing.
    const settled = at > Math.max(INCIDENT_TIMING.rockfall + 0.25, INCIDENT_TIMING.impact + 0.12);
    const empty = at < INCIDENT_TIMING.rockfall;
    const key = settled ? 1 : empty ? 0 : at;
    if (key === state.shownAt) return;
    state.shownAt = key;
    chips.forEach((chip, index) => {
      const grow = MathUtils.smoothstep(at, chip.from, chip.from + 0.05);
      state.placement.position.copy(chip.position);
      state.placement.rotation.set(chip.spin[0], chip.spin[1], 0);
      state.placement.scale.setScalar(Math.max(0.0001, chip.size * grow));
      state.placement.updateMatrix();
      field.setMatrixAt(index, state.placement.matrix);
    });
    field.instanceMatrix.needsUpdate = true;
  });

  return <group>
    <group ref={rocks}>
      {ROCKS.map((rock, index) => <mesh key={index} geometry={boulders[index]} material={material} visible={false}
        scale={[rock.radius * 1.15, rock.radius * rock.squash, rock.radius]} />)}
    </group>
    <instancedMesh ref={gravel} args={[gravelGeometry, material, gravelCount]} frustumCulled={false} />
  </group>;
}

// --- Warning --------------------------------------------------------------------------------

function triangleShape(size: number, inset = 0) {
  const height = size * Math.sqrt(3) / 2;
  const shape = new Shape();
  shape.moveTo(0, height * 2 / 3 - inset * 2);
  shape.lineTo(-size / 2 + inset * Math.sqrt(3), -height / 3 + inset);
  shape.lineTo(size / 2 - inset * Math.sqrt(3), -height / 3 + inset);
  shape.closePath();
  return shape;
}

// Like a HUD marker it keeps a readable size: larger far away, smaller up close.
const hologramScale = (distance: number) => MathUtils.clamp(distance / 62, 0.75, 1.65);
const TRIANGLE_HALF_WIDTH = 3.2;

/** Hazard hologram: a hard red outline, a faint fill, a ring and a beam down to the rocks. */
function WarningHologram() {
  const sign = useRef<Group>(null);
  const cameraRight = useMemo(() => new Vector3(), []);
  const beam = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  const shapes = useMemo(() => {
    const outline = triangleShape(6.4);
    outline.holes.push(triangleShape(6.4, 0.42));
    const mark = new Shape();
    mark.moveTo(-0.2, 1.25);
    mark.lineTo(0.2, 1.25);
    mark.lineTo(0.13, -0.3);
    mark.lineTo(-0.13, -0.3);
    mark.closePath();
    return { outline, fill: triangleShape(6.4, 0.42), mark };
  }, []);
  useLayoutEffect(() => {
    if (sign.current) markReflected(sign.current);
    if (beam.current) markReflected(beam.current);
  }, []);

  useFrame(({ camera }) => {
    const at = journeyRuntime.position;
    // Nothing warns of the rock before it falls; the warning comes up with it.
    const shown = MathUtils.smoothstep(at, INCIDENT_TIMING.rockfall - 0.005, INCIDENT_TIMING.rockfall + 0.04) * visibleUntilCleared(at);
    const scale = hologramScale(camera.position.distanceTo(WARNING_POINT));
    // Label anchor: just past the triangle's right edge as seen from the camera.
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    warningLabelAnchor.copy(WARNING_POINT).addScaledVector(cameraRight, (TRIANGLE_HALF_WIDTH + 1.1) * scale);
    warningLabelAnchorLeft.copy(WARNING_POINT).addScaledVector(cameraRight, -(TRIANGLE_HALF_WIDTH + 1.1) * scale);
    const pulse = journeyRuntime.reducedMotion ? 1 : 0.82 + 0.18 * Math.sin(journeyRuntime.time * 3.1);
    // It flares as it appears, and again at the knock.
    const pulseAt = (moment: number) => MathUtils.smoothstep(at, moment - 0.005, moment + 0.01) * (1 - MathUtils.smoothstep(at, moment + 0.01, moment + 0.08));
    const flare = Math.max(pulseAt(INCIDENT_TIMING.rockfall), pulseAt(INCIDENT_TIMING.impact));
    if (sign.current) {
      sign.current.visible = shown > 0.002;
      sign.current.scale.setScalar(scale);
      sign.current.position.y = WARNING_POINT.y + (journeyRuntime.reducedMotion ? 0 : Math.sin(journeyRuntime.time * 0.9) * 0.18);
      sign.current.traverse(object => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as MeshBasicMaterial;
        material.opacity = (mesh.userData.baseOpacity ?? 1) * shown * pulse * (1 + flare * 0.6);
      });
    }
    if (beam.current) {
      beam.current.visible = shown > 0.002;
      (beam.current.material as MeshBasicMaterial).opacity = 0.16 * shown * pulse;
    }
    if (light.current) light.current.intensity = (34 + flare * 60) * shown;
    // Runs between the camera rig (-2) and the HUD projector (-1), so the label never lags.
  }, -1.5);

  const glow = [4.2, 0.32, 0.16] as const;
  return <group>
    <group ref={sign} position={WARNING_POINT}>
      <Billboard>
        <mesh userData={{ baseOpacity: 1 }}><shapeGeometry args={[shapes.outline]} /><meshBasicMaterial color={glow} toneMapped={false} transparent depthWrite={false} /></mesh>
        <mesh userData={{ baseOpacity: 0.09 }} position={[0, 0, -0.02]}><shapeGeometry args={[shapes.fill]} /><meshBasicMaterial color={[1, 0.08, 0.04]} toneMapped={false} transparent depthWrite={false} side={DoubleSide} /></mesh>
        <mesh userData={{ baseOpacity: 1 }} position={[0, -0.1, 0.01]}><shapeGeometry args={[shapes.mark]} /><meshBasicMaterial color={[4.6, 1.1, 0.7]} toneMapped={false} transparent depthWrite={false} /></mesh>
        <mesh userData={{ baseOpacity: 1 }} position={[0, -0.92, 0.01]}><circleGeometry args={[0.24, 20]} /><meshBasicMaterial color={[4.6, 1.1, 0.7]} toneMapped={false} transparent depthWrite={false} /></mesh>
        <mesh userData={{ baseOpacity: 0.55 }}><ringGeometry args={[4.35, 4.43, 96]} /><meshBasicMaterial color={glow} toneMapped={false} transparent depthWrite={false} /></mesh>
        <mesh userData={{ baseOpacity: 0.25 }}><ringGeometry args={[4.75, 4.79, 96, 1, 0.3, Math.PI * 1.25]} /><meshBasicMaterial color={glow} toneMapped={false} transparent depthWrite={false} /></mesh>
      </Billboard>
    </group>
    <mesh ref={beam} position={[WARNING_POINT.x, (WARNING_ROAD_Y + BEAM_TOP) / 2, WARNING_POINT.z]}>
      <cylinderGeometry args={[0.05, 0.9, BEAM_TOP - WARNING_ROAD_Y, 24, 1, true]} />
      <meshBasicMaterial color={[2.4, 0.18, 0.08]} toneMapped={false} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
    </mesh>
    <pointLight ref={light} position={[WARNING_POINT.x, WARNING_ROAD_Y + 2.2, WARNING_POINT.z]} color="#ff3a22" intensity={34} distance={30} decay={1.5} />
  </group>;
}

/** Rings that roll out across the wet asphalt from the rockfall. */
function PulseRings() {
  const group = useRef<Group>(null);
  useFrame(() => {
    const rings = group.current;
    if (!rings) return;
    const at = journeyRuntime.position;
    const shown = MathUtils.smoothstep(at, INCIDENT_TIMING.rockfall, INCIDENT_TIMING.rockfall + 0.06) * visibleUntilCleared(at);
    rings.visible = shown > 0.002;
    rings.children.forEach((child, index) => {
      const phase = journeyRuntime.reducedMotion ? (index + 1) / 4 : (journeyRuntime.time * 0.32 + index / 3) % 1;
      child.scale.setScalar(2 + phase * 13);
      ((child as Mesh).material as MeshBasicMaterial).opacity = Math.pow(1 - phase, 1.6) * 0.75 * shown;
    });
  });
  return <group ref={group} position={ROCKFALL_POINT}>
    {[0, 1, 2].map(index => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1, 1.035, 128]} />
      <meshBasicMaterial color={[3.2, 0.2, 0.1]} toneMapped={false} transparent depthWrite={false} />
    </mesh>)}
  </group>;
}

/** The knock at the front-left corner, played by scroll rather than by clock. */
function ImpactPulse() {
  const ring = useRef<Mesh>(null);
  const flash = useRef<Mesh>(null);
  useFrame(() => {
    const progress = MathUtils.clamp((journeyRuntime.position - INCIDENT_TIMING.impact) / 0.11, 0, 1);
    const alive = journeyRuntime.position > INCIDENT_TIMING.impact && progress < 1;
    if (ring.current) {
      ring.current.visible = alive;
      ring.current.scale.setScalar(0.4 + progress * 9);
      (ring.current.material as MeshBasicMaterial).opacity = Math.pow(1 - progress, 1.4);
    }
    if (flash.current) {
      flash.current.visible = alive;
      flash.current.scale.setScalar(0.3 + progress * 2.6);
      (flash.current.material as MeshBasicMaterial).opacity = Math.pow(1 - progress, 3) * 0.9;
    }
  });
  return <group position={IMPACT_POINT}>
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} visible={false}>
      <ringGeometry args={[1, 1.06, 96]} />
      <meshBasicMaterial color={[5, 0.6, 0.25]} toneMapped={false} transparent depthWrite={false} />
    </mesh>
    <mesh ref={flash} visible={false}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshBasicMaterial color={[3, 0.5, 0.2]} toneMapped={false} transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  </group>;
}

export function IncidentScene() {
  return <group>
    <Rockfall />
    <WarningHologram />
    <PulseRings />
    <ImpactPulse />
  </group>;
}

