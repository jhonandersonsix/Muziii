// Muzi · reconoce links de YouTube: videos, youtu.be, Shorts, YouTube Music y playlists.

const ID = /^[\w-]{11}$/;

/** @returns {{ vids: string[], lists: string[] }} */
export function parseLinks(text) {
  const vids = [], lists = [];
  text.split(/[\s,]+/).filter(Boolean).forEach(raw => {
    let url;
    try { url = new URL(/^https?:/i.test(raw) ? raw : 'https://' + raw); }
    catch { if (ID.test(raw)) vids.push(raw); return; }

    const host = url.hostname.replace(/^(www|m|music)\./, '');
    let vid = null;
    if (host === 'youtu.be') vid = url.pathname.slice(1, 12);
    else if (/youtube(-nocookie)?\.com$/.test(host)) {
      vid = url.searchParams.get('v');
      const path = url.pathname.match(/\/(shorts|embed|live|v)\/([\w-]{11})/);
      if (!vid && path) vid = path[2];
      const list = url.searchParams.get('list');
      if (list && !vid) lists.push(list);
    }
    if (vid && ID.test(vid)) vids.push(vid);
  });
  return { vids: [...new Set(vids)], lists: [...new Set(lists)] };
}
