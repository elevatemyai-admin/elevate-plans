/* GET /api/digest?k=<DIGEST_KEY>[&mark=1]
   A plain-language weekly summary across all clients. mark=1 saves today's numbers as the new "last week" baseline. */
const L = require('./_lib');
const DAY = 86400000;
module.exports = async (req, res) => {
  L.cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!L.digestOk(req)) return L.send(res, 401, { error: 'Wrong key.' });
  try {
    const all = (await L.allPlans()).filter(p => p.plan && !p.plan.demo);
    const now = Date.now();
    const out = [], marks = [];
    all.forEach(p => {
      const s = L.summary(p);
      const titles = {};
      (p.plan.tasks || []).forEach(t => (titles[String(t.id)] = String(t.title).replace(/<[^>]+>/g, '')));
      p.prog.added.forEach(a => (titles[a.id] = a.title));
      const prevDone = new Set((p.snap && p.snap.done) || []);
      const prevAdded = new Set(((p.snap && p.snap.added) || []).map(a => a.id));
      const newlyDone = p.prog.done.filter(i => !prevDone.has(i) && titles[i]).map(i => titles[i]);
      const newlyAdded = p.prog.added.filter(a => !prevAdded.has(a.id)).map(a => a.title);
      const idle = s.last ? Math.floor((now - s.last) / DAY) : null;
      const left = (p.plan.tasks || []).filter(t => !p.prog.done.includes(String(t.id))).slice(0, 3).map(t => String(t.title).replace(/<[^>]+>/g, ''));
      out.push({ ...s, newlyDone, newlyAdded, idleDays: idle, upNext: left, firstWeek: !p.snap });
      marks.push(['SET', 'digest:' + p.id, JSON.stringify({ done: p.prog.done, added: p.prog.added, t: now })]);
    });
    // client feedback form: how many responses since the last digest
    const fbLast = +((await L.rc(['GET', 'feedback:digest'])) || 0);
    const fbRows = ((await L.rc(['LRANGE', 'feedback', 0, 499])) || []).map(L.parse).filter(Boolean);
    const fbNew = fbRows.filter(f => f.t > fbLast).length;
    if (req.query && req.query.mark === '1') { marks.push(['SET', 'feedback:digest', String(now)]); await L.pipe(marks); }
    const lines = ['Weekly client plan digest', ''];
    if (!out.length) lines.push('No client plans yet.');
    out.forEach(o => {
      lines.push(`${o.client}: ${o.done} of ${o.total} steps done${o.firstWeek ? ' (first digest)' : ''}`);
      if (o.newlyDone.length) lines.push('  Finished this week: ' + o.newlyDone.join('; '));
      if (o.newlyAdded.length) lines.push('  They added: ' + o.newlyAdded.join('; '));
      if (!o.newlyDone.length && !o.newlyAdded.length) lines.push('  No new activity this week.');
      if (o.idleDays !== null && o.idleDays >= 14) lines.push(`  Quiet for ${o.idleDays} days: worth a nudge.`);
      if (o.idleDays === null) lines.push('  They have not opened it yet.');
      if (o.upNext.length) lines.push('  Next up: ' + o.upNext.join('; '));
      lines.push('');
    });
    lines.push(fbNew ? `Client feedback: ${fbNew} new response${fbNew === 1 ? '' : 's'} this week. Read them at elevate-plans.vercel.app/feedback/responses` : 'Client feedback: no new responses this week.');
    lines.push('');
    lines.push('Reminder: download a backup from the admin page once a month.');
    return L.send(res, 200, { text: lines.join('\n'), plans: out, marked: req.query && req.query.mark === '1' });
  } catch (e) {
    return L.send(res, 500, { error: 'Could not reach the store.' });
  }
};
