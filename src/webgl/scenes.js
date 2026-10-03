// The scroll script. Every scene is a set of numbers (camera, chain shape, plating, light...)
// pinned to a scroll position measured from the DOM. Between keys the numbers ease; the
// Experience then damps toward them so the whole film feels weighted.

export const BASE = {
  camX: 0, camY: 0.12, camZ: 6.5, tgtX: 0, tgtY: 0, tgtZ: 0, roll: 0,
  chX: 0, chY: 0, chZ: 0, chRX: -1.12, chRY: 0, chRZ: 0.32, chS: 1,
  flat: 0, inf: 0, neck: 0, links: 22, flow: 1,
  gold: 0.5, seam: 1, explode: 0,
  title: 1, titleY: 0, titleZ: -2.6,
  beam: 1, trails: 1, dust: 1,
  warm: 0.55, cool: 0.2, dim: 0,
  gem: 0, bokeh: 1.1, frange: 5,
};

// per-property damping rates (higher = snappier)
export const RATES = { gold: 2.0, links: 2.6, explode: 3.2, gem: 2.6, inf: 3.2, neck: 3.0, flat: 3.2 };

function measure(el) {
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
}

export function buildKeys(sections, vh, layout, dyn) {
  const P = layout === 'portrait';
  const R = (sec, t) => sec.top + t * Math.max(1, sec.height - vh);
  const m = measure(sections.manifest);
  const c = measure(sections.collection);
  const a = measure(sections.anatomy);
  const i = measure(sections.irl);
  const o = measure(sections.order);
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

  const raw = [
    [0, {}],
    [R(m, 0), {
      camX: P ? 0.3 : -0.6, camY: -0.4, camZ: 3.05, tgtX: P ? 0.05 : -0.75, tgtY: -0.52, tgtZ: 1.15, roll: -0.1,
      chRZ: 0.55, title: 0, titleZ: -3.8, bokeh: P ? 1 : 3.4, frange: 0.75,
      beam: 0.55, trails: 0.25, warm: 0.7, cool: 0.08, flow: 0.55,
    }],
    [R(m, 0.42), { camX: P ? -0.2 : -0.85, tgtX: P ? 0 : -0.9, camY: -0.34, camZ: 2.85, roll: 0.06, chRZ: 0.72 }],
    [R(m, 0.95), {
      inf: 1, flat: 1, chRX: 0, chRY: 0, chRZ: 0, chX: P ? 0 : 0.85, chY: P ? -0.6 : 0, chS: P ? 0.82 : 0.95,
      camX: 0, camY: 0, camZ: P ? 8.2 : 7.4, tgtX: 0, tgtY: 0, tgtZ: 0, roll: 0,
      bokeh: 1, frange: 3, gold: 0.5, beam: 0.8, trails: 0.6, flow: 0.9,
    }],
    [R(c, 0), {
      inf: 0, flat: 0, chX: P ? 0 : 1.55, chY: P ? 1.05 : 0, chZ: 0, chS: P ? 0.82 : 1,
      chRX: -1.0, chRY: 0.35, chRZ: 0.28, camX: 0, camY: 0.1, camZ: P ? 8.4 : 6.6,
      gold: 0, seam: 0.8, warm: 0.12, cool: 0.6, beam: 0.9, trails: 0.5, flow: 0.8,
    }],
    [R(c, 0.28), { camX: -0.35, chRY: 0.6 }],
    [R(c, 0.31), {}],
    [R(c, 0.41), { gold: 1, chRX: -0.85, chRY: -0.35, chRZ: -0.2, camX: 0.4, warm: 0.8, cool: 0.08, seam: 1 }],
    [R(c, 0.6), { chRY: -0.6, camX: 0.15 }],
    [R(c, 0.64), {}],
    [R(c, 0.8), {
      neck: 1, links: 54, chX: P ? 0 : 1.3, chY: P ? 1.3 : 0.25, chRX: -0.12, chRY: 0, chRZ: 0,
      camX: 0, camZ: P ? 15.5 : 12.5, gold: dyn.necklaceGold, seam: 0.7, flow: 0.45,
      warm: () => 0.15 + dyn.necklaceGold() * 0.65, cool: () => 0.6 - dyn.necklaceGold() * 0.5,
    }],
    [R(c, 1), { chRY: 0.35, camX: -0.5 }],
    [R(a, 0), {
      neck: 0, links: 22, chX: 0, chY: P ? 0.55 : -0.25, chRX: -0.55, chRY: 0, chRZ: 0.2, chS: P ? 0.8 : 0.82,
      camX: 0, camY: 0.9, camZ: P ? 9 : 6.9, tgtY: -0.1, gold: 0.5, warm: 0.2, cool: 0.9,
      explode: 0, beam: 0.5, trails: 0.3, flow: 0.7, seam: 1,
    }],
    [R(a, 0.3), { explode: 1, camX: P ? 0 : -1.2, camY: 0.4, camZ: P ? 9.4 : 6.6, chRZ: 0.35 }],
    [R(a, 0.75), { explode: 1, camX: P ? 0 : 1.3, camY: 1.1, chRZ: 0, chRY: 0.6 }],
    [R(a, 1), { explode: 0.15 }],
    [R(i, 0), {
      explode: 0, chX: 0, chY: 0.6, chZ: -5, chS: 1, chRX: -1.2, chRY: 0, chRZ: 0.3,
      dim: 0.6, beam: 0.15, trails: 0.15, camX: 0, camY: 0, camZ: 7, tgtY: 0,
      gold: 0.5, warm: 0.3, cool: 0.4, flow: 1.4,
    }],
    [R(i, 1), { chRY: 1.2 }],
    [Math.min(o.top, maxScroll), {
      gem: 1, chX: P ? 0 : 2.35, chY: P ? 1.55 : 0.45, chZ: 0, chS: P ? 0.7 : 0.85,
      flat: 1, chRX: -0.22, chRY: 0, chRZ: 0, links: 24,
      camX: 0, camY: 0, camZ: P ? 9.5 : 7.6, dim: 0, beam: 0.9, trails: 1,
      warm: 0.85, cool: 0.15, flow: 0.7, explode: 0, bokeh: 1.2, frange: 3,
    }],
  ];

  const keys = [];
  let prev = { ...BASE };
  for (const [y, s] of raw) {
    const full = { ...prev, ...s };
    keys.push({ y, s: full });
    prev = full;
  }
  keys.sort((p, q) => p.y - q.y);
  return keys;
}

const ease = (t) => t * t * (3 - 2 * t);
const val = (v) => (typeof v === 'function' ? v() : v);

export function sampleKeys(keys, y, out) {
  if (!keys.length) return out;
  let j = 0;
  while (j < keys.length - 1 && keys[j + 1].y <= y) j++;
  const A = keys[j], B = keys[Math.min(j + 1, keys.length - 1)];
  const span = B.y - A.y;
  const t = span > 0 ? ease(Math.min(1, Math.max(0, (y - A.y) / span))) : 0;
  for (const k in BASE) {
    const a = val(A.s[k]), b = val(B.s[k]);
    out[k] = a + (b - a) * t;
  }
  return out;
}
