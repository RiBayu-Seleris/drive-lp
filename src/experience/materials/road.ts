import { MeshStandardMaterial, Vector2, type IUniform, type Matrix4, type Texture } from 'three';
import { noiseGlsl } from './glsl';

/** Cross-section of the carriageway, in world units from the centre line. */
export const ROAD_WIDTH = 17;
export const LANE_LINE_OFFSETS = [-4.25, 0, 4.25];
export const EDGE_LINE_OFFSET = 7.9;
/** Street lamps hang over the right-hand lanes at this spacing along the road. */
export const LAMP_SPACING = 56;
export const LAMP_ARM_OFFSET = 6;

export interface RoadReflectionUniforms {
  texture: IUniform<Texture | null>;
  matrix: IUniform<Matrix4>;
  strength: IUniform<number>;
}

/**
 * Wet asphalt after rain: darker where water pools, near-mirror in the puddles, painted
 * lines that stay matte. With `reflection`, the planar mirror image of the car and its
 * lights is smeared vertically, the way lights stretch across a wet road at night.
 */
export function createRoadMaterial(diffuse: Texture, normal: Texture, reflection: RoadReflectionUniforms | null) {
  const material = new MeshStandardMaterial({
    name: 'DRIVE wet asphalt',
    map: diffuse,
    normalMap: normal,
    normalScale: new Vector2(0.6, 0.6),
    color: '#454c55',
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.6,
  });
  if (reflection) material.defines = { USE_ROAD_REFLECTION: '' };

  material.onBeforeCompile = shader => {
    shader.uniforms.roadWidth = { value: ROAD_WIDTH };
    shader.uniforms.lampSpacing = { value: LAMP_SPACING };
    shader.uniforms.lampArm = { value: LAMP_ARM_OFFSET };
    if (reflection) {
      shader.uniforms.roadReflection = reflection.texture;
      shader.uniforms.reflectionMatrix = reflection.matrix;
      shader.uniforms.reflectionStrength = reflection.strength;
    }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec2 vRoadUv;
varying vec3 vRoadWorld;
#ifdef USE_ROAD_REFLECTION
uniform mat4 reflectionMatrix;
varying vec4 vReflectCoord;
#endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vRoadUv = uv;
  vec4 roadWorld = modelMatrix * vec4(transformed, 1.0);
  vRoadWorld = roadWorld.xyz;
#ifdef USE_ROAD_REFLECTION
  vReflectCoord = reflectionMatrix * roadWorld;
#endif`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float roadWidth;
uniform float lampSpacing;
uniform float lampArm;
varying vec2 vRoadUv;
varying vec3 vRoadWorld;
#ifdef USE_ROAD_REFLECTION
uniform sampler2D roadReflection;
uniform float reflectionStrength;
varying vec4 vReflectCoord;
#endif
${noiseGlsl}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  float across = (vRoadUv.x - 0.5) * roadWidth;
  float along = vRoadUv.y * roadWidth;
  float acrossPixel = max(fwidth(across), 0.0001);
  float laneDistance = min(min(abs(across + 4.25), abs(across)), abs(across - 4.25));
  float dash = step(fract(along / 15.0), 0.4);
  float laneLine = (1.0 - smoothstep(0.08, 0.08 + acrossPixel * 1.5, laneDistance)) * dash;
  float edgeLine = 1.0 - smoothstep(0.1, 0.1 + acrossPixel * 1.5, abs(abs(across) - ${EDGE_LINE_OFFSET.toFixed(2)}));
  float paint = max(laneLine, edgeLine);
  float puddle = smoothstep(0.5, 0.74, valueNoise(vRoadWorld.xz * 0.09) * 0.65 + valueNoise(vRoadWorld.xz * 0.37) * 0.35);
  diffuseColor.rgb *= mix(0.62, 0.38, puddle);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.58, 0.6, 0.62), paint);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.07, puddle * (1.0 - paint));
  roughnessFactor = mix(roughnessFactor, 0.5, paint);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float lampAlong = (fract(along / lampSpacing + 0.5) - 0.5) * lampSpacing;
    float lampAcross = across - lampArm;
    float pool = exp(-(lampAlong * lampAlong) / 90.0 - (lampAcross * lampAcross) / 46.0);
    totalEmissiveRadiance += vec3(0.5, 0.58, 0.72) * pool * 0.045 * (1.0 - 0.45 * puddle);
  }`)
      .replace('#include <opaque_fragment>', `
#ifdef USE_ROAD_REFLECTION
  {
    vec2 reflectUv = vReflectCoord.xy / vReflectCoord.w;
    vec3 ripple = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
    reflectUv += ripple.xy * mix(0.02, 0.005, puddle);
    float spread = mix(0.011, 0.0035, puddle);
    float lod = mix(2.6, 0.8, puddle);
    vec3 reflected = vec3(0.0);
    float total = 0.0;
    for (int i = -4; i <= 4; i++) {
      float k = float(i);
      float weight = exp(-k * k / 7.0);
      reflected += textureLod(roadReflection, reflectUv + vec2(0.0, k * spread), lod).rgb * weight;
      total += weight;
    }
    reflected /= total;
    vec3 toEye = normalize(cameraPosition - vRoadWorld);
    float fresnel = 0.02 + 0.98 * pow(1.0 - clamp(toEye.y, 0.0, 1.0), 5.0);
    vec2 inside = smoothstep(vec2(0.0), vec2(0.03), reflectUv) * (1.0 - smoothstep(vec2(0.97), vec2(1.0), reflectUv));
    float wetness = mix(0.3, 1.0, puddle) * (1.0 - paint * 0.6);
    outgoingLight += reflected * wetness * mix(0.25, 1.0, fresnel) * reflectionStrength * inside.x * inside.y;
  }
#endif
#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => (reflection ? 'drive-road-reflective' : 'drive-road');
  return material;
}
