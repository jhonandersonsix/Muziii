// Muzi · configuración general. Cambia aquí los datos sin tocar el resto del código.

export const APP_NAME = 'Muzi';

/** WhatsApp donde los alumnos piden canciones (formato internacional, sin + ni espacios). */
export const WA_NUMBER = '51932024404';
export const WA_MESSAGE = 'Hola profe 🎧 quiero poner esta canción en Muzi: ';

/** Clave donde se guarda la cola en el navegador. */
export const STORAGE_KEY = 'muzi.v1';
export const WHO_KEY = 'muzi.who';

/** Paleta Muzi para el color de cada canción (rosa, mandarina, volt, menta, azul, lila). */
export const HUES = ['#FF3D8B', '#FF8A3D', '#FFD23F', '#3DF2B0', '#4D7CFF', '#A78BFA', '#FF3D8B'];

/** Mezcla tipo DJ: segundos por defecto y máximo del control. */
export const DEFAULT_FADE = 8;
export const MAX_FADE = 15;
export const DEFAULT_VOLUME = 85;

/** Opciones del temporizador de clase (minutos; -1 = al terminar la canción). */
export const TIMER_STEPS = [0, 15, 30, 45, -1];

/** Máximo de canciones que se importan de una playlist de YouTube. */
export const PLAYLIST_LIMIT = 100;

/* ---------------- Sala en vivo ---------------- */

/**
 * Datos de tu proyecto de Firebase (Configuración del proyecto → Tus apps → Web).
 * Si lo pones en null, la sala funciona en "modo prueba": solo entre pestañas de esta misma compu.
 * Formato:
 * export const FIREBASE = {
 *   apiKey: '...', authDomain: 'muzi-xxxx.firebaseapp.com',
 *   databaseURL: 'https://muzi-xxxx-default-rtdb.firebaseio.com', projectId: 'muzi-xxxx', appId: '...'
 * };
 */
export const FIREBASE = {
  apiKey: 'AIzaSyAmxKC2ZgECL713lLdloxhcpOtMXsnhOHw',
  authDomain: 'muziii-64219.firebaseapp.com',
  databaseURL: 'https://muziii-64219-default-rtdb.firebaseio.com',
  projectId: 'muziii-64219',
  storageBucket: 'muziii-64219.firebasestorage.app',
  messagingSenderId: '239768581684',
  appId: '1:239768581684:web:48835ddb980555775afc61'
};

/** Canciones que un alumno puede tener esperando en la cola a la vez. */
export const MAX_PENDING_PER_STUDENT = 3;

/** Reacciones que los alumnos pueden mandar desde el celular. */
export const REACTIONS = ['🔥', '😍', '💃', '👏', '😂', '🎉'];

/** Dónde se recuerda la sala abierta en el navegador del profe. */
export const ROOM_KEY = 'muzi.sala';
