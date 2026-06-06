const CACHE = 'rp-orcamentos-v19';
const ASSETS = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-180.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isApiOrLogin = url.pathname.startsWith('/api/') || url.pathname === '/login';
  const isSupabase = /supabase\./.test(url.hostname);
  const isJsPdf = /jspdf/i.test(url.href);
  // Só usa cache p/ recursos estáticos do próprio app + CDN do jsPDF.
  // Supabase, API e login = SEMPRE rede (senão apagar/editar "volta" com dado velho do cache).
  if (isApiOrLogin || isSupabase || (!sameOrigin && !isJsPdf)) return;
  // HTML/navegação = REDE PRIMEIRO (sempre pega a versão nova; usa cache só se estiver offline).
  const isHTML = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  if (isHTML && sameOrigin) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok && !resp.redirected) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)).catch(() => {}); }
        return resp;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }
  // Demais estáticos (ícones, jsPDF) = cache primeiro.
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok && !resp.redirected) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
      return resp;
    }).catch(() => caches.match('index.html')))
  );
});
