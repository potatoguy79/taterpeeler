/* TaterPeeler's backup route (relay) for Google Apps Script. Made by Andres Campos.
 *
 * Some networks (school filters like iBoss) block the game's server, Supabase. They usually allow Google, so the game
 * can send its online calls here instead: this script passes each one on to the server and sends the answer back.
 * It only passes on the game's own tp_* functions, and only with the game's public (publishable) key, which is in
 * the game anyway; it keeps nothing.
 *
 * Set it up: see README.txt next to this file. */
const SERVER = 'https://pckptzbflvfqgynuwyku.supabase.co';
const KEY = 'sb_publishable_jZDxIAWYOGoiAqKWnr3XyQ_WazV-Hkz';

function doPost(e) {
  var q;
  try { q = JSON.parse(e.postData.contents); } catch (x) { return answer(400, '{"error":"bad request"}'); }
  var fn = String(q.f || '');
  if (!/^tp[_-][a-z0-9_-]+$/.test(fn)) return answer(400, '{"error":"not a TaterPeeler call"}');
  var url = SERVER + (q.k ? '/functions/v1/' : '/rest/v1/rpc/') + fn;
  var r = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { apikey: KEY },
    payload: JSON.stringify(q.b || {})
  });
  return answer(r.getResponseCode(), r.getContentText());
}

/* open the web app's address in a browser to check it's running */
function doGet() { return answer(200, '"The TaterPeeler relay is running."'); }

/* the status on the first line, then the server's answer (Apps Script can't set the HTTP status itself) */
function answer(status, body) {
  return ContentService.createTextOutput(status + '\n' + body).setMimeType(ContentService.MimeType.TEXT);
}
