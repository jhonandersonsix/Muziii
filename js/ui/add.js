// Muzi · agregar canciones, filtros, búsqueda, compartir la lista y QR para pedir por WhatsApp.

import { $, $$, storage } from '../core/utils.js';
import { state, update, addTracks, shareLink, current } from '../core/store.js';
import { WA_NUMBER, WA_MESSAGE, WHO_KEY, PLAYLIST_LIMIT } from '../core/config.js';
import { parseLinks } from '../services/parser.js';
import { readPlaylist } from '../services/decks.js';
import { onAdded } from '../core/player.js';
import { toast, burst, shake } from './effects.js';

async function onSubmit(e) {
  e.preventDefault();
  const { vids, lists } = parseLinks($('url').value);
  const who = $('who').value.trim().slice(0, 30);
  if (!vids.length && !lists.length) { toast('Ese link no parece de YouTube. Copia el link del video y pégalo aquí.'); shake($('addForm')); return; }

  const added = addTracks(vids, who);
  $('url').value = '';
  if (added.length) { toast(added.length === 1 ? '¡Entró a la cola! 🔥' : `${added.length} canciones entraron a la cola 🔥`); burst(60); }
  else if (vids.length) toast('Esa canción ya está en la cola 😉');
  onAdded(added);

  for (const id of lists) {
    const loading = toast('Leyendo la playlist de YouTube…', { sticky: true });
    const ids = await readPlaylist(id, PLAYLIST_LIMIT);
    loading.close();
    const fromList = addTracks(ids, who);
    const n = fromList.length;
    toast(n ? `${n} canciones de la playlist entraron a la cola 🔥`
      : ids.length ? 'Todas las canciones de esa playlist ya estaban en la cola 😉'
      : 'No pude leer esa playlist. ¿Es pública?');
    if (n) { burst(80); onAdded(fromList); }
  }
}

let qrLib = null;
const loadQR = () => qrLib ??= new Promise((ok, fail) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.onload = ok; s.onerror = fail;
  document.head.appendChild(s);
});

export const WA_URL = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(WA_MESSAGE);

/** Dibuja los dos QR (panel y proyector) apuntando a `url`. */
export async function setQR(url) {
  try {
    await loadQR();
    ['qr', 'qr2'].forEach((id, i) => {
      $(id).innerHTML = '';
      new QRCode($(id), { text: url, width: i ? 192 : 148, height: i ? 192 : 148, colorDark: '#0B0B0D', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    });
  } catch { $('qr').closest('.qrcard').hidden = true; document.querySelector('.qrbox').hidden = true; }
}

function initQR() {
  $('waLink').href = WA_URL;
  setQR(WA_URL);
}

export function initAdd() {
  $('who').value = storage.get(WHO_KEY, '') || '';
  $('who').addEventListener('change', () => storage.set(WHO_KEY, $('who').value));
  $('addForm').addEventListener('submit', onSubmit);

  const filters = $$('.chip[data-f]');
  filters.forEach(c => c.addEventListener('click', () => {
    filters.forEach(x => x.classList.toggle('on', x === c));
    state.filter = c.dataset.f; update();
  }));
  // el orden por votos es un modo de reproducción: no depende del filtro que estés viendo
  const vm = $('voteMode');
  const paintVm = () => { vm.classList.toggle('on', state.voteMode); vm.setAttribute('aria-pressed', state.voteMode); };
  vm.addEventListener('click', () => {
    state.voteMode = !state.voteMode; paintVm(); update();
    toast(state.voteMode ? 'Ahora suenan primero las más votadas 🔥' : 'Vuelve el orden de la cola');
  });
  paintVm();
  vm.addEventListener('muzi:paint', paintVm);
  $('q').addEventListener('input', e => { state.query = e.target.value.trim().toLowerCase(); update(); });

  $('btnShare').onclick = async () => {
    const url = shareLink();
    try { await navigator.clipboard.writeText(url); toast('Link copiado: quien lo abra recibe esta lista 📋'); }
    catch { prompt('Copia este link:', url); }
  };
  $('btnClear').onclick = () => {
    const b = $('btnClear');
    if (!b.dataset.sure) {
      b.dataset.sure = '1'; b.textContent = 'Toca otra vez para vaciar';
      setTimeout(() => { delete b.dataset.sure; b.textContent = 'Vaciar la cola'; }, 3000);
      return;
    }
    const keep = current();
    const before = { tracks: [...state.tracks], played: new Set(state.played) };
    state.tracks = keep ? [keep] : []; state.played.clear(); update();
    delete b.dataset.sure; b.textContent = 'Vaciar la cola';
    toast(keep ? 'Cola vaciada (se queda la que suena)' : 'Cola vaciada', {
      action: { label: 'Deshacer', fn: () => { state.tracks = before.tracks; state.played = before.played; update(); toast('Cola recuperada 🎧'); } }
    });
  };
  initQR();
}
