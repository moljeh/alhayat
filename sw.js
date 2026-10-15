const CACHE_NAME = 'eduabsensi-admin-v4'; // Naikkan versi menjadi v4 agar cache lama langsung terhapus

// Daftar file utama yang akan di-cache
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
  self.skipWaiting(); // Paksa Service Worker baru langsung aktif tanpa menunggu
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Menggunakan trik Promise.all dan .catch()
        // Agar jika 1 file gagal ditemukan (404), file yang lain tetap sukses disimpan
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn('PWA Peringatan: File ini gagal di-cache (mungkin tidak ditemukan):', url);
            });
          })
        );
      })
  );
});

// PROSES AKTIVASI: Hapus Cache versi lama secara otomatis
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
  // Pengecualian: Biarkan Google Apps Script berjalan normal (selalu ambil dari server, dilarang di-cache)
  if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
      return; 
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Jika internet jalan dan berhasil mengambil data baru, perbarui salinan di dalam cache
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Jika perangkat sedang OFFLINE / tidak ada internet, barulah ambil dari Cache
        return caches.match(event.request);
      })
  );
});