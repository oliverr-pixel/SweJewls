import * as THREE from 'three';

// Volumetric "display case" light: open cones with additive, noise-modulated falloff.
export function createBeams() {
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uColor: { value: new THREE.Color(1.0, 0.86, 0.62) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      varying float vH;
      void main() {
        vLocal = position;
        vH = uv.y;
        vNormalV = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntensity;
      uniform vec3 uColor;
      varying vec3 vLocal;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      varying float vH;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 x) {
        vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        float facing = abs(dot(normalize(vNormalV), normalize(-vViewPos)));
        float core = pow(facing, 2.4);
        float along = smoothstep(0.0, 0.55, vH) * smoothstep(1.0, 0.82, vH);
        float n = noise(vec3(vLocal.x * 0.9, vLocal.y * 0.35 + uTime * 0.18, vLocal.z * 0.9));
        float n2 = noise(vec3(vLocal.x * 2.4 - uTime * 0.05, vLocal.y * 0.8, vLocal.z * 2.4));
        float a = core * along * (0.45 + 0.55 * n) * (0.7 + 0.3 * n2) * uIntensity * 0.16;
        gl_FragColor = vec4(uColor * a, 1.0);
      }
    `,
  });
  const make = (rTop, rBot, h, x, z, rz) => {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, 48, 1, true);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 1.2 + h * 0.5 - 2.6, z);
    m.rotation.z = rz;
    m.frustumCulled = false;
    group.add(m);
  };
  make(0.08, 2.4, 13, 0.6, -1.2, 0.12);
  make(0.05, 1.5, 12, -1.4, -2.2, -0.2);
  group.userData.material = mat;
  return group;
}
