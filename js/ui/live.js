// Muzi · sala en vivo en la pantalla del profe: abrir/cerrar, código y QR, quién está conectado,
// reacciones que flotan y el feed de actividad del proyector.

import { $, esc, storage, REDUCED_MOTION } from '../core/utils.js';
import { state, update } from '../core/store.js';
import { ROOM_KEY } from '../core/config.js';
import * as room from '../services/room.js';
import { setQR, WA_URL } from './add.js';
import { toast, burst } from './effects.js';

const COLORS = ['#FF3D8B', '#FF8A3D', '#FFD23F', '#3DF2B0', '#4D7CFF', '#A78BFA'];
const colorOf = name => COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initial = name => (name.trim()[0] || '?').toUpperCase();

/* ---------- reacciones flotando ---------- */
export function floatReaction(emoji, name = '') {
  const layer = $('reacts');
  const el = document.createElement('div');
  el.className = 'rx';
  el.style.left = (8 + Math.random() * 84) + '%';
  el.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
  el.style.setProperty('--rot', (Math.random() * 40 - 20) + 'deg');
  el.innerHTML = `<span class="e">${emoji}</span>${name ? `<small style="--c:${colorOf(name)}">${esc(name)}</small>` : ''}`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), REDUCED_MOTION ? 1500 : 3600);
  // muchas reacciones seguidas = la pantalla "late"
  pulse++;
  clearTimeout(pulseT); pulseT = setTimeout(() => { pulse = 0; document.body.classList.remove('hype'); }, 2500);
  if (pulse >= 6) document.body.classList.add('hype');
}
let pulse = 0, pulseT = null;

/* ---------- feed del proyector ---------- */
function feed(html, name) {
  const box = $('pjFeed');
  if (box.firstChild && box.firstChild.dataset.h === html) return;   // sin repetir lo mismo seguido
  const el = document.createElement('div');
  el.dataset.h = html;
  el.className = 'fi';
  el.innerHTML = `<span class="av" style="--c:${colorOf(name)}">${esc(initial(name))}</span><span>${html}</span>`;
  box.prepend(el);
  [...box.children].slice(2).forEach(x => x.remove());
  setTimeout(() => el.classList.add('old'), 9000);
}

/* ---------- pintar el estado de la sala ---------- */
function paintPeople(list) {
  const n = list.length;
  $('roomN').textContent = n;
  $('roomNtx').textContent = n === 1 ? 'persona conectada' : 'personas conectadas';
  $('roomChipN').textContent = n;
  $('roomFaces').innerHTML = list.slice(0, 14).map((p, i) =>
    `<span class="av" style="--c:${colorOf(p.name || '?')};animation-delay:${i * 40}ms" title="${esc(p.name || '')}">${esc(initial(p.name || '?'))}</span>`
  ).join('') + (n > 14 ? `<span class="av more">+${n - 14}</span>` : '');
  const pc = $('pjCode');
  if (room.roomCode()) pc.innerHTML = `Código <b>${room.roomCode()}</b> · ${n} en la sala`;
}

function paint(code) {
  const on = !!code;
  $('roomOff').hidden = on; $('roomOn').hidden = !on; $('roomChip').hidden = !on;
  document.body.classList.toggle('room-open', on);
  $('pjCode').hidden = !on;
  if (on) {
    $('roomCode').textContent = code; $('roomChipCode').textContent = code;
    const url = room.roomUrl(code);
    setQR(url);
    $('qrT').textContent = 'Entra a la sala ' + code;
    $('qrS').textContent = 'Escanea con tu celular: pide tu canción, vota y reacciona en vivo.';
    $('qr2T').textContent = '¡Entra a la sala!';
    $('qr2S').textContent = 'Escanea, pide y vota desde tu celular';
    $('roomMode').innerHTML = room.roomMode() === 'local'
      ? '⚠ <b>Modo prueba</b>: solo funciona en pestañas de esta compu. Pon tu Firebase en <code>config.js</code> para usarla con celulares.'
      : `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ''))}</a>`;
    paintPeople(room.roomPeople());
  } else {
    setQR(WA_URL);
    $('qrT').textContent = 'Escanea y pide tu canción';
    $('qrS').textContent = 'Te abre WhatsApp con el mensaje listo. Pega tu link de YouTube y envíalo.';
    $('qr2T').textContent = '¿Quieres poner tu canción?';
    $('qr2S').textContent = 'Escanea y mándala por WhatsApp';
  }
}

async function openRoom(auto = false) {
  const b = $('btnRoom');
  b.disabled = true; b.textContent = 'Abriendo la sala…';
  try {
    const code = await room.open();
    if (!auto) {
      toast(`Sala ${code} abierta 📡 Que escaneen el QR`);
      burst(70);
      if (!state.voteMode) { state.voteMode = true; update(); document.getElementById('voteMode')?.dispatchEvent(new Event('muzi:paint')); }
    }
  } catch {
    if (!auto) toast('No pude abrir la sala. Revisa tu internet o los datos de Firebase.');
  } finally {
    b.disabled = false; b.textContent = '📡 Abrir la sala';
  }
}

export function initLive() {
  room.on('change', paint);
  room.on('people', paintPeople);
  room.on('joined', name => { feed(`<b>${esc(name)}</b> entró a la sala`, name); });
  room.on('added', (t, name) => {
    toast(`🎵 ${name} agregó una canción`);
    feed(`<b>${esc(name)}</b> agregó una canción`, name);
    burst(30);
  });
  room.on('voted', (t, name, up) => { if (up) feed(`<b>${esc(name)}</b> votó 🔥 ${esc(t.title || 'una canción')}`, name); });
  room.on('react', (emoji, name) => floatReaction(emoji, name));

  $('btnRoom').onclick = () => openRoom(false);
  $('roomClose').onclick = () => {
    const b = $('roomClose');
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '¿Seguro?'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Cerrar'; }, 3000); return; }
    room.close(); toast('Sala cerrada');
  };
  $('roomChip').onclick = () => document.getElementById('room').scrollIntoView({ behavior: 'smooth', block: 'center' });

  // si la sala estaba abierta antes de recargar, se recupera sola
  if (storage.get(ROOM_KEY)) openRoom(true);
}
