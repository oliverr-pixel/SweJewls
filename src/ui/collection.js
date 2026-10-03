import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Three products, one stage. A scrubbed timeline hands the panel over while the price
// rolls like an odometer (250 → 300 → 350) in step with the 3D chain re-plating and growing.
export function initCollection({ section, reduced, onFinish }) {
  const panels = [...section.querySelectorAll('.product')];
  const odo = section.querySelector('#odo');
  const idxEl = section.querySelector('#colIndex');
  const track = section.querySelector('#colTrack');
  const stage = section.querySelector('.collection__stage');

  // odometer: three columns of 0-9 twice, so 5 → 0 can keep rolling forward
  const start = [2, 5, 0];
  const cols = start.map((d) => {
    const col = document.createElement('span');
    col.className = 'odo__col';
    for (let r = 0; r < 2; r++) for (let n = 0; n < 10; n++) {
      const s = document.createElement('span');
      s.textContent = String(n);
      col.appendChild(s);
    }
    odo.appendChild(col);
    gsap.set(col, { yPercent: (-100 / 20) * d });
    return col;
  });
  const at = (i) => (-100 / 20) * i;

  // finish picker for the necklace
  section.querySelectorAll('.finish__opt').forEach((b) => {
    b.addEventListener('click', () => {
      section.querySelectorAll('.finish__opt').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
      onFinish(b.dataset.finish);
    });
  });

  const anim = panels.map((p) => [...p.querySelectorAll('.product__no, .product__name, .product__specs li, .finish, .btn')]);
  panels.forEach((p, i) => {
    if (i > 0) gsap.set(anim[i], { opacity: 0, yPercent: 60 });
    setActive(p, i === 0);
  });

  function setActive(p, on) {
    p.setAttribute('aria-hidden', String(!on));
    if (on) p.removeAttribute('inert'); else p.setAttribute('inert', '');
  }

  const blur = reduced ? 0 : 10;
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  const out = (i, t) => tl.to(anim[i], { opacity: 0, yPercent: -50, filter: `blur(${blur}px)`, stagger: 0.006, duration: 0.05 }, t);
  const into = (i, t) => tl.fromTo(anim[i],
    { opacity: 0, yPercent: 60, filter: `blur(${blur}px)` },
    { opacity: 1, yPercent: 0, filter: 'blur(0px)', stagger: 0.008, duration: 0.06, immediateRender: false }, t);
  out(0, 0.3);
  into(1, 0.35);
  tl.to(cols[0], { yPercent: at(3), duration: 0.08 }, 0.31);
  tl.to(cols[1], { yPercent: at(10), duration: 0.1 }, 0.3);
  out(1, 0.62);
  into(2, 0.67);
  tl.to(cols[1], { yPercent: at(15), duration: 0.1 }, 0.62);
  tl.fromTo(track, { scaleY: 0, scaleX: 0 }, { scaleY: 1, scaleX: 1, duration: 1 }, 0);
  tl.set({}, {}, 1);

  let active = 0;
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: reduced ? true : 0.7,
    animation: tl,
    onUpdate: (self) => {
      const p = self.progress;
      const a = p < 0.35 ? 0 : p < 0.67 ? 1 : 2;
      if (a !== active) {
        active = a;
        idxEl.textContent = `0${a + 1}`;
        panels.forEach((el, i) => setActive(el, i === a));
      }
    },
  });

  // entrance of the whole stage
  gsap.from(stage, {
    opacity: 0, y: 60, duration: reduced ? 0 : 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: section, start: 'top 70%', toggleActions: 'play none none reverse' },
  });
}
