import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// The IRL clips on a 3D carousel that turns with scroll. The card facing you plays;
// the rest wait. Hovering the front card tilts it toward the pointer with a moving glare.
export function initReel({ section, reduced }) {
  const ring = section.querySelector('.reel__ring');
  const cards = [...section.querySelectorAll('.reel__card')];
  const videos = cards.map((c) => c.querySelector('video'));
  const N = cards.length;

  const loadMedia = () => videos.forEach((v) => {
    if (v && !v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
  });
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { loadMedia(); io.disconnect(); }
  }, { rootMargin: '120% 0px' });
  io.observe(section);

  if (reduced) {
    const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
      const v = e.target.querySelector('video');
      if (!v) return;
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }), { threshold: 0.6 });
    cards.forEach((c) => vio.observe(c));
    return;
  }

  let R = 400;
  const layout = () => {
    const w = ring.offsetWidth || 280;
    R = (w / 2) / Math.tan(Math.PI / N) * 1.22;
  };
  layout();
  window.addEventListener('resize', layout);

  let progress = 0;
  ScrollTrigger.create({
    trigger: section, start: 'top bottom', end: 'bottom top',
    onUpdate: (s) => { progress = s.progress; },
  });

  const tilt = { x: 0, y: 0, tx: 0, ty: 0, card: null };
  cards.forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tilt.card = c; tilt.tx = (0.5 - py) * 14; tilt.ty = (px - 0.5) * 18;
      c.style.setProperty('--gx', `${px * 100}%`);
      c.style.setProperty('--gy', `${py * 100}%`);
      c.style.setProperty('--glare', '1');
    });
    c.addEventListener('pointerleave', () => { tilt.tx = 0; tilt.ty = 0; c.style.setProperty('--glare', '0'); });
  });

  let rot = 0;
  let visible = false;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(section);

  gsap.ticker.add(() => {
    if (!visible) return;
    // the sticky part of the scroll steps through the cards, holding each one front and centre
    const vh = window.innerHeight, h = section.offsetHeight;
    const s0 = vh / (h + vh), s1 = h / (h + vh);
    const p = Math.min(1, Math.max(0, (progress - s0) / (s1 - s0)));
    const f = p * (N - 1), i = Math.floor(f), t = f - i;
    const hold = t < 0.3 ? 0 : t > 0.7 ? 1 : (t - 0.3) / 0.4;
    const step = hold * hold * (3 - 2 * hold);
    const lead = progress < s0 ? (s0 - progress) * 140 : progress > s1 ? -(progress - s1) * 140 : 0;
    const target = -(i + step) * (360 / N) + lead;
    rot += (target - rot) * 0.08;
    tilt.x += (tilt.tx - tilt.x) * 0.12;
    tilt.y += (tilt.ty - tilt.y) * 0.12;
    ring.style.transform = `translateZ(${-R}px) rotateX(-4deg)`;
    cards.forEach((c, i) => {
      let a = (i * 360) / N + rot;
      a = ((a % 360) + 540) % 360 - 180;
      const facing = Math.cos((a * Math.PI) / 180);
      const isT = tilt.card === c;
      c.style.transform = `rotateY(${a}deg) translateZ(${R}px)${isT ? ` rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : ''}`;
      c.style.opacity = String(0.25 + 0.75 * Math.pow(Math.max(0, facing), 2));
      c.style.filter = facing > 0.9 ? 'none' : `brightness(${0.45 + 0.5 * Math.max(0, facing)})`;
      const v = videos[i];
      if (v && v.src) {
        if (facing > 0.86 && v.paused) v.play().catch(() => {});
        else if (facing <= 0.86 && !v.paused) v.pause();
      }
    });
  });
}
