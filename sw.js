const CACHE = 'lifting-companion-v2';
const FILES = [
   './',
   './index.html',
   './style.css',
   './app.js',
   './manifest.json'
];

self.addEventListener('install', e => {
   e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener('fetch', e => {
   e.respondWith(
       caches.match(e.request).then(response => response || fetch(e.request))
   );
});
