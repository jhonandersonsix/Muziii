// Muzi · utilidades pequeñas que usan todos los módulos.

export const $ = id => document.getElementById(id);
export const $$ = sel => [...document.querySelectorAll(sel)];

/** El usuario prefiere menos movimiento (accesibilidad). */
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 245 → "4:05" */
export const fmt = s => (!isFinite(s) || s < 0) ? '0:00' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

/** Escapa texto antes de meterlo en HTML. */
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Miniaturas públicas de YouTube. */
export const thumb = (vid, size = 'mqdefault') => `https://i.ytimg.com/vi/${vid}/${size}.jpg`;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Guarda/lee del navegador sin romper si el almacenamiento está bloqueado. */
export const storage = {
  get(key, fallback = null) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ } }
};
