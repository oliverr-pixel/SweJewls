// Inline SVG versions of the SweJewls logo, built from the outlined paths in brand-paths.json
// (generated together with the files in /brand).
import paths from './brand-paths.json';

let uid = 0;
const GOLD = ['#F8E6A8', '#E2B653', '#A97A22'];
const ICE = ['#FFFFFF', '#DDE4EB', '#A3AEBA'];

function gradients(id) {
  const stops = (c) => `<stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/>`;
  return `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">${stops(GOLD)}</linearGradient><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">${stops(ICE)}</linearGradient></defs>`;
}
const markPaths = () => paths.mark.map((f) => `<path d="${f.d}" fill="${f.c}"/>`).join('');
const words = (id) => `<path d="${paths.swe}" fill="url(#${id}g)"/><path d="${paths.jewls}" fill="url(#${id}s)"/>`;

export function markSVG() {
  return `<svg viewBox="2 10 96 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${markPaths()}</svg>`;
}

export function horizontalSVG() {
  const id = `swj${uid++}`;
  const { capH, wordWidth } = paths;
  const markH = capH * 1.32, s = markH / 80, markW = 92 * s, gap = capH * 0.42;
  const W = markW + gap + wordWidth, H = markH;
  return `<svg viewBox="-2 -3 ${(W + 4).toFixed(1)} ${(H + 6).toFixed(1)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${gradients(id)}<g transform="translate(${(-4 * s).toFixed(2)} ${(-12 * s).toFixed(2)}) scale(${s.toFixed(4)})">${markPaths()}</g><g transform="translate(${(markW + gap).toFixed(2)} ${((H + capH) / 2).toFixed(2)})">${words(id)}</g></svg>`;
}

export function stackedSVG() {
  const id = `swj${uid++}`;
  const { capH, wordWidth } = paths;
  const markH = capH * 2.1, s = markH / 80, markW = 92 * s, gap = capH * 0.55;
  const W = wordWidth, H = markH + gap + capH;
  return `<svg viewBox="-4 -4 ${(W + 8).toFixed(1)} ${(H + 10).toFixed(1)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${gradients(id)}<g transform="translate(${((W - markW) / 2 - 4 * s).toFixed(2)} ${(-12 * s).toFixed(2)}) scale(${s.toFixed(4)})">${markPaths()}</g><g transform="translate(0 ${(markH + gap + capH).toFixed(2)})">${words(id)}</g></svg>`;
}

export function mountLogos(root = document) {
  const make = { mark: markSVG, horizontal: horizontalSVG, stacked: stackedSVG };
  root.querySelectorAll('[data-logo]').forEach((el) => {
    const fn = make[el.dataset.logo];
    if (fn) el.innerHTML = fn();
  });
}

export const brandPaths = paths;
