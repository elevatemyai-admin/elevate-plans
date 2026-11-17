// Client feedback form. POST = public (anyone with the link). GET / DELETE = admin key only.
// Stored in Upstash: list "feedback" (newest first), each item is JSON.
const { rc, cors, send, adminOk, body, parse } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      if (!adminOk(req)) return send(res, 401, { error: 'Admin key needed.' });
      const rows = (await rc(['LRANGE', 'feedback', 0, 499])) || [];
      return send(res, 200, { items: rows.map(parse).filter(Boolean) });
    }
    if (req.method === 'DELETE') {
      if (!adminOk(req)) return send(res, 401, { error: 'Admin key needed.' });
      const id = String((req.query && req.query.id) || '');
      const rows = (await rc(['LRANGE', 'feedback', 0, 499])) || [];
      const hit = rows.find(r => (parse(r) || {}).id === id);
      if (hit) await rc(['LREM', 'feedback', 1, hit]);
      return send(res, 200, { ok: true });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });

    const b = body(req);
    if (b.website) return send(res, 200, { ok: true }); // honeypot: bots fill this in
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
    const n = await rc(['INCR', 'fbrate:' + ip]);
    if (n === 1) await rc(['EXPIRE', 'fbrate:' + ip, 3600]);
    if (n > 10) return send(res, 429, { error: 'Too many submissions. Please try again later.' });

    const answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, 30)
      .map(a => ({ q: String((a && a.q) || '').slice(0, 300), a: String((a && a.a) || '').trim().slice(0, 4000) }))
      .filter(a => a.q && a.a);
    const name = String(b.name || '').trim().slice(0, 120);
    const quote = String(b.quote || '').slice(0, 200);
    if (!answers.length && !name) return send(res, 400, { error: 'Please fill in at least one answer.' });
    const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), name, quote, answers };
    await rc(['LPUSH', 'feedback', JSON.stringify(item)]);
    await rc(['LTRIM', 'feedback', 0, 499]);
    return send(res, 200, { ok: true });
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong saving that. Please try again.' });
  }
};
