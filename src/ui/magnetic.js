import { gsap } from 'gsap';

// Buttons lean toward the pointer when it comes close, their label leans further, then spring back.
export function initMagnetic() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const items = [...document.querySelectorAll('.magnetic')].map((el) => ({
    el,
    inner: el.querySelector('.magnetic__inner'),
    xTo: gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' }),
    yTo: gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' }),
    ixTo: null, iyTo: null,
    on: false,
  }));
  items.forEach((it) => {
    if (it.inner) {
      it.ixTo = gsap.quickTo(it.inner, 'x', { duration: 0.6, ease: 'power3.out' });
      it.iyTo = gsap.quickTo(it.inner, 'y', { duration: 0.6, ease: 'power3.out' });
    }
  });
  window.addEventListener('pointermove', (e) => {
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      if (r.width === 0) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const pad = 36;
      const inside = Math.abs(dx) < r.width / 2 + pad && Math.abs(dy) < r.height / 2 + pad;
      if (inside) {
        it.on = true;
        it.xTo(dx * 0.32); it.yTo(dy * 0.38);
        if (it.ixTo) { it.ixTo(dx * 0.14); it.iyTo(dy * 0.16); }
      } else if (it.on) {
        it.on = false;
        gsap.to(it.el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)', overwrite: true });
        if (it.inner) gsap.to(it.inner, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)', overwrite: true });
        it.xTo = gsap.quickTo(it.el, 'x', { duration: 0.6, ease: 'power3.out' });
        it.yTo = gsap.quickTo(it.el, 'y', { duration: 0.6, ease: 'power3.out' });
        if (it.inner) {
          it.ixTo = gsap.quickTo(it.inner, 'x', { duration: 0.6, ease: 'power3.out' });
          it.iyTo = gsap.quickTo(it.inner, 'y', { duration: 0.6, ease: 'power3.out' });
        }
      }
    }
  }, { passive: true });
}
