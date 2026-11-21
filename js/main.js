// Muzi · punto de entrada. Arranca el estado, conecta los módulos y pinta la interfaz.
//
// Mapa del código:
//   core/config.js      datos editables (WhatsApp, colores, tiempos)
//   core/utils.js       ayudas pequeñas
//   core/store.js       estado + guardado en el navegador + link para compartir
//   core/player.js      qué suena, qué sigue, mezcla automática
//   services/decks.js   los dos reproductores de YouTube (mezcla tipo DJ)
//   services/parser.js  lee links de YouTube
//   services/meta.js    títulos de los videos
//   services/room.js    sala en vivo (lado del profe) · services/transport.js conexión (Firebase o modo prueba)
//   ui/*.js             cada parte visible de la app (ui/live.js = la sala en pantalla)

import { restore, importFromHash, subscribe, update } from './core/store.js';
import { init as initPlayer } from './core/player.js';
import * as decks from './services/decks.js';
import { renderList, initList } from './ui/list.js';
import { renderPanels, initPanels, knobTo } from './ui/panels.js';
import { initControls, updateMediaSession } from './ui/controls.js';
import { initAdd } from './ui/add.js';
import { initNav } from './ui/nav.js';
import { initAmbient, splash, toast } from './ui/effects.js';
import { initLive } from './ui/live.js';
import { mountLogos } from './ui/logo.js';
import { burst } from './ui/effects.js';

// Logo vivo: las "i" bailan cuando suena la música; tocarlo lanza confeti.
mountLogos({ isPlaying: () => !document.body.classList.contains('paused'), onBurst: burst });
// El logo del menú ya no recarga la página (cortaría la música): vuelve arriba.
document.querySelector('.side .logo')?.addEventListener('click', e => { e.preventDefault(); document.querySelector('[data-go="top"]')?.click(); });
splash();
restore();
const received = importFromHash();

subscribe(renderList);
subscribe(renderPanels);
subscribe(updateMediaSession);

decks.on('knob', knobTo);
initPlayer();
initList();
initPanels();
initControls();
initAdd();
initNav();
initAmbient();
initLive();
update();

if (received) setTimeout(() => toast(`${received} canciones llegaron desde el link 🎧`), 1700);
