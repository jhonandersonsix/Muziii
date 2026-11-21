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
