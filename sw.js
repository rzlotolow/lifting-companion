
+     1: const CACHE = 'lifting-companion-v1';
+     2: const FILES = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];
+     3: 
+     4: self.addEventListener('install', e => {
+     5:     e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
+     6: });
+     7: 
+     8: self.addEventListener('fetch', e => {
+     9:     e.respondWith(
+    10:         caches.match(e.request).then(response => response || fetch(e.request))
+    11:     );
+    12: });

Creating: /workspace/lifting-companion/sw.js
