import { BackSide, FrontSide, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { WATER_LEVEL } from '../world/atmosphere';
import { noiseGlsl } from './glsl';

/**
 * Towers across the bay. Each box gets its own floor height, window rhythm and share of lit
 * rooms from a per-instance seed, so 200 boxes read as a skyline rather than a pattern.
 * `mirrored` draws the same instances flipped below the water as their reflection.
 * The geometry must carry an instanced `aStyle` attribute (see CITY_STYLE).
 */
export const CITY_STYLE = { plain: 0, fins: 1, crown: 2 } as const;
const vertexShader = /* glsl */ `
uniform float mirrored;
uniform float waterLevel;
// 0 ordinary tower, 1 LED fins on the corners, 2 lit crown.
attribute float aStyle;
varying vec3 vLocal;
varying vec3 vFaceNormal;
varying vec3 vSize;
varying vec3 vWorld;
varying float vSeed;
varying float vStyle;
#include <fog_pars_vertex>

void main() {
  vec3 size = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vSize = size;
  vLocal = position * size;
  vFaceNormal = normal;
  vSeed = fract(sin(float(gl_InstanceID) * 12.9898 + 78.233) * 43758.5453);
  vStyle = aStyle;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  if (mirrored > 0.5) world.y = 2.0 * waterLevel - world.y;
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragmentShader = /* glsl */ `
uniform float mirrored;
uniform float time;
varying vec3 vLocal;
varying vec3 vFaceNormal;
varying vec3 vSize;
varying vec3 vWorld;
varying float vSeed;
varying float vStyle;
#include <fog_pars_fragment>

${noiseGlsl}

void main() {
  vec3 n = normalize(vFaceNormal);
  float roof = step(0.5, n.y);
  bool sideX = abs(n.x) > 0.5;
  float across = sideX ? vLocal.z : vLocal.x;
  float halfAcross = sideX ? vSize.z * 0.5 : vSize.x * 0.5;
  float face = n.x > 0.5 ? 1.0 : (n.x < -0.5 ? 2.0 : (n.z > 0.5 ? 3.0 : 4.0));
  float height = vLocal.y;

  float floorHeight = mix(3.2, 4.6, hash12(vec2(vSeed * 13.0, 2.0)));
  float bay = mix(1.8, 3.4, hash12(vec2(vSeed * 17.0, 5.0)));
  float litShare = mix(0.16, 0.6, hash12(vec2(vSeed * 19.0, 9.0)));

  vec2 grid = vec2(across / bay, height / floorHeight);
  vec2 cell = floor(grid);
  vec2 inCell = fract(grid);
  vec2 pixel = fwidth(grid);
  float pane = smoothstep(0.16 - pixel.x, 0.16 + pixel.x, inCell.x) * (1.0 - smoothstep(0.84 - pixel.x, 0.84 + pixel.x, inCell.x))
    * smoothstep(0.22 - pixel.y, 0.22 + pixel.y, inCell.y) * (1.0 - smoothstep(0.8 - pixel.y, 0.8 + pixel.y, inCell.y));
  float lit = step(1.0 - litShare, hash12(cell + vec2(face * 31.0, vSeed * 97.0)));
  // Panes smaller than a couple of pixels turn into their average instead of shimmering.
  float minify = smoothstep(0.25, 0.6, max(pixel.x, pixel.y));
  float windows = mix(pane * lit, litShare * 0.45, minify) * (1.0 - roof) * step(floorHeight * 0.7, height);

  vec3 warm = vec3(1.0, 0.68, 0.38);
  vec3 cool = vec3(0.68, 0.82, 1.0);
  vec3 tint = mix(warm, cool, step(0.6, hash12(cell * 1.7 + vSeed * 41.0)));
  float glow = 1.4 + 2.2 * hash12(cell + 7.3);

  float rise = clamp(height / max(vSize.y, 1.0), 0.0, 1.0);
  vec3 color = mix(vec3(0.004, 0.006, 0.011), vec3(0.011, 0.015, 0.025), rise) + tint * glow * windows;

  // A few towers carry light: LED fins on their corners or a lit crown.
  float edge = 1.0 - smoothstep(0.0, 0.3 + fwidth(across) * 1.5, halfAcross - abs(across));
  float crown = 1.0 - smoothstep(0.0, 1.4, vSize.y - height);
  float fins = 1.0 - step(0.5, abs(vStyle - 1.0));
  float crowned = 1.0 - step(0.5, abs(vStyle - 2.0));
  color += vec3(0.25, 0.6, 1.0) * 3.2 * edge * fins * (1.0 - roof);
  color += vec3(0.85, 0.92, 1.0) * 1.8 * crown * crowned * (1.0 - roof);

  if (mirrored > 0.5) {
    // Reflection: darker, broken into drifting horizontal bands by the ripples.
    float bands = valueNoise(vec2(vWorld.x * 0.04 + time * 0.08, vWorld.y * 0.85 + time * 0.3));
    color *= 0.55 * (0.3 + 0.7 * bands);
  }

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function createCityMaterial(mirrored: boolean) {
  return new ShaderMaterial({
    name: mirrored ? 'DRIVE city reflection' : 'DRIVE city',
    vertexShader,
    fragmentShader,
    uniforms: UniformsUtils.merge([UniformsLib.fog, {
      mirrored: { value: mirrored ? 1 : 0 },
      waterLevel: { value: WATER_LEVEL },
      time: { value: 0 },
    }]),
    // A mirror flips triangle winding, so the reflection shows its back faces.
    side: mirrored ? BackSide : FrontSide,
    fog: true,
  });
}
