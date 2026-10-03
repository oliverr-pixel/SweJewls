import { gsap } from 'gsap';

// Dot + lagging ring. Over anything with data-cursor the ring fills with gold and shows the label.
export function initCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const root = document.querySelector('.cursor');
  if (!root) return;
  document.documentElement.classList.add('has-cursor');
  const dot = root.querySelector('.cursor__dot');
  const ring = root.querySelector('.cursor__ring');
  const label = root.querySelector('.cursor__label');
  let x = window.innerWidth / 2, y = window.innerHeight / 2, rx = x, ry = y;
  let shown = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!shown) { shown = true; rx = x; ry = y; root.style.opacity = 1; }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { root.style.opacity = 0; shown = false; });
  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup', () => root.classList.remove('is-down'));

  const interactive = 'a, button, [data-cursor], input, textarea, label';
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(interactive);
    if (!t || t.matches('input, textarea')) return;
    const text = t.dataset.cursor || '';
    root.classList.toggle('is-hover', !!text);
    root.classList.toggle('is-link', !text);
    if (text) label.textContent = text;
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest(interactive);
    if (!t) return;
    if (e.relatedTarget && t.contains(e.relatedTarget)) return;
    root.classList.remove('is-hover', 'is-link');
    const parent = e.relatedTarget?.closest?.(interactive);
    if (parent) {
      const text = parent.dataset.cursor || '';
      root.classList.toggle('is-hover', !!text);
      root.classList.toggle('is-link', !text);
      if (text) label.textContent = text;
    }
  });

  gsap.ticker.add(() => {
    rx += (x - rx) * 0.17;
    ry += (y - ry) * 0.17;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
  });
}
