/* TaterPeeler website - notifications from the owner (global messages he chooses to send, and updates).
 * Asks as soon as the game opens. Chrome and Edge allow that right away; Firefox and Safari only let a page ask
 * after a tap, so they're asked on the first tap. On iPhone and iPad, Safari only offers notifications once the
 * site has been added to the Home Screen. Made by Andres Campos. */
(function () {
  'use strict';
  var SERVER = 'https://pckptzbflvfqgynuwyku.supabase.co';
  var RPC = SERVER + '/rest/v1/rpc/', FN = SERVER + '/functions/v1/';
  var KEY = 'sb_publishable_jZDxIAWYOGoiAqKWnr3XyQ_WazV-Hkz';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

  function unb64u(s) {
    var t = s.replace(/-/g, '+').replace(/_/g, '/'), bin = atob(t + '===='.slice(t.length % 4 || 4)), o = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
    return o;
  }
  function sameKey(a, b) {
    if (!a) return false;
    a = new Uint8Array(a);
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function device() { var m = /(?:^|;)dev=([^;]+)/.exec(store('taterpeeler.save.v1') || ''); return m ? m[1] : null; }

  /* the backup route: networks that block the server can still reach a relay (its address is in events.txt) */
  var relayList = null;
  function relays() {
    if (!relayList) relayList = fetch('events.txt', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var m = /^relay:[ \t]*(.*)$/m.exec(t || '');
      return m ? m[1].trim().split(/\s+/).filter(function (u) { return /^https:\/\//.test(u); }) : [];
    }).catch(function () { return []; });
    return relayList;
  }
  /* one of the server's tp_* calls (edge: one of its Edge Functions), straight there or through a relay */
  function call(fn, edge, body) {
    return fetch((edge ? FN : RPC) + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, cache: 'no-store',
                                           body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function (err) {
        return relays().then(function (list) {
          var i = 0;
          function next() {
            if (i >= list.length) throw err;
            return fetch(list[i++], { method: 'POST', headers: { 'Content-Type': 'text/plain' }, cache: 'no-store',
                                      body: JSON.stringify({ f: fn, k: edge ? 1 : 0, b: body }) })
              .then(function (r) { return r.text(); })
              .then(function (t) { var n = t.indexOf('\n'); if (n < 0) throw err; return JSON.parse(t.slice(n + 1)); })
              .catch(next);
          }
          return next();
        });
      });
  }

  /* the server's public key (it makes it itself the first time anyone asks); kept here in case the server can't be reached */
  function getKey() {
    return call('tp_push_key', 0, {}).then(function (a) {
      if (a && a.ok && a.key) return a.key;
      if (a && a.error === 'nokey') return call('tp-push', 1, { kind: 'key' }).then(function (b) { return b && b.ok && b.key; });
      return null;
    }).catch(function () { return null; }).then(function (k) {
      if (k && /^[A-Za-z0-9_-]{80,100}$/.test(k)) { store('taterpeeler.pushkey', k); return k; }
      return store('taterpeeler.pushkey');
    });
  }

  var reg = navigator.serviceWorker.register('sw.js').catch(function (e) { console.log('[push] service worker:', e && e.message); });
  var busy = false;

  /* once allowed: get this browser's push address and give it to the server (again every 3 days, so it stays on the list) */
  function subscribe() {
    if (busy || Notification.permission !== 'granted') return;
    busy = true;
    var key = null;
    getKey().then(function (k) {
      if (!k) throw new Error('no notification key from the server yet');
      key = unb64u(k);
      return reg;
    }).then(function () { return navigator.serviceWorker.ready; }).then(function (r) {
      return r.pushManager.getSubscription().then(function (s) {
        if (s && !sameKey(s.options && s.options.applicationServerKey, key)) return s.unsubscribe().then(function () { return null; });
        return s;
      }).then(function (s) {
        return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      });
    }).then(function (s) {
      var j = s.toJSON(), last = (store('taterpeeler.push') || '').split('|');
      if (last[0] === j.endpoint && Date.now() - (+last[1] || 0) < 3 * 86400e3) return;
      return call('tp_push_subscribe', 0, { p_device: device(), p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
                                            p_lang: (navigator.language || '').slice(0, 8) }).then(function (a) {
        if (a && a.ok) store('taterpeeler.push', j.endpoint + '|' + Date.now());
        else console.log('[push] server said:', a && (a.error || a.message));
      });
    }).catch(function (e) { console.log('[push]', e && e.message); }).then(function () { busy = false; });
  }

  function ask() {
    new Promise(function (done) {
      try { var p = Notification.requestPermission(done); if (p && p.then) p.then(done, function () { done('default'); }); }
      catch (e) { done('default'); }
    }).then(function (perm) { if (perm === 'granted') subscribe(); });
  }

  /* the game's Settings: a "Turn on notifications" button while they're off */
  window.TP_PUSH = {
    state: function () { var p = Notification.permission; return p === 'granted' ? 3 : p === 'denied' ? 2 : 1; },
    ask: function () { if (Notification.permission === 'granted') subscribe(); else ask(); }
  };
  if (Notification.permission === 'granted') subscribe();
  else if (Notification.permission === 'default') {
    var chromium = !!(navigator.userAgentData && navigator.userAgentData.brands);
    if (chromium) ask();   /* right away */
    var first = function () {
      removeEventListener('pointerup', first, true); removeEventListener('keyup', first, true);
      if (Notification.permission === 'default') ask();
    };
    addEventListener('pointerup', first, true); addEventListener('keyup', first, true);
  }
})();
