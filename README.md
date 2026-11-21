# Muzi · La playlist de tu clase

Tus alumnos pegan links de YouTube y Muzi los reproduce solo, uno tras otro, mezclándolos como un DJ.
Muzi tiene su propia identidad de marca (ver `docs/`). Creado por Jhon Pariona.

## Publicar en GitHub Pages (5 minutos)

1. En GitHub, crea un repositorio nuevo llamado `muzi`.
2. Sube **todo el contenido de esta carpeta** (no la carpeta en sí): `index.html`, `css/`, `js/`, `assets/` y `manifest.webmanifest`. La carpeta `docs/` es opcional (son los manuales).
3. Ve a **Settings → Pages**. En "Branch", elige `main` y la carpeta `/ (root)`. Guarda.
4. En un minuto queda en: `https://jhonandersonsix.github.io/muzi/`

> Importante: Muzi usa módulos de JavaScript, así que **no funciona abriendo el `index.html` con doble clic**. Tiene que estar publicado (GitHub Pages) o servido localmente (ver abajo).

## Probar en tu computadora

Con Python instalado, abre una terminal en esta carpeta y ejecuta:

```
python -m http.server 8000
```

Luego entra a `http://localhost:8000`.

## Cómo está ordenado

```
muzi/
├── index.html              Estructura de la página
├── manifest.webmanifest    Permite instalar Muzi como app en el celular o la compu
├── assets/favicon.svg      Ícono
├── docs/                   Manual de marca y guía del producto (PDF)
├── css/
│   ├── tokens.css          Colores, tipografía y formas de la marca Muzi
│   ├── base.css            Reset
│   ├── motion.css          Animaciones y atmósfera
│   ├── layout.css          Estructura tipo Spotify
│   ├── components.css      Botones, chips, lista, reproductor, proyector
│   ├── muzi.css            Logo, intro y estilo propio de Muzi
│   └── responsive.css      Celular, tablet y accesibilidad
└── js/
    ├── main.js             Arranque: conecta todo
    ├── sala.js             Página del alumno (sala.html)
    ├── core/
    │   ├── config.js       ← Cambia aquí el WhatsApp, tiempos y colores
    │   ├── utils.js        Ayudas pequeñas
    │   ├── store.js        Estado, guardado y link para compartir
    │   └── player.js       Qué suena, qué sigue, mezcla automática
    ├── services/
    │   ├── decks.js        Los dos reproductores de YouTube (mezcla tipo DJ)
    │   ├── parser.js       Lee links de YouTube
    │   ├── meta.js         Títulos de los videos
    │   ├── room.js         Sala en vivo, lado del profe (recibe pedidos, votos, reacciones)
    │   └── transport.js    Conexión de la sala: Firebase o modo prueba
    └── ui/
        ├── list.js         La cola (votos, me gusta, arrastrar)
        ├── panels.js       Ahora suena, estadísticas, modo proyector
        ├── controls.js     Botones, barras, temporizador, atajos
        ├── add.js          Agregar canciones, filtros, compartir, QR
        ├── nav.js          Menú y vistas en celular
        ├── effects.js      Confeti, toasts, color dinámico, onda, intro
        └── live.js         La sala en la pantalla del profe: código, QR, reacciones, actividad
```

## Sala en vivo (los alumnos desde su celular)

Con la sala abierta, el QR lleva a `sala.html`. Ahí cada alumno escribe su nombre, pide canciones (máximo 3 esperando a la vez), vota (un voto por canción) y manda reacciones que flotan en la pantalla del profe y en el proyector.

- **Abrir:** panel "Ahora suena" → **📡 Abrir la sala**. Sale un código de 4 letras y el QR cambia a la sala. Al abrirla se activa "Más votadas suenan primero".
- **Sin Firebase (modo prueba):** funciona solo entre pestañas de la misma compu. Sirve para ver cómo es: abre `sala.html?sala=CODIGO` en otra pestaña.
- **Con Firebase (celulares de verdad), una sola vez:**
  1. En console.firebase.google.com crea un proyecto (sin Analytics).
  2. Compilación → **Realtime Database** → Crear base de datos (modo bloqueado).
  3. En la pestaña **Reglas** de la base de datos pega todo el archivo `firebase-rules.json` y toca **Publicar**.
  4. Compilación → **Authentication** → Comenzar → activa **Anónimo**.
  5. ⚙ Configuración del proyecto → Tus apps → ícono web `</>` → copia el `firebaseConfig` y pégalo en `FIREBASE` dentro de `js/core/config.js`.
  6. Sube los cambios a GitHub. Listo.

El plan gratuito de Firebase (Spark) alcanza de sobra para una clase: 100 conexiones a la vez.

## Atajos de teclado

| Tecla | Acción |
|---|---|
| Espacio | Play / pausa |
| Shift + → | Mezclar ya a la siguiente |
| Shift + ← | Anterior |
| S | Aleatorio |
| L | Me gusta |
| P | Modo proyector |
| / | Buscar en la cola |

## Límites de YouTube

- Algunos videos oficiales (VEVO, algunas disqueras) no permiten sonar fuera de YouTube: Muzi avisa y pasa a la siguiente. Los lyric videos y los canales "- Topic" suelen funcionar.
- YouTube puede mostrar anuncios. Si tienes YouTube Premium y sesión iniciada en el mismo navegador, no deberían salir.
- El video debe verse mientras suena (regla de YouTube): deja abierto el panel "Ahora suena" o usa el modo proyector.
- La cola se guarda en el navegador donde se usa. Para pasarla a otro equipo, usa "Copiar link de la lista".
