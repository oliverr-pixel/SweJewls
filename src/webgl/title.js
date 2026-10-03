import * as THREE from 'three';
import { brandPaths } from '../brand.js';

// The SWEJEWLS wordmark as a plane inside the scene, behind the piece.
// Drawn from the logo outlines, with a liquid ripple under the cursor and a slow light sweep.
export function createTitle() {
  const { swe, jewls, wordWidth, capH } = brandPaths;
  const W = 2048, pad = 60;
  const s = (W - pad * 2) / wordWidth;
  const H = Math.ceil(capH * s + pad * 2 + 20);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.translate(pad, pad + capH * s);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -capH, 0, 4);
  g.addColorStop(0, '#FBEBC0'); g.addColorStop(0.55, '#E2B653'); g.addColorStop(1, '#9A6E1C');
  ctx.fillStyle = g;
  ctx.fill(new Path2D(swe));
  const g2 = ctx.createLinearGradient(0, -capH, 0, 4);
  g2.addColorStop(0, '#FFFFFF'); g2.addColorStop(0.55, '#D6DDE5'); g2.addColorStop(1, '#8E99A6');
  ctx.fillStyle = g2;
  ctx.fill(new Path2D(jewls));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  const aspect = W / H;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMap: { value: tex },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uMouse: { value: new THREE.Vector2(-1, -1) },
      uHover: { value: 0 },
      uVel: { value: 0 },
      uAspect: { value: aspect },
      uBright: { value: 0.62 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime, uOpacity, uHover, uVel, uAspect, uBright;
      uniform vec2 uMouse;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        vec2 d = (uv - uMouse) * vec2(uAspect, 1.0);
        float l = length(d);
        float w = exp(-l * l * 6.0) * uHover;
        uv += normalize(d + 1e-5) / vec2(uAspect, 1.0) * w * 0.035 * sin(l * 26.0 - uTime * 5.0);
        uv.x += sin(uv.y * 10.0 + uTime) * uVel * 0.0015;
        float ca = 0.0015 + abs(uVel) * 0.0025 + w * 0.006;
        vec4 c = texture2D(uMap, uv);
        float r = texture2D(uMap, uv + vec2(ca, 0.0)).r;
        float b = texture2D(uMap, uv - vec2(ca, 0.0)).b;
        c.rgb = vec3(r, c.g, b);
        float band = smoothstep(0.07, 0.0, abs(fract(uv.x * 0.55 - uv.y * 0.25 - uTime * 0.06) - 0.5));
        c.rgb += band * c.a * 0.55;
        gl_FragColor = vec4(c.rgb * uBright, c.a * uOpacity);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1 / aspect), mat);
  mesh.renderOrder = -5;
  mesh.userData.aspect = aspect;
  return mesh;
}
