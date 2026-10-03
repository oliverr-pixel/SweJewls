import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createMetalMaterial } from './metal.js';
import { createStoneGeometry, createStoneMaterial } from './stone.js';

// Procedural iced Cuban link chain.
// Every link is a sheared, flattened stadium ring with a row of pavé stones on top; a box clasp
// closes the loop. Links are laid out by arc length along a closed curve that morphs between a
// bracelet, an infinity sign and a hanging necklace, so the same chain can grow, unroll and re-plate.

export const PITCH = 0.36;
const D = { L: 2.2 * PITCH, W: 1.22 * PITCH, a: 0.41 * PITCH, b: 0.27 * PITCH, skew: 0.55 };
const CLASP = { len: 1.65 * PITCH, w: D.W * 1.1, h: D.b * 1.8 };
const SAMPLES = 420;
const TAU = Math.PI * 2;

const se = (t, n) => {
  const c = Math.cos(t), s = Math.sin(t);
  return [Math.sign(c) * Math.abs(c) ** (2 / n), Math.sign(s) * Math.abs(s) ** (2 / n)];
};

function linkPath(t) {
  const hx = D.L / 2 - D.a / 2, hy = D.W / 2 - D.a / 2;
  const [cx, cy] = se(t, 3.4);
  return [cx * hx, cy * hy];
}

function buildLinkGeometry(segU, segV) {
  const pos = new Float32Array(segU * segV * 3);
  const idx = [];
  for (let i = 0; i < segU; i++) {
    const t = (i / segU) * TAU;
    const [px, py] = linkPath(t);
    const [qx, qy] = linkPath(t + 1e-3);
    let tx = qx - px, ty = qy - py;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = ty, ny = -tx;
    for (let j = 0; j < segV; j++) {
      const v = (j / segV) * TAU;
      const [sx, sz] = se(v, 3.0);
      const y = py + ny * sx * D.a * 0.5;
      const x = px + nx * sx * D.a * 0.5 + D.skew * y;
      const z = sz * D.b * 0.5;
      const k = (i * segV + j) * 3;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      const a = i * segV + j;
      const b = ((i + 1) % segU) * segV + j;
      const a1 = i * segV + ((j + 1) % segV);
      const b1 = ((i + 1) % segU) * segV + ((j + 1) % segV);
      idx.push(a, b, a1, b, b1, a1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function linkStoneLocals() {
  const N = 256;
  const pts = [], len = [0];
  for (let i = 0; i <= N; i++) {
    pts.push(linkPath((i / N) * TAU));
    if (i > 0) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = len[N];
  const r = D.a * 0.41;
  const K = Math.floor(total / (2 * r * 1.07));
  const out = [];
  const q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
  for (let k = 0; k < K; k++) {
    const s = ((k + 0.5) / K) * total;
    let j = 1;
    while (j < N && len[j] < s) j++;
    const f = (s - len[j - 1]) / (len[j] - len[j - 1] || 1);
    const px = pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f;
    const py = pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f;
    q.setFromAxisAngle(zAxis, Math.random() * TAU);
    out.push(new THREE.Matrix4().compose(new THREE.Vector3(px + D.skew * py, py, D.b * 0.5 * 0.78), q, new THREE.Vector3(r, r, r)));
  }
  return out;
}

function claspStoneLocals() {
  const cols = 6, rows = 4;
  const cw = (CLASP.len * 0.86) / cols, ch = (CLASP.w * 0.84) / rows;
  const r = Math.min(cw, ch) * 0.5 * 0.94;
  const out = [];
  const q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
  for (let c = 0; c < cols; c++) {
    for (let rr = 0; rr < rows; rr++) {
      q.setFromAxisAngle(zAxis, Math.random() * TAU);
      out.push(new THREE.Matrix4().compose(
        new THREE.Vector3((c - (cols - 1) / 2) * cw, (rr - (rows - 1) / 2) * ch, CLASP.h * 0.5 * 0.86),
        q, new THREE.Vector3(r, r, r),
      ));
    }
  }
  return out;
}

// Closed curve at parameter u. Writes position and a "stones face this way" hint.
function shape(u, w, out, up) {
  const th = u * TAU;
  const ca = th - Math.PI / 2; // bracelet: clasp starts at the front
  const cx = Math.cos(ca), cy = Math.sin(ca);
  const sl = Math.sin(th), cl = Math.cos(th);
  const den = 1 + sl * sl;
  const ix = (1.65 * cl) / den, iy = (1.65 * sl * cl) / den, iz = 0.3 * sl;
  const nx = sl, nz = -0.72 * cl; // necklace: clasp sits at the back of the neck
  const ny = 0.5 - 1.9 * Math.pow((1 - cl) / 2, 1.7);
  const wc = (1 - w.inf) * (1 - w.neck), wi = w.inf * (1 - w.neck), wn = w.neck;
  out.set(cx * wc + ix * wi + nx * wn, cy * wc + iy * wi + ny * wn, iz * wi + nz * wn);
  const fl = w.flat;
  up.set(cx * (1 - fl) * wc + sl * wn, cy * (1 - fl) * wc + 0.3 * wn, fl * wc + wi - cl * wn);
}

export class Chain {
  constructor({ maxLinks = 56, quality = 'high', envMap }) {
    this.maxLinks = maxLinks;
    this.group = new THREE.Group();
    this.metal = createMetalMaterial(envMap);
    this.stoneMat = createStoneMaterial();

    const hi = quality === 'high';
    this.links = new THREE.InstancedMesh(buildLinkGeometry(hi ? 56 : 36, hi ? 16 : 12), this.metal, maxLinks);
    this.links.frustumCulled = false;
    this.links.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.links);

    this.clasp = new THREE.Mesh(new RoundedBoxGeometry(CLASP.len, CLASP.w, CLASP.h, 3, CLASP.h * 0.32), this.metal);
    this.clasp.matrixAutoUpdate = false;
    this.clasp.frustumCulled = false;
    this.group.add(this.clasp);

    this.linkStones = linkStoneLocals();
    this.claspStones = claspStoneLocals();
    this.K = this.linkStones.length;
    this.C = this.claspStones.length;
    const total = this.C + maxLinks * this.K;
    const stoneGeo = createStoneGeometry();
    const rnd = new Float32Array(total * 4);
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    stoneGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
    this.stones = new THREE.InstancedMesh(stoneGeo, this.stoneMat, total);
    this.stones.frustumCulled = false;
    this.stones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.stones);

    this.lift = new Float32Array(total);
    this.liftVel = new Float32Array(total);
    this.liftH = new Float32Array(total);
    for (let i = 0; i < total; i++) this.liftH[i] = 0.05 + Math.random() * 0.28;

    this.P = Array.from({ length: SAMPLES + 1 }, () => new THREE.Vector3());
    this.U = Array.from({ length: SAMPLES + 1 }, () => new THREE.Vector3());
    this.L = new Float32Array(SAMPLES + 1);
    this.w = { inf: 0, neck: 0, flat: 0 };
    this.flowPos = 0;
    this.spin = 0; // extra flow velocity from dragging / scroll
    this.anchorsLocal = Array.from({ length: 4 }, () => new THREE.Vector3());
    this.minX = -1; this.maxX = 1;

    // scratch
    this._p = new THREE.Vector3(); this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
    this._u = new THREE.Vector3(); this._t = new THREE.Vector3(); this._wd = new THREE.Vector3();
    this._m = new THREE.Matrix4(); this._sm = new THREE.Matrix4(); this._v = new THREE.Vector3();
    this._off = new THREE.Vector3();
  }

  // position + up-hint at arc length s (in final units)
  sampleAt(s, k, outP, outU) {
    const L = this.L, n = SAMPLES;
    const raw = s / k;
    let lo = 0, hi = n;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (L[mid] < raw) lo = mid; else hi = mid;
    }
    const f = (raw - L[lo]) / (L[hi] - L[lo] || 1);
    outP.lerpVectors(this.P[lo], this.P[hi], f).multiplyScalar(k).sub(this._off);
    if (outU) outU.lerpVectors(this.U[lo], this.U[hi], f);
  }

  frame(s, k, perim, pos, T, Wd, U) {
    const wrap = (x) => ((x % perim) + perim) % perim;
    const ds = 0.02;
    this.sampleAt(wrap(s), k, pos, U);
    this.sampleAt(wrap(s + ds), k, this._a, null);
    this.sampleAt(wrap(s - ds), k, this._b, null);
    T.subVectors(this._a, this._b).normalize();
    U.addScaledVector(T, -U.dot(T));
    if (U.lengthSq() < 1e-6) U.set(0, 0, 1);
    U.normalize();
    Wd.crossVectors(U, T).normalize();
  }

  update(dt, time, st, pointerLocal, pointerActive) {
    const maxL = this.maxLinks;
    const n = THREE.MathUtils.clamp(st.links, 4, maxL);
    const nFull = Math.floor(n), frac = n - nFull;
    const count = Math.min(maxL, frac > 1e-3 ? nFull + 1 : nFull);
    const spacing = PITCH * (1 + st.explode * 0.45);
    const claspLen = CLASP.len * (1 + st.explode * 0.35);
    const perim = claspLen + n * spacing;

    // sample the morphing curve
    const w = this.w; w.inf = st.inf; w.neck = st.neck; w.flat = st.flat;
    let len = 0;
    this._off.set(0, 0, 0);
    for (let i = 0; i <= SAMPLES; i++) {
      shape(i / SAMPLES, w, this.P[i], this.U[i]);
      if (i > 0) len += this.P[i].distanceTo(this.P[i - 1]);
      this.L[i] = len;
      if (i < SAMPLES) this._off.add(this.P[i]);
    }
    const k = perim / len;
    this._off.multiplyScalar((k / SAMPLES) * st.neck);

    this.flowPos += dt * (0.1 * st.flow + this.spin);
    this.spin *= Math.exp(-dt * 1.6);
    const base = this.flowPos;

    const reveal = st.reveal ?? 1;
    const T = this._t, Wd = this._wd, U = this._u, pos = this._p;
    const m = this._m, sm = this._sm;
    const lift = this.lift, vel = this.liftVel, H = this.liftH;
    const stiffness = 140, damping = 13;
    const h = Math.min(dt, 1 / 30);
    const px = pointerLocal.x, py = pointerLocal.y, pz = pointerLocal.z;
    const mw = this.group.matrixWorld.elements;
    let minX = Infinity, maxX = -Infinity;
    const revealAt = (i) => {
      const r = THREE.MathUtils.clamp(reveal * (count + 8) - i, 0, 1);
      return r * r * (3 - 2 * r);
    };

    const placeStones = (mat, locals, startIdx, sc) => {
      const e = mat.elements;
      const ux = e[8], uy = e[9], uz = e[10];
      for (let j = 0; j < locals.length; j++) {
        const id = startIdx + j;
        sm.multiplyMatrices(mat, locals[j]);
        const se2 = sm.elements;
        let target = st.explode * H[id];
        if (pointerActive) {
          const dx = se2[12] - px, dy = se2[13] - py, dz = se2[14] - pz;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < 0.55) target += (1 - d / 0.55) * 0.09;
        }
        const acc = (target - lift[id]) * stiffness - vel[id] * damping;
        vel[id] += acc * h;
        lift[id] += vel[id] * h;
        const l = lift[id] / Math.max(sc, 1e-4);
        se2[12] += ux * l; se2[13] += uy * l; se2[14] += uz * l;
        this.stones.setMatrixAt(id, sm);
      }
    };

    // clasp
    this.frame(base, k, perim, pos, T, Wd, U);
    {
      const sc = revealAt(0) * (st.scale ?? 1);
      m.set(
        T.x * sc, Wd.x * sc, U.x * sc, pos.x,
        T.y * sc, Wd.y * sc, U.y * sc, pos.y,
        T.z * sc, Wd.z * sc, U.z * sc, pos.z,
        0, 0, 0, 1,
      );
      this.clasp.matrix.copy(m);
      this.clasp.matrixWorldNeedsUpdate = true;
      placeStones(m, this.claspStones, 0, sc || 1e-4);
      this.anchorsLocal[3].copy(pos).addScaledVector(U, CLASP.h * 0.6);
    }

    const aIdx = [Math.floor(count * 0.18), Math.floor(count * 0.42), Math.floor(count * 0.68)];
    for (let i = 0; i < count; i++) {
      const partial = i === nFull && frac > 1e-3;
      const slot = partial ? frac * spacing : spacing;
      const s = base + claspLen / 2 + i * spacing + slot / 2;
      this.frame(s, k, perim, pos, T, Wd, U);

      // alternate tilt + height so neighbouring links read as interlocked
      const alt = i % 2 ? 1 : -1;
      const roll = alt * 0.13 * (1 - st.explode * 0.5);
      const cr = Math.cos(roll), sr = Math.sin(roll);
      this._v.copy(U);
      U.multiplyScalar(cr).addScaledVector(Wd, sr);
      Wd.multiplyScalar(cr).addScaledVector(this._v, -sr);
      if (st.explode > 0.001) {
        const tw = st.explode * 0.38 * Math.sin(i * 1.7);
        const ct = Math.cos(tw), stw = Math.sin(tw);
        this._v.copy(T);
        T.multiplyScalar(ct).addScaledVector(Wd, stw);
        Wd.multiplyScalar(ct).addScaledVector(this._v, -stw);
      }
      const breathe = Math.sin(time * 1.3 + i * 0.55) * 0.008;
      const exLift = st.explode * (0.05 + ((i * 7) % 5) * 0.03);
      pos.addScaledVector(U, alt * D.b * 0.16 + breathe + exLift);

      let sc = revealAt(i + 1) * (st.scale ?? 1);
      if (partial) sc *= frac * frac * (3 - 2 * frac);
      m.set(
        T.x * sc, Wd.x * sc, U.x * sc, pos.x,
        T.y * sc, Wd.y * sc, U.y * sc, pos.y,
        T.z * sc, Wd.z * sc, U.z * sc, pos.z,
        0, 0, 0, 1,
      );
      this.links.setMatrixAt(i, m);
      placeStones(m, this.linkStones, this.C + i * this.K, sc || 1e-4);

      const wx = mw[0] * pos.x + mw[4] * pos.y + mw[8] * pos.z + mw[12];
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (i === aIdx[0]) this.anchorsLocal[0].copy(pos).addScaledVector(Wd, D.W * 0.5);
      if (i === aIdx[1]) this.anchorsLocal[1].copy(pos).addScaledVector(U, D.b * 0.5);
      if (i === aIdx[2]) this.anchorsLocal[2].copy(pos).addScaledVector(U, D.b * 0.9);
    }
    this.links.count = count;
    this.stones.count = this.C + count * this.K;
    this.links.instanceMatrix.needsUpdate = true;
    this.stones.instanceMatrix.needsUpdate = true;
    if (count > 0) { this.minX = minX; this.maxX = maxX; }
  }
}
