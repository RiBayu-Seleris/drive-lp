import { useDeferredValue, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { MathUtils, Object3D, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial, type PointLight } from 'three';
import { VehicleNarrative } from './world/VehicleNarrative';
import { rigWheels } from './vehicleWheels';
import { applyNightLook, findMaterial, TAIL_GLOW, VEHICLE_MATERIAL } from './vehicleLook';
import { markReflected } from './world/reflection';
import { journeyRuntime, storyPosition } from './runtime';
import { sampleVehicleRolledDistance, sampleVehicleRouteAt, VEHICLE_SCALE } from './journeyPath';
import { INCIDENT_TIMING } from './story';

type VehicleProps = Omit<ThreeElements['group'], 'scale'> & { low?: boolean };

// A five-spoke rim looks smooth below ~1/3 of its 72° period per frame. Faster real spin is
// shown at this rate plus a blur disc, as film does, instead of strobing backwards.
const MAX_VISIBLE_SPIN = 18; // rad/s
const MAX_FRAME_STEP = .38; // rad, guards against long frames

// Indicators in model space (nose toward -Z), measured from the GLB's lamp meshes: the outer
// segment of each Y-shaped headlight ('Headlight LEDs', centroids x ±0.69, y 0.51, z -1.91) and
// the outermost tail-light LED segment ('Rear LED lamps', centroids x ±0.76, y 0.70, z 1.975).
// They sit inside the lamp housings, a hair forward of the LEDs, so they read as the lamp blinking.
const HAZARD_LAMPS: { position: [number, number, number]; size: [number, number, number] }[] = [
  { position: [-0.7, 0.515, -1.93], size: [0.1, 0.03, 0.05] },
  { position: [0.7, 0.515, -1.93], size: [0.1, 0.03, 0.05] },
  { position: [-0.765, 0.705, 1.985], size: [0.08, 0.04, 0.03] },
  { position: [0.765, 0.705, 1.985], size: [0.08, 0.04, 0.03] },
];

/**
 * Lights that belong to the car: the red wash its tail-lights throw on the wet road, the
 * headlight beam ahead, brake lights while it stops for the rocks, then hazard blinkers.
 */
function VehicleLights({ model }: { model: Object3D }) {
  const tailWash = useRef<PointLight>(null);
  const hazardWash = useRef<PointLight>(null);
  const blinkers = useRef<Group>(null);
  const tail = useRef<MeshStandardMaterial | null>(null);
  const beamTarget = useMemo(() => {
    const target = new Object3D();
    target.position.set(0, 0, -22);
    return target;
  }, []);

  useFrame(() => {
    const at = journeyRuntime.position;
    // Brake lights from the moment the rock falls until the car is at rest; hazards from the pull-over.
    const braking = MathUtils.smoothstep(at, INCIDENT_TIMING.brakeFrom, INCIDENT_TIMING.brakeFrom + .04)
      * (1 - MathUtils.smoothstep(at, INCIDENT_TIMING.stopAt, INCIDENT_TIMING.stopAt + .04));
    const hazards = MathUtils.smoothstep(at, INCIDENT_TIMING.hazardsFrom, INCIDENT_TIMING.hazardsFrom + .02)
      * (1 - MathUtils.smoothstep(at, INCIDENT_TIMING.hazardsUntil - .1, INCIDENT_TIMING.hazardsUntil));
    // Calm mode keeps them on rather than flashing.
    const blink = journeyRuntime.reducedMotion ? 1 : (Math.sin(journeyRuntime.time * Math.PI * 2.6) > 0 ? 1 : 0.08);

    tail.current ??= findMaterial(model, VEHICLE_MATERIAL.tailLeds) ?? null;
    if (tail.current) tail.current.emissiveIntensity = MathUtils.lerp(TAIL_GLOW.cruise, TAIL_GLOW.brake, braking);
    if (tailWash.current) tailWash.current.intensity = 5 + braking * 9;
    if (hazardWash.current) hazardWash.current.intensity = hazards * blink * 7;
    if (blinkers.current) {
      blinkers.current.visible = hazards > .01;
      blinkers.current.children.forEach(child => { ((child as Mesh).material as MeshBasicMaterial).opacity = hazards * blink; });
    }
  });

  return <>
    <pointLight ref={tailWash} position={[0, .55, 2.9]} color="#ff2a16" intensity={5} distance={9} decay={1.6} />
    <pointLight ref={hazardWash} position={[0, .7, 0]} color="#ffad3a" intensity={0} distance={10} decay={1.6} />
    <primitive object={beamTarget} />
    <spotLight position={[0, .62, -2.2]} target={beamTarget} color="#dfe9ff" intensity={60} distance={48} angle={.48} penumbra={.65} decay={1.4} />
    <group ref={blinkers} visible={false}>
      {HAZARD_LAMPS.map((lamp, index) => <mesh key={index} position={lamp.position}>
        <boxGeometry args={lamp.size} />
        <meshBasicMaterial color={[4.5, 2, .25]} toneMapped={false} transparent opacity={0} depthWrite={false} />
      </mesh>)}
    </group>
  </>;
}

/** User-supplied Aventador: 4.8m long, nose -Z, tires grounded at Y=0. */
export function Vehicle({ low = false, ...props }: VehicleProps) {
  // Keep the current mesh visible while an adaptive quality change loads the other LOD.
  const url = useDeferredValue(low ? '/assets/models/aventador-low.glb' : '/assets/models/aventador.glb');
  // Meshopt is bundled locally. Draco is explicitly disabled; no decoder CDN requests.
  const { scene } = useGLTF(url, false, true);
  const { model, rig } = useMemo(() => {
    // Keep instance transforms separate from the loader cache; GPU resources survive LOD changes.
    const clone = scene.clone(true);
    clone.name = 'DRIVE Aventador Sport';
    clone.userData.vehicleAsset = url;
    // Night materials first: the wheel rig copies the rim finish for its blur discs.
    applyNightLook(clone);
    const wheels = rigWheels(clone);
    markReflected(clone);
    return { model: clone, rig: wheels };
  }, [scene, url]);
  const spin = useRef({ distance: Number.NaN, angles: [0, 0, 0, 0], blur: 0 });

  useFrame((_, delta) => {
    const state = spin.current;
    const distance = sampleVehicleRolledDistance(sampleVehicleRouteAt(storyPosition(), journeyRuntime.reducedMotion));
    const moved = Number.isNaN(state.distance) ? 0 : distance - state.distance;
    state.distance = distance;
    const dt = Math.max(delta, 1 / 240);
    const limit = Math.min(MAX_VISIBLE_SPIN * dt, MAX_FRAME_STEP);
    let fastest = 0;
    rig.wheels.forEach((wheel, index) => {
      // Rolling without slipping: angle = distance / radius. Negative X turns the tread
      // toward the tail while the car moves nose-first (-Z).
      const step = -moved / (wheel.radius * VEHICLE_SCALE);
      fastest = Math.max(fastest, Math.abs(step) / dt);
      state.angles[index] += MathUtils.clamp(step, -limit, limit);
      wheel.pivot.rotation.set(state.angles[index], 0, 0);
    });
    const blurTarget = MathUtils.smoothstep(fastest, MAX_VISIBLE_SPIN * .7, MAX_VISIBLE_SPIN * 2.5);
    state.blur = MathUtils.damp(state.blur, blurTarget, 7, dt);
    rig.blur?.setValues({ opacity: .85 * state.blur });
  });

  return <group {...props} scale={VEHICLE_SCALE} name="vehicle">
    <mesh position={[0, .018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.9, 5.8]} />
      <shaderMaterial transparent depthWrite={false}
        vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}"
        fragmentShader="varying vec2 vUv;void main(){float a=(1.-smoothstep(.35,1.,length((vUv-.5)*2.)))*.78;gl_FragColor=vec4(.0,.002,.004,a);}" />
    </mesh>
    <primitive object={model} dispose={null} />
    <VehicleLights model={model} />
    <VehicleNarrative model={model}/>
  </group>;
}
