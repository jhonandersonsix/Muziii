// Muzi · la cola: filas tipo Spotify con votos (Jam), me gusta, quitar y arrastrar para reordenar.

import { $, esc, fmt, thumb, REDUCED_MOTION } from '../core/utils.js';
import { state, update, visibleTracks, byId, score } from '../core/store.js';
import { play } from '../core/player.js';
import { ensureMeta } from '../services/meta.js';
import { toast, burst } from './effects.js';

const VOTE_GAP = 2000;           // ms entre votos a la misma canción
const voteAt = new Map();
const TOUCH = () => matchMedia('(hover:none)').matches;
let lastDrag = 0;   // para que soltar un arrastre no cuente como toque

/** Mueve la canción `fromId` al lugar de `toId`. */
function moveTrack(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return false;
  const from = state.tracks.findIndex(t => t.id === fromId);
  const [moved] = state.tracks.splice(from, 1);
  state.tracks.splice(state.tracks.findIndex(t => t.id === toId), 0, moved);
  update(); toast('Cola reordenada');
  return true;
}

/** Arrastrar con el dedo: mantén presionada una fila medio segundo y muévela. */
function initTouchDrag(list) {
  let timer = null, row = null, startY = 0, active = false, over = null;
  const cancel = () => { clearTimeout(timer); timer = null; };
  const finish = () => {
    cancel();
    if (active && row) {
      lastDrag = Date.now();
      row.classList.remove('lift'); row.style.transform = '';
      list.querySelectorAll('.tr.over').forEach(x => x.classList.remove('over'));
      if (over) moveTrack(row.dataset.id, over.dataset.id);
    }
    active = false; row = null; over = null;
  };
  list.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || e.target.closest('button')) return;
    row = e.target.closest('.tr'); if (!row) return;
    startY = e.clientY;
    timer = setTimeout(() => {
      active = true; row.classList.add('lift');
      if (navigator.vibrate) navigator.vibrate(15);
    }, 450);
  });
  list.addEventListener('pointermove', e => {
    if (!row || e.pointerType !== 'touch') return;
    if (!active) { if (Math.abs(e.clientY - startY) > 8) cancel(); return; }
    row.style.transform = `translateY(${e.clientY - startY}px)`;
    row.style.pointerEvents = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tr');
    row.style.pointerEvents = '';
    if (under !== over) { over?.classList.remove('over'); over = under && under !== row ? under : null; over?.classList.add('over'); }
  });
  // mientras arrastras, la página no se desplaza
  list.addEventListener('touchmove', e => { if (active) e.preventDefault(); }, { passive: false });
  list.addEventListener('pointerup', finish);
  list.addEventListener('pointercancel', () => { if (!active) finish(); });
  list.addEventListener('touchend', finish);
  list.addEventListener('contextmenu', e => { if (row) e.preventDefault(); });
}

const ICON = {
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2 0 3.4 1.1 4.3 2.4.9-1.3 2.3-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

function rowInner(t) {
  const n = state.tracks.indexOf(t) + 1;
  const sc = score(t);
  const live = t.voters && t.voters.length ? ` title="${t.voters.length} desde la sala"` : '';
  return `
    <span class="n"><span class="num">${n}</span><span class="eqb"><i></i><i></i><i></i></span><button class="pl" type="button" data-act="play" aria-label="Reproducir">${ICON.play}</button></span>
    <span class="song"><img loading="lazy" alt="" src="${thumb(t.vid)}"><span style="min-width:0"><p class="tt">${esc(t.title || 'Cargando título…')}</p><p class="ch">${t.blocked ? '⚠ No se pudo reproducir aquí' : esc(t.ch || 'YouTube')}</p></span></span>
    <span class="who">${t.who ? `La puso <b>${esc(t.who)}</b>` : 'La clase'}</span>
    <span class="likes"><button class="vote${sc ? ' on' : ''}" type="button" data-act="vote" aria-label="Votar para que suene antes"${live}>🔥<b>${sc}</b></button><button class="heart${t.liked ? ' on' : ''}" type="button" data-act="like" aria-label="Me gusta" aria-pressed="${t.liked}">${ICON.heart}</button></span>
    <span class="dur">${t.dur ? fmt(t.dur) : '—'}</span>
    <button class="del" type="button" data-act="del" aria-label="Quitar de la cola">${ICON.x}</button>`;
}

// Filas que ya están en pantalla: se reutilizan para que nada parpadee y los cambios de lugar se animen.
const rows = new Map();   // id -> { el, sig, score }

function placeRows(list, v) {
  const before = new Map();
  if (!REDUCED_MOTION) rows.forEach((r, id) => { if (r.el.isConnected) before.set(id, r.el.getBoundingClientRect().top); });
  const seen = new Set();
  let prev = null;
  v.forEach((t, k) => {
    seen.add(t.id);
    const sig = [state.tracks.indexOf(t), t.id === state.cur, t.title, t.ch, t.who, score(t), t.liked, t.dur, t.blocked, (t.voters || []).length].join('|');
    let r = rows.get(t.id);
    const cls = 'tr' + (t.id === state.cur ? ' cur' : '') + (t.uid ? ' fromroom' : '');
    if (!r) {
      const el = document.createElement('div');
      el.className = cls + (state.started || rows.size ? ' enter' : '');
      el.draggable = true; el.dataset.id = t.id;
      el.style.animationDelay = rows.size ? '0ms' : Math.min(k, 12) * 30 + 'ms';
      el.innerHTML = rowInner(t);
      r = { el, sig, score: score(t) };
      rows.set(t.id, r);
    } else if (r.sig !== sig) {
      r.el.className = cls + ['lift', 'enter', 'drag'].filter(c => r.el.classList.contains(c)).map(c => ' ' + c).join('');
      r.el.innerHTML = rowInner(t);
      r.sig = sig;
      const s = score(t);
      if (s > r.score && !REDUCED_MOTION) r.el.querySelector('.vote')?.classList.add('bump');
      r.score = s;
    }
    const want = prev ? prev.nextSibling : list.firstChild;
    if (want !== r.el) list.insertBefore(r.el, want);
    prev = r.el;
  });
  rows.forEach((r, id) => { if (!seen.has(id)) { r.el.remove(); rows.delete(id); } });
  // FLIP: cada fila que cambió de lugar se desliza desde donde estaba
  if (!REDUCED_MOTION) before.forEach((top, id) => {
    const r = rows.get(id); if (!r) return;
    const dy = top - r.el.getBoundingClientRect().top;
    if (Math.abs(dy) > 2) r.el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.9,.25,1)' });
  });
}

const EMPTY_BY_FILTER = {
  next: 'No queda nada por sonar',
  liked: 'Todavía no hay canciones con me gusta',
  done: 'Todavía no ha sonado ninguna'
};

export function renderList() {
  const v = visibleTracks();
  const empty = $('empty');
  if (!state.tracks.length) {
    empty.innerHTML = '<b>La cola está vacía</b>Pega el primer link de YouTube y abre la sesión 🎧';
  } else if (!v.length) {
    empty.innerHTML = state.query
      ? `<b>Nada coincide con «${esc(state.query)}»</b><small>Prueba con otra palabra o borra la búsqueda.</small>`
      : `<b>${EMPTY_BY_FILTER[state.filter] || 'No hay canciones aquí'}</b><small>Toca «Todas» para ver la cola completa.</small>`;
  }
  empty.hidden = v.length > 0;
  $('list-anchor').hidden = !v.length;
  placeRows($('list'), v);
  state.tracks.forEach(ensureMeta);
}

export function initList() {
  const list = $('list');

  list.addEventListener('click', e => {
    const r = e.target.closest('.tr'); if (!r) return;
    const t = byId(r.dataset.id); if (!t) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'vote') {
      const now = Date.now();
      if (now - (voteAt.get(t.id) || 0) < VOTE_GAP) { toast('Un voto a la vez 😉 Espera un momento'); return; }
      voteAt.set(t.id, now);
      t.votes = (t.votes || 0) + 1; update(); burst(10, e.clientX, e.clientY); return;
    }
    if (act === 'like') { t.liked = !t.liked; update(); if (t.liked) burst(8, e.clientX, e.clientY); return; }
    if (act === 'del') {
      if (t.id === state.cur) { toast('Esa está sonando. Pasa a la siguiente y luego quítala.'); return; }
      const at = state.tracks.indexOf(t), wasPlayed = state.played.has(t.id);
      state.tracks = state.tracks.filter(x => x !== t); state.played.delete(t.id); update();
      toast('Quitada de la cola', { action: { label: 'Deshacer', fn: () => {
        if (state.tracks.includes(t)) return;
        state.tracks.splice(Math.min(at, state.tracks.length), 0, t);
        if (wasPlayed) state.played.add(t.id);
        update();
      } } });
      return;
    }
    if (act === 'play') { play(t.id, state.cur ? state.fade : 0); return; }
    // en pantallas táctiles no hay "pasar el mouse": tocar la fila la reproduce
    if (!act && TOUCH() && Date.now() - lastDrag > 400 && !e.target.closest('button') && t.id !== state.cur) play(t.id, state.cur ? state.fade : 0);
  });
  list.addEventListener('dblclick', e => {
    const r = e.target.closest('.tr');
    if (r && !e.target.closest('button')) play(r.dataset.id, state.cur ? state.fade : 0);
  });

  initTouchDrag(list);

  // arrastrar para reordenar (mouse)
  let dragId = null;
  list.addEventListener('dragstart', e => { const r = e.target.closest('.tr'); if (!r) return; dragId = r.dataset.id; r.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
  list.addEventListener('dragend', () => { dragId = null; list.querySelectorAll('.tr').forEach(r => r.classList.remove('drag', 'over')); });
  list.addEventListener('dragover', e => {
    e.preventDefault(); const r = e.target.closest('.tr');
    list.querySelectorAll('.tr.over').forEach(x => x !== r && x.classList.remove('over')); r?.classList.add('over');
  });
  list.addEventListener('drop', e => {
    e.preventDefault(); const r = e.target.closest('.tr');
    if (r) moveTrack(dragId, r.dataset.id);
  });
}
