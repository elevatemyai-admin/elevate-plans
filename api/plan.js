/* GET /api/plan  -> the plan for this web address, plus the client's saved progress.
   ?id=<plan> only works with the admin key (used for previews) or for a demo plan. */
const L = require('./_lib');
module.exports = async (req, res) => {
  L.cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    let id = null;
    const asked = req.query && req.query.id;
    if (asked && L.okId(asked)) {
      const p = L.parse(await L.rc(['GET', 'plan:' + asked]));
      if (p && (p.demo || L.adminOk(req))) id = asked;
    }
    if (!id) id = await L.rc(['HGET', 'hosts', L.hostOf(req)]);
    if (!id) return L.send(res, 404, { error: 'No plan lives at this address.' });
    const [pl, pr] = await L.pipe([['GET', 'plan:' + id], ['GET', 'prog:' + id]]);
    const plan = L.parse(pl);
    if (!plan) return L.send(res, 404, { error: 'Plan not found.' });
    const prog = plan.demo ? { done: [], added: [], steps: [] } : (L.parse(pr) || { done: [], added: [], steps: [] });
    return L.send(res, 200, { id, plan, progress: prog, rev: plan.t || 0, savedAt: prog.t || 0 });
  } catch (e) {
    return L.send(res, 500, { error: 'Could not reach the store.' });
  }
};
