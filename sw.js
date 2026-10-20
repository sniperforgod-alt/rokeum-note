const CACHE = 'rokeum-note-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'rokeum-share').map(k => caches.delete(k))))); self.clients.claim(); });
async function receiveShare(req){
  const fd = await req.formData();
  const c = await caches.open('rokeum-share');
  const files = fd.getAll('files').filter(f => f && f.size);
  const meta = { title: fd.get('title') || '', text: [fd.get('text'), fd.get('url')].filter(Boolean).join('\n'), files: [] };
  for (let i = 0; i < files.length; i++) {
    meta.files.push({ name: files[i].name || ('노트' + (i + 1)), type: files[i].type, lastModified: files[i].lastModified });
    await c.put('./shared-file-' + i, new Response(files[i]));
  }
  await c.put('./shared-meta', new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }));
  return Response.redirect('./?shared=1', 303);
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/share-target')) { e.respondWith(receiveShare(e.request)); return; }
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
