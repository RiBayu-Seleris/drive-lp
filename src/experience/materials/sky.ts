import { BackSide, ShaderMaterial, Vector3 } from 'three';
import { glslVec3, MOON_DIRECTION, NIGHT, SUN_DIRECTION } from '../world/atmosphere';
import { noiseGlsl } from './glsl';

/**
 * Night sky dome: gradient, moonlit cloud edges, the moon itself, stars through the gaps
 * and the glow the coast city throws onto low cloud. `dawn` (0–1) warms it for the ending.
 * The dome follows the camera, so the shader works from view direction only.
 */
const vertexShader = /* glsl */ `
varying vec3 vWorld;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 zenithColor;
uniform vec3 horizonColor;
uniform vec3 moonDirection;
uniform float time;
uniform float dawn;
varying vec3 vWorld;

${noiseGlsl}

void main() {
  vec3 direction = normalize(vWorld - cameraPosition);
  float up = max(direction.y, 0.0);

  vec3 color = mix(horizonColor, zenithColor, pow(up, 0.42));
  color *= mix(1.0, 0.6, smoothstep(0.0, -0.2, direction.y));

  // The city across the bay lights the low sky in front and to the left.
  vec3 heading = normalize(vec3(direction.x, 0.0, direction.z) + vec3(0.0, 0.0001, 0.0));
  float cityGlow = pow(max(dot(heading, normalize(vec3(-0.3, 0.0, -1.0))), 0.0), 5.0) * exp(-up * 11.0);
  color += vec3(0.045, 0.03, 0.032) * cityGlow;

  // Clouds on a curved ceiling; they stretch toward the horizon like real perspective.
  vec2 cloudUv = direction.xz / (up + 0.12) * 1.25 + vec2(time * 0.006, time * 0.002);
  float warp = fbm(cloudUv * 0.55 + 3.7);
  float density = smoothstep(0.4, 0.76, fbm(cloudUv + warp * 1.4)) * smoothstep(-0.01, 0.07, direction.y);

  float moonAlign = max(dot(direction, moonDirection), 0.0);
  float moonNear = pow(moonAlign, 7.0);
  float moonFar = pow(moonAlign, 2.0);
  // Thin cloud edges catch the moon; thick cloud stays dark.
  float edge = density * (1.0 - smoothstep(0.35, 0.9, density));
  vec3 cloudBody = mix(horizonColor * 0.7, zenithColor * 1.3, up) + vec3(0.02, 0.014, 0.014) * cityGlow;
  vec3 silver = vec3(0.2, 0.24, 0.32) * (moonNear * 2.4 + moonFar * 0.35 + 0.05);
  color = mix(color, cloudBody + silver * edge * 2.6, density);

  // Stars on a fixed angular grid, only where the sky is clear.
  vec2 starGrid = vec2(atan(direction.z, direction.x), asin(clamp(direction.y, -1.0, 1.0))) * 190.0;
  vec2 starCell = floor(starGrid);
  float starSeed = hash12(starCell);
  float starShape = 1.0 - smoothstep(0.05, 0.32, length(fract(starGrid) - 0.5));
  float twinkle = 0.65 + 0.35 * sin(time * (1.5 + starSeed * 3.0) + starSeed * 40.0);
  float stars = step(0.993, starSeed) * starShape * twinkle * (1.0 - density) * smoothstep(0.08, 0.3, up);
  color += vec3(0.75, 0.82, 1.0) * stars * 0.9;

  // Moon: a small bright disc and its halo, partly veiled by passing cloud.
  float disc = smoothstep(0.99985, 0.99991, moonAlign);
  float halo = pow(moonAlign, 260.0) * 0.5 + pow(moonAlign, 34.0) * 0.08;
  float veil = 1.0 - density * 0.82;
  color += vec3(1.0, 0.97, 0.92) * disc * 7.0 * veil + vec3(0.55, 0.64, 0.86) * halo * mix(1.0, 0.55, density);

  // Ending: first light ahead of the road, warm low sky, cloud undersides lit.
  vec3 sunDirection = ${glslVec3(SUN_DIRECTION)};
  float sunAlign = max(dot(direction, sunDirection), 0.0);
  vec3 dawnSky = mix(vec3(0.42, 0.26, 0.2), vec3(0.08, 0.12, 0.22), pow(up, 0.5));
  dawnSky += vec3(1.0, 0.55, 0.25) * pow(sunAlign, 12.0) * 0.9 + vec3(2.4, 1.6, 0.9) * pow(sunAlign, 900.0);
  vec3 dawnCloud = mix(vec3(0.5, 0.3, 0.24), vec3(0.16, 0.16, 0.22), up) * (0.6 + edge * 1.4);
  dawnSky = mix(dawnSky, dawnCloud, density * 0.85);
  color = mix(color, dawnSky, dawn);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createSkyMaterial() {
  return new ShaderMaterial({
    name: 'DRIVE night sky',
    vertexShader,
    fragmentShader,
    uniforms: {
      zenithColor: { value: NIGHT.zenith.clone() },
      horizonColor: { value: NIGHT.horizon.clone() },
      moonDirection: { value: new Vector3().copy(MOON_DIRECTION) },
      time: { value: 0 },
      dawn: { value: 0 },
    },
    side: BackSide,
    depthWrite: false,
    fog: false,
  });
}
