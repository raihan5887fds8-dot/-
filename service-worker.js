/* ন্যূনতম সার্ভিস ওয়ার্কার — শুধু PWA "ইনস্টলযোগ্য" হওয়ার শর্ত পূরণের জন্য।
   এটা ডেটা অফলাইনে ক্যাশ করে না (অ্যাপের নিজস্ব Firebase অফলাইন-স্ন্যাপশট
   ব্যবস্থা আলাদাভাবে সেটা সামলায়), শুধু স্বাভাবিকভাবে নেটওয়ার্ক রিকোয়েস্ট
   পাস করে দেয়। */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
