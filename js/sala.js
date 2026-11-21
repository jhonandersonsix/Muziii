// Muzi · sala en vivo, lado del alumno (sala.html). Se abre desde el QR del profe.
// El alumno pide canciones, vota (un voto por canción) y manda reacciones. La compu del profe decide.

import { $, esc, thumb, storage, REDUCED_MOTION } from './core/utils.js';
import { REACTIONS, WHO_KEY } from './core/config.js';
import { connect, isLive } from './services/transport.js';
import { parseLinks } from './services/parser.js';
import { mountLogos } from './ui/logo.js';

let T = null, code = null, name = storage.get(WHO_KEY, '') || '', st = null;
const pending = new Map();      // mid -> timeout (pedidos esperando respuesta del profe)
const myVotes = new Set();      // votos enviados que aún no se reflejan

/* ---------- ayudas de pantalla ---------- */
function show(id) { ['join', 'live', 'closed'].forEach(s => { $(s).hidden = s !== id; }); $('reactbar').hidden = id !== 'live'; }

let toastT = null;
function toast(text, ok = true) {
  const t = $('toast');
  t.textContent = text; t.className = 'toast ' + (ok ? 'ok' : 'no'); t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200);
}

function fly(emoji, x) {
  if (REDUCED_MOTION) return;
  const el = document.createElement('span');
  el.className = 'fly'; el.textContent = emoji;
  el.style.left = x + 'px';
  el.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
  $('fx').appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* nada */ } };
const fmtCode = c => String(c || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 4);

/* ---------- ahora suena ---------- */
let npId = null;
function renderNow() {
  const n = st?.np;
  document.body.classList.toggle('playing', !!(st?.playing && n));
  if (!n) {
    $('npT').textContent = 'Muzi está en silencio'; $('npB').textContent = 'El profe todavía no da play';
    $('art').style.backgroundImage = ''; npId = null; return;
  }
  if (n.id !== npId) {
    npId = n.id;
    $('art').style.backgroundImage = `url(${thumb(n.vid, 'hqdefault')})`;
    ['npT', 'npB', 'art'].forEach(id => { const el = $(id); el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
    if (n.uid === T.uid) { toast('¡Está sonando tu canción! 🎉'); burstAt(innerWidth / 2, 160, 10); vibrate([30, 40, 30]); }
  }
  $('npT').textContent = n.title || 'Cargando título…';
  $('npB').innerHTML = n.uid === T.uid ? 'La pusiste <b>tú</b> 🎧' : `La puso <b>${esc(n.who || 'la clase')}</b>`;
  $('npK').textContent = st.playing ? '// ahora suena' : '// en pausa';
}

// barra de avance: el profe manda la posición cada pocos segundos y aquí se completa suave
function tick() {
  const n = st?.np;
  if (n && n.dur) {
    const pos = n.pos + (st.playing ? (Date.now() - n.at) / 1000 : 0);
    $('npBar').style.width = Math.min(100, pos / n.dur * 100) + '%';
  } else $('npBar').style.width = '0%';
  requestAnimationFrame(tick);
}

/* ---------- la cola (con animación cuando cambia el orden) ---------- */
const rows = new Map();
function renderQueue() {
  const q = st?.queue || [];
  const list = $('list');
  $('empty').hidden = q.length > 0;
  $('qmode').textContent = st?.voteMode ? '🔥 las más votadas suenan primero' : 'en orden de llegada';
  const before = new Map();
  if (!REDUCED_MOTION) rows.forEach((r, id) => before.set(id, r.el.getBoundingClientRect().top));
  const seen = new Set();
  let prev = null;
  q.forEach((t, i) => {
    seen.add(t.id);
    const voted = t.voters?.includes(T.uid);
    if (voted) myVotes.delete(t.id);
    const mine = t.uid === T.uid;
    const sig = [i, t.title, t.who, t.score, voted, mine].join('|');
    let r = rows.get(t.id);
    if (!r) {
      const el = document.createElement('div');
      el.className = 'it' + (rows.size || prev ? ' enter' : '');
      el.dataset.id = t.id;
      r = { el, sig: '', score: t.score };
      rows.set(t.id, r);
    }
    if (r.sig !== sig) {
      r.el.classList.toggle('mine', mine);
      r.el.innerHTML = `
        <span class="pos">${i + 1}</span>
        <img alt="" loading="lazy" src="${thumb(t.vid)}">
        <span class="tx"><b>${esc(t.title || 'Cargando título…')}</b><span>${mine ? '<i class="you">tú</i>' : 'La puso ' + esc(t.who || 'la clase')}</span></span>
        <button class="vote${voted ? ' on' : ''}" type="button" aria-pressed="${!!voted}" aria-label="${voted ? 'Quitar mi voto' : 'Votar para que suene antes'}">🔥<b>${t.score || 0}</b></button>`;
      if (t.score > r.score && !REDUCED_MOTION) r.el.querySelector('.vote').classList.add('bump');
      r.score = t.score; r.sig = sig;
    }
    const want = prev ? prev.nextSibling : list.firstChild;
    if (want !== r.el) list.insertBefore(r.el, want);
    prev = r.el;
  });
  rows.forEach((r, id) => { if (!seen.has(id)) { r.el.remove(); rows.delete(id); } });
  if (!REDUCED_MOTION) before.forEach((top, id) => {
    const r = rows.get(id); if (!r) return;
    const dy = top - r.el.getBoundingClientRect().top;
    if (Math.abs(dy) > 2) r.el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.9,.25,1)' });
  });
}

function onState(s) {
  if (!s || !s.open) {
    st = null;
    if (code) { show('closed'); $('code').hidden = true; $('people').hidden = true; }
    return;
  }
  st = s;
  if (!name) { askName(); return; }
  show('live');
  $('peopleN').textContent = s.people || 1; $('people').hidden = false;
  renderNow(); renderQueue();
}

/* ---------- acciones del alumno ---------- */
async function onAdd(e) {
  e.preventDefault();
  const { vids, lists } = parseLinks($('url').value);
  if (!vids.length) {
    toast(lists.length ? 'Aquí va una sola canción, no una playlist 😉' : 'Ese link no parece de YouTube. Cópialo desde Compartir.', false);
    $('addForm').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 320 });
    return;
  }
  const mid = Math.random().toString(36).slice(2, 10);
  const b = $('addBtn'); b.disabled = true; b.classList.add('wait');
  pending.set(mid, setTimeout(() => { pending.delete(mid); b.disabled = false; b.classList.remove('wait'); toast('El profe no respondió. ¿Sigue abierta la sala?', false); }, 9000));
  try { await T.send(code, { type: 'add', vid: vids[0], name, mid }); }
  catch { toast('No se pudo enviar. Revisa tu internet.', false); b.disabled = false; b.classList.remove('wait'); }
}

function onAck(a) {
  const tm = pending.get(a.mid);
  if (a.mid && tm) { clearTimeout(tm); pending.delete(a.mid); }
  const b = $('addBtn'); b.disabled = false; b.classList.remove('wait');
  toast(a.text, a.ok);
  if (a.ok) { $('url').value = ''; vibrate(25); burstAt(b.getBoundingClientRect().left + 30, b.getBoundingClientRect().top, 14); }
}

function onVote(e) {
  const btn = e.target.closest('.vote'); if (!btn) return;
  const id = btn.closest('.it').dataset.id;
  const on = !btn.classList.contains('on');
  // respuesta inmediata en pantalla; el profe confirma en menos de un segundo
  btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on);
  const b = btn.querySelector('b'); b.textContent = Math.max(0, (+b.textContent || 0) + (on ? 1 : -1));
  if (on) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); const r = btn.getBoundingClientRect(); fly('🔥', r.left + r.width / 2); vibrate(15); }
  T.send(code, { type: 'vote', id, name });
}

let lastReact = 0;
function onReact(e) {
  const btn = e.target.closest('button'); if (!btn) return;
  const now = Date.now();
  const r = btn.getBoundingClientRect();
  fly(btn.dataset.e, r.left + r.width / 2);
  btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
  if (now - lastReact < 550) return;   // el profe tampoco acepta más rápido
  lastReact = now;
  vibrate(10);
  T.send(code, { type: 'react', emoji: btn.dataset.e, name });
}

function burstAt(x, y, n) {
  if (REDUCED_MOTION) return;
  const colors = ['#FF3D8B', '#FF8A3D', '#FFD23F', '#3DF2B0', '#4D7CFF', '#A78BFA'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'bit';
    p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % 6]};--x:${(Math.random() - .5) * 220}px;--y:${-60 - Math.random() * 160}px;--r:${Math.random() * 540}deg`;
    $('fx').appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

/* ---------- entrar ---------- */
function askName() {
  show('join');
  $('codeField').hidden = !!code;
  $('joinTitle').textContent = code ? `Entra a la sala ${code}` : 'Entra a la sala';
  $('nameIn').value = name;
  setTimeout(() => (code ? $('nameIn') : $('codeIn')).focus(), 50);
}

let unsub = [];
async function enter() {
  unsub.forEach(f => { try { typeof f === 'function' && f(); } catch { /* nada */ } }); unsub = [];
  $('code').textContent = code; $('code').hidden = false;
  history.replaceState(null, '', '?sala=' + code);
  unsub.push(T.onState(code, onState));
  unsub.push(T.onAck(code, onAck));
  if (name) { T.join(code, { name }); T.send(code, { type: 'hello', name }); }
}

async function start() {
  $('reactbar').innerHTML = REACTIONS.map(e => `<button type="button" data-e="${e}" aria-label="Reaccionar ${e}">${e}</button>`).join('');
  $('reactbar').addEventListener('click', onReact);
  $('list').addEventListener('click', onVote);
  $('addForm').addEventListener('submit', onAdd);
  $('otherCode').onclick = () => { code = null; askName(); };
  $('codeIn').addEventListener('input', e => { e.target.value = fmtCode(e.target.value); });
  $('joinForm').addEventListener('submit', e => {
    e.preventDefault();
    const c = code || fmtCode($('codeIn').value);
    const n = $('nameIn').value.trim().slice(0, 30);
    if (c.length !== 4) { $('joinNote').textContent = 'El código tiene 4 letras o números.'; return; }
    if (!n) { $('joinNote').textContent = 'Escribe tu nombre para que sepan quién la puso.'; return; }
    name = n; storage.set(WHO_KEY, n);
    const same = c === code; code = c;
    $('joinNote').textContent = '';
    if (same && st) { T.join(code, { name }); T.send(code, { type: 'hello', name }); onState(st); } else enter();
  });

  if (!isLive()) $('joinNote').textContent = 'Modo prueba: solo funciona en esta misma compu.';
  code = fmtCode(new URLSearchParams(location.search).get('sala')) || null;
  if (code && code.length !== 4) code = null;
  try { T = await connect(); }
  catch { show('closed'); $('closedTx').textContent = 'No me pude conectar. Revisa tu internet y vuelve a abrir el link.'; return; }
  requestAnimationFrame(tick);
  if (!code || !name) { askName(); if (code) enter(); return; }
  enter();
}

start();

// Logo vivo: las "i" bailan cuando el profe tiene música sonando; tocarlo lanza confeti.
mountLogos({ isPlaying: () => document.body.classList.contains('playing'), onBurst: (n, x, y) => burstAt(x, y, Math.min(n, 18)) });
