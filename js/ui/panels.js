// Muzi · todo lo que muestra "qué suena": portada, estadísticas, panel Ahora suena,
// barra inferior y modo proyector.

import { $, esc, thumb } from '../core/utils.js';
import { state, current, score } from '../core/store.js';
import { pickNext, upcoming, play } from '../core/player.js';
import { countTo, tintFrom, buildWave } from './effects.js';

const PLAY = '<path d="M8 5v14l11-7z"/>';
const PAUSE = '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';
let lastCur = null;

export function renderPanels() {
  const tracks = state.tracks;

  // estadísticas de la sesión
  const people = new Set(tracks.map(t => t.who.trim().toLowerCase()).filter(Boolean));
  countTo($('stN'), tracks.length);
  countTo($('stP'), people.size);
  countTo($('stL'), tracks.filter(t => t.liked).length);
  countTo($('stD'), state.played.size);

  const total = tracks.reduce((a, t) => a + (t.dur || 0), 0);
  $('mN').textContent = tracks.length + (tracks.length === 1 ? ' tema' : ' temas') + (total ? `, ${Math.round(total / 60)} min` : '');
  $('mT').textContent = state.fade ? `mezcla ${state.fade} s` : 'sin mezcla';

  // portada: mosaico de las últimas 4, como las playlists de Spotify
  const cover = $('cover');
  if (tracks.length >= 4) cover.innerHTML = '<div class="mosaic">' + tracks.slice(-4).map(t => `<img alt="" src="${thumb(t.vid)}">`).join('') + '</div>';
  else if (tracks.length) cover.innerHTML = `<img alt="" style="width:100%;height:100%;object-fit:cover" src="${thumb(tracks.at(-1).vid, 'hqdefault')}">`;
  else cover.innerHTML = '<div class="ph"><span>Mz</span></div>';

  // estado de reproducción
  const icon = state.playing ? PAUSE : PLAY;
  $('ppIco').innerHTML = icon; $('bigIco').innerHTML = icon;
  ['pp', 'bigPlay'].forEach(id => $(id).setAttribute('aria-label', state.playing ? 'Pausar' : 'Reproducir'));
  document.body.classList.toggle('paused', !state.playing);
  $('liveDot').classList.toggle('on', state.playing);
  $('liveTx').textContent = state.playing ? 'sonando' : 'en pausa';
  ['shufA', 'shufB'].forEach(id => { $(id).classList.toggle('on', state.shuffle); $(id).setAttribute('aria-pressed', state.shuffle); });
  $('rep').classList.toggle('on', state.repeat); $('rep').setAttribute('aria-pressed', state.repeat);

  // lo que sigue
  const nexts = upcoming(4).filter(t => t.id !== state.cur);
  $('upnext').innerHTML = nexts.length
    ? nexts.map((t, k) => `<div class="it" data-id="${t.id}" style="animation-delay:${k * 60}ms"><img alt="" src="${thumb(t.vid)}"><div style="min-width:0"><p class="t">${esc(t.title || 'Cargando…')}</p><p class="w">${t.who ? 'La puso ' + esc(t.who) : 'La clase'}</p></div></div>`).join('')
    : '<p class="w" style="color:var(--mute);font-size:13px">Nada en espera todavía.</p>';

  renderNow();
}

function renderNow() {
  const t = current();
  $('bLike').classList.toggle('on', !!t?.liked);
  if (!t) return;
  const who = t.who ? 'La puso ' + t.who : 'La puso la clase';
  $('npT').textContent = t.title || 'Cargando…';
  $('npB').textContent = who;
  $('bT').textContent = t.title || 'Cargando…';
  $('bW').textContent = (t.who ? 'La puso ' + t.who : 'La clase') + (t.ch ? ' · ' + t.ch : '');
  $('bThumb').src = thumb(t.vid);
  document.title = `▶ ${t.title || 'Muzi'} · Muzi`;

  // título largo: se desliza como en Spotify
  const tx = $('bT'), box = tx.parentElement;
  tx.classList.remove('mq');
  requestAnimationFrame(() => { const over = tx.scrollWidth - box.clientWidth; if (over > 4) { tx.style.setProperty('--mx', (-over - 8) + 'px'); tx.classList.add('mq'); } });

  if (lastCur !== t.id) {
    // la canción nueva entra con un pequeño salto
    if (lastCur) ['npT', 'pjT', 'bT', 'pjW'].forEach(id => { const el = $(id); el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
    lastCur = t.id;
    buildWave(t.vid);
    tintFrom(t.vid, state.tracks.indexOf(t));
  }
  renderProjector();
}

export function renderProjector() {
  const t = current(); if (!t) return;
  $('pjBg').style.backgroundImage = `url(${thumb(t.vid, 'hqdefault')})`;
  $('pjT').textContent = t.title || 'Cargando…';
  $('pjW').innerHTML = `La puso <b>${esc(t.who || 'la clase')}</b>`;
  const nx = upcoming(3).filter(x => x.id !== t.id);
  const html = nx.length
    ? '<p class="nxl">Sigue</p>' + nx.map((n, i) => `<div class="nxi" style="animation-delay:${i * 80}ms"><img alt="" src="${thumb(n.vid)}"><div><b>${esc(n.title || 'Cargando…')}</b><span>${n.who ? 'La puso ' + esc(n.who) : 'La clase'}${score(n) ? ` · 🔥 ${score(n)}` : ''}</span></div></div>`).join('')
    : '<p class="nxl">Sigue</p><div class="nxi"><div><b>Agrega más canciones 🎧</b></div></div>';
  if ($('pjNx').dataset.h !== html) { $('pjNx').dataset.h = html; $('pjNx').innerHTML = html; }
}

export function setProjector(on) {
  document.body.classList.toggle('proj', on);
  $('projOv').setAttribute('aria-hidden', String(!on));
  if (on) { renderProjector(); document.documentElement.requestFullscreen?.().catch(() => {}); }
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

export function initPanels() {
  $('projBtn').onclick = () => setProjector(true);
  $('projX').onclick = () => setProjector(false);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('proj'); });
  $('upnext').addEventListener('click', e => { const it = e.target.closest('.it'); if (it) play(it.dataset.id); });
  buildWave('muzi-0000000');
}

export const knobTo = x => { $('knob').style.left = (x * 100) + '%'; };
