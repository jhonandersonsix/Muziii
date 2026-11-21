// Muzi · logo "MUZiii" vivo (línea gráfica V1).
//
// Se dibuja en SVG para animar cada pieza por separado:
//   · M, U, Z → flotan, cabecean con el ritmo, saltan al pasar el mouse y suenan como xilófono al tocarlas.
//   · las tres "i" (amarilla, rosa, blanca) → son un ecualizador: bailan con la música y respiran en pausa.
//   · la sombra 3D (extrusión azul marino) gira hacia el lado contrario del mouse o según cómo inclines el celular.
//   · clic en el logo → ola de saltos + confeti.
//
// Uso: <span data-logo></span> y luego mountLogos({ isPlaying, onBurst }).
// Atributos: data-logo-intro (las piezas caen al cargar) · data-logo-quiet (sin sonido).
// Color de la extrusión: variable CSS --mzl-ink (por defecto azul marino).

const NS = 'http://www.w3.org/2000/svg';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const C = { teal: '#1FC8A6', white: '#FFFFFF', volt: '#FFD23F', pop: '#EE3F8E' };
const VIEW = '405 105 820 390';
const STEPS = 11;                  // capas de la extrusión
const DEPTH = { x: 2.3, y: 2.4 };  // desplazamiento por capa en reposo
const BASE = 432;                  // línea base de las "i"

const LETTERS = [
  { k: 'M', fill: C.teal, rot: -2, px: 545, py: 440, note: 261.63,
    d: 'M430 172 L512 168 L548 296 L586 164 L664 168 L662 442 L600 442 L603 300 L567 412 L529 412 L492 300 L491 444 L432 442 Z' },
  { k: 'U', fill: C.white, rot: 2, px: 750, py: 446, note: 329.63,
    d: 'M668 140 L744 138 L743 356 Q743 384 757 384 Q770 384 770 356 L770 138 L834 141 L831 360 Q829 450 750 450 Q666 450 667 362 Z' },
  { k: 'Z', fill: C.teal, rot: -1.5, px: 912, py: 442, note: 392.0,
    d: 'M836 200 L992 196 L992 262 L908 378 L994 376 L992 442 L832 444 L832 384 L916 266 L836 268 Z' },
];
const BARS = [
  { k: 'i1', fill: C.volt,  x: 994,  w: 52, h: 160, note: 523.25 },
  { k: 'i2', fill: C.pop,   x: 1060, w: 52, h: 214, note: 659.25 },
  { k: 'i3', fill: C.white, x: 1126, w: 52, h: 150, note: 783.99 },
];
const DOT_R = 27, DOT_GAP = 22;

let uid = 0;
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

// Una pieza = forma base (en <defs>) + capas de extrusión (<use>) + cara de color (<use>)
function piece(defs, shape, fill) {
  const id = 'mzl' + (++uid);
  shape.setAttribute('id', id);
  defs.append(shape);
  const g = el('g'), ext = [];
  for (let s = STEPS; s >= 1; s--) {
    const u = el('use', { href: '#' + id, class: 'mzl-ink' });
    u.dataset.s = s; ext.push(u); g.append(u);
  }
  const face = el('use', { href: '#' + id, fill, class: 'mzl-face' });
  g.append(face);
  return { g, ext, shape };
}

function build(host) {
  const svg = el('svg', { viewBox: VIEW, class: 'mzl-svg', 'aria-hidden': 'true', focusable: 'false' });
  const defs = el('defs');
  svg.append(defs);
  const parts = [];

  for (const L of LETTERS) {
    const p = piece(defs, el('path', { d: L.d }), L.fill);
    const wrap = el('g', { class: 'mzl-g', 'data-k': L.k });
    wrap.append(p.g); svg.append(wrap);
    parts.push({ ...L, type: 'letter', wrap, ext: p.ext, y: 0, vy: 0, r: 0, vr: 0, s: 0, vs: 0, phase: Math.random() * 6 });
  }
  for (const B of BARS) {
    const bar = piece(defs, el('rect', { x: B.x, y: BASE - B.h, width: B.w, height: B.h, rx: 12 }), B.fill);
    const dot = piece(defs, el('circle', { cx: B.x + B.w / 2, cy: BASE - B.h - DOT_GAP - DOT_R, r: DOT_R }), B.fill);
    const wrap = el('g', { class: 'mzl-g mzl-i', 'data-k': B.k });
    const dotWrap = el('g'); dotWrap.append(dot.g);
    wrap.append(bar.g, dotWrap); svg.append(wrap);
    parts.push({ ...B, type: 'bar', wrap, rect: bar.shape, dotWrap, ext: [...bar.ext, ...dot.ext],
      y: 0, vy: 0, r: 0, vr: 0, s: 0, vs: 0, lvl: 1, vl: 0, rot: 0, phase: Math.random() * 6, px: B.x + B.w / 2, py: BASE });
  }
  host.replaceChildren(svg);
  return { svg, parts };
}

// --- sonido (xilófono suave, solo al tocar) ---
let actx;
export function blip(freq, vol = 0.12) {
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime, o = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    o2.type = 'sine'; o2.frequency.value = freq * 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); o2.connect(g); g.connect(actx.destination);
    o.start(t); o2.start(t); o.stop(t + 0.5); o2.stop(t + 0.5);
  } catch { /* sin audio: no pasa nada */ }
}

// --- pulso compartido (todas las animaciones laten juntas) ---
export const beatClock = { beat: 0, playing: false, t: 0 };

function setExt(ext, dx, dy) {
  for (const u of ext) {
    const s = +u.dataset.s;
    u.setAttribute('x', (dx * s).toFixed(1));
    u.setAttribute('y', (dy * s).toFixed(1));
  }
}

function animate(host, { isPlaying, onBurst }) {
  const { svg, parts } = build(host);
  const quiet = host.hasAttribute('data-logo-quiet');
  host.classList.add('mzl');
  if (!host.hasAttribute('role')) { host.setAttribute('role', 'img'); host.setAttribute('aria-label', 'Muziii'); }

  const t0 = performance.now();
  if (host.hasAttribute('data-logo-intro') && !REDUCED) {
    parts.forEach((p, i) => { p.y = -700; p.r = (i % 2 ? 1 : -1) * 22; p.hold = 120 + i * 110; if (p.type === 'bar') p.lvl = 0; });
  }

  // inclinación: mouse o giroscopio
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / Math.max(innerWidth / 2, 1)));
    ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / Math.max(innerHeight / 2, 1)));
  }, { passive: true });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    tx = Math.max(-1, Math.min(1, e.gamma / 30)); ty = Math.max(-1, Math.min(1, (e.beta - 40) / 30));
  }, { passive: true });

  const kick = (p, power = 1, sound = false) => {
    p.vy -= 800 * power; p.vr += (Math.random() - .5) * 240 * power; p.vs += 9 * power;
    if (p.type === 'bar') p.vl += 8 * power;
    if (sound && !quiet) blip(p.note);
  };
  const partOf = target => parts.find(p => p.wrap.contains(target));
  svg.addEventListener('pointerover', e => { const p = partOf(e.target); if (p && e.pointerType === 'mouse') kick(p, .45); });
  svg.addEventListener('pointerdown', e => { const p = partOf(e.target); if (p) kick(p, 1, true); });
  host.addEventListener('click', e => {
    const now = performance.now();
    parts.forEach((p, i) => { p.waveAt = now + i * 65; });
    if (onBurst) { const r = host.getBoundingClientRect(); onBurst(30, r.left + r.width / 2, r.top + r.height / 2); }
    if (!quiet && e.detail === 0) blip(523.25);
  });

  let last = performance.now(), visible = true, raf = 0, lastOx = 0, lastOy = 0;
  const step = now => {
    raf = 0;
    const dt = Math.min(.034, (now - last) / 1000); last = now;
    const playing = isPlaying ? isPlaying() : true;
    const t = (now - t0) / 1000;
    const beat = beatClock.beat;

    cx += (tx - cx) * Math.min(1, dt * 6); cy += (ty - cy) * Math.min(1, dt * 6);
    svg.style.transform = `perspective(900px) rotateX(${(-cy * 9).toFixed(2)}deg) rotateY(${(cx * 13).toFixed(2)}deg)`;
    // la sombra va al lado contrario del mouse
    const ox = DEPTH.x - cx * 1.6, oy = DEPTH.y - cy * 1.6;
    const moved = Math.abs(ox - lastOx) > .03 || Math.abs(oy - lastOy) > .03;
    if (moved) { lastOx = ox; lastOy = oy; }

    parts.forEach((p, i) => {
      if (p.hold != null) { if (now - t0 < p.hold) { p.wrap.setAttribute('transform', 'translate(0 -900)'); return; } p.hold = null; }
      if (p.waveAt && now >= p.waveAt) { p.waveAt = 0; kick(p, .9); }

      p.vy += (-170 * p.y - 13 * p.vy) * dt; p.y += p.vy * dt;
      p.vr += (-170 * p.r - 13 * p.vr) * dt; p.r += p.vr * dt;
      p.vs += (-260 * p.s - 14 * p.vs) * dt; p.s += p.vs * dt;

      const float = Math.sin(t * 1.7 + p.phase) * (playing ? 4 : 2.5);
      const sway = Math.sin(t * 1.3 + p.phase) * (playing ? 1.4 : .7);
      const bob = p.type === 'letter' ? -beat * 9 : 0;
      const sq = Math.max(-.25, Math.min(.35, p.s * .12 + (p.type === 'letter' ? beat * .05 : 0)));
      const y = p.y + float + bob, r = p.rot + p.r + sway;
      p.wrap.setAttribute('transform',
        `translate(${p.px} ${(p.py + y).toFixed(1)}) rotate(${r.toFixed(2)}) scale(${(1 + sq * .5).toFixed(3)} ${(1 - sq * .6).toFixed(3)}) translate(${-p.px} ${-p.py})`);
      if (moved || p.fresh !== false) { setExt(p.ext, ox, oy); p.fresh = false; }

      if (p.type === 'bar') {
        const n1 = Math.sin(t * (2.1 + i * .7) + p.phase), n2 = Math.sin(t * (3.7 + i * 1.3) + p.phase * 2);
        const target = playing ? .88 + beat * (.32 + (i % 3) * .1) + n1 * .14 + n2 * .1 : 1 + Math.sin(t * 1.4 + i * 1.7) * .06;
        p.vl += ((target - p.lvl) * 120 - 11 * p.vl) * dt; p.lvl += p.vl * dt;
        const h = p.h * Math.max(.15, Math.min(1.5, p.lvl));
        p.rect.setAttribute('y', (BASE - h).toFixed(1)); p.rect.setAttribute('height', h.toFixed(1));
        p.dotWrap.setAttribute('transform', `translate(0 ${(p.h - h).toFixed(1)})`);
      }
    });
    if (visible && !document.hidden) raf = requestAnimationFrame(step);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(step); } };

  if (REDUCED) {
    parts.forEach(p => { setExt(p.ext, DEPTH.x, DEPTH.y); p.wrap.setAttribute('transform', `rotate(${p.rot} ${p.px} ${p.py})`); });
    return;
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; start(); }).observe(host);
  document.addEventListener('visibilitychange', start);
  start();
}

// Reloj de ritmo único: ~118 BPM cuando suena; lo leen el logo, los stickers y la interfaz (--beat).
let clockOn = false;
function startClock(isPlaying) {
  if (clockOn || REDUCED) return; clockOn = true;
  let last = performance.now(), acc = 0;
  const period = 60 / 118, root = document.documentElement;
  const tick = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const playing = isPlaying ? isPlaying() : false;
    acc += dt;
    if (playing && acc >= period) { acc %= period; beatClock.beat = 1; }
    beatClock.beat *= Math.pow(playing ? .02 : .15, dt);
    beatClock.playing = playing; beatClock.t = now / 1000;
    root.style.setProperty('--beat', beatClock.beat.toFixed(3));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function mountLogos(opts = {}) {
  startClock(opts.isPlaying);
  document.querySelectorAll('[data-logo]').forEach(h => { if (!h.__mzl) { h.__mzl = true; animate(h, opts); } });
}
