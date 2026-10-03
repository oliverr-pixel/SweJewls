import * as THREE from 'three';

// Light trails: ribbons whose every vertex is placed on an orbit purely in the vertex shader,
// so a trail is just "the same orbit a few moments ago". No CPU work per frame.
export function createTrails(trailCount, segs) {
  const verts = trailCount * segs * 2;
  const aT = new Float32Array(verts);
  const aSide = new Float32Array(verts);
  const aOrbit = new Float32Array(verts * 4);
  const aOrbit2 = new Float32Array(verts * 4);
  const idx = [];
  for (let k = 0; k < trailCount; k++) {
    const radius = 1.9 + Math.random() * 1.6;
    const incl = (Math.random() * 2 - 1) * 1.1;
    const phase = Math.random() * Math.PI * 2;
    const speed = (0.35 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1);
    const yaw = Math.random() * Math.PI * 2;
    const len = 0.9 + Math.random() * 1.2;
    const width = 0.003 + Math.random() * 0.007;
    const wob = Math.random() * 0.5;
    for (let j = 0; j < segs; j++) {
      for (let s = 0; s < 2; s++) {
        const v = (k * segs + j) * 2 + s;
        aT[v] = j / (segs - 1);
        aSide[v] = s ? 1 : -1;
        aOrbit.set([radius, incl, phase, speed], v * 4);
        aOrbit2.set([yaw, len, width, wob], v * 4);
      }
      if (j < segs - 1) {
        const a = (k * segs + j) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
  geo.setAttribute('aOrbit', new THREE.BufferAttribute(aOrbit, 4));
  geo.setAttribute('aOrbit2', new THREE.BufferAttribute(aOrbit2, 4));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uRadius: { value: 1 },
      uCenter: { value: new THREE.Vector3() },
      uWarm: { value: 0.5 },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute float aSide;
      attribute vec4 aOrbit;
      attribute vec4 aOrbit2;
      uniform float uTime, uRadius;
      uniform vec3 uCenter;
      varying float vT;
      varying float vSide;
      vec3 orbit(float tau) {
        float r = aOrbit.x * uRadius * (1.0 + sin(tau * 2.0 + aOrbit2.w * 6.0) * 0.06);
        vec3 p = vec3(cos(tau) * r, sin(tau) * r * 0.8, sin(tau * 2.0 + aOrbit.z) * 0.25 * aOrbit2.w);
        float ci = cos(aOrbit.y), si = sin(aOrbit.y);
        p = vec3(p.x, p.y * ci - p.z * si, p.y * si + p.z * ci);
        float cy = cos(aOrbit2.x), sy = sin(aOrbit2.x);
        p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
        return p + uCenter;
      }
      void main() {
        float tau = uTime * aOrbit.w + aOrbit.z - aT * aOrbit2.y * sign(aOrbit.w);
        vec3 p = orbit(tau);
        vec3 q = orbit(tau + 0.01 * sign(aOrbit.w));
        vec4 mvp = modelViewMatrix * vec4(p, 1.0);
        vec4 mvq = modelViewMatrix * vec4(q, 1.0);
        vec3 dir = normalize(mvq.xyz - mvp.xyz);
        vec3 side = normalize(cross(dir, vec3(0.0, 0.0, 1.0)));
        float w = aOrbit2.z * pow(1.0 - aT, 1.3);
        mvp.xyz += side * aSide * w;
        gl_Position = projectionMatrix * mvp;
        vT = aT;
        vSide = aSide;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensity, uWarm;
      varying float vT;
      varying float vSide;
      void main() {
        float fade = pow(1.0 - vT, 2.2);
        float head = smoothstep(0.08, 0.0, vT);
        vec3 gold = vec3(1.0, 0.7, 0.32);
        vec3 ice = vec3(0.75, 0.85, 1.0);
        vec3 col = mix(ice, gold, uWarm) * fade * 1.1 + vec3(1.0) * head * 2.4;
        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
