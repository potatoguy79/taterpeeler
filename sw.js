/* TaterPeeler website - shows the notifications the owner sends, and opens the game when one is tapped.
 * 4.0: it also keeps this release's game files (the ones stamped ?v=...), so the next visit starts in a moment
 * instead of downloading them all again. A new release has a new stamp, so it never serves an old game: the page
 * itself always comes fresh, and the old release's files are thrown away once the new one is used. Made by Andres Campos. */
var KEEP = 'tp-files';
self.addEventListener('fetch', function (e) {
  var q = e.request;
  if (q.method !== 'GET' || q.headers.get('range')) return;
  var u = new URL(q.url), m = /^\?v=([0-9]+)$/.exec(u.search);
  if (!m || u.origin !== self.location.origin) return;
  e.respondWith(caches.open(KEEP).then(function (c) {
    return c.match(q).then(function (hit) {
      if (hit) return hit;
      return fetch(q).then(function (r) {
        if (r && r.status === 200 && r.type === 'basic') {
          var copy = r.clone();
          c.put(q, copy).then(function () {   /* this release is in use: drop the older ones */
            return c.keys().then(function (ks) { ks.forEach(function (k) { var km = /[?&]v=([0-9]+)/.exec(k.url); if (km && km[1] < m[1]) c.delete(k); }); });
          }).catch(function () {});
        }
        return r;
      });
    });
  }).catch(function () { return fetch(q); }));
});
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
