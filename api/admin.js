/* POST /api/admin  (header x-admin-key)  { action, ... }
   list | get{id} | save{id,plan,hosts} | saveProgress{id,progress} | delete{id} | export | import{data} */
const L = require('./_lib');
module.exports = async (req, res) => {
  L.cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed' });
  if (!process.env.ADMIN_KEY) return L.send(res, 500, { error: 'ADMIN_KEY is not set in Vercel.' });
  if (!L.adminOk(req)) return L.send(res, 401, { error: 'Wrong key.' });
  const b = L.body(req);
  try {
    if (b.action === 'list') {
      return L.send(res, 200, { plans: (await L.allPlans()).map(L.summary) });
    }
    if (b.action === 'get') {
      if (!L.okId(b.id)) return L.send(res, 400, { error: 'Bad id' });
      const p = (await L.allPlans()).find(x => x.id === b.id);
      return L.send(res, 200, p ? { id: p.id, plan: p.plan, progress: p.prog, hosts: p.hosts } : { id: b.id, plan: null, progress: { done: [], added: [] }, hosts: [] });
    }
    if (b.action === 'save') {
      if (!L.okId(b.id)) return L.send(res, 400, { error: 'Plan id: lowercase letters, numbers and dashes only.' });
      const plan = b.plan;
      if (!plan || typeof plan !== 'object' || !Array.isArray(plan.projects) || !Array.isArray(plan.tasks)) return L.send(res, 400, { error: 'Plan needs projects and tasks.' });
      plan.t = Date.now();
      const s = JSON.stringify(plan);
      if (s.length > 400000) return L.send(res, 400, { error: 'Plan is too large.' });
      const cmds = [['SET', 'plan:' + b.id, s], ['SADD', 'plans', b.id]];
      if (Array.isArray(b.hosts)) {
        const cur = (await L.rc(['HGETALL', 'hosts'])) || [];
        for (let i = 0; i < cur.length; i += 2) if (cur[i + 1] === b.id) cmds.push(['HDEL', 'hosts', cur[i]]);
        b.hosts.map(h => String(h).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()).filter(Boolean)
          .forEach(h => cmds.push(['HSET', 'hosts', h, b.id]));
      }
      await L.pipe(cmds);
      return L.send(res, 200, { ok: true, t: plan.t });
    }
    if (b.action === 'saveProgress') {
      if (!L.okId(b.id)) return L.send(res, 400, { error: 'Bad id' });
      await L.rc(['SET', 'prog:' + b.id, JSON.stringify(L.cleanProgress(b.progress))]);
      return L.send(res, 200, { ok: true });
    }
    if (b.action === 'delete') {
      if (!L.okId(b.id)) return L.send(res, 400, { error: 'Bad id' });
      const cur = (await L.rc(['HGETALL', 'hosts'])) || [];
      const cmds = [['DEL', 'plan:' + b.id], ['DEL', 'prog:' + b.id], ['DEL', 'digest:' + b.id], ['SREM', 'plans', b.id]];
      for (let i = 0; i < cur.length; i += 2) if (cur[i + 1] === b.id) cmds.push(['HDEL', 'hosts', cur[i]]);
      await L.pipe(cmds);
      return L.send(res, 200, { ok: true });
    }
    if (b.action === 'export') {
      const all = await L.allPlans();
      return L.send(res, 200, { exportedAt: new Date().toISOString(), plans: all.map(p => ({ id: p.id, plan: p.plan, progress: p.prog, hosts: p.hosts })) });
    }
    if (b.action === 'import') {
      const list = (b.data && b.data.plans) || [];
      const cmds = [];
      list.forEach(p => {
        if (!L.okId(p.id) || !p.plan) return;
        cmds.push(['SET', 'plan:' + p.id, JSON.stringify(p.plan)], ['SADD', 'plans', p.id]);
        if (p.progress) cmds.push(['SET', 'prog:' + p.id, JSON.stringify(L.cleanProgress(p.progress))]);
        (p.hosts || []).forEach(h => cmds.push(['HSET', 'hosts', String(h).toLowerCase(), p.id]));
      });
      await L.pipe(cmds);
      return L.send(res, 200, { ok: true, restored: list.length });
    }
    return L.send(res, 400, { error: 'Unknown action' });
  } catch (e) {
    return L.send(res, 500, { error: 'Could not reach the store.' });
  }
};
