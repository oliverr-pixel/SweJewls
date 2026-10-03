import * as THREE from 'three';

// Full-screen gradient at the far plane: obsidian black, a soft halo behind the piece and slow haze.
export function createBackdrop() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const mat = new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uSpot: { value: new THREE.Vector2(0.5, 0.5) },
      uWarm: { value: 0.5 },
      uCool: { value: 0.2 },
      uDim: { value: 0 },
      uGlow: { value: 1 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.99999, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uTime, uAspect, uWarm, uCool, uDim, uGlow;
      uniform vec2 uSpot;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        vec2 sp = (uSpot - 0.5) * vec2(uAspect, 1.0);
        float d = length(p - sp);
        vec3 warm = vec3(0.034, 0.019, 0.006);
        vec3 cool = vec3(0.008, 0.016, 0.034);
        vec3 tint = warm * uWarm + cool * uCool;
        float haze = fbm(p * 1.7 + vec2(uTime * 0.018, -uTime * 0.012));
        vec3 col = vec3(0.0032, 0.0036, 0.005);
        col += tint * exp(-d * d * 2.4) * (0.65 + 0.7 * haze) * uGlow;
        col += tint * 0.35 * smoothstep(0.85, 0.0, length((p - vec2(sp.x * 0.6, 0.62)) * vec2(1.6, 0.8))) * uGlow;
        col += vec3(0.004, 0.0045, 0.006) * haze;
        col *= 1.0 - uDim * 0.7;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}
