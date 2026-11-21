// Muzi · trae título y canal de cada video (oEmbed público vía noembed.com).

import { update } from '../core/store.js';

const asked = new Set();

export async function ensureMeta(track) {
  if (track.title || asked.has(track.vid)) return;
  asked.add(track.vid);
  try {
    const url = 'https://noembed.com/embed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + track.vid);
    const data = await (await fetch(url)).json();
    if (data && data.title) {
      track.title = data.title;
      track.ch = data.author_name || '';
      update();
    }
  } catch { /* el título llegará cuando suene */ }
}
