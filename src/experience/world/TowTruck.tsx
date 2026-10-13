import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group, type Mesh, type PointLight } from 'three';
import { journeyRuntime, storyPosition } from '../runtime';
import {
  createPose, createTruckPose, ROAD_LENGTH, sampleTowTruck, sampleVehiclePose, sampleVehicleRouteAt, TOW_BED, VEHICLE_HALF_LENGTH,
} from '../journeyPath';
import { RECOVERY_TIMING } from '../story';
import { markReflected } from './reflection';

// Truck frame: nose toward -Z, origin at the bed's centre, y up from the road.
const WHEEL_RADIUS = 0.52;
const AXLES: { z: number; track: number; width: number }[] = [
  { z: -4.55, track: 1.05, width: 0.34 },
  { z: 1, track: 1, width: 0.5 },
  { z: 2.25, track: 1, width: 0.5 },
];
/** The bed tips about its front-bottom edge. */
const BED_PIVOT = new Vector3(0, TOW_BED.top - TOW_BED.thickness, -TOW_BED.halfLength);
/** Where the winch cable leaves the headboard, in the bed's frame. */
const WINCH_DRUM = new Vector3(0, 0.36, 0.2);

// One truck in the story, so its per-frame scratch values can live here.
const pose = createTruckPose();
const car = createPose();
const drum = new Vector3();
const hook = new Vector3();
const forward = new Vector3();
const UP = new Vector3(0, 1, 0);
const direction = new Vector3();

const paint = { color: '#c9cfd6', metalness: 0.35, roughness: 0.42 };
const trim = { color: '#181d23', metalness: 0.4, roughness: 0.55 };
const glass = { color: '#0a1016', metalness: 0.3, roughness: 0.08 };
const steel = { color: '#3b444e', metalness: 0.6, roughness: 0.42 };

/**
 * The partner tow truck: a cab-over flatbed with an amber light bar. It drives the path in
 * journeyPath.ts, tips its bed into a ramp, winches the car aboard and carries it to the bay.
 */
export function TowTruck() {
  const truck = useRef<Group>(null);
  const bed = useRef<Group>(null);
  const wheels = useRef<Group>(null);
  const beaconA = useRef<Group>(null);
  const beaconB = useRef<Group>(null);
  const reverseLights = useRef<Group>(null);
  const beaconLight = useRef<PointLight>(null);
  const cable = useRef<Mesh>(null);
  useLayoutEffect(() => { if (truck.current) markReflected(truck.current); }, []);

  useFrame(() => {
    const group = truck.current;
    if (!group) return;
    const T = RECOVERY_TIMING;
    const at = sampleVehicleRouteAt(storyPosition(), journeyRuntime.reducedMotion);
    // Only in the story between dispatch and leaving the bay (calm mode jumps chapter to chapter).
    group.visible = at > T.towFrom - 0.02 && at < T.truckLeaveTo;
    if (!group.visible) return;
    sampleTowTruck(at, pose);
    group.position.copy(pose.position);
    group.rotation.set(pose.pitch, pose.heading, 0, 'YXZ');
    if (bed.current) {
      bed.current.position.set(BED_PIVOT.x, BED_PIVOT.y, BED_PIVOT.z + TOW_BED.slide * pose.ramp);
      bed.current.rotation.set(TOW_BED.tilt * pose.ramp, 0, 0);
    }
    // Rolling wheels: the same distance-based rule as the car, so reversing turns them back.
    const roll = -pose.progress * ROAD_LENGTH / WHEEL_RADIUS;
    wheels.current?.children.forEach(wheel => wheel.rotation.set(roll, 0, 0));

    // Light bar: working from the moment it pulls up until it leaves the bay.
    const working = at > T.towArrive - 0.06 && at < T.truckLeaveFrom + 0.04;
    const blink = journeyRuntime.reducedMotion ? 1 : Math.sin(journeyRuntime.time * Math.PI * 3.2) > 0 ? 1 : 0;
    if (beaconA.current) beaconA.current.visible = working && blink > 0.5;
    if (beaconB.current) beaconB.current.visible = working && (blink < 0.5 || journeyRuntime.reducedMotion);
    if (beaconLight.current) beaconLight.current.intensity = working ? (journeyRuntime.reducedMotion ? 6 : 4 + 6 * blink) : 0;
    if (reverseLights.current) reverseLights.current.visible = pose.reversing;

    // Winch cable from the headboard to the car's towing eye while it is pulled aboard.
    const winching = at > T.tiltTo - 0.01 && at < T.winchTo + 0.005;
    if (cable.current) {
      cable.current.visible = winching;
      if (winching && bed.current) {
        group.updateMatrixWorld();
        drum.copy(WINCH_DRUM);
        bed.current.localToWorld(drum);
        sampleVehiclePose(at, car);
        forward.set(-Math.sin(car.heading), 0, -Math.cos(car.heading));
        hook.copy(car.position).addScaledVector(forward, VEHICLE_HALF_LENGTH - 0.05);
        hook.y += 0.36 + Math.sin(car.pitch) * VEHICLE_HALF_LENGTH;
        // The cable lives in the truck's frame, so convert both ends.
        group.worldToLocal(drum);
        group.worldToLocal(hook);
        direction.subVectors(hook, drum);
        const length = direction.length();
        cable.current.position.copy(drum).addScaledVector(direction, 0.5);
        cable.current.quaternion.setFromUnitVectors(UP, direction.normalize());
        cable.current.scale.set(1, Math.max(length, 0.01), 1);
      }
    }
  });

  return <group ref={truck} name="tow-truck">
    {/* Chassis and under-run bar */}
    <mesh position={[0, 0.56, -1.2]}><boxGeometry args={[1.9, 0.26, 9]} /><meshStandardMaterial color="#13171c" roughness={0.8} /></mesh>
    <mesh position={[0, 0.42, 3.3]}><boxGeometry args={[2.3, 0.12, 0.12]} /><meshStandardMaterial {...steel} /></mesh>
    {/* Cab */}
    <group position={[0, 0, -4.55]}>
      <mesh position={[0, 1.76, 0]}><boxGeometry args={[2.5, 1.56, 2.3]} /><meshStandardMaterial {...paint} /></mesh>
      <mesh position={[0, 2.6, 0.08]}><boxGeometry args={[2.38, 0.14, 2.06]} /><meshStandardMaterial {...paint} /></mesh>
      <mesh position={[0, 0.86, -1.13]}><boxGeometry args={[2.46, 0.56, 0.3]} /><meshStandardMaterial {...trim} /></mesh>
      <mesh position={[0, 2.06, -1.16]} rotation={[-0.12, 0, 0]}><boxGeometry args={[2.28, 0.78, 0.05]} /><meshStandardMaterial {...glass} /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * 1.26, 2.08, -0.38]}><boxGeometry args={[0.04, 0.62, 1.05]} /><meshStandardMaterial {...glass} /></mesh>
        <mesh position={[side * 1.46, 2.02, -0.86]}><boxGeometry args={[0.08, 0.42, 0.16]} /><meshStandardMaterial {...trim} /></mesh>
        <mesh position={[side * 0.82, 1.02, -1.29]}><boxGeometry args={[0.42, 0.2, 0.06]} /><meshBasicMaterial color={[4.2, 4.2, 4]} toneMapped={false} /></mesh>
        <mesh position={[side * 1.16, 1.02, -1.28]}><boxGeometry args={[0.12, 0.14, 0.06]} /><meshBasicMaterial color={[3.2, 1.5, 0.2]} toneMapped={false} /></mesh>
      </group>)}
      <mesh position={[0, 1.06, -1.29]}><boxGeometry args={[1.1, 0.36, 0.04]} /><meshStandardMaterial color="#0d1014" roughness={0.6} /></mesh>
      {/* Amber light bar: two halves that alternate */}
      <mesh position={[0, 2.74, -0.05]}><boxGeometry args={[1.72, 0.12, 0.34]} /><meshStandardMaterial {...trim} /></mesh>
      <group ref={beaconA} visible={false}>
        {[-0.68, 0.24].map(x => <mesh key={x} position={[x, 2.84, -0.05]}><boxGeometry args={[0.38, 0.12, 0.3]} /><meshBasicMaterial color={[5, 2.1, 0.25]} toneMapped={false} /></mesh>)}
      </group>
      <group ref={beaconB} visible={false}>
        {[-0.24, 0.68].map(x => <mesh key={x} position={[x, 2.84, -0.05]}><boxGeometry args={[0.38, 0.12, 0.3]} /><meshBasicMaterial color={[5, 2.1, 0.25]} toneMapped={false} /></mesh>)}
      </group>
      <pointLight ref={beaconLight} position={[0, 3.3, 0]} color="#ffae3d" intensity={0} distance={18} decay={1.6} />
    </group>
    {/* Wheels */}
    <group ref={wheels}>
      {AXLES.flatMap(axle => [-1, 1].map(side => <group key={`${axle.z}-${side}`} position={[side * axle.track, WHEEL_RADIUS, axle.z]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, axle.width, 18]} />
          <meshStandardMaterial color="#0b0d0f" roughness={0.9} />
        </mesh>
        {/* A hub bar across the outer face, so the turning reads */}
        <mesh position={[side * (axle.width / 2 + 0.005), 0, 0]}><boxGeometry args={[0.02, WHEEL_RADIUS * 1.1, 0.14]} /><meshStandardMaterial {...steel} /></mesh>
      </group>))}
    </group>
    {/* Rear lights on the chassis, under the bed */}
    {[-1, 1].map(side => <mesh key={side} position={[side * 1, 0.6, 3.36]}><boxGeometry args={[0.32, 0.14, 0.04]} /><meshBasicMaterial color={[3.2, 0.12, 0.06]} toneMapped={false} /></mesh>)}
    <group ref={reverseLights} visible={false}>
      {[-1, 1].map(side => <mesh key={side} position={[side * 0.62, 0.6, 3.36]}><boxGeometry args={[0.18, 0.12, 0.04]} /><meshBasicMaterial color={[3.6, 3.6, 3.4]} toneMapped={false} /></mesh>)}
    </group>
    {/* Flatbed, pivoting at its front-bottom edge */}
    <group ref={bed} position={BED_PIVOT}>
      <mesh position={[0, TOW_BED.thickness / 2, TOW_BED.halfLength]}><boxGeometry args={[TOW_BED.halfWidth * 2, TOW_BED.thickness, TOW_BED.halfLength * 2]} /><meshStandardMaterial {...steel} /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * (TOW_BED.halfWidth - 0.03), TOW_BED.thickness + 0.05, TOW_BED.halfLength]}><boxGeometry args={[0.07, 0.1, TOW_BED.halfLength * 2]} /><meshStandardMaterial {...trim} /></mesh>
        {[1.2, 3.2, 5.2].map(z => <mesh key={z} position={[side * (TOW_BED.halfWidth + 0.01), TOW_BED.thickness * 0.5, z]}><boxGeometry args={[0.03, 0.06, 0.16]} /><meshBasicMaterial color={[3, 1.3, 0.15]} toneMapped={false} /></mesh>)}
      </group>)}
      <mesh position={[0, TOW_BED.thickness + 0.48, 0.06]}><boxGeometry args={[TOW_BED.halfWidth * 2, 0.96, 0.1]} /><meshStandardMaterial {...steel} /></mesh>
      <mesh position={[0, WINCH_DRUM.y, WINCH_DRUM.z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.7, 12]} /><meshStandardMaterial {...trim} /></mesh>
    </group>
    {/* Winch cable: a unit cylinder stretched between drum and towing eye each frame */}
    <mesh ref={cable} visible={false}>
      <cylinderGeometry args={[0.022, 0.022, 1, 6]} />
      <meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.3} />
    </mesh>
  </group>;
}
