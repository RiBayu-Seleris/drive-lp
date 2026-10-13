import { ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from 'three';
import { MOON_DIRECTION, NIGHT } from '../world/atmosphere';
import { noiseGlsl } from './glsl';

/**
 * The bay. Reflections are real geometry: the city is drawn a second time, mirrored below
 * the surface, and this translucent layer lets it through by the Fresnel amount — almost
 * nothing when looking straight down, most of it toward the far shore.
 */
const vertexShader = /* glsl */ `
#include <fog_pars_vertex>
varying vec3 vWorld;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 waterColor;
uniform vec3 moonDirection;
uniform float time;
varying vec3 vWorld;
#include <fog_pars_fragment>

${noiseGlsl}

void main() {
  vec3 toCamera = cameraPosition - vWorld;
  vec3 view = normalize(toCamera);

  // Two drifting ripple layers tilt the surface normal a little.
  vec2 p = vWorld.xz * 0.07;
  float a = valueNoise(p + vec2(time * 0.05, time * 0.03));
  float b = valueNoise(p * 2.6 - vec2(time * 0.04, -time * 0.02));
  vec3 normal = normalize(vec3((a - 0.5) * 0.14 + (b - 0.5) * 0.07, 1.0, (a - b) * 0.12));

  float facing = clamp(dot(view, normal), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
  float reflectivity = clamp(0.1 + fresnel * 1.2, 0.0, 0.9);

  // A path of moon glitter on the ripples.
  vec3 halfVector = normalize(view + moonDirection);
  float glitter = pow(clamp(dot(normal, halfVector), 0.0, 1.0), 700.0) * 4.0;

  vec3 color = waterColor + vec3(0.75, 0.82, 1.0) * glitter;
  gl_FragColor = vec4(color, clamp(1.0 - reflectivity + glitter, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function createWaterMaterial() {
  return new ShaderMaterial({
    name: 'DRIVE bay water',
    vertexShader,
    fragmentShader,
    uniforms: UniformsUtils.merge([UniformsLib.fog, {
      waterColor: { value: NIGHT.water.clone() },
      moonDirection: { value: new Vector3().copy(MOON_DIRECTION) },
      time: { value: 0 },
    }]),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}
