/* Service worker YCS 2026: hanya untuk notifikasi pengingat (Chrome Android wajib lewat service worker).
   Tidak menyimpan cache halaman, jadi tidak mengubah cara web dimuat. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const tab = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).find((c) => c.url.split('#')[0] === url.split('#')[0]);
    if (tab) return tab.focus();
    return self.clients.openWindow(url);
  })());
});
