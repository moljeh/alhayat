const CACHE_NAME = 'eduabsensi-admin-online-v1'; 

// PROSES INSTALL: Langsung aktif tanpa menyimpan file ke cache
self.addEventListener('install', event => {
  self.skipWaiting(); 
});

// PROSES AKTIVASI: Hapus semua cache versi lama secara total
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Membersihkan sisa cache lama:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// PROSES FETCH: Mewajibkan Internet (Network Only)
self.addEventListener('fetch', event => {
  // Syarat PWA tetap terpenuhi, namun browser dipaksa menarik data dari server
  event.respondWith(fetch(event.request));
});