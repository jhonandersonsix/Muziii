// Muzi · conexión de la sala en vivo. Dos formas con la misma interfaz:
//   · Firebase (Realtime Database + acceso anónimo): funciona entre todos los celulares.
//     Se activa al pegar los datos de tu proyecto en FIREBASE (js/core/config.js).
//   · Modo prueba (BroadcastChannel): sin cuenta, pero solo entre pestañas del mismo navegador.
//
// Datos en Firebase:  rooms/{CODIGO}/owner   uid del profe (nadie más puede escribir el estado)
//                     rooms/{CODIGO}/state   lo que ven los alumnos (lo escribe el profe)
//                     rooms/{CODIGO}/inbox   pedidos, votos y reacciones de los alumnos
//                     rooms/{CODIGO}/acks    respuesta del profe a cada alumno
//                     rooms/{CODIGO}/people  quién está conectado

import { FIREBASE } from '../core/config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

/** ¿Está configurado Firebase? Si no, la sala funciona en modo prueba. */
export const isLive = () => !!(FIREBASE && FIREBASE.databaseURL);

let conn = null;
/** Conecta una sola vez y devuelve la conexión. */
export function connect() {
  conn ??= (isLive() ? firebase() : local()).catch(e => { conn = null; throw e; });
  return conn;
}

/* ---------------------------------- Firebase ---------------------------------- */
async function firebase() {
  const [{ initializeApp }, A, D] = await Promise.all([
    import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-database.js')
  ]);
  const app = initializeApp(FIREBASE);
  const cred = await A.signInAnonymously(A.getAuth(app));
  const uid = cred.user.uid;
  const db = D.getDatabase(app);
  const r = path => D.ref(db, 'rooms/' + path);
  return {
    mode: 'firebase', uid,
    async claim(code) { try { await D.set(r(code + '/owner'), uid); return true; } catch { return false; } },
    setState: (code, s) => D.set(r(code + '/state'), s),
    onState: (code, cb) => D.onValue(r(code + '/state'), snap => cb(snap.val()), () => cb(null)),
    send: (code, msg) => D.push(r(code + '/inbox'), { ...msg, uid, ts: Date.now() }),
    onInbox: (code, cb) => D.onChildAdded(r(code + '/inbox'), snap => { cb(snap.val(), snap.key); D.remove(snap.ref).catch(() => {}); }),
    ack: (code, to, obj) => D.set(r(`${code}/acks/${to}`), { ...obj, ts: Date.now() }),
    onAck: (code, cb) => D.onValue(r(`${code}/acks/${uid}`), snap => { const v = snap.val(); if (v) cb(v); }),
    join(code, person) {
      const me = r(`${code}/people/${uid}`);
      D.onDisconnect(me).remove();
      return D.set(me, { name: person.name || '', ts: Date.now() });
    },
    leave: code => D.remove(r(`${code}/people/${uid}`)),
    onPeople: (code, cb) => D.onValue(r(code + '/people'), snap => cb(Object.entries(snap.val() || {}).map(([id, p]) => ({ uid: id, ...p }))))
  };
}

/* --------------------------- Modo prueba (misma compu) --------------------------- */
async function local() {
  // cada pestaña es una "persona" distinta
  let uid = null;
  try { uid = sessionStorage.getItem('muzi.uid'); } catch { /* sin almacenamiento */ }
  if (!uid) { uid = 'u' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('muzi.uid', uid); } catch { /* nada */ } }

  const chans = new Map();
  const ch = code => { if (!chans.has(code)) chans.set(code, new BroadcastChannel('muzi-sala-' + code)); return chans.get(code); };
  const listen = (code, k, cb) => { const f = e => { if (e.data && e.data.k === k) cb(e.data); }; ch(code).addEventListener('message', f); return () => ch(code).removeEventListener('message', f); };
  const key = (code, what) => `muzi.sala.${code}.${what}`;
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* nada */ } };
  const people = new Map();   // por sala: uid -> {name, seen}

  return {
    mode: 'local', uid,
    async claim(code) { const o = get(key(code, 'owner')); if (o && o !== uid && Date.now() - (get(key(code, 'beat')) || 0) < 15000) return false; put(key(code, 'owner'), uid); return true; },
    async setState(code, s) { put(key(code, 'state'), s); put(key(code, 'beat'), Date.now()); ch(code).postMessage({ k: 'state', v: s }); },
    onState(code, cb) { setTimeout(() => cb(get(key(code, 'state'))), 0); return listen(code, 'state', d => cb(d.v)); },
    async send(code, msg) { ch(code).postMessage({ k: 'inbox', id: Math.random().toString(36).slice(2), v: { ...msg, uid, ts: Date.now() } }); },
    onInbox: (code, cb) => listen(code, 'inbox', d => cb(d.v, d.id)),
    async ack(code, to, obj) { ch(code).postMessage({ k: 'ack', to, v: { ...obj, ts: Date.now() } }); },
    onAck: (code, cb) => listen(code, 'ack', d => { if (d.to === uid) cb(d.v); }),
    async join(code, person) {
      const beat = () => ch(code).postMessage({ k: 'person', uid, v: { name: person.name || '' } });
      beat(); clearInterval(this._hb); this._hb = setInterval(beat, 4000);
      listen(code, 'who', beat);
      addEventListener('pagehide', () => ch(code).postMessage({ k: 'leave', uid }));
    },
    async leave(code) { clearInterval(this._hb); ch(code).postMessage({ k: 'leave', uid }); },
    onPeople(code, cb) {
      const emit = () => {
        for (const [id, p] of people) if (Date.now() - p.seen > 12000) people.delete(id);
        cb([...people].map(([id, p]) => ({ uid: id, name: p.name })));
      };
      listen(code, 'person', d => { people.set(d.uid, { name: d.v.name, seen: Date.now() }); emit(); });
      listen(code, 'leave', d => { people.delete(d.uid); emit(); });
      ch(code).postMessage({ k: 'who' });
      setInterval(emit, 5000);
      emit();
    }
  };
}
