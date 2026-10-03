import { gsap } from 'gsap';
import { PRODUCTS, PHONE, formatKr } from '../data.js';
import { copyText } from './copy.js';
import { toast } from './toast.js';

const KEY = 'swejewls-cart-v1';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => PRODUCTS[i.id] && i.qty > 0) : [];
  } catch { return []; }
}
function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
}

export function initCart({ lenis, getFinish, reduced }) {
  let items = load();
  const root = document.getElementById('cart');
  const panel = root.querySelector('.cart__panel');
  const scrim = root.querySelector('.cart__scrim');
  const list = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const totalEl = document.getElementById('cartTotal');
  const countEl = document.getElementById('cartCount');
  const sms = document.getElementById('smsLink');
  const copyBtn = document.getElementById('copyOrder');
  const nameIn = document.getElementById('orderName');
  const noteIn = document.getElementById('orderNote');
  const cartBtn = document.getElementById('cartBtn');
  let lastFocus = null;

  const total = () => items.reduce((s, i) => s + PRODUCTS[i.id].price * i.qty, 0);
  const count = () => items.reduce((s, i) => s + i.qty, 0);

  function body() {
    const lines = items.map((i) => {
      const p = PRODUCTS[i.id];
      return `${i.qty} st ${p.name}${i.finish ? ` (${i.finish.toLowerCase()})` : ''}: ${formatKr(p.price * i.qty)}`;
    });
    let txt = `Hej SweJewls! Jag vill beställa:\n${lines.join('\n')}\nTotalt: ${formatKr(total())}`;
    const name = nameIn.value.trim();
    const note = noteIn.value.trim();
    if (name) txt += `\nNamn: ${name}`;
    if (note) txt += `\n${note}`;
    return txt;
  }

  function updateLink() {
    sms.href = `sms:${PHONE.e164}?&body=${encodeURIComponent(body())}`;
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
        <div class="qty" role="group" aria-label="Antal ${p.name}">
          <button type="button" data-dec="${idx}" aria-label="En mindre">&minus;</button>
          <output aria-live="polite">${i.qty}</output>
          <button type="button" data-inc="${idx}" aria-label="En till">+</button>
        </div>
        <button type="button" class="remove mono" data-rm="${idx}">Ta bort</button>`;
      list.appendChild(li);
    });
    const has = items.length > 0;
    empty.hidden = has;
    totalEl.textContent = formatKr(total());
    countEl.textContent = String(count());
    document.querySelectorAll('[data-cart-total]').forEach((el) => { el.textContent = formatKr(total()); });
    sms.classList.toggle('is-disabled', !has);
    sms.setAttribute('aria-disabled', String(!has));
    copyBtn.classList.toggle('is-disabled', !has);
    updateLink();
  }

  function add(id, fromEl) {
    const p = PRODUCTS[id];
    if (!p) return;
    const finish = p.finishes ? getFinish(id) : null;
    const found = items.find((i) => i.id === id && (i.finish || null) === finish);
    if (found) found.qty += 1;
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
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    cartBtn.setAttribute('aria-expanded', 'true');
    lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    gsap.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: reduced ? 0 : 0.8, ease: 'expo.out' });
    gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : 0.5 });
    gsap.fromTo(list.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, delay: 0.15, ease: 'power3.out' });
    setTimeout(() => root.querySelector('.cart__close').focus(), 50);
  }

  function close() {
    if (root.hidden) return;
    cartBtn.setAttribute('aria-expanded', 'false');
    gsap.to(scrim, { opacity: 0, duration: reduced ? 0 : 0.4 });
    gsap.to(panel, {
      xPercent: 100, duration: reduced ? 0 : 0.6, ease: 'expo.in',
      onComplete: () => {
        root.hidden = true;
        document.documentElement.style.overflow = '';
        lenis?.start();
        lastFocus?.focus?.();
      },
    });
  }

  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { add(addBtn.dataset.add, addBtn); return; }
    if (e.target.closest('[data-open-cart]') || e.target.closest('#cartBtn')) { open(); return; }
    if (e.target.closest('[data-close-cart]')) { close(); return; }
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const rm = e.target.closest('[data-rm]');
    if (inc || dec || rm) {
      const idx = Number((inc || dec || rm).dataset.inc ?? (inc || dec || rm).dataset.dec ?? (inc || dec || rm).dataset.rm);
      const it = items[idx];
      if (!it) return;
      if (inc) it.qty += 1;
      if (dec) it.qty -= 1;
      if (rm || it.qty <= 0) items.splice(idx, 1);
      save(items);
      render();
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
  noteIn.addEventListener('input', updateLink);
  document.getElementById('cartForm').addEventListener('submit', (e) => e.preventDefault());

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = [...panel.querySelectorAll('button, a[href], input, textarea')].filter((el) => !el.classList.contains('is-disabled'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await copyText(btn.dataset.copy);
      toast(ok ? `${btn.dataset.copy} är kopierat` : 'Kunde inte kopiera. Markera numret själv.');
    });
  });

  render();
  return { open, close, add };
}
