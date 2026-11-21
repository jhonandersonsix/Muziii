// Muzi · lógica de reproducción: qué suena, qué sigue, mezcla automática.

import { state, update, current, byId, score } from './store.js';
import * as decks from '../services/decks.js';
import { toast, burst } from '../ui/effects.js';

// Orden aleatorio decidido de antemano: así "Sigue en la cola" muestra lo que de verdad va a sonar.
let bag = [];

const playable = t => !t.blocked;
const pendingTracks = () => state.tracks.filter(t => t.id !== state.cur && !state.played.has(t.id) && playable(t));

function shuffleBag() {
  const pending = pendingTracks();
  const ids = new Set(pending.map(t => t.id));
  bag = bag.filter(id => ids.has(id));
  // las canciones nuevas entran en un lugar al azar
  pending.forEach(t => { if (!bag.includes(t.id)) bag.splice(Math.floor(Math.random() * (bag.length + 1)), 0, t.id); });
  return bag.map(byId);
}

/** Las próximas canciones, en el orden real en que van a sonar. */
export function upcoming(limit = Infinity) {
  const q = state.tracks;
  if (!q.length) return [];
  let list;
  if (state.voteMode) {
    list = pendingTracks().sort((a, b) => score(b) - score(a));
  } else if (state.shuffle) {
    list = shuffleBag();
  } else {
    const idx = q.findIndex(t => t.id === state.cur);
    list = q.slice(idx + 1).filter(t => !state.played.has(t.id) && playable(t));
  }
  if (!list.length && state.repeat) {
    // vuelta nueva: todas menos la que suena (si es la única, se repite ella)
    const again = q.filter(t => t.id !== state.cur && playable(t));
    list = again.length ? again : q.filter(playable);
    if (state.voteMode) list.sort((a, b) => score(b) - score(a));
  }
  return list.slice(0, limit);
}

/** Siguiente canción según el modo (votos, aleatorio u orden de la cola). */
export const pickNext = () => upcoming(1)[0] || null;

export function play(id, fade = state.fade, { back = false } = {}) {
  const t = byId(id); if (!t) return;
  state.started = true;
  state.ended = false;
  t.blocked = false;               // si la eliges a mano, se vuelve a intentar
  state.played.delete(t.id);
  if (state.cur && state.cur !== t.id) {
    if (!back) { state.played.add(state.cur); state.history.push(state.cur); }
  }
  // vuelta completa con "repetir": empieza de nuevo
  if (state.repeat && state.tracks.every(x => state.played.has(x.id) || x.id === t.id || x.blocked)) state.played.clear();
  state.cur = t.id;
  bag = bag.filter(x => x !== t.id);
  decks.load(t.vid, fade, state.vol);
  document.getElementById('idle').hidden = true;
  update();
  burst(14);
}

export function advance(fade = state.fade) {
  const next = pickNext();
  if (next) { play(next.id, fade); return; }
  setPlaying(false);
  if (state.cur) { state.played.add(state.cur); state.history.push(state.cur); }
  state.ended = true;
  update();
  const anyPlayable = state.tracks.some(playable);
  toast(anyPlayable ? 'Se acabó la cola. Agrega más canciones 🎶' : 'Ninguna canción de la cola se puede reproducir aquí. Prueba con otros links 🎧');
}

export function previous() {
  if (decks.time() > 5) { decks.seekTo(0); return; }
  while (state.history.length) {
    const id = state.history.pop();
    if (byId(id) && id !== state.cur) { if (state.cur) bag.unshift(state.cur); play(id, Math.min(2, state.fade), { back: true }); return; }
  }
  const q = state.tracks, i = q.findIndex(t => t.id === state.cur);
  if (i > 0) play(q[i - 1].id, Math.min(2, state.fade), { back: true });
  else decks.seekTo(0);
}

/** Empieza desde el principio (o al azar) cuando no hay nada sonando. */
function startFresh() {
  state.played.clear();
  const list = state.tracks.filter(playable);
  if (!list.length) { toast('Ninguna canción de la cola se puede reproducir aquí. Prueba con otros links 🎧'); return; }
  const first = state.voteMode ? [...list].sort((a, b) => score(b) - score(a))[0]
    : state.shuffle ? list[Math.floor(Math.random() * list.length)] : list[0];
  play(first.id, 0);
}

export function toggle() {
  if (!state.tracks.length) { toast('Primero agrega una canción 🎧'); document.getElementById('url').focus(); return; }
  if (state.ended) {
    const next = pickNext();
    if (next) play(next.id, 0); else startFresh();
    return;
  }
  if (!state.cur || !byId(state.cur)) { startFresh(); return; }
  if (!decks.hasVideo()) { play(state.cur, 0, { back: true }); return; }   // tras recargar la página
  if (state.playing) { decks.pause(); setPlaying(false); }
  else { decks.play(); setPlaying(true); }
}

/** Canciones que acaban de entrar: si la música se había detenido por fin de cola, arranca sola. */
export function onAdded(tracks) {
  if (!tracks.length || state.playing || !state.started) return;
  if (state.ended || !state.cur) play((tracks.find(playable) || tracks[0]).id, 0);
}

export const mixNow = () => { if (state.cur) advance(state.fade); };

export function setPlaying(on) {
  if (state.playing === on) return;
  state.playing = on;
  update();
}

let errorRun = 0;   // errores seguidos: corta el bucle si nada se puede reproducir

export function init() {
  decks.on('playing', p => {
    errorRun = 0;
    setPlaying(true);
    const t = current(); if (!t) return;
    const d = p.getDuration();
    if (d && t.dur !== d) t.dur = d;
    const data = p.getVideoData && p.getVideoData();
    if (data && data.title && !t.title) { t.title = data.title; t.ch = data.author || ''; }
    update();
  });
  decks.on('paused', () => setPlaying(false));
  decks.on('ended', () => advance(0));
  decks.on('error', code => {
    const t = current();
    if (t) t.blocked = true;
    errorRun++;
    const next = pickNext();
    if (!next || errorRun > state.tracks.length) {
      errorRun = 0;
      setPlaying(false);
      state.ended = true;
      update();
      toast('Ninguna canción de la cola se puede reproducir aquí. Prueba con otros links 🎧');
      return;
    }
    toast((code === 101 || code === 150)
      ? `«${t?.title || 'Este video'}» no permite sonar fuera de YouTube. Paso a la siguiente.`
      : 'Ese video no está disponible. Paso a la siguiente.');
    setTimeout(() => advance(0), 600);
  });
  decks.init();

  // Mezcla automática: cuando falta lo que dura la mezcla, entra la siguiente.
  setInterval(() => {
    if (!state.playing || decks.isMixing() || state.fade <= 0) return;
    const d = decks.duration(), c = decks.time();
    const f = Math.min(state.fade, d / 3);
    if (d > 0 && d - c <= f && d - c > 0.3) {
      const n = pickNext();
      if (n && n.id !== state.cur) advance(f);
    }
  }, 250);
}
