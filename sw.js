/* TaterPeeler website - shows the notifications the owner sends, and opens the game when one is tapped.
 * Nothing is cached here: the game always loads fresh from the website. Made by Andres Campos. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'TaterPeeler', {
    body: d.body || '', icon: 'icon-192.png', tag: d.tag || 'taterpeeler', renotify: true,
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var scope = self.registration.scope;
  var url = new URL((e.notification.data && e.notification.data.url) || './', scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if (cs[i].url.indexOf(scope) === 0 && 'focus' in cs[i]) return cs[i].focus();
    return self.clients.openWindow(url);
  }));
});
