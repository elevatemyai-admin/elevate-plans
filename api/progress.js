/* POST /api/progress  -> saves ticked steps and steps the client added, for this web address's plan. */
const L = require('./_lib');
module.exports = async (req, res) => {
  L.cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed' });
  try {
    const id = await L.rc(['HGET', 'hosts', L.hostOf(req)]);
    if (!id) return L.send(res, 404, { error: 'No plan lives at this address.' });
    const plan = L.parse(await L.rc(['GET', 'plan:' + id]));
    if (!plan || plan.demo) return L.send(res, 200, { ok: true, demo: true });
    await L.rc(['SET', 'prog:' + id, JSON.stringify(L.cleanProgress(L.body(req)))]);
    return L.send(res, 200, { ok: true });
  } catch (e) {
    return L.send(res, 500, { error: 'Could not reach the store.' });
  }
};
