import type { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D } from 'three';

/** Material names written by scripts/build-aventador.mjs. */
export const VEHICLE_MATERIAL = {
  paint: 'Aventador pearl silver',
  glass: 'Smoked glass',
  accent: 'Blue accent',
  rims: 'Forged alloy wheels',
  headlights: 'Headlight LEDs',
  tailLens: 'Rear lamp lens',
  tailLeds: 'Rear LED lamps',
} as const;

/** Taillight brightness in linear HDR: cruising, then braking hard when the rock comes down. */
export const TAIL_GLOW = { cruise: 3.2, brake: 9 };

/**
 * Turns the showroom silver into a dark car on a wet night road: near-black blue paint under
 * a glossy clear coat, darker glass and rims, and lamps that actually emit light. The GLB's
 * materials are shared by every clone, so this edits them in place and is safe to repeat.
 */
export function applyNightLook(model: Object3D) {
  model.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const material = mesh.material as MeshPhysicalMaterial;
    switch (material.name) {
      case VEHICLE_MATERIAL.paint:
        material.color.set('#0b1017');
        material.metalness = 0.72;
        material.roughness = 0.3;
        material.clearcoat = 1;
        material.clearcoatRoughness = 0.04;
        material.envMapIntensity = 1.15;
        break;
      case VEHICLE_MATERIAL.accent:
        // The model's blue stripe would read as a livery; keep it as a darker trim line.
        material.color.set('#151c25');
        material.roughness = 0.4;
        break;
      case VEHICLE_MATERIAL.glass:
        material.color.set('#070b10');
        material.roughness = 0.04;
        material.metalness = 0.3;
        material.opacity = 0.86;
        material.envMapIntensity = 1.5;
        break;
      case VEHICLE_MATERIAL.rims:
        material.color.set('#4a535d');
        material.metalness = 0.92;
        material.roughness = 0.26;
        break;
      case VEHICLE_MATERIAL.headlights:
        setGlow(material, '#d9e8ff', 2.4);
        break;
      case VEHICLE_MATERIAL.tailLens:
        setGlow(material, '#ff1a0e', 1.1);
        break;
      case VEHICLE_MATERIAL.tailLeds:
        setGlow(material, '#ff2412', TAIL_GLOW.cruise);
        break;
    }
  });
}

function setGlow(material: MeshStandardMaterial, color: string, intensity: number) {
  material.emissive.set(color);
  material.emissiveIntensity = intensity;
  material.toneMapped = true;
}

export function findMaterial(model: Object3D, name: string) {
  let found: MeshStandardMaterial | undefined;
  model.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.material.name === name) found = mesh.material as MeshStandardMaterial;
  });
  return found;
}
