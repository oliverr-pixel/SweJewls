import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Typography choreography: masked char reveals for headings, word-by-word reading for the manifest.
export function initText({ reduced }) {
  const out = {};

  document.querySelectorAll('.split-chars').forEach((el) => {
    const split = SplitText.create(el, { type: 'chars,words', mask: 'words' });
    gsap.from(split.chars, {
      yPercent: 110,
      rotate: reduced ? 0 : 8,
      duration: reduced ? 0 : 1.1,
      ease: 'expo.out',
      stagger: 0.022,
      scrollTrigger: { trigger: el.closest('section'), start: 'top 55%', toggleActions: 'play none none reverse' },
    });
  });

  const lead = document.querySelector('.split-lines');
  if (lead) out.heroLines = SplitText.create(lead, { type: 'lines', mask: 'lines' }).lines;

  const manifest = document.querySelector('#manifest');
  if (manifest) {
    const words = [];
    manifest.querySelectorAll('[data-words]').forEach((el) => {
      const s = SplitText.create(el, { type: 'words', wordsClass: 'word' });
      words.push(...s.words);
    });
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.fromTo(words,
      { opacity: 0.1, yPercent: 18, filter: `blur(${reduced ? 0 : 6}px)` },
      { opacity: 1, yPercent: 0, filter: 'blur(0px)', stagger: 0.035, duration: 0.12 }, 0.04);
    tl.to(manifest.querySelector('.manifest__pin'), { opacity: 0, y: -40, duration: 0.12 }, 0.9);
    ScrollTrigger.create({ trigger: manifest, start: 'top 30%', end: 'bottom bottom', scrub: reduced ? true : 0.8, animation: tl });
  }

  // headings lean with scroll velocity
  out.skewTargets = [...document.querySelectorAll('.manifest__title, .anatomy__title, .irl__title, .order__title')];
  return out;
}
