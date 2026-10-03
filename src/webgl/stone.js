import * as THREE from 'three';

// Round-brilliant stone, 8-fold, flat facets. Table faces +Z.
export function createStoneGeometry() {
  const pts = [
    [0.001, -0.78],
    [1.0, -0.03],
    [1.0, 0.05],
    [0.6, 0.36],
    [0.001, 0.36],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  let geo = new THREE.LatheGeometry(pts, 8);
  geo.rotateX(Math.PI / 2);
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  geo.deleteAttribute('uv');
  return geo;
}

const ENV = /* glsl */ `
  uniform float uEnvRot;
  uniform float uSweepLight;
  uniform float uSweepI;
  vec3 rotY(vec3 d, float a) { float c = cos(a), s = sin(a); return vec3(c * d.x + s * d.z, d.y, -s * d.x + c * d.z); }
  float strip(float az, float c, float w) { float d = abs(mod(az - c + 3.14159265, 6.2831853) - 3.14159265); return smoothstep(w, w * 0.3, d); }
  vec3 studio(vec3 d) {
    d = rotY(d, uEnvRot);
    float az = atan(d.z, d.x);
    float el = d.y;
    vec3 c = mix(vec3(0.003, 0.004, 0.006), vec3(0.04, 0.042, 0.052), smoothstep(-0.5, 0.9, el));
    c += vec3(4.5) * smoothstep(0.8, 0.93, el);
    c += vec3(8.0) * strip(az, 2.94, 0.085) * smoothstep(-0.6, -0.3, el) * smoothstep(0.78, 0.5, el);
    c += vec3(5.5, 5.2, 4.8) * strip(az, -0.1, 0.07) * smoothstep(-0.55, -0.25, el) * smoothstep(0.72, 0.42, el);
    c += vec3(3.2, 2.2, 1.0) * smoothstep(0.2, 0.0, abs(el + 0.18)) * strip(az, -1.5708, 1.1);
    c += vec3(0.9, 1.15, 1.5) * strip(az, 1.25, 0.35) * smoothstep(0.6, 0.2, abs(el - 0.2));
    c += vec3(16.0, 15.0, 13.5) * strip(az, uSweepLight, 0.05) * uSweepI;
    return c;
  }
`;

export function createStoneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uEnvRot: { value: 0 },
      uSweepLight: { value: -3.14 },
      uSweepI: { value: 0 },
      uCursor: { value: new THREE.Vector3(0, 0, 3) },
      uCursorI: { value: 1 },
      uKeyDir: { value: new THREE.Vector3(0.4, 0.8, 0.5).normalize() },
      uSparkle: { value: 1 },
      uFire: { value: 1 },
      uEdge: { value: 0 },
      uSeam: { value: 1 },
      uFogColor: { value: new THREE.Color(0.004, 0.0045, 0.006) },
      uFogDensity: { value: 0.045 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aRand;
      varying vec3 vN;
      varying vec3 vW;
      varying vec4 vR;
      varying float vDepth;
      void main() {
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.0);
        vW = wp.xyz;
        vN = normalize(mat3(m) * normal);
        vR = aRand;
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uCursor;
      uniform float uCursorI;
      uniform vec3 uKeyDir;
      uniform float uSparkle;
      uniform float uFire;
      uniform float uEdge;
      uniform float uSeam;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      varying vec3 vN;
      varying vec3 vW;
      varying vec4 vR;
      varying float vDepth;
      ${ENV}
      vec3 hash3(vec3 p) {
        return fract(sin(vec3(dot(p, vec3(12.9898, 78.233, 37.719)), dot(p, vec3(39.346, 11.135, 83.155)), dot(p, vec3(73.156, 52.235, 9.151)))) * 43758.5453) - 0.5;
      }
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        // facet-constant scramble so neighbouring stones break up the reflection like real pavé
        vec3 h = hash3(N * 7.0 + vR.xyz * 17.0);
        vec3 Nf = normalize(N + h * 0.5);
        float ndv = max(dot(Nf, V), 0.0);
        vec3 R = reflect(-V, Nf);
        float fres = 0.17 + 0.83 * pow(1.0 - ndv, 5.0);

        // fake internal bounce with dispersion ("fire")
        vec3 pav = normalize(-N + h.yzx * 1.4);
        float d = 0.035 * uFire;
        vec3 tr = reflect(refract(-V, Nf, 1.0 / (2.42 - d)), pav);
        vec3 tg = reflect(refract(-V, Nf, 1.0 / 2.42), pav);
        vec3 tb = reflect(refract(-V, Nf, 1.0 / (2.42 + d)), pav);
        vec3 inner = vec3(studio(tr).r, studio(tg).g, studio(tb).b);

        vec3 col = inner * 0.75 + studio(R) * fres * 1.2;

        float tw = 0.55 + 0.45 * sin(uTime * (1.3 + vR.y * 3.5) + vR.z * 40.0);
        float sp = pow(max(dot(R, normalize(uKeyDir)), 0.0), 240.0) * 34.0;
        vec3 Lc = normalize(uCursor - vW);
        float spc = pow(max(dot(R, Lc), 0.0), 120.0) * 26.0 * uCursorI;
        col += (sp + spc) * tw * uSparkle * vec3(1.0, 0.97, 0.92);

        float seam = exp(-pow((vW.x - uEdge) / 0.11, 2.0)) * uSeam;
        col += vec3(3.6, 2.5, 1.1) * seam;

        float fog = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
        col = mix(col, uFogColor, fog);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
