import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  AdditiveBlending, BoxGeometry, Color, ConeGeometry, InstancedBufferAttribute, InstancedMesh, MathUtils, Mesh, Object3D,
  RepeatWrapping, SRGBColorSpace, Vector3, type Group, type ShaderMaterial, type Texture,
} from 'three';
import { journeyRuntime } from '../runtime';
import { sampleDawn } from '../story';
import { seeded } from './roadPath';
import { markReflected } from './reflection';
import { NIGHT, WATER_LEVEL } from './atmosphere';
import { CITY_BOUNDS, CITY_GROUND, cityLayout } from './cityLayout';
import {
  FAR_RANGES, ISLAND, TOWER_PEAK, coastalWallHeight, fbm, heightfield, islandHeight, rangeHeight, towerPeakHeight,
} from './terrain';
import { createSkyMaterial } from '../materials/sky';
import { createWaterMaterial } from '../materials/water';
import { createCityMaterial } from '../materials/city';
import { createMountainMaterial } from '../materials/mountains';
import { createCliffMaterial } from '../materials/cliff';
import { createMistMaterial } from '../materials/atmospherics';

type Quality = 'high' | 'medium' | 'low';

/** Sky dome centred on the camera, so the moon stays put however far the car travels. */
function Sky() {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(() => createSkyMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => { if (mesh.current) markReflected(mesh.current); }, []);
  useFrame(({ camera }) => {
    const sky = mesh.current;
    if (!sky) return;
    sky.position.copy(camera.position);
    const uniforms = (sky.material as ShaderMaterial).uniforms;
    uniforms.time.value = journeyRuntime.time;
    uniforms.dawn.value = sampleDawn(journeyRuntime.position);
  });
  return <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
    <sphereGeometry args={[3200, 48, 24]} />
  </mesh>;
}

/** Calm bay: a translucent surface over the mirrored city below it. */
function Bay() {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(() => createWaterMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    if (mesh.current) (mesh.current.material as ShaderMaterial).uniforms.time.value = journeyRuntime.time;
  });
  return <mesh ref={mesh} material={material} position={[0, WATER_LEVEL, -300]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
    <planeGeometry args={[7000, 7000]} />
  </mesh>;
}

function City({ count }: { count: number }) {
  const towers = useRef<InstancedMesh>(null);
  const reflection = useRef<InstancedMesh>(null);
  const layout = useMemo(() => cityLayout(count), [count]);
  const geometry = useMemo(() => {
    const box = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    box.setAttribute('aStyle', new InstancedBufferAttribute(new Float32Array(layout.map(building => building.style)), 1));
    return box;
  }, [layout]);
  const [solid, mirrored] = useMemo(() => [createCityMaterial(false), createCityMaterial(true)], []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => { solid.dispose(); mirrored.dispose(); }, [solid, mirrored]);

  useLayoutEffect(() => {
    if (!towers.current || !reflection.current) return;
    const placement = new Object3D();
    layout.forEach((building, index) => {
      placement.position.set(building.x, CITY_GROUND, building.z);
      placement.scale.set(building.width, building.height, building.depth);
      placement.updateMatrix();
      towers.current!.setMatrixAt(index, placement.matrix);
    });
    towers.current.instanceMatrix.needsUpdate = true;
    // The reflection reads the same transforms; the shader flips them below the water.
    reflection.current.instanceMatrix = towers.current.instanceMatrix;
  }, [layout]);

  useFrame(() => {
    if (reflection.current) (reflection.current.material as ShaderMaterial).uniforms.time.value = journeyRuntime.time;
  });

  const width = CITY_BOUNDS.maxX - CITY_BOUNDS.minX + 60;
  const depth = CITY_BOUNDS.nearZ - CITY_BOUNDS.farZ + 40;
  return <group>
    <instancedMesh ref={towers} args={[geometry, solid, layout.length]} frustumCulled={false} />
    <instancedMesh ref={reflection} args={[geometry, mirrored, layout.length]} frustumCulled={false} />
    <mesh position={[(CITY_BOUNDS.minX + CITY_BOUNDS.maxX) / 2, CITY_GROUND - 0.15, (CITY_BOUNDS.nearZ + CITY_BOUNDS.farZ) / 2 - 10]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#06090f" roughness={0.95} />
    </mesh>
  </group>;
}

function FarRanges({ detail }: { detail: number }) {
  const group = useRef<Group>(null);
  const ranges = useMemo(() => FAR_RANGES.map(range => ({
    geometry: heightfield({
      minX: range.x - range.width / 2, maxX: range.x + range.width / 2,
      minZ: range.z - range.depth / 2, maxZ: range.z + range.depth / 2,
      step: range.width / detail,
      height: (x, z) => rangeHeight(range, x, z),
    }),
    material: createMountainMaterial(WATER_LEVEL + range.peak * 0.42, WATER_LEVEL + range.peak),
  })), [detail]);
  useEffect(() => () => ranges.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); }), [ranges]);
  useFrame(() => {
    const dawn = sampleDawn(journeyRuntime.position);
    group.current?.children.forEach(child => { ((child as Mesh).material as ShaderMaterial).uniforms.dawn.value = dawn; });
  });
  return <group ref={group}>{ranges.map(({ geometry, material }, index) => <mesh key={index} geometry={geometry} material={material} />)}</group>;
}

// Wet dark rock at the waterline, lichen-grey higher up, a dark green cap where trees grow.
function rockColor(_x: number, y: number) {
  const height = y - WATER_LEVEL;
  const base = new Color(0.32, 0.36, 0.42).lerp(new Color(0.62, 0.66, 0.7), MathUtils.smoothstep(height, 4, 40));
  return base.lerp(new Color(0.3, 0.38, 0.34), MathUtils.smoothstep(height, 70, 105) * 0.6);
}

/** Repeating rock textures; only colour maps are sRGB-encoded. */
function prepareTiling(texture: Texture, color: boolean) {
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  if (color) texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
}

interface Landform { height: (x: number, z: number) => number; bounds: [number, number, number, number]; step: number }

const LANDFORMS: Landform[] = [
  { height: coastalWallHeight, bounds: [-30, 178, -178, 72], step: 1.25 },
  { height: towerPeakHeight, bounds: [TOWER_PEAK.x - 74, TOWER_PEAK.x + 74, TOWER_PEAK.z - 98, TOWER_PEAK.z + 98], step: 2.2 },
  { height: islandHeight, bounds: [ISLAND.x - 55, ISLAND.x + 55, ISLAND.z - 37, ISLAND.z + 37], step: 1.6 },
];

/** Trees where the rock levels out: tops and shoulders, never on the sheer faces. */
function treeSpots(count: number) {
  const spots: { position: Vector3; scale: number }[] = [];
  const probe = 1.5;
  for (let attempt = 0; spots.length < count && attempt < count * 40; attempt++) {
    const form = LANDFORMS[attempt % LANDFORMS.length];
    const [minX, maxX, minZ, maxZ] = form.bounds;
    const x = MathUtils.lerp(minX, maxX, seeded(attempt * 2 + 11));
    const z = MathUtils.lerp(minZ, maxZ, seeded(attempt * 2 + 29));
    const y = form.height(x, z);
    if (y < WATER_LEVEL + 9) continue;
    const slope = Math.hypot(form.height(x + probe, z) - y, form.height(x, z + probe) - y) / probe;
    if (slope > 0.75 || fbm(x * 0.04, z * 0.04, 3) < 0.42) continue;
    spots.push({ position: new Vector3(x, y - 0.4, z), scale: 0.75 + seeded(attempt * 7 + 3) * 0.6 });
  }
  return spots;
}

function Headlands({ quality, treeCount }: { quality: Quality; treeCount: number }) {
  const [diffuse, normal] = useTexture(['/assets/textures/cliff_side_diff_1k.jpg', '/assets/textures/cliff_side_nor_gl_1k.jpg']);
  useLayoutEffect(() => {
    prepareTiling(diffuse, true);
    prepareTiling(normal, false);
  }, [diffuse, normal]);
  const material = useMemo(() => createCliffMaterial(diffuse, normal), [diffuse, normal]);
  // Coarser rock on lower tiers keeps vertex count in check.
  const coarseness = quality === 'high' ? 1 : quality === 'medium' ? 1.35 : 1.8;
  const geometries = useMemo(() => LANDFORMS.map(form => heightfield({
    minX: form.bounds[0], maxX: form.bounds[1], minZ: form.bounds[2], maxZ: form.bounds[3],
    step: form.step * coarseness, height: form.height, color: rockColor,
  })), [coarseness]);
  useEffect(() => () => geometries.forEach(geometry => geometry.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);

  const trees = useRef<InstancedMesh>(null);
  const spots = useMemo(() => treeSpots(treeCount), [treeCount]);
  const treeGeometry = useMemo(() => new ConeGeometry(1, 1, 6).translate(0, 0.5, 0), []);
  useEffect(() => () => treeGeometry.dispose(), [treeGeometry]);
  useLayoutEffect(() => {
    if (!trees.current) return;
    const placement = new Object3D();
    spots.forEach((spot, index) => {
      placement.position.copy(spot.position);
      placement.scale.set(2.4 * spot.scale, 9.5 * spot.scale, 2.4 * spot.scale);
      placement.rotation.set(0, seeded(index) * Math.PI, 0);
      placement.updateMatrix();
      trees.current!.setMatrixAt(index, placement.matrix);
    });
    trees.current.instanceMatrix.needsUpdate = true;
    trees.current.computeBoundingSphere();
  }, [spots]);

  return <group>
    {geometries.map((geometry, index) => <mesh key={index} geometry={geometry} material={material} />)}
    <instancedMesh ref={trees} args={[treeGeometry, undefined, spots.length]}>
      <meshStandardMaterial color="#17261e" roughness={1} flatShading />
    </instancedMesh>
  </group>;
}

/** Landmark on the far promontory: stacked discs, lit rings and a beam into the cloud. */
function DiscTower() {
  const beacon = useRef<Mesh>(null);
  const base = useMemo(() => new Vector3(TOWER_PEAK.x, towerPeakHeight(TOWER_PEAK.x, TOWER_PEAK.z) - 2, TOWER_PEAK.z), []);
  useFrame(() => {
    if (beacon.current) beacon.current.visible = Math.sin(journeyRuntime.time * 2.4) > 0.2 || journeyRuntime.reducedMotion;
  });
  const discs = [{ y: 17, radius: 15 }, { y: 22.5, radius: 11.5 }, { y: 27, radius: 8.5 }];
  return <group position={base}>
    <mesh position={[0, 15, 0]}><cylinderGeometry args={[1.6, 2.6, 30, 16]} /><meshStandardMaterial color="#1b2430" metalness={0.6} roughness={0.4} /></mesh>
    {discs.map(disc => <group key={disc.y} position={[0, disc.y, 0]}>
      <mesh><cylinderGeometry args={[disc.radius, disc.radius * 0.82, 1.6, 48]} /><meshStandardMaterial color="#202b38" metalness={0.7} roughness={0.32} /></mesh>
      <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[disc.radius * 0.97, disc.radius * 0.97, 0.45, 48, 1, true]} /><meshBasicMaterial color={[3.2, 2.6, 1.9]} toneMapped={false} /></mesh>
    </group>)}
    <mesh position={[0, 31, 0]} ref={beacon}><sphereGeometry args={[0.6, 12, 8]} /><meshBasicMaterial color={[5, 0.35, 0.2]} toneMapped={false} /></mesh>
    <mesh position={[0, 330, 0]}>
      <cylinderGeometry args={[0.45, 0.45, 600, 8, 1, true]} />
      <meshBasicMaterial color={[0.6, 0.85, 1.4]} transparent opacity={0.2} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>;
}

// Fog banks: at the foot of the cliff, around the island and along the far shore.
const MIST_BANKS: { position: [number, number, number]; size: [number, number] }[] = [
  { position: [40, -4, -20], size: [90, 26] }, { position: [58, 2, -78], size: [110, 30] },
  { position: [30, -6, 28], size: [80, 20] }, { position: [92, 14, -40], size: [130, 34] },
  { position: [-82, -2, -150], size: [120, 24] }, { position: [-40, -8, -230], size: [160, 22] },
  { position: [-110, -6, -500], size: [240, 26] }, { position: [70, -7, -498], size: [200, 22] },
  { position: [150, 30, -230], size: [150, 40] }, { position: [120, -4, -160], size: [140, 26] },
  { position: [-240, 10, -560], size: [220, 40] }, { position: [210, 6, -420], size: [200, 34] },
];

function MistBanks({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(() => createMistMaterial(new Vector3(NIGHT.horizon.r * 1.6, NIGHT.horizon.g * 1.6, NIGHT.horizon.b * 1.6), 0.5), []);
  useEffect(() => () => material.dispose(), [material]);
  const banks = useMemo(() => MIST_BANKS.slice(0, count), [count]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const placement = new Object3D();
    banks.forEach((bank, index) => {
      placement.position.set(...bank.position);
      placement.scale.set(bank.size[0], bank.size[1], 1);
      placement.updateMatrix();
      mesh.current!.setMatrixAt(index, placement.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [banks]);
  useFrame(() => {
    if (mesh.current) (mesh.current.material as ShaderMaterial).uniforms.time.value = journeyRuntime.time;
  });
  return <instancedMesh ref={mesh} args={[undefined, material, banks.length]} frustumCulled={false} renderOrder={2}>
    <planeGeometry args={[1, 1]} />
  </instancedMesh>;
}

export function Landscape({ quality }: { quality: Quality }) {
  const low = quality === 'low';
  return <>
    <Sky />
    <Bay />
    <City count={low ? 110 : quality === 'medium' ? 170 : 230} />
    <FarRanges detail={low ? 56 : 96} />
    <Headlands quality={quality} treeCount={low ? 120 : 260} />
    <DiscTower />
    <MistBanks count={low ? 8 : MIST_BANKS.length} />
  </>;
}
