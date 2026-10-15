const CACHE_NAME = 'eduabsensi-guru-v2'; // Naikkan versi agar cache lama terhapus

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

// PROSES INSTALL: Simpan file utama ke Cache
self.addEventListener('install', event => {
  self.skipWaiting(); // Paksa Service Worker baru langsung aktif
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// PROSES AKTIVASI: Hapus Cache versi lama jika ada
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// PROSES FETCH: STRATEGI "NETWORK FIRST" (Prioritaskan Internet, jika offline pakai Cache)
self.addEventListener('fetch', event => {
  // Pengecualian: Biarkan Google Apps Script berjalan normal tanpa di-cache
  if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
      return; 
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Jika berhasil mengambil dari internet, simpan salinannya ke cache untuk jaga-jaga offline
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Jika internet terputus (offline), ambil dari Cache
        return caches.match(event.request);
      })
  );
});