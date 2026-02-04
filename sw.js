const CACHE = 'lifting-companion-v1';
const FILES = [
   '/lifting-companion/',
   '/lifting-companion/index.html',
   '/lifting-companion/style.css',
   '/lifting-companion/app.js',
   '/lifting-companion/manifest.json'
];

self.addEventListener('install', e => {
   e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener('fetch', e => {
   e.respondWith(
       caches.match(e.request).then(response => response || fetch(e.request))
   );
});
