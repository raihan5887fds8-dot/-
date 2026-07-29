/* বন্ধু ঐক্য সমবায় সমিতি — Service Worker
   এটা শুধু অ্যাপ-শেল (index.html, আইকন, ম্যানিফেস্ট) অফলাইনে ক্যাশ করে রাখে,
   যাতে ইন্টারনেট না থাকলেও অ্যাপটা অন্তত খোলে (লগইন স্ক্রিন দেখায়)।
   আসল ডেটা (সদস্য/চাঁদা/ইনভেস্টমেন্ট ইত্যাদি) সবসময় লাইভ Google Sheet থেকে
   আসে — সেটা অফলাইনে কাজ করবে না, ইন্টারনেট লাগবেই। */

const CACHE_NAME = 'bes-app-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Google Apps Script API কল (script.google.com) কখনোই ক্যাশ করা হবে না —
  // ওটা সবসময় নেটওয়ার্ক থেকেই আসতে হবে, নাহলে পুরনো/ভুল ডেটা দেখাবে
  if (req.url.includes('script.google.com')) return;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
