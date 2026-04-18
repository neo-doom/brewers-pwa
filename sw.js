const CACHE = 'brewers-v2';

const SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/api.js',
  'js/ui.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { hostname } = new URL(e.request.url);

  // MLB API: network only — stale scores are worse than a brief error
  if (hostname === 'statsapi.mlb.com') {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify(null), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    return;
  }

  // App shell: cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
