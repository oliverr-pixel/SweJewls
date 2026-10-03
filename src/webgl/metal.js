import * as THREE from 'three';

// Polished metal that is gold on one side of a world-space edge and silver on the other.
// Moving the edge "re-plates" the chain; a hot seam glows where the two metals meet.
export function createMetalMaterial(envMap) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.17,
    envMap,
    envMapIntensity: 1.35,
  });
  const uniforms = {
    uEdge: { value: 0 },
    uSoft: { value: 0.05 },
    uSeam: { value: 1 },
    uSeamW: { value: 0.07 },
    uGold: { value: new THREE.Color(1.0, 0.69, 0.27) },
    uSilver: { value: new THREE.Color(0.9, 0.93, 0.97) },
    uSeamColor: { value: new THREE.Color(6.0, 3.9, 1.5) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vSweepX;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 swp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          swp = instanceMatrix * swp;
        #endif
        vSweepX = (modelMatrix * swp).x;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vSweepX;
        uniform float uEdge; uniform float uSoft; uniform float uSeam; uniform float uSeamW;
        uniform vec3 uGold; uniform vec3 uSilver; uniform vec3 uSeamColor;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float swf = smoothstep(uEdge - uSoft, uEdge + uSoft, vSweepX);
        diffuseColor.rgb = mix(uGold, uSilver, swf);
        float seamF = exp(-pow((vSweepX - uEdge) / uSeamW, 2.0)) * uSeam;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor * 0.85, roughnessFactor, swf);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uSeamColor * seamF;`);
  };
  mat.userData.uniforms = uniforms;
  return mat;
}
