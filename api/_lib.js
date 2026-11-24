/* Shared helpers for the Elevate plans site. Storage is one Upstash Redis database.
   Keys:  plans (set of plan ids)   plan:<id> (content JSON)   prog:<id> (client progress JSON)
          hosts (hash: web address -> plan id)   digest:<id> (snapshot from the last weekly digest) */
const crypto = require('crypto');
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function call(path, body) {
  const r = await fetch(URL_ + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)h
  });
  if (!r.ok) throw new Error('store ' + r.status);
  return r.json();
}
async function rc(cmd) { return (await call('', cmd)).result; }
async function pipe(cmds) {
  if (!cmds.length) return [];
  return (await call('/pipeline', cmds)).map(x => x.result);
}
const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-admin-key,x-digest-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}
function send(res, code, obj) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).json(obj);
}
function same(a, b) {
  if (!a || !b) return false;
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const adminOk = req => same(req.headers['x-admin-key'] || (req.query && req.query.k), process.env.ADMIN_KEY);
const digestOk = req => adminOk(req) || same(req.headers['x-digest-key'] || (req.query && req.query.k), process.env.DIGEST_KEY);
const hostOf = req => String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase().split(':')[0];
const body = req => (typeof req.body === 'string' ? parse(req.body) : req.body) || {};
const okId = id => /^[a-z0-9-]{1,40}$/.test(id || '');

function cleanProgress(b) {
  b = b && typeof b === 'object' ? b : {};
  const done = (Array.isArray(b.done) ? b.done : []).slice(0, 1000).map(x => String(x).slice(0, 40));
  const added = (Array.isArray(b.added) ? b.added : []).slice(0, 300)
    .filter(a => a && a.id && a.title)
    .map(a => ({ id: String(a.id).slice(0, 40), title: String(a.title).slice(0, 160), mins: Math.min(240, Math.max(1, +a.mins || 20)), p: String(a.p || 'mine').slice(0, 40), d: String(a.d || '').slice(0, 10) }));
  const steps = (Array.isArray(b.steps) ? b.steps : []).slice(0, 4000).map(x => String(x).slice(0, 60));
  const ip = (Array.isArray(b.ip) ? b.ip : []).slice(0, 1000).map(x => String(x).slice(0, 40));
   return { done, ip, added, steps, t: Date.now() };
}

async function allPlans() {
  const ids = (await rc(['SMEMBERS', 'plans'])) || [];
  ids.sort();
  const rows = await pipe(ids.flatMap(id => [['GET', 'plan:' + id], ['GET', 'prog:' + id], ['GET', 'digest:' + id]]));
  const hosts = (await rc(['HGETALL', 'hosts'])) || [];
  const hostMap = {};
  for (let i = 0; i < hosts.length; i += 2) (hostMap[hosts[i + 1]] = hostMap[hosts[i + 1]] || []).push(hosts[i]);
  return ids.map((id, i) => ({
    id, plan: parse(rows[i * 3]), prog: parse(rows[i * 3 + 1]) || { done: [], added: [], t: 0 },
    snap: parse(rows[i * 3 + 2]), hosts: hostMap[id] || []
  }));
}

function summary(p) {
  const tasks = (p.plan && p.plan.tasks) || [];
  const ids = new Set(tasks.map(t => String(t.id)));
  const done = p.prog.done.filter(i => ids.has(i) || p.prog.added.some(a => a.id === i)).length;
  return { id: p.id, client: (p.plan && p.plan.client) || p.id, total: tasks.length + p.prog.added.length, done, added: p.prog.added.length, last: p.prog.t || 0, demo: !!(p.plan && p.plan.demo), hosts: p.hosts };
}

module.exports = { rc, pipe, parse, cors, send, adminOk, digestOk, hostOf, body, okId, cleanProgress, allPlans, summary };
