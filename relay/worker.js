// TaterPeeler's backup route (relay) as a Cloudflare Worker: the same job as Code.gs (see README.txt), on
// Cloudflare instead of Google. Made by Andres Campos.
const SERVER = 'https://pckptzbflvfqgynuwyku.supabase.co';
const KEY = 'sb_publishable_jZDxIAWYOGoiAqKWnr3XyQ_WazV-Hkz';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
const answer = (status, body) => new Response(status + '\n' + body, { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method === 'GET') return answer(200, '"The TaterPeeler relay is running."');
    let q;
    try { q = JSON.parse(await req.text()); } catch (e) { return answer(400, '{"error":"bad request"}'); }
    const fn = String(q.f || '');
    if (!/^tp[_-][a-z0-9_-]+$/.test(fn)) return answer(400, '{"error":"not a TaterPeeler call"}');
    const r = await fetch(SERVER + (q.k ? '/functions/v1/' : '/rest/v1/rpc/') + fn, {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', 'X-Forwarded-For': req.headers.get('CF-Connecting-IP') || '' },
      body: JSON.stringify(q.b || {}),
    });
    return answer(r.status, await r.text());
  },
};
