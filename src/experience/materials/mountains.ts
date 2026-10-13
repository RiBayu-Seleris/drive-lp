import { ShaderMaterial, Vector3 } from 'three';
import { glslVec3, MOON_DIRECTION, NIGHT, SUN_DIRECTION } from '../world/atmosphere';
import { noiseGlsl } from './glsl';

/**
 * Far snow peaks. Scene fog would erase them at this distance, so they carry their own
 * aerial perspective: enough haze to sit behind the city, not so much that they vanish.
 */
const vertexShader = /* glsl */ `
varying vec3 vWorld;
varying vec3 vWorldNormal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 moonDirection;
uniform vec3 moonColor;
uniform vec3 hazeColor;
uniform float snowLine;
uniform float peakHeight;
uniform float dawn;
varying vec3 vWorld;
varying vec3 vWorldNormal;

${noiseGlsl}

void main() {
  vec3 n = normalize(vWorldNormal);
  float altitude = clamp((vWorld.y - snowLine) / (peakHeight - snowLine), 0.0, 1.0);
  float streaks = valueNoise(vWorld.xz * 0.025) * 0.4 + valueNoise(vWorld.xz * 0.09) * 0.25;
  float snow = smoothstep(0.2, 0.5, altitude + streaks - 0.25) * smoothstep(0.3, 0.72, n.y);

  vec3 albedo = mix(vec3(0.012, 0.015, 0.022), vec3(0.42, 0.47, 0.58), snow);
  vec3 sunDirection = ${glslVec3(SUN_DIRECTION)};
  vec3 lightDirection = normalize(mix(moonDirection, sunDirection, dawn));
  vec3 lightColor = mix(moonColor, vec3(1.3, 0.85, 0.6), dawn);
  float lambert = max(dot(n, lightDirection), 0.0);
  vec3 skyFill = mix(vec3(0.02, 0.03, 0.052), vec3(0.12, 0.1, 0.12), dawn);
  vec3 color = albedo * (lightColor * lambert * 1.15 + skyFill * (0.45 + 0.55 * n.y));

  float range = length(vWorld - cameraPosition);
  float haze = clamp(0.2 + range / 3800.0, 0.0, 0.72) * (1.0 - 0.4 * clamp(vWorld.y / peakHeight, 0.0, 1.0));
  vec3 hazeTint = mix(hazeColor, vec3(0.3, 0.22, 0.22), dawn);
  gl_FragColor = vec4(mix(color, hazeTint, haze), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createMountainMaterial(snowLine: number, peakHeight: number) {
  return new ShaderMaterial({
    name: 'DRIVE far peaks',
    vertexShader,
    fragmentShader,
    uniforms: {
      moonDirection: { value: new Vector3().copy(MOON_DIRECTION) },
      moonColor: { value: NIGHT.moonlight.clone() },
      hazeColor: { value: NIGHT.horizon.clone() },
      snowLine: { value: snowLine },
      peakHeight: { value: peakHeight },
      dawn: { value: 0 },
    },
    fog: false,
  });
}
