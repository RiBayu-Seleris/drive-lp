import { AdditiveBlending, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from 'three';
import { noiseGlsl } from './glsl';

/**
 * Mist banks and rain. Both are instanced quads that turn toward the camera in the vertex
 * shader, so hundreds of them cost one draw call each and never show a hard edge.
 */
const mistVertex = /* glsl */ `
varying vec2 vUv;
varying float vSeed;
varying float vNear;
#include <fog_pars_vertex>

void main() {
  vec3 center = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  // Upright billboard: faces the camera horizontally, stays level like a fog bank.
  vec3 right = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
  vec3 world = center + right * position.x * size.x + vec3(0.0, 1.0, 0.0) * position.y * size.y;
  vUv = uv;
  vSeed = fract(sin(float(gl_InstanceID) * 7.31 + 1.7) * 4375.85);
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  // Fade out as the camera flies into a bank instead of cutting through a flat card.
  vNear = smoothstep(6.0, 34.0, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const mistFragment = /* glsl */ `
uniform vec3 mistColor;
uniform float opacity;
uniform float time;
varying vec2 vUv;
varying float vSeed;
varying float vNear;
#include <fog_pars_fragment>

${noiseGlsl}

void main() {
  vec2 p = vUv * vec2(3.2, 1.4) + vec2(time * 0.012 + vSeed * 13.0, vSeed * 5.0);
  float body = fbm(p + fbm(p * 0.7) * 0.8);
  float shape = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.4, 1.0, vUv.y))
    * smoothstep(0.0, 0.3, vUv.x) * (1.0 - smoothstep(0.7, 1.0, vUv.x));
  float alpha = smoothstep(0.32, 0.78, body) * shape * opacity * vNear;
  gl_FragColor = vec4(mistColor, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function createMistMaterial(color: Vector3, opacity: number) {
  return new ShaderMaterial({
    name: 'DRIVE mist',
    vertexShader: mistVertex,
    fragmentShader: mistFragment,
    uniforms: UniformsUtils.merge([UniformsLib.fog, {
      mistColor: { value: color.clone() },
      opacity: { value: opacity },
      time: { value: 0 },
    }]),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}

const rainVertex = /* glsl */ `
uniform float time;
uniform vec3 volume;
uniform vec3 focus;
varying float vAlpha;
varying vec2 vUv;

void main() {
  // instanceMatrix only carries each drop's seed position inside a unit box.
  vec3 seed = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 fall = vec3(time * 1.8, time * 26.0, time * 0.6) / volume;
  // Wrap the field around the camera so it never runs out and never moves with it.
  vec3 local = (fract(seed - fall - focus / volume) - 0.5) * volume;
  vec3 dropCenter = focus + local;
  vec3 toCamera = normalize(cameraPosition - dropCenter);
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
  vec3 world = dropCenter + side * position.x * 0.016 + vec3(-0.06, 1.0, -0.02) * position.y * 0.75;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  float depth = -mvPosition.z;
  vAlpha = smoothstep(1.5, 4.0, depth) * (1.0 - smoothstep(14.0, 30.0, depth));
  vUv = uv;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const rainFragment = /* glsl */ `
uniform vec3 rainColor;
uniform float opacity;
varying float vAlpha;
varying vec2 vUv;

void main() {
  float streak = (1.0 - abs(vUv.x - 0.5) * 2.0) * smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));
  gl_FragColor = vec4(rainColor * streak * vAlpha * opacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createRainMaterial() {
  return new ShaderMaterial({
    name: 'DRIVE rain',
    vertexShader: rainVertex,
    fragmentShader: rainFragment,
    uniforms: {
      time: { value: 0 },
      volume: { value: new Vector3(44, 26, 44) },
      focus: { value: new Vector3() },
      rainColor: { value: new Vector3(0.55, 0.62, 0.75) },
      opacity: { value: 0.32 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  });
}
