import { gsap } from 'gsap';

// Endless band whose speed and direction follow the scroll.
export function initMarquee({ getVelocity, reduced }) {
  const track = document.querySelector('.marquee__track');
  if (!track) return;
  track.innerHTML += track.innerHTML;
  if (reduced) return;
  let x = 0, dir = -1, half = track.scrollWidth / 2;
  window.addEventListener('resize', () => { half = track.scrollWidth / 2; });
  gsap.ticker.add((t, dtMs) => {
    const v = getVelocity();
    if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
    x += dir * (40 + Math.min(Math.abs(v) * 28, 1400)) * (dtMs / 1000);
    if (x < -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px, 0, 0) skewX(${-Math.max(-12, Math.min(12, v * 0.35))}deg)`;
  });
}
