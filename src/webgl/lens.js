import { Effect, EffectAttribute } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

// One pass for the "camera": barrel breathing, scroll-velocity liquid displacement,
// click ripples, radial chromatic aberration, vignette and film grain.
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uVel;
  uniform float uCA;
  uniform float uGrain;
  uniform float uVignette;
  uniform float uRipple;
  uniform vec2 uRippleC;
  uniform float uWarp;
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 p = uv - 0.5;
    vec2 asp = vec2(aspect, 1.0);
    vec2 pa = p * asp;
    float r2 = dot(pa, pa);
    vec2 duv = uv - p * r2 * (0.03 + uWarp * 0.5);
    float wave = sin(uv.y * 14.0 + uTime * 1.7) * 0.6 + sin(uv.y * 31.0 - uTime * 2.3) * 0.4;
    duv.x += wave * uVel * 0.0032;
    duv.y += uVel * 0.0016 * sin(uv.x * 9.0 + uTime);
    vec2 rc = (uv - uRippleC) * asp;
    float rd = length(rc);
    float ring = sin(rd * 40.0 - uRipple * 24.0) * exp(-rd * 4.0) * (1.0 - uRipple) * step(0.0001, uRipple) * step(uRipple, 0.9999);
    duv += normalize(rc + 1e-5) / asp * ring * 0.007;
    float ca = (uCA + abs(uVel) * 0.009 + uWarp * 0.03) * (0.2 + r2 * 2.4);
    vec2 dir = normalize(pa + 1e-5) / asp;
    vec3 col;
    col.r = texture2D(inputBuffer, duv + dir * ca).r;
    col.g = texture2D(inputBuffer, duv).g;
    col.b = texture2D(inputBuffer, duv - dir * ca).b;
    float vig = smoothstep(1.15, 0.2, length(p * vec2(1.0, 1.2)) * 1.3);
    col *= mix(1.0, vig, uVignette);
    float g = hash12(uv * resolution + fract(uTime * 7.13) * 431.0) - 0.5;
    col += g * uGrain * (0.5 + 0.5 * (1.0 - clamp(dot(col, vec3(0.333)), 0.0, 1.0)));
    outputColor = vec4(col, inputColor.a);
  }
`;

export class LensEffect extends Effect {
  constructor() {
    super('LensEffect', fragmentShader, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['uTime', new Uniform(0)],
        ['uVel', new Uniform(0)],
        ['uCA', new Uniform(0.0018)],
        ['uGrain', new Uniform(0.03)],
        ['uVignette', new Uniform(0.85)],
        ['uRipple', new Uniform(0)],
        ['uRippleC', new Uniform(new Vector2(0.5, 0.5))],
        ['uWarp', new Uniform(0)],
      ]),
    });
  }
  set(name, v) { this.uniforms.get(name).value = v; }
  get(name) { return this.uniforms.get(name).value; }
}
