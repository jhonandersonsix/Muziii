// Muzi · controles: botones del reproductor, barras (avance, mezcla, volumen), temporizador de clase,
// atajos de teclado y controles del sistema (teclas multimedia / pantalla bloqueada).

import { $, fmt, clamp, thumb } from '../core/utils.js';
import { state, update, current } from '../core/store.js';
import { MAX_FADE, TIMER_STEPS } from '../core/config.js';
import { toggle, mixNow, previous, setPlaying } from '../core/player.js';
import * as decks from '../services/decks.js';
import { toast, burst } from './effects.js';
import { setProjector } from './panels.js';

let seeking = false;

/** Barra arrastrable genérica (mouse, dedo y teclado). */
function slider(el, onSet, onEnd) {
  const set = e => { const r = el.getBoundingClientRect(); const k = clamp((e.clientX - r.left) / r.width, 0, 1); el.style.setProperty('--v', k * 100 + '%'); onSet(k); };
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); el.dataset.drag = '1'; set(e); });
  el.addEventListener('pointermove', e => { if (el.dataset.drag) set(e); });
  el.addEventListener('pointerup', () => { delete el.dataset.drag; onEnd?.(); });
  el.addEventListener('keydown', e => {
    const step = { ArrowRight: .05, ArrowUp: .05, ArrowLeft: -.05, ArrowDown: -.05 }[e.key]; if (!step) return;
    e.preventDefault();
    const k = clamp((parseFloat(el.style.getPropertyValue('--v')) || 0) / 100 + step, 0, 1);
    el.style.setProperty('--v', k * 100 + '%'); onSet(k); onEnd?.();
  });
}

function initSliders() {
  let seekK = 0;
  slider($('seek'), k => { seeking = true; seekK = k; $('tCur').textContent = fmt(k * decks.duration()); },
    () => { decks.seekTo(seekK * decks.duration()); seeking = false; });
  slider($('mixR'), k => { state.fade = Math.round(k * MAX_FADE); $('mixV').textContent = state.fade + ' s'; update(); });
  slider($('volR'), k => { state.vol = Math.round(k * 100); decks.setVolume(state.vol); update(); });
  $('mixR').style.setProperty('--v', state.fade / MAX_FADE * 100 + '%');
  $('mixV').textContent = state.fade + ' s';
  $('volR').style.setProperty('--v', state.vol + '%');
}

/** Reloj de la barra de avance (también la del proyector y la pantalla bloqueada). */
function startClock() {
  setInterval(() => {
    if (!state.cur) return;
    const c = decks.time(), d = decks.duration();
    $('tCur').textContent = fmt(c); $('tDur').textContent = fmt(d);
    const pct = (d ? c / d * 100 : 0) + '%';
    if (!seeking) $('seek').style.setProperty('--v', pct);
    $('pjBar').style.width = pct;
    if ('mediaSession' in navigator && d && navigator.mediaSession.setPositionState) {
      try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(c, d), playbackRate: 1 }); } catch { /* no soportado */ }
    }
  }, 250);
}

// --- temporizador de clase ---
let tIdx = 0, tEnd = 0, endAfterSong = false;
function initTimer() {
  $('timerBtn').onclick = () => {
    tIdx = (tIdx + 1) % TIMER_STEPS.length;
    const v = TIMER_STEPS[tIdx];
    endAfterSong = v === -1; tEnd = v > 0 ? Date.now() + v * 60000 : 0;
    $('timerBadge').textContent = v > 0 ? v + "'" : v === -1 ? 'FIN' : '';
    toast(v > 0 ? `La música se apagará sola en ${v} minutos ⏲` : v === -1 ? 'Se apagará al terminar esta canción ⏲' : 'Temporizador apagado');
  };
  const stop = () => {
    tIdx = 0; tEnd = 0; endAfterSong = false; $('timerBadge').textContent = '';
    decks.fadeOutAndPause(4, state.vol, () => { setPlaying(false); toast('Fin de la música por hoy 🎧 ¡Buena clase!'); });
  };
  setInterval(() => {
    if (tEnd && state.playing && Date.now() >= tEnd) stop();
    else if (tEnd) $('timerBadge').textContent = Math.ceil((tEnd - Date.now()) / 60000) + "'";
    if (endAfterSong && state.playing) { const d = decks.duration(); if (d && d - decks.time() < 5) stop(); }
  }, 1000);
}

// --- teclas multimedia y pantalla bloqueada ---
let lastMeta = null;
export function updateMediaSession() {
  const t = current();
  if (!('mediaSession' in navigator) || !t || lastMeta === t.id + t.title) return;
  lastMeta = t.id + t.title;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title || 'Muzi', artist: t.who ? 'La puso ' + t.who : 'Muzi', album: 'Muzi · La playlist de tu clase',
      artwork: [{ src: thumb(t.vid, 'hqdefault'), sizes: '480x360', type: 'image/jpeg' }]
    });
  } catch { /* navegador sin soporte */ }
}
function initMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { /* acción no soportada */ } };
  h('play', () => { if (!state.playing) toggle(); });
  h('pause', () => { if (state.playing) toggle(); });
  h('nexttrack', mixNow);
  h('previoustrack', previous);
}

function initShortcuts() {
  addEventListener('keydown', e => {
    const el = document.activeElement;
    if (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable || e.target.getAttribute?.('role') === 'slider') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;              // Ctrl+S, Ctrl+P, Cmd+L… son del navegador
    const k = e.key.toLowerCase();
    if (e.code === 'Space') {
      if (el.tagName === 'BUTTON' || el.tagName === 'A') return;   // Espacio activa el botón enfocado
      e.preventDefault(); toggle();
    }
    else if (e.key === 'ArrowRight' && e.shiftKey) mixNow();
    else if (e.key === 'ArrowLeft' && e.shiftKey) previous();
    else if (k === 's') $('shufA').click();
    else if (k === 'l') $('bLike').click();
    else if (k === 'p') setProjector(!document.body.classList.contains('proj'));
    else if (e.key === 'Escape') setProjector(false);
    else if (e.key === '/') { e.preventDefault(); $('q').focus(); }
  });
}

export function initControls() {
  $('pp').onclick = toggle;
  $('bigPlay').onclick = toggle;
  $('next').onclick = mixNow;
  $('mixA').onclick = mixNow;
  $('prev').onclick = previous;
  $('shufA').onclick = $('shufB').onclick = () => { state.shuffle = !state.shuffle; update(); toast(state.shuffle ? 'Aleatorio activado 🔀' : 'Orden de la cola'); };
  $('rep').onclick = () => { state.repeat = !state.repeat; update(); toast(state.repeat ? 'La lista se repite al terminar' : 'La lista se detiene al terminar'); };
  $('bLike').onclick = e => { const t = current(); if (!t) return; t.liked = !t.liked; update(); if (t.liked) burst(8, e.clientX, e.clientY); };
  initSliders(); startClock(); initTimer(); initMediaSession(); initShortcuts();
}
