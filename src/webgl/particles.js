import * as THREE from 'three';

// Diamond dust: GPU-animated points that drift upward, react to scroll speed and get pushed by the cursor.
export function createParticles(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * 15;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * 10;
    pos[i * 3 + 2] = -18 + Math.random() * 24;
    rnd[i * 4] = Math.random();
    rnd[i * 4 + 1] = Math.random();
    rnd[i * 4 + 2] = Math.pow(Math.random(), 3.0);
    rnd[i * 4 + 3] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uVel: { value: 0 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
      uIntro: { value: 1 },
      uPixel: { value: 1 },
      uBright: { value: 1 },
      uWarm: { value: 0.5 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aRand;
      uniform float uTime, uScroll, uVel, uIntro, uPixel;
      uniform vec3 uMouse;
      varying float vTw;
      varying float vStar;
      varying float vMix;
      varying float vFade;
      void main() {
        vec3 p = position;
        float sp = 0.25 + aRand.y * 0.75;
        p.x += sin(uTime * 0.11 * sp + p.y * 0.35 + aRand.x * 6.28) * 0.7;
        p.z += cos(uTime * 0.09 * sp + p.x * 0.2 + aRand.w * 6.28) * 0.5;
        float depthF = 0.35 + 0.65 * smoothstep(-18.0, 6.0, position.z);
        p.y = mod(p.y + uTime * 0.12 * sp + uScroll * depthF * 0.004 + 10.0, 20.0) - 10.0;
        vec3 dm = p - uMouse;
        float l = length(dm.xy);
        p.xy += normalize(dm.xy + 1e-4) * smoothstep(2.0, 0.0, l) * 0.9 * step(abs(dm.z), 4.0);
        p *= 1.0 + (1.0 - uIntro) * (2.5 + aRand.x * 2.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float size = (1.0 + aRand.z * 10.0) * (1.0 + abs(uVel) * 0.5);
        gl_PointSize = min(size * uPixel * 26.0 / max(-mv.z, 0.1), 70.0);
        gl_Position = projectionMatrix * mv;
        vTw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.8 + aRand.y * 3.0) + aRand.x * 50.0), 3.0);
        vStar = smoothstep(0.45, 0.9, aRand.z);
        vMix = aRand.w;
        vFade = smoothstep(0.4, 2.2, -mv.z) * smoothstep(40.0, 18.0, -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uBright, uWarm;
      varying float vTw, vStar, vMix, vFade;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        float core = pow(smoothstep(0.5, 0.0, r), 2.6);
        float star = (max(0.0, 1.0 - abs(c.x) * 22.0) * max(0.0, 1.0 - abs(c.y) * 2.1)
                    + max(0.0, 1.0 - abs(c.y) * 22.0) * max(0.0, 1.0 - abs(c.x) * 2.1)) * vStar;
        vec3 gold = vec3(1.0, 0.72, 0.36);
        vec3 ice = vec3(0.78, 0.86, 1.0);
        vec3 col = mix(ice, gold, step(1.0 - uWarm, vMix));
        float a = (core + star * 0.8) * vTw * vFade * uBright;
        gl_FragColor = vec4(col * a * 1.6, 1.0);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}
