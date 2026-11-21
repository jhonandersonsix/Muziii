// Muzi · estado único de la app. Los módulos leen `state` y llaman a `update()` cuando cambian algo;
// todos los que se suscribieron se vuelven a pintar una sola vez por cuadro.

import { STORAGE_KEY, DEFAULT_FADE, DEFAULT_VOLUME } from './config.js';
import { storage } from './utils.js';

export const state = {
  tracks: [],            // [{ id, vid, who, uid, title, ch, dur, liked, votes, voters, blocked }]
  cur: null,             // id de la canción que suena
  played: new Set(),     // ids que ya sonaron
  shuffle: false,
  repeat: true,
  fade: DEFAULT_FADE,    // segundos de mezcla
  vol: DEFAULT_VOLUME,
  filter: 'all',         // all | next | liked | done
  voteMode: false,       // las más votadas suenan primero (independiente del filtro)
  history: [],           // ids en el orden en que sonaron (para "Anterior")
  ended: false,          // la cola terminó (sin repetir)
  query: '',
  playing: false,
  started: false
};

const listeners = new Set();
let queued = false;

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Avisa a la interfaz y guarda. Se agrupa en un cuadro para no pintar de más. */
export function update() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    listeners.forEach(fn => fn(state));
    persist();
  });
}

/** Votos totales: los de la compu del profe + uno por alumno de la sala. */
export const score = t => (t.votes || 0) + (t.voters ? t.voters.length : 0);

export const current = () => state.tracks.find(t => t.id === state.cur) || null;
export const byId = id => state.tracks.find(t => t.id === id) || null;

let seq = Date.now();
export function makeTrack(vid, who = '') {
  return { id: 't' + (seq++).toString(36), vid, who: who.slice(0, 30), title: '', ch: '', dur: 0, liked: false, votes: 0 };
}

/** Agrega canciones nuevas (sin repetir) y devuelve las que entraron. */
export function addTracks(vids, who) {
  const added = [];
  for (const vid of vids) {
    if (state.tracks.some(t => t.vid === vid)) continue;
    const t = makeTrack(vid, who);
    state.tracks.push(t);
    added.push(t);
  }
  if (added.length) update();
  return added;
}

/** Lista visible según filtro y búsqueda. */
export function visibleTracks() {
  const q = state.query;
  const list = state.tracks.filter(t => {
    if (q && !(`${t.title} ${t.ch} ${t.who}`.toLowerCase().includes(q))) return false;
    switch (state.filter) {
      case 'next': return t.id !== state.cur && !state.played.has(t.id);
      case 'liked': return t.liked;
      case 'done': return state.played.has(t.id);
      default: return true;
    }
  });
  if (state.voteMode) {
    // la que suena arriba, luego las pendientes por votos, al final las que ya sonaron
    const rank = t => t.id === state.cur ? 0 : state.played.has(t.id) ? 2 : 1;
    list.sort((a, b) => rank(a) - rank(b) || (rank(a) === 1 ? score(b) - score(a) : 0));
  }
  return list;
}

function persist() {
  storage.set(STORAGE_KEY, {
    tracks: state.tracks, fade: state.fade, vol: state.vol, shuffle: state.shuffle, repeat: state.repeat,
    voteMode: state.voteMode, cur: state.cur, played: [...state.played]
  });
}

export function restore() {
  const d = storage.get(STORAGE_KEY);
  if (!d) return;
  state.tracks = (d.tracks || []).filter(t => /^[\w-]{11}$/.test(t.vid)).map(t => ({ votes: 0, liked: false, ...t }));
  state.fade = d.fade ?? DEFAULT_FADE;
  state.vol = d.vol ?? DEFAULT_VOLUME;
  state.shuffle = !!d.shuffle;
  state.repeat = d.repeat !== false;
  state.voteMode = !!d.voteMode;
  if (d.cur && state.tracks.some(t => t.id === d.cur)) state.cur = d.cur;
  (d.played || []).forEach(id => { if (state.tracks.some(t => t.id === id)) state.played.add(id); });
}

/** Lista compartida por link: #lista=ID~Nombre,ID~Nombre */
export function importFromHash() {
  const m = location.hash.match(/lista=([^&]+)/);
  if (!m) return 0;
  let added = 0;
  decodeURIComponent(m[1]).split(',').forEach(part => {
    const [vid, who = ''] = part.split('~');
    if (/^[\w-]{11}$/.test(vid) && !state.tracks.some(t => t.vid === vid)) { state.tracks.push(makeTrack(vid, who)); added++; }
  });
  history.replaceState(null, '', location.pathname + location.search);
  return added;
}

export function shareLink() {
  const enc = state.tracks.map(t => t.vid + (t.who ? '~' + t.who.replace(/[,~]/g, ' ') : '')).join(',');
  return location.origin + location.pathname + '#lista=' + encodeURIComponent(enc);
}
