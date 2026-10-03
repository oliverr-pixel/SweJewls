import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, DepthOfFieldEffect,
  ToneMappingEffect, ToneMappingMode,
} from 'postprocessing';
import { createEnvironment } from './env.js';
import { Chain } from './chain.js';
import { createParticles } from './particles.js';
import { createTrails } from './trails.js';
import { createBeams } from './beams.js';
import { createBackdrop } from './backdrop.js';
import { createTitle } from './title.js';
import { createGem } from './gem.js';
import { LensEffect } from './lens.js';
import { BASE, RATES, buildKeys, sampleKeys } from './scenes.js';

const clamp = THREE.MathUtils.clamp;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export class Experience {
  constructor(canvas, { mobile, reduced, sections, dyn }) {
    this.canvas = canvas;
    this.mobile = mobile;
    this.reduced = reduced;
    this.sections = sections;
    this.dyn = dyn;
    this.quality = mobile ? 'low' : 'high';

    const renderer = (this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance',
    }));
    renderer.setClearColor(0x010102, 1);
    this.maxDpr = mobile ? 1.5 : 1.75;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    renderer.setPixelRatio(this.dpr);
    if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = mobile ? 0.4 : 0.6;

    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.FogExp2(new THREE.Color().setRGB(0.004, 0.0045, 0.006), 0.045);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 90);
    this.baseFov = 35;

    const env = createEnvironment(renderer);
    scene.environment = env;

    this.backdrop = createBackdrop();
    scene.add(this.backdrop);

    this.title = createTitle();
    scene.add(this.title);

    this.chain = new Chain({ maxLinks: 56, quality: this.quality, envMap: env });
    scene.add(this.chain.group);

    this.gem = createGem(env, this.quality);
    scene.add(this.gem);

    this.particles = createParticles(mobile ? 700 : 2200);
    scene.add(this.particles);

    this.trails = createTrails(mobile ? 5 : 8, mobile ? 50 : 80);
    scene.add(this.trails);

    this.beams = createBeams();
    scene.add(this.beams);

    this.cursorLight = new THREE.PointLight(0xfff0d8, 9, 0, 2);
    scene.add(this.cursorLight);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 4);
    scene.add(key);

    // post
    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: mobile ? 0 : 4 });
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new BloomEffect({
      intensity: 1.1, luminanceThreshold: 0.9, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.72, levels: mobile ? 6 : 8,
    });
    this.focusTarget = new THREE.Vector3();
    this.dof = !mobile ? new DepthOfFieldEffect(this.camera, { focusDistance: 7, focusRange: 5, bokehScale: 1, resolutionScale: 0.5 }) : null;
    if (this.dof) this.dof.target = this.focusTarget;
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    this.mainPass = new EffectPass(this.camera, ...[this.dof, this.bloom, this.tone].filter(Boolean));
    this.composer.addPass(this.mainPass);
    this.lens = new LensEffect();
    if (mobile) this.lens.set('uGrain', 0.035);
    this.composer.addPass(new EffectPass(this.camera, this.lens));

    // state
    this.state = { ...BASE };
    this.target = { ...BASE };
    this.keys = [];
    this.intro = { t: reduced ? 1 : 0 };
    this.flash = 0;
    this.sparkle = 1;
    this.ripple = { t: 0, x: 0.5, y: 0.5 };

    // pointer
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerS = new THREE.Vector2(0, 0);
    this.pointerActive = false;
    this.pointerWorld = new THREE.Vector3(0, 0, 3);
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._local = new THREE.Vector3();
    this.anchorsScreen = Array.from({ length: 4 }, () => ({ x: 0, y: 0, z: 0 }));
    this.velS = 0;
    this.time = 0;
    this.frames = [];
    this.lowered = 0;

    this.resize();
  }

  // ---------- external API ----------
  refresh() {
    this.keys = buildKeys(this.sections, window.innerHeight, this.layout, this.dyn);
  }

  setPointer(x, y, active = true) {
    this.pointer.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.pointerActive = active;
  }

  pulse(x, y) {
    this.ripple.t = 0.0001;
    this.ripple.x = x / window.innerWidth;
    this.ripple.y = 1 - y / window.innerHeight;
    this.sparkle = 2.8;
    this.chain.spin += 0.6;
  }

  drag(dx) {
    this.chain.spin += dx * 0.0035;
  }

  resize() {
    const w = window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.layout = aspect < 0.9 ? 'portrait' : 'landscape';
    const half = Math.max(Math.tan(THREE.MathUtils.degToRad(17.5)), Math.tan(THREE.MathUtils.degToRad(16.5)) / aspect);
    this.baseFov = Math.min(68, THREE.MathUtils.radToDeg(2 * Math.atan(half)));
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.backdrop.material.uniforms.uAspect.value = aspect;
    this.particles.material.uniforms.uPixel.value = this.renderer.getPixelRatio() * (h / 900);
    // wordmark fills ~88% of the frame width (max 9 units)
    const dist = BASE.camZ - BASE.titleZ;
    const visW = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.baseFov / 2)) * aspect;
    this.titleWidth = Math.min(9.2, visW * 0.9);
    this.refresh();
  }

  // ---------- frame ----------
  update(dt, scrollY, velocity) {
    dt = Math.min(dt, 1 / 20);
    this.time += dt;
    const time = this.time;
    const st = this.state, tg = this.target;
    const reduced = this.reduced;

    sampleKeys(this.keys, scrollY, tg);
    const snap = window.__SWJ_SNAP === true; // test hook: jump straight to the target state
    const kBase = snap ? 1 : 1 - Math.exp(-dt * (reduced ? 30 : 4.2));
    for (const key in tg) {
      const r = RATES[key];
      const k = r && !reduced && !snap ? 1 - Math.exp(-dt * r) : kBase;
      st[key] += (tg[key] - st[key]) * k;
    }

    const vel = clamp(velocity / 40, -1, 1) * (reduced ? 0 : 1);
    this.velS += (vel - this.velS) * (1 - Math.exp(-dt * 6));
    const v = this.velS;

    // intro
    const it = this.intro.t;
    const e = easeOut(it);
    const ie = 1 - e;
    const reveal = clamp((it - 0.12) / 0.62, 0, 1);
    const flash = Math.exp(-Math.pow((it - 0.78) / 0.07, 2));

    // pointer smoothing
    const pk = 1 - Math.exp(-dt * 3.2);
    this.pointerS.x += (this.pointer.x - this.pointerS.x) * pk;
    this.pointerS.y += (this.pointer.y - this.pointerS.y) * pk;
    const mx = reduced ? 0 : this.pointerS.x, my = reduced ? 0 : this.pointerS.y;

    // camera
    const cam = this.camera;
    const hand = reduced ? 0 : 1;
    cam.position.set(
      st.camX + mx * 0.32 + Math.sin(time * 0.43) * 0.04 * hand,
      st.camY + my * 0.2 + Math.cos(time * 0.37) * 0.03 * hand + ie * 1.1,
      st.camZ + ie * 9.5,
    );
    this.focusTarget.set(st.tgtX, st.tgtY, st.tgtZ);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.focusTarget);
    cam.rotateZ(st.roll + ie * 0.38);
    const fov = this.baseFov * (1 + ie * 0.25);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();

    // pointer in world (plane through the piece, facing the camera)
    this.raycaster.setFromCamera(this.pointerS, cam);
    const g = this.chain.group;
    this.plane.normal.set(0, 0, 1);
    this.plane.constant = -(st.chZ + 0.9);
    if (this.raycaster.ray.intersectPlane(this.plane, this._v)) this.pointerWorld.copy(this._v);

    // chain transform
    g.position.set(st.chX, st.chY, st.chZ);
    g.rotation.set(
      st.chRX + my * 0.16 + v * 0.12,
      st.chRY + mx * 0.28,
      st.chRZ + ie * 0.8,
    );
    g.scale.setScalar(st.chS);
    g.updateMatrixWorld();
    this._local.copy(this.pointerWorld);
    g.worldToLocal(this._local);
    this.chain.spin += v * dt * 0.8;
    this.chain.update(dt, time, { ...st, reveal, scale: 1, flow: reduced ? st.flow * 0.15 : st.flow }, this._local, this.pointerActive && !this.mobile);

    // plating: edge sweeps across the current width of the chain
    const span = (this.chain.maxX - this.chain.minX) * 0.5 + 0.25;
    const centre = (this.chain.maxX + this.chain.minX) * 0.5;
    const edge = centre + (st.gold * 2 - 1) * span;
    const mu = this.chain.metal.userData.uniforms;
    mu.uEdge.value = edge;
    const seamVis = Math.min(1, (1 - Math.abs(st.gold * 2 - 1)) * 3);
    mu.uSeam.value = st.seam * seamVis * (0.8 + flash * 2);
    this.chain.metal.envMapRotation.y = mx * 0.5 + time * 0.03;

    const su = this.chain.stoneMat.uniforms;
    su.uTime.value = time;
    su.uEdge.value = edge;
    su.uSeam.value = st.seam * seamVis * 0.7;
    su.uEnvRot.value = -(mx * 0.5 + time * 0.03);
    su.uCursor.value.copy(this.pointerWorld).setZ(this.pointerWorld.z + 1.2);
    su.uCursorI.value = this.mobile ? 0.4 : 1;
    this.sparkle += (1 - this.sparkle) * (1 - Math.exp(-dt * 2.2));
    su.uSparkle.value = this.sparkle * (1 + flash * 2);
    // light bar sweeping across the studio during the intro
    su.uSweepI.value = clamp((it - 0.45) * 3, 0, 1) * (1 - clamp((it - 0.92) * 12, 0, 1));
    su.uSweepLight.value = -2.6 + clamp((it - 0.45) / 0.5, 0, 1) * 5.2;

    this.cursorLight.position.copy(this.pointerWorld).setZ(this.pointerWorld.z + 1.6);
    this.cursorLight.intensity = (this.pointerActive ? 9 : 4) * (1 - st.dim * 0.5);

    // gem
    const gem = this.gem;
    gem.visible = st.gem > 0.02;
    if (gem.visible) {
      gem.position.copy(g.position);
      const gs = st.gem * 0.72 * (this.layout === 'portrait' ? 0.85 : 1) * (1 + Math.sin(time * 1.4) * 0.015);
      gem.scale.setScalar(Math.max(gs, 0.0001));
      gem.rotation.set(0.42 + my * 0.25, time * 0.35 + mx * 0.6, Math.sin(time * 0.5) * 0.06);
    }

    // particles
    const pu = this.particles.material.uniforms;
    pu.uTime.value = time;
    pu.uScroll.value = scrollY;
    pu.uVel.value = v;
    pu.uIntro.value = e;
    pu.uMouse.value.copy(this.pointerWorld);
    pu.uBright.value = st.dust * (1 - st.dim * 0.35);
    pu.uWarm.value = clamp(st.warm, 0, 1);

    // trails
    const tu = this.trails.material.uniforms;
    tu.uTime.value = time * (reduced ? 0.2 : 1);
    tu.uCenter.value.copy(g.position);
    tu.uRadius.value = st.chS * (0.95 + st.neck * 0.8);
    tu.uIntensity.value = st.trails * clamp((it - 0.3) * 2, 0, 1) * (1 - st.dim * 0.6);
    tu.uWarm.value = clamp(st.warm / (st.warm + st.cool + 1e-3), 0, 1);

    // beams
    const bm = this.beams.userData.material.uniforms;
    bm.uTime.value = time;
    bm.uIntensity.value = st.beam * e * (1 - st.dim * 0.8);
    bm.uColor.value.setRGB(0.55 + st.warm * 0.5, 0.6 + st.warm * 0.3, 0.75 + st.cool * 0.35 - st.warm * 0.2);
    this.beams.position.x = st.chX * 0.8;
    this.beams.position.z = st.chZ;

    // backdrop
    this._v2.copy(g.position).project(cam);
    const bu = this.backdrop.material.uniforms;
    bu.uTime.value = time;
    bu.uSpot.value.set(this._v2.x * 0.5 + 0.5, this._v2.y * 0.5 + 0.5);
    bu.uWarm.value = st.warm;
    bu.uCool.value = st.cool;
    bu.uDim.value = st.dim;
    bu.uGlow.value = 0.6 + e * 0.4 + flash * 0.6;

    // title
    const tm = this.title;
    tm.position.set(0, st.titleY + (this.layout === 'portrait' ? 0.9 : 0), st.titleZ);
    tm.scale.setScalar(this.titleWidth * (1 + ie * 0.15));
    const tuni = tm.material.uniforms;
    tuni.uTime.value = time;
    tuni.uOpacity.value = st.title * clamp((it - 0.42) / 0.4, 0, 1);
    tuni.uVel.value = v;
    tm.visible = tuni.uOpacity.value > 0.003;
    if (tm.visible && this.pointerActive) {
      const hit = this.raycaster.intersectObject(tm, false)[0];
      if (hit && hit.uv) { tuni.uMouse.value.copy(hit.uv); tuni.uHover.value += (1 - tuni.uHover.value) * 0.08; }
      else tuni.uHover.value *= 0.94;
    } else tuni.uHover.value *= 0.94;

    // post
    this.bloom.intensity = (this.mobile ? 0.9 : 1.1) + flash * 2.2;
    if (this.dof) {
      this.dof.cocMaterial.focusRange = st.frange + ie * 6;
      this.dof.bokehScale = reduced ? 0 : st.bokeh * (1 + ie * 2);
    }
    if (this.ripple.t > 0) {
      this.ripple.t = Math.min(1, this.ripple.t + dt / 1.5);
      this.lens.set('uRipple', this.ripple.t);
      this.lens.uniforms.get('uRippleC').value.set(this.ripple.x, this.ripple.y);
      if (this.ripple.t >= 1) { this.ripple.t = 0; this.lens.set('uRipple', 0); }
    }
    this.lens.set('uTime', time);
    this.lens.set('uVel', v);
    this.lens.set('uWarp', ie * ie);

    // anchors for the quality callouts
    for (let i = 0; i < 4; i++) {
      this._v.copy(this.chain.anchorsLocal[i]);
      g.localToWorld(this._v);
      this._v.project(cam);
      const a = this.anchorsScreen[i];
      a.x = (this._v.x * 0.5 + 0.5) * window.innerWidth;
      a.y = (-this._v.y * 0.5 + 0.5) * (this.canvas.clientHeight || window.innerHeight);
      a.z = this._v.z;
    }

    this.composer.render(dt);
    this.watchPerformance(dt);
  }

  // Drop resolution, then depth of field, if frames keep running long.
  watchPerformance(dt) {
    if (this.intro.t < 1) return;
    const f = this.frames;
    f.push(dt);
    if (f.length < 90) return;
    const avg = f.reduce((a, b) => a + b, 0) / f.length;
    f.length = 0;
    if (avg > 1 / 42) {
      if (this.dpr > 1.01) {
        this.dpr = Math.max(1, this.dpr - 0.25);
        this.renderer.setPixelRatio(this.dpr);
        this.resize();
      } else if (this.dof && this.lowered === 0) {
        this.lowered = 1;
        this.composer.removePass(this.mainPass);
        this.mainPass = new EffectPass(this.camera, this.bloom, this.tone);
        this.composer.addPass(this.mainPass, 1);
        this.dof.dispose();
        this.dof = null;
      } else if (this.dpr > 0.76) {
        this.dpr = Math.max(0.75, this.dpr - 0.25);
        this.renderer.setPixelRatio(this.dpr);
        this.resize();
      }
    }
  }
}
