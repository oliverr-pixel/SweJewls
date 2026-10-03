import { gsap } from 'gsap';
import { PRODUCTS, PHONE, formatKr } from '../data.js';
import { copyText } from './copy.js';
import { toast } from './toast.js';

const KEY = 'swejewls-cart-v1';
const MAX_QTY = 99;
const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

// Only trust saved rows that match a real product, a real finish and a sane quantity.
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((i) => {
      if (!i || typeof i.id !== 'string' || !has(PRODUCTS, i.id)) return [];
      if (!Number.isInteger(i.qty) || i.qty < 1) return [];
      const p = PRODUCTS[i.id];
      const finish = p.finishes ? (p.finishes.includes(i.finish) ? i.finish : null) : null;
      if (p.finishes && !finish) return [];
      return [{ id: i.id, finish, qty: Math.min(i.qty, MAX_QTY) }];
    });
  } catch { return []; }
}
function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
}

export function initCart({ lenis, getFinish, reduced, canScroll = () => true }) {
  let items = load();
  const root = document.getElementById('cart');
  const panel = root.querySelector('.cart__panel');
  const scrim = root.querySelector('.cart__scrim');
  const foot = root.querySelector('.cart__foot');
  const list = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const totalEl = document.getElementById('cartTotal');
  const countEl = document.getElementById('cartCount');
  const sms = document.getElementById('smsLink');
  const copyBtn = document.getElementById('copyOrder');
  const nameIn = document.getElementById('orderName');
  const noteIn = document.getElementById('orderNote');
  const cartBtn = document.getElementById('cartBtn');
  const scroller = document.getElementById('cartScroll');
  const html = document.documentElement;
  const payment = () => root.querySelector('input[name="pay"]:checked')?.value || '';
  let lastFocus = null;
  let state = 'closed'; // closed | open | closing

  const total = () => items.reduce((s, i) => s + PRODUCTS[i.id].price * i.qty, 0);
  const count = () => items.reduce((s, i) => s + i.qty, 0);

  function body() {
    const lines = items.map((i) => {
      const p = PRODUCTS[i.id];
      return `${i.qty} st ${p.name}${i.finish ? ` (${i.finish.toLowerCase()})` : ''}: ${formatKr(p.price * i.qty)}`;
    });
    let txt = `Hej SweJewls! Jag vill beställa och mötas upp i Stockholm:\n${lines.join('\n')}\nTotalt: ${formatKr(total())}`;
    const name = nameIn.value.trim();
    const note = noteIn.value.trim();
    if (name) txt += `\nNamn: ${name}`;
    if (payment()) txt += `\nBetalning: ${payment()}`;
    if (note) txt += `\n${note}`;
    // "1 000 kr" uses a no-break space; a plain space keeps the SMS in the cheaper GSM alphabet
    return txt.replace(/[  ]/g, ' ');
  }

  function updateLink() {
    sms.href = `sms:${PHONE.e164}?&body=${encodeURIComponent(body())}`;
  }

  // fade the bottom edge while there is more to scroll to
  function updateMore() {
    const el = getComputedStyle(scroller).overflowY === 'visible' ? panel : scroller;
    root.classList.toggle('has-more', el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  }
  // keep toasts above the pinned footer while the cart is open
  function updateFootHeight() {
    html.style.setProperty('--cart-foot-h', `${foot.offsetHeight}px`);
  }

  function render() {
    list.innerHTML = '';
    items.forEach((i, idx) => {
      const p = PRODUCTS[i.id];
      const li = document.createElement('li');
      li.className = 'cart__item';
      li.innerHTML = `
        <div><h3>${p.name}</h3><span class="mono">${p.kind}${i.finish ? ` · ${i.finish}` : ''} · ${formatKr(p.price)}/st</span></div>
        <b>${formatKr(p.price * i.qty)}</b>
        <div class="qty" role="group" aria-label="Antal ${p.name}${i.finish ? ` ${i.finish.toLowerCase()}` : ''}">
          <button type="button" data-dec="${idx}" aria-label="En mindre">&minus;</button>
          <output aria-live="polite">${i.qty}</output>
          <button type="button" data-inc="${idx}" aria-label="En till"${i.qty >= MAX_QTY ? ' disabled' : ''}>+</button>
        </div>
        <button type="button" class="remove mono" data-rm="${idx}">Ta bort</button>`;
      list.appendChild(li);
    });
    const any = items.length > 0;
    empty.hidden = any;
    totalEl.textContent = formatKr(total());
    countEl.textContent = String(count());
    document.querySelectorAll('[data-cart-total]').forEach((el) => { el.textContent = formatKr(total()); });
    sms.classList.toggle('is-disabled', !any);
    sms.setAttribute('aria-disabled', String(!any));
    if (any) sms.removeAttribute('tabindex'); else sms.setAttribute('tabindex', '-1');
    copyBtn.disabled = !any;
    updateLink();
    if (state !== 'closed') { updateMore(); updateFootHeight(); }
  }

  function add(id, fromEl) {
    const p = PRODUCTS[id];
    if (!p) return;
    const finish = p.finishes ? getFinish(id) : null;
    const found = items.find((i) => i.id === id && (i.finish || null) === finish);
    if (found) found.qty = Math.min(MAX_QTY, found.qty + 1);
    else items.push({ id, finish, qty: 1 });
    save(items);
    render();
    fly(fromEl);
    toast(`${p.name}${finish ? ` (${finish.toLowerCase()})` : ''} ligger i korgen`);
  }

  function fly(fromEl) {
    const bump = () => {
      countEl.classList.remove('is-bump');
      void countEl.offsetWidth;
      countEl.classList.add('is-bump');
    };
    if (!fromEl || reduced) { bump(); return; }
    const a = fromEl.getBoundingClientRect();
    const b = cartBtn.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const x1 = b.left + b.width - 18, y1 = b.top + b.height / 2;
    const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 160;
    const el = document.createElement('i');
    el.className = 'fly';
    document.body.appendChild(el);
    const o = { t: 0 };
    gsap.to(o, {
      t: 1, duration: 0.85, ease: 'power2.inOut',
      onUpdate: () => {
        const t = o.t, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
        const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${45 + t * 270}deg) scale(${1 - t * 0.4})`;
      },
      onComplete: () => { el.remove(); bump(); },
    });
  }

  function open() {
    if (state === 'open') return;
    const wasClosed = state === 'closed';
    gsap.killTweensOf([panel, scrim]);
    state = 'open';
    if (wasClosed) {
      lastFocus = document.activeElement;
      root.hidden = false;
      scroller.scrollTop = 0;
      panel.scrollTop = 0;
      gsap.set(panel, { xPercent: 100 });
      gsap.set(scrim, { opacity: 0 });
      if (!reduced) gsap.fromTo(list.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, delay: 0.15, ease: 'power3.out' });
    }
    cartBtn.setAttribute('aria-expanded', 'true');
    html.classList.add('cart-open');
    lenis?.stop();
    html.style.overflow = 'hidden';
    gsap.to(panel, { xPercent: 0, duration: reduced ? 0 : 0.8, ease: 'expo.out' });
    gsap.to(scrim, { opacity: 1, duration: reduced ? 0 : 0.5 });
    updateFootHeight();
    updateMore();
    setTimeout(() => { if (state === 'open') root.querySelector('.cart__close').focus(); }, 50);
  }

  function close() {
    if (state !== 'open') return;
    state = 'closing';
    gsap.killTweensOf([panel, scrim]);
    cartBtn.setAttribute('aria-expanded', 'false');
    gsap.to(scrim, { opacity: 0, duration: reduced ? 0 : 0.4 });
    gsap.to(panel, {
      xPercent: 100, duration: reduced ? 0 : 0.6, ease: 'expo.in',
      onComplete: () => {
        if (state !== 'closing') return;
        state = 'closed';
        root.hidden = true;
        html.classList.remove('cart-open');
        html.style.overflow = '';
        if (canScroll()) lenis?.start();
        lastFocus?.focus?.();
      },
    });
  }

  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { add(addBtn.dataset.add, addBtn); return; }
    if (e.target.closest('[data-open-cart]') || e.target.closest('#cartBtn')) { open(); return; }
    if (e.target.closest('[data-close-cart]')) { close(); return; }
    const ctl = e.target.closest('[data-inc], [data-dec], [data-rm]');
    if (!ctl) return;
    const kind = 'inc' in ctl.dataset ? 'inc' : 'dec' in ctl.dataset ? 'dec' : 'rm';
    const idx = Number(ctl.dataset[kind]);
    const it = items[idx];
    if (!it) return;
    if (kind === 'inc') it.qty = Math.min(MAX_QTY, it.qty + 1);
    if (kind === 'dec') it.qty -= 1;
    const removed = kind === 'rm' || it.qty <= 0;
    if (removed) items.splice(idx, 1);
    save(items);
    render();
    // the list was rebuilt; put focus back on the same control (or its neighbour)
    if (state === 'open') {
      const sel = removed ? `[data-rm="${Math.min(idx, items.length - 1)}"]` : `[data-${kind}="${idx}"]`;
      const target = list.querySelector(sel);
      (target && !target.disabled ? target : root.querySelector('.cart__close')).focus({ preventScroll: true });
    }
  });

  sms.addEventListener('click', (e) => {
    if (!items.length) { e.preventDefault(); return; }
    updateLink();
  });
  copyBtn.addEventListener('click', async () => {
    if (!items.length) return;
    const ok = await copyText(`${body()}\n\nSkickas till ${PHONE.display}`);
    toast(ok ? 'Beställningen är kopierad' : 'Kunde inte kopiera. Markera texten själv.');
  });
  nameIn.addEventListener('input', updateLink);
  root.querySelectorAll('input[name="pay"]').forEach((r) => r.addEventListener('change', updateLink));
  noteIn.addEventListener('input', updateLink);
  document.getElementById('cartForm').addEventListener('submit', (e) => e.preventDefault());
  scroller.addEventListener('scroll', updateMore, { passive: true });
  panel.addEventListener('scroll', updateMore, { passive: true });
  window.addEventListener('resize', () => { if (state !== 'closed') { updateMore(); updateFootHeight(); } });

  // Escape and the Tab trap work wherever focus is, even after clicking plain text in the panel
  document.addEventListener('keydown', (e) => {
    if (state !== 'open') return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll('button, a[href], input, textarea')]
      .filter((el) => !el.disabled && el.tabIndex >= 0 && el.offsetParent !== null && !(el.type === 'radio' && !el.checked && root.querySelector(`input[name="${el.name}"]:checked`)));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    const inside = panel.contains(document.activeElement);
    if (!inside) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await copyText(btn.dataset.copy);
      toast(ok ? `${btn.dataset.copy} är kopierat` : 'Kunde inte kopiera. Markera numret själv.');
    });
  });

  render();
  return { open, close, add, isOpen: () => state !== 'closed' };
}
