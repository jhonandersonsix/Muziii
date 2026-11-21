# Versión 3 · sala en vivo · 21 de noviembre de 2026

- **Sala en vivo:** código de 4 letras + QR. Los alumnos entran desde el celular (`sala.html`), ven qué suena con su barra de avance, piden canciones (máximo 3 esperando), votan una vez por canción y mandan reacciones (🔥 😍 💃 👏 😂 🎉).
- **En la pantalla del profe:** quién está conectado (con su inicial), avisos de lo que pasa, reacciones que flotan por la pantalla y la hacen "latir" cuando llueven, y la sala se recupera sola si recargas.
- **Proyector:** muestra el código de la sala, las próximas 3 canciones con quién las puso y sus votos, y la actividad en vivo.
- **Fluidez:** la cola ya no se vuelve a dibujar entera en cada cambio. Las filas se deslizan a su nuevo lugar cuando cambian los votos, las nuevas entran deslizándose con un brillo, el contador de votos salta y el título de la canción nueva entra con un pequeño salto.
- **Votos:** total = votos desde la compu + un voto por alumno de la sala.
- Archivos nuevos: `sala.html`, `js/sala.js`, `js/services/room.js`, `js/services/transport.js`, `js/ui/live.js`, `css/live.css`, `css/sala.css`, `firebase-rules.json`.

# Cambios · 21 de noviembre de 2026

Arreglos de la auditoría (15 errores):

1. El cartel "Muzi está en silencio" ya no tapa el video mientras suena (`css/base.css`: `[hidden]` siempre oculta).
2. Si una canción (o todas) no se puede reproducir fuera de YouTube, se marca con ⚠ y Muzi pasa a la siguiente; si no queda ninguna, se detiene con un aviso en vez de reintentar sin fin.
3. Cuando la cola termina y alguien agrega una canción, empieza a sonar sola. Play después del final sigue con la nueva, no repite la última.
4. Aleatorio sin repetir termina cuando ya sonaron todas.
5. "Anterior" vuelve a la canción que de verdad sonó antes (también en aleatorio), y "Siguiente" ya no se salta la que dejaste.
6. El volumen se puede cambiar durante una mezcla.
7. Los atajos ignoran Ctrl/Cmd/Alt (Ctrl+P imprime, no abre el proyector) y Espacio sobre un botón activa ese botón.
8. "Sigue en la cola" y el "Sigue" del proyector muestran lo que de verdad va a sonar, también en aleatorio y con votos.
9. "🔥 Más votadas suenan primero" ahora es un modo que se prende y apaga, independiente del filtro. Hay una pausa de 2 s entre votos a la misma canción para que no se inflen con clics seguidos.
10. Celular: tocar una canción la reproduce; mantenerla presionada medio segundo permite arrastrarla para reordenar.
11. Al recargar la página se recuerda qué sonaba y qué ya sonó; play retoma esa canción.
12. Buscar o filtrar sin resultados muestra un mensaje.
13. Mientras se lee una playlist aparece un aviso con indicador de carga.
14. Botones de al menos 40 px en pantallas táctiles.
15. Quitar una canción o vaciar la cola tiene "Deshacer" durante 5 s.

## Versión 4 · Logo "MuZiii" vivo

- Nuevo logo **MuZiii** (M y Z menta, u amarilla, tres "i" rosa, amarilla y azul, borde blanco tipo sticker y sombra 3D). Está dibujado en código (SVG), así que se ve nítido en cualquier tamaño y no depende de fuentes.
- Aparece en: la intro, el menú lateral, el modo proyector y la pantalla del alumno (sala.html). También cambió el ícono de la pestaña (las tres "i").
- Animación e interacción (`js/ui/logo.js` + `css/logo.css`):
  - **Intro:** las letras caen una tras otra con rebote.
  - **Las tres "i" son un ecualizador:** bailan al ritmo cuando hay música y respiran suave en pausa.
  - **Sombra 3D que sigue al mouse** (en celular, a la inclinación del teléfono). El logo se gira un poco hacia donde está el cursor.
  - **Pasar el mouse por una letra** la hace saltar. **Tocar una letra** suena como un xilófono (cada letra es una nota).
  - **Clic en el logo:** ola de saltos y confeti. En el menú ya no recarga la página (antes cortaba la música): vuelve arriba.
  - Respeta "reducir movimiento" del sistema y se detiene cuando no está a la vista (no gasta batería).
- La intro dura 2,3 s (antes 1,5 s) para que se vea la caída del logo. Un toque la salta.

## Versión 6 · Logo MUZiii definitivo (solo el logo; la interfaz no cambia)

- Logo nuevo según la propuesta V1: M y Z turquesa, U blanca, tres "i" amarilla, rosa y blanca, con sombra 3D azul marino.
- Mantiene toda la animación de la versión 4: caída en la intro, "i" que bailan como ecualizador con la música, sombra 3D que sigue al mouse (o la inclinación del celular), letras que saltan y suenan al tocarlas, y ola + confeti al hacer clic.
- Ícono de la pestaña con las tres "i" en los nuevos colores.
- El resto de la interfaz (colores, tipografías, paneles) queda igual que antes.
