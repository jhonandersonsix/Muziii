// Muzi · motor de dos decks de YouTube. Mientras uno suena, el otro carga la siguiente canción;
// la mezcla sube el volumen de uno y baja el del otro (y funde los videos en pantalla).

import { $ } from '../core/utils.js';

const PLAYING = 1, PAUSED = 2, ENDED = 0;
const players = [null, null];
const ready = [false, false];
let active = 0;
let mixing = false;
let mixTimer = null;
let waiting = [];
let loaded = false;      // ¿ya se cargó algún video?
let mixVol = 0;         // volumen destino de la mezcla en curso (se puede cambiar a mitad)
const handlers = { playing() {}, paused() {}, ended() {}, error() {}, knob() {} };

export const on = (event, fn) => { handlers[event] = fn; };
export const isMixing = () => mixing;
export const activePlayer = () => players[active];
export const isReady = () => ready[0] && ready[1];
export const hasVideo = () => loaded;

export function init() {
  window.onYouTubeIframeAPIReady = () => {
    [0, 1].forEach(i => {
      players[i] = new YT.Player('yt' + i, {
        width: '100%', height: '100%',
        playerVars: { controls: 0, rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1, iv_load_policy: 3, fs: 0 },
        events: {
          onReady: () => {
            ready[i] = true;
            players[i].setVolume(0);
            if (isReady()) { const q = waiting; waiting = []; q.forEach(fn => fn()); }
          },
          onStateChange: e => {
            if (i !== active) return;
            if (e.data === PLAYING) handlers.playing(players[i]);
            else if (e.data === PAUSED && !mixing) handlers.paused();
            else if (e.data === ENDED && !mixing) handlers.ended();
          },
          onError: e => { if (i === active) handlers.error(e.data); }
        }
      });
    });
  };
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}

const whenReady = fn => isReady() ? fn() : waiting.push(fn);

/** Carga `vid` en el deck libre y mezcla durante `fade` segundos. */
export function load(vid, fade, volume) {
  whenReady(() => {
    const inI = 1 - active, outI = active;
    const inP = players[inI], outP = players[outI];
    const f = Math.max(0, fade);
    clearInterval(mixTimer);

    const outWasPlaying = outP.getPlayerState && outP.getPlayerState() === PLAYING;
    inP.setVolume(f > 0.3 && outWasPlaying ? 0 : volume);
    inP.loadVideoById(vid);
    loaded = true;
    mixVol = volume;

    document.documentElement.style.setProperty('--xf', Math.max(0.4, f) + 's');
    $('pv' + inI).classList.remove('off');
    $('pv' + outI).classList.add('off');
    active = inI;

    if (f > 0.3 && outWasPlaying) {
      mixing = true;
      const t0 = performance.now(), v0 = outP.getVolume();
      mixTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / (f * 1000));
        const e = k * k * (3 - 2 * k); // curva suave
        inP.setVolume(Math.round(mixVol * e));
        outP.setVolume(Math.round(Math.min(v0, mixVol) * (1 - e)));
        handlers.knob(inI === 1 ? e : 1 - e);
        if (k >= 1) { clearInterval(mixTimer); outP.stopVideo(); mixing = false; }
      }, 60);
    } else {
      try { outP.stopVideo(); } catch { /* deck vacío */ }
      handlers.knob(inI);
      mixing = false;
    }
  });
}

export function play() { players[active]?.playVideo(); }
export function pause() { players[active]?.pauseVideo(); if (mixing) players[1 - active]?.pauseVideo(); }
export function setVolume(v) { mixVol = v; if (!mixing) players[active]?.setVolume(v); }
export function seekTo(sec) { players[active]?.seekTo(sec, true); }
export function time() { const p = players[active]; return p?.getCurrentTime ? (p.getCurrentTime() || 0) : 0; }
export function duration() { const p = players[active]; return p?.getDuration ? (p.getDuration() || 0) : 0; }

/** Baja el volumen hasta cero y pausa (temporizador de clase). */
export function fadeOutAndPause(seconds, restoreVolume, done) {
  const p = players[active]; if (!p) return;
  const v0 = p.getVolume(), steps = Math.max(1, seconds * 5); let n = 0;
  const t = setInterval(() => {
    n++; p.setVolume(Math.round(v0 * (1 - n / steps)));
    if (n >= steps) { clearInterval(t); p.pauseVideo(); p.setVolume(restoreVolume); done && done(); }
  }, 200);
}

/** Lee los IDs de una playlist pública con un reproductor oculto. */
export function readPlaylist(listId, limit) {
  return new Promise(resolve => {
    const go = () => {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;width:200px;height:200px;left:-9999px;top:0';
      const inner = document.createElement('div');
      host.appendChild(inner); document.body.appendChild(host);
      const tmp = new YT.Player(inner, {
        width: 200, height: 200, playerVars: { listType: 'playlist', list: listId, autoplay: 0 },
        events: {
          onReady: () => {
            let tries = 0;
            const t = setInterval(() => {
              const ids = tmp.getPlaylist && tmp.getPlaylist();
              if ((ids && ids.length) || ++tries > 20) {
                clearInterval(t); tmp.destroy(); host.remove();
                resolve((ids || []).filter(v => /^[\w-]{11}$/.test(v)).slice(0, limit));
              }
            }, 300);
          }
        }
      });
    };
    const wait = () => (window.YT && YT.Player) ? go() : setTimeout(wait, 500);
    wait();
  });
}
