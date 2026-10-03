import 'lenis/dist/lenis.css';
import './styles/main.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { mountLogos } from './brand.js';
import { Experience } from './webgl/Experience.js';
import { initCursor } from './ui/cursor.js';
import { initMagnetic } from './ui/magnetic.js';
import { initCart } from './ui/cart.js';
import { initCollection } from './ui/collection.js';
import { initReel } from './ui/reel.js';
import { initAnatomy } from './ui/anatomy.js';
import { initMarquee } from './ui/marquee.js';
import { initText } from './ui/text.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
html.classList.toggle('reduced', reduced);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

mountLogos();
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// ---------- smooth scroll ----------
let lenis = null;
if (!reduced) {
  lenis = new Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.3,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollY = () => (lenis ? lenis.animatedScroll : window.scrollY);
let nativeVel = 0, lastY = window.scrollY;
const velocity = () => (lenis ? lenis.velocity : nativeVel);

document.querySelectorAll('[data-scroll]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (!id || !id.startsWith('#')) return;
    const el = id === '#top' ? 0 : document.querySelector(id);
    if (el === null) return;
    e.preventDefault();
    let target = el;
    // land where each scene reads best
    if (id === '#kollektion') target = el.offsetTop + 2;
    if (id === '#kvalitet') target = el.offsetTop + window.innerHeight * 0.9;
    if (id === '#irl') target = el.offsetTop + window.innerHeight * 0.6;
    if (lenis) lenis.scrollTo(target, { duration: 2.2 });
    else window.scrollTo({ top: typeof target === 'number' ? target : target.offsetTop, behavior: reduced ? 'auto' : 'smooth' });
  });
});

// ---------- WebGL ----------
const canvas = document.getElementById('gl');
let necklaceFinish = 'Silver';
const dyn = { necklaceGold: () => (necklaceFinish === 'Guld' ? 1 : 0) };
let exp = null;
try {
  const test = document.createElement('canvas').getContext('webgl2');
  if (!test) throw new Error('WebGL2 saknas');
  exp = new Experience(canvas, {
    mobile,
    reduced,
    dyn,
    sections: {
      manifest: document.getElementById('manifest'),
      collection: document.getElementById('kollektion'),
      anatomy: document.getElementById('kvalitet'),
      irl: document.getElementById('irl'),
      order: document.getElementById('bestall'),
    },
  });
} catch (err) {
  console.warn('[SweJewls] 3D är avstängt:', err);
  html.classList.add('no-webgl');
  canvas.style.display = 'none';
}

gsap.ticker.add((t, dtMs) => {
  if (!lenis) {
    const y = window.scrollY;
    nativeVel = nativeVel * 0.8 + (y - lastY) * 0.2;
    lastY = y;
  }
  if (exp) exp.update(dtMs / 1000, scrollY(), velocity());
});

// pointer → scene
if (exp) {
  let drag = null;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') exp.setPointer(e.clientX, e.clientY, true);
    if (drag) { exp.drag(e.clientX - drag); drag = e.clientX; }
  }, { passive: true });
  document.addEventListener('pointerleave', () => exp.setPointer(window.innerWidth / 2, window.innerHeight / 2, false));
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, textarea, label, .cart, video, .reel__card')) return;
    exp.pulse(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') drag = e.clientX;
  });
  window.addEventListener('pointerup', () => { drag = null; });
}

// ---------- UI ----------
initCursor();
initMagnetic();
const text = initText({ reduced });
let introReleased = false;
const cart = initCart({ lenis, reduced, getFinish: () => necklaceFinish, canScroll: () => introReleased });
initCollection({
  section: document.getElementById('kollektion'),
  reduced,
  onFinish: (f) => { necklaceFinish = f; },
});
initAnatomy({ section: document.getElementById('kvalitet'), exp, reduced });
initReel({ section: document.getElementById('irl'), reduced });
initMarquee({ getVelocity: velocity, reduced });

// headings lean into fast scrolls
if (!reduced) {
  const skewTo = text.skewTargets.map((el) => gsap.quickTo(el, 'skewY', { duration: 0.5, ease: 'power3.out' }));
  gsap.ticker.add(() => {
    const v = Math.max(-1, Math.min(1, velocity() / 40));
    skewTo.forEach((fn) => fn(v * -2.2));
  });
}

// active nav link
const navLinks = [...document.querySelectorAll('.nav__links a')];
['kollektion', 'kvalitet', 'irl', 'bestall'].forEach((id) => {
  const el = document.getElementById(id);
  ScrollTrigger.create({
    trigger: el, start: 'top 50%', end: 'bottom 50%',
    onToggle: (s) => navLinks.forEach((a) => { if (a.getAttribute('href') === `#${id}`) a.classList.toggle('is-active', s.isActive); }),
  });
});

// ---------- resize ----------
let lastW = window.innerWidth, lastH = window.innerHeight, rt = 0;
window.addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    const w = window.innerWidth, h = window.innerHeight;
    // mobile URL bar show/hide only changes height a little; keep the stage still
    if (mobile && w === lastW && Math.abs(h - lastH) < 160) return;
    lastW = w; lastH = h;
    exp?.resize();
    ScrollTrigger.refresh();
  }, 180);
});
ScrollTrigger.addEventListener('refresh', () => exp?.refresh());

// ---------- loader + opening shot ----------
const num = document.getElementById('loaderNum');
const bar = document.getElementById('loaderBar');
const load = { p: 0 };
const draw = () => {
  num.textContent = String(Math.round(load.p * 100)).padStart(3, '0');
  bar.style.transform = `scaleX(${load.p})`;
};
gsap.to(load, { p: 0.72, duration: reduced ? 0 : 1.1, ease: 'power2.out', onUpdate: draw });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ready = Promise.all([
  Promise.race([document.fonts?.ready ?? Promise.resolve(), wait(2500)]),
  exp?.renderer.compileAsync ? exp.renderer.compileAsync(exp.scene, exp.camera).catch(() => {}) : Promise.resolve(),
  wait(reduced ? 0 : 900),
]);

ready.then(() => {
  ScrollTrigger.refresh();
  exp?.refresh();
  gsap.to(load, {
    p: 1, duration: reduced ? 0 : 0.45, ease: 'power2.inOut', onUpdate: draw,
    onComplete: () => (reduced ? skipIntro() : playIntro()),
  });
});

function skipIntro() {
  document.getElementById('loader').style.display = 'none';
  if (exp) exp.intro.t = 1;
  introReleased = true;
  if (!cart.isOpen()) lenis?.start();
}

function playIntro() {
  html.classList.add('is-intro');
  const tl = gsap.timeline({ onComplete: () => html.classList.remove('is-intro') });
  tl.to(['.loader__mark', '.loader__num', '.loader__cap'], { yPercent: -60, opacity: 0, duration: 0.5, ease: 'power3.in', stagger: 0.05 })
    .to('.loader__bar', { width: '100vw', duration: 0.55, ease: 'expo.inOut' }, '<0.15')
    .set('#loader', { display: 'none' })
    .addLabel('open')
    .to('.letterbox i:first-child', { yPercent: -100, duration: 1.5, ease: 'expo.inOut' }, 'open')
    .to('.letterbox i:last-child', { yPercent: 100, duration: 1.5, ease: 'expo.inOut' }, 'open');
  if (exp) tl.to(exp.intro, { t: 1, duration: 3.1, ease: 'none' }, 'open-=0.25');
  tl.from('.nav', { yPercent: -120, opacity: 0, duration: 1.1, ease: 'expo.out' }, 'open+=1.3');
  if (text.heroLines) tl.from(text.heroLines, { yPercent: 115, duration: 1.2, stagger: 0.09, ease: 'expo.out' }, 'open+=1.5');
  tl.from('.hero__where, .hero__from, .hero__scroll, .hero__edge', { opacity: 0, y: 24, duration: 1.1, stagger: 0.08, ease: 'expo.out' }, 'open+=1.7');
  tl.add(() => { introReleased = true; if (!cart.isOpen()) lenis?.start(); }, 'open+=1.6');
}
