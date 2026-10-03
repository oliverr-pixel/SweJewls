import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Callouts that point at real parts of the 3D chain while it comes apart.
export function initAnatomy({ section, exp, reduced }) {
  const pin = section.querySelector('.anatomy__pin');
  const callouts = [...section.querySelectorAll('.callout')];
  const paths = [...section.querySelectorAll('.leaders path')];
  const dots = [...section.querySelectorAll('.anchor-dot')];
  const vis = callouts.map(() => ({ v: 0 }));

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  callouts.forEach((c, i) => {
    tl.fromTo(c, { opacity: 0, x: i % 2 ? 40 : -40, filter: `blur(${reduced ? 0 : 8}px)` },
      { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.08 }, 0.16 + i * 0.07);
    tl.fromTo(vis[i], { v: 0 }, { v: 1, duration: 0.08 }, 0.16 + i * 0.07);
  });
  tl.to(callouts, { opacity: 0, duration: 0.06 }, 0.93);
  tl.to(vis, { v: 0, duration: 0.06 }, 0.93);
  ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.6, animation: tl });

  let visible = false;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(section);
  const narrow = window.matchMedia('(max-width: 760px)');

  gsap.ticker.add(() => {
    if (!visible || !exp || narrow.matches) return;
    const pr = pin.getBoundingClientRect();
    callouts.forEach((c, i) => {
      const a = exp.anchorsScreen[c.dataset.anchor | 0];
      const r = c.getBoundingClientRect();
      const left = i % 2 === 0;
      const x1 = (left ? r.right : r.left) - pr.left;
      const y1 = r.top + 22 - pr.top;
      const x2 = a.x - pr.left, y2 = a.y - pr.top;
      const mx = x1 + (x2 - x1) * 0.35;
      const o = vis[i].v * (a.z < 1 ? 1 : 0);
      paths[i].setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)} L${mx.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
      paths[i].style.opacity = o;
      dots[i].style.transform = `translate3d(${x2}px, ${y2}px, 0)`;
      dots[i].style.opacity = o;
    });
  });
}
