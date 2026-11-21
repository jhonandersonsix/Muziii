// Muzi · sala en vivo, lado del profe. La compu del profe manda: recibe pedidos, votos y reacciones
// de los alumnos, los aplica a la cola y publica lo que ven los celulares.

import { state, update, current, byId, score, subscribe, addTracks } from '../core/store.js';
import { upcoming, onAdded } from '../core/player.js';
import { MAX_PENDING_PER_STUDENT, REACTIONS, ROOM_KEY } from '../core/config.js';
import { storage } from '../core/utils.js';
import { connect, isLive } from './transport.js';
import * as decks from './decks.js';

const ID = /^[\w-]{11}$/;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin 0/O ni 1/I para que no se confundan

const handlers = { joined() {}, added() {}, voted() {}, react() {}, people() {}, change() {} };
export const on = (event, fn) => { handlers[event] = fn; };

let T = null, code = null, people = [], timer = null, beat = null, subscribed = false;
const lastReact = new Map();

export const roomCode = () => code;
export const roomPeople = () => people;
export const roomMode = () => (isLive() ? 'firebase' : 'local');

/** URL que abren los alumnos (la del QR). */
export function roomUrl(c = code) {
  const u = new URL('sala.html', location.href);
  u.search = '?sala=' + c; u.hash = '';
  return u.toString();
}

const newCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

/** Abre la sala (o recupera la que estaba abierta). Devuelve el código. */
export async function open(preferred = storage.get(ROOM_KEY)) {
  T = await connect();
  let c = preferred && /^[A-Z2-9]{4}$/.test(preferred) && (await T.claim(preferred)) ? preferred : null;
  for (let i = 0; !c && i < 12; i++) { const k = newCode(); if (await T.claim(k)) c = k; }
  if (!c) throw new Error('No pude crear la sala');
  code = c;
  storage.set(ROOM_KEY, code);
  T.onInbox(code, handle);
  T.onPeople(code, list => { people = list; handlers.people(list); schedule(); });
  if (!subscribed) { subscribe(schedule); subscribed = true; }
  clearInterval(beat); beat = setInterval(publish, 5000);   // mantiene al día la barra de avance de los celulares
  publish();
  handlers.change(code);
  return code;
}

export async function close() {
  if (!code) return;
  const c = code;
  code = null; people = [];
  clearInterval(beat); clearTimeout(timer);
  storage.set(ROOM_KEY, null);
  await T.setState(c, { open: false, ts: Date.now() });
  handlers.change(null);
}

/* ---------- publicar lo que ven los alumnos ---------- */
function schedule() {
  if (!code || timer) return;
  timer = setTimeout(() => { timer = null; publish(); }, 200);
}

const slim = t => ({ id: t.id, vid: t.vid, title: t.title || '', ch: t.ch || '', who: t.who || '', uid: t.uid || '', score: score(t), voters: t.voters || [] });

function publish() {
  if (!code || !T) return;
  const t = current();
  T.setState(code, {
    open: true,
    voteMode: !!state.voteMode,
    playing: !!state.playing,
    np: t ? { ...slim(t), dur: Math.round(decks.duration() || t.dur || 0), pos: Math.round((decks.time() || 0) * 10) / 10, at: Date.now() } : null,
    queue: upcoming(30).filter(x => x.id !== state.cur).map(slim),
    people: people.length,
    ts: Date.now()
  }).catch(() => {});
}

/* ---------- lo que llega de los alumnos ---------- */
const pendingOf = uid => state.tracks.filter(t => t.uid === uid && t.id !== state.cur && !state.played.has(t.id)).length;

function reply(msg, ok, text, extra = {}) {
  T.ack(code, msg.uid, { mid: msg.mid || '', ok, text, ...extra }).catch(() => {});
}

function handle(msg) {
  if (!msg || !msg.uid || !code) return;
  const name = String(msg.name || '').trim().slice(0, 30) || 'Alguien';

  if (msg.type === 'hello') { handlers.joined(name); return; }

  if (msg.type === 'add') {
    const vid = String(msg.vid || '');
    if (!ID.test(vid)) return reply(msg, false, 'Ese link no parece de YouTube.');
    const dup = state.tracks.find(t => t.vid === vid);
    if (dup) return reply(msg, false, dup.id === state.cur ? '¡Esa está sonando ahora mismo! 🎧' : 'Esa canción ya está en la cola. ¡Vótala! 🔥', { id: dup.id });
    if (pendingOf(msg.uid) >= MAX_PENDING_PER_STUDENT) return reply(msg, false, `Ya tienes ${MAX_PENDING_PER_STUDENT} canciones esperando. Espera a que suene una 😉`);
    const [t] = addTracks([vid], name);
    t.uid = msg.uid;
    update();
    onAdded([t]);
    handlers.added(t, name);
    return reply(msg, true, '¡Entró a la cola! 🔥', { id: t.id });
  }

  if (msg.type === 'vote') {
    const t = byId(msg.id);
    if (!t) return;
    t.voters ||= [];
    const i = t.voters.indexOf(msg.uid);
    if (i >= 0) t.voters.splice(i, 1); else t.voters.push(msg.uid);
    update();
    handlers.voted(t, name, i < 0);
    return;
  }

  if (msg.type === 'react') {
    if (!REACTIONS.includes(msg.emoji)) return;
    const now = Date.now();
    if (now - (lastReact.get(msg.uid) || 0) < 500) return;   // sin lluvia infinita
    lastReact.set(msg.uid, now);
    handlers.react(msg.emoji, name);
  }
}
