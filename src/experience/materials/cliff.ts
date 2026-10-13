import { MeshStandardMaterial, type Texture } from 'three';

/**
 * Rock for steep coastal walls. Texture coordinates come from world space on three axes
 * (triplanar), so vertical faces keep their grain instead of stretching. The normal map is
 * blended the same way, which is what lets the moon pick out ledges and cracks.
 */
export function createCliffMaterial(diffuse: Texture, normal: Texture, scale = 0.045) {
  const material = new MeshStandardMaterial({
    name: 'DRIVE cliff rock',
    map: diffuse,
    color: '#8792a2',
    roughness: 0.92,
    metalness: 0,
    vertexColors: true,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.cliffNormal = { value: normal };
    shader.uniforms.triplanarScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriplanarPosition;\nvarying vec3 vTriplanarNormal;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 triplanarLocal = vec4(transformed, 1.0);
  vec3 triplanarObjectNormal = objectNormal;
#ifdef USE_INSTANCING
  // Scattered gravel: texture and lighting follow each instance's own placement.
  triplanarLocal = instanceMatrix * triplanarLocal;
  triplanarObjectNormal = mat3(instanceMatrix) * triplanarObjectNormal;
#endif
  vTriplanarPosition = (modelMatrix * triplanarLocal).xyz;
  vTriplanarNormal = normalize(mat3(modelMatrix) * triplanarObjectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D cliffNormal;
uniform float triplanarScale;
varying vec3 vTriplanarPosition;
varying vec3 vTriplanarNormal;
vec3 triplanarWeights(vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  return w / max(dot(w, vec3(1.0)), 0.0001);
}`)
      .replace('#include <map_fragment>', `
  vec3 triWeights = triplanarWeights(normalize(vTriplanarNormal));
  vec3 triPoint = vTriplanarPosition * triplanarScale;
  vec4 rockTexel = texture2D(map, triPoint.zy) * triWeights.x
    + texture2D(map, triPoint.xz) * triWeights.y
    + texture2D(map, triPoint.xy) * triWeights.z;
  diffuseColor *= rockTexel;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    vec3 nx = texture2D(cliffNormal, triPoint.zy).xyz * 2.0 - 1.0;
    vec3 ny = texture2D(cliffNormal, triPoint.xz).xyz * 2.0 - 1.0;
    vec3 nz = texture2D(cliffNormal, triPoint.xy).xyz * 2.0 - 1.0;
    // UDN blend: each projection tilts the surface along its own two axes.
    vec3 worldNormal = normalize(vTriplanarNormal
      + vec3(0.0, nx.y, nx.x) * triWeights.x
      + vec3(ny.x, 0.0, ny.y) * triWeights.y
      + vec3(nz.x, nz.y, 0.0) * triWeights.z);
    normal = normalize((viewMatrix * vec4(worldNormal, 0.0)).xyz);
  }`);
  };
  material.customProgramCacheKey = () => 'drive-cliff-triplanar';
  return material;
}
