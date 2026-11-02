/* TaterPeeler website - notifications from the owner (global messages he chooses to send, and updates).
 * Asks as soon as the game opens. Chrome and Edge allow that right away; Firefox and Safari only let a page ask
 * after a tap, so they're asked on the first tap. On iPhone and iPad, Safari only offers notifications once the
 * site has been added to the Home Screen. Made by Andres Campos. */
(function () {
  'use strict';
  var VAPID = 'BJpPLKrT8oX_Qf5H58b0pU2mshERLWrMpFpAUNBa03kr4LN8x1YMMfAUQT9-TTnpCRZE0uAgITqN1lWDywYMn1k';
  var RPC = 'https://pckptzbflvfqgynuwyku.supabase.co/rest/v1/rpc/';
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

  var key = unb64u(VAPID);
  var reg = navigator.serviceWorker.register('sw.js').catch(function (e) { console.log('[push] service worker:', e && e.message); });
  var busy = false;

  /* once allowed: get this browser's push address and give it to the server (again every 3 days, so it stays on the list) */
  function subscribe() {
    if (busy || Notification.permission !== 'granted') return;
    busy = true;
    reg.then(function () { return navigator.serviceWorker.ready; }).then(function (r) {
      return r.pushManager.getSubscription().then(function (s) {
        if (s && !sameKey(s.options && s.options.applicationServerKey, key)) return s.unsubscribe().then(function () { return null; });
        return s;
      }).then(function (s) {
        return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      });
    }).then(function (s) {
      var j = s.toJSON(), last = (store('taterpeeler.push') || '').split('|');
      if (last[0] === j.endpoint && Date.now() - (+last[1] || 0) < 3 * 86400e3) return;
      return fetch(RPC + 'tp_push_subscribe', {
        method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ p_device: device(), p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
                               p_lang: (navigator.language || '').slice(0, 8) })
      }).then(function (res) { return res.json(); }).then(function (a) {
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
