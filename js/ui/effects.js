// Muzi · movimiento de la marca: toasts, confeti, botones magnéticos, luz de cursor,
// contadores animados, color dinámico (Apple Music) y onda de avance (SoundCloud).

import { $, $$, REDUCED_MOTION } from '../core/utils.js';
import { HUES } from '../core/config.js';

/**
 * Aviso flotante. Opciones:
 *   sticky: true        se queda hasta que llames a .close() (p. ej. "Leyendo la playlist…")
 *   action: {label, fn} agrega un botón (p. ej. "Deshacer")
 */
export function toast(message, { sticky = false, action = null } = {}) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (sticky ? ' sticky' : '') + (action ? ' long' : '');
  t.setAttribute('role', 'status');
  const txt = document.createElement('span'); txt.textContent = message; t.appendChild(txt);
  if (sticky) t.prepend(Object.assign(document.createElement('i'), { className: 'spin' }));
  if (action) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = action.label;
    b.onclick = () => { t.remove(); action.fn(); };
    t.appendChild(b);
  }
  document.body.appendChild(t);
  const close = () => t.remove();
  if (!sticky) setTimeout(close, action ? 5300 : 3300);
  return { close };
}

export function shake(el) {
  if (REDUCED_MOTION) return;
  el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 360 });
}

// --- confeti ---
let canvas, ctx, parts = [], running = false;
export function burst(n, x, y) {
  if (REDUCED_MOTION) return;
  canvas ??= $('fx'); ctx ??= canvas.getContext('2d');
  canvas.width = innerWidth; canvas.height = innerHeight;
  x ??= innerWidth / 2; y ??= innerHeight * 0.45;
  const big = n > 20;
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * (big ? 16 : 8), vy: -Math.random() * (big ? 15 : 8) - 3, r: Math.random() * 5 + 3, c: HUES[i % 7], a: Math.random() * 6, l: 1 });
  if (!running) { running = true; requestAnimationFrame(loop); }
}
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  parts.forEach(p => {
    p.vy += .42; p.x += p.vx; p.y += p.vy; p.a += .2; p.l -= .01;
    ctx.save(); ctx.globalAlpha = Math.max(0, p.l); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
  });
  parts = parts.filter(p => p.l > 0 && p.y < canvas.height + 30);
  if (parts.length) requestAnimationFrame(loop);
  else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

// --- contadores que suben ---
const last = new WeakMap();
export function countTo(el, to) {
  const from = last.get(el) ?? 0; last.set(el, to);
  if (from === to || REDUCED_MOTION) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / 500); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// --- luz de cursor y botones magnéticos (firma de movimiento de Muzi) ---
export function initAmbient() {
  const light = $('curLight');
  addEventListener('pointermove', e => { light.style.left = e.clientX + 'px'; light.style.top = e.clientY + 'px'; }, { passive: true });
  if (REDUCED_MOTION || !matchMedia('(pointer:fine)').matches) return;
  document.addEventListener('pointermove', e => {
    $$('.mag').forEach(m => {
      const r = m.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      m.style.transform = Math.hypot(dx, dy) < 90 ? `translate(${dx * .22}px,${dy * .22}px)` : '';
    });
  }, { passive: true });
  // luz que sigue al cursor dentro de cada fila
  $('list').addEventListener('pointermove', e => {
    const row = e.target.closest('.tr'); if (!row) return;
    row.style.setProperty('--mxp', (e.clientX - row.getBoundingClientRect().left) + 'px');
  });
}

// --- Apple Music: el color de la portada tiñe la app ---
export function tintFrom(vid, index) {
  const fallback = HUES[index % HUES.length];
  const set = c => document.documentElement.style.setProperty('--hue', c);
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = 24; c.height = 14;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 14);
      const d = x.getImageData(0, 0, 24, 14).data;
      let best = null, score = -1;
      for (let k = 0; k < d.length; k += 4) {
        const r = d[k], g = d[k + 1], b = d[k + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const s = (mx ? (mx - mn) / mx : 0) * (mx / 255);
        if (s > score && mx > 60) { score = s; best = [r, g, b]; }
      }
      set(best && score > .18 ? `rgb(${best.join(',')})` : fallback);
    } catch { set(fallback); }
  };
  img.onerror = () => set(fallback);
  img.src = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
}

// --- SoundCloud: onda única por canción ---
export function buildWave(seed) {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296;
  const n = 72, html = [];
  for (let i = 0; i < n; i++) {
    const env = Math.sin(Math.PI * (i + .5) / n) * .55 + .45;
    html.push(`<b style="height:${Math.round((18 + rnd() * 82) * env)}%"></b>`);
  }
  $('wv0').innerHTML = html.join(''); $('wv1').innerHTML = html.join('');
  $('seek').style.setProperty('--ww', $('seek').clientWidth + 'px');
}

// --- intro animada ---
export function splash() {
  document.body.classList.add('booting');
  const s = $('splash');
  const hide = () => { s.classList.add('out'); document.body.classList.remove('booting'); setTimeout(() => s.remove(), 700); };
  if (REDUCED_MOTION) { s.remove(); document.body.classList.remove('booting'); return; }
  setTimeout(hide, 1500);
  s.addEventListener('click', hide, { once: true });
}
