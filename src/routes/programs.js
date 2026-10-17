const r = require('express').Router(), dns = require('dns').promises;
const { q, tx } = require('../db');
const { E, h, auth, rnd, clip } = require('../security');
const DOM = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const SECT = ['bank', 'telecom', 'ecommerce', 'health', 'logistics', 'gov', 'other'];
const cleanDom = d => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[\/:].*$/, '');
const txtHas = async (d, token) => { try { return (await dns.resolveTxt(d)).some(a => a.join('') === token); } catch { return false; } };
const own = async req => {
  const p = (await q('SELECT p.*,c.owner_id FROM programs p JOIN companies c ON c.id=p.company_id WHERE p.id=$1', [req.params.id])).rows[0];
  if (!p || (p.owner_id !== req.user.id && req.user.role !== 'admin')) throw new E(404, 'NOT_FOUND'); return p;
};
async function withDomains(rows, all) {
  if (!rows.length) return rows;
  const ds = (await q(`SELECT id,program_id,domain,token,verified FROM program_domains WHERE program_id IN (${rows.map(p => Number(p.id)).join(',')}) ${all ? '' : 'AND verified'} ORDER BY id`)).rows;
  return rows.map(p => ({ ...p, domains: ds.filter(d => d.program_id === p.id).map(d => all ? d : d.domain) }));
}

r.get('/', h(async (req, res) => {
  const args = [], w = ["p.status='active'"];
  if (SECT.includes(req.query.sector)) { args.push(req.query.sector); w.push(`p.sector=$${args.length}`); }
  if (req.query.q) { args.push('%' + clip(req.query.q, 50) + '%'); w.push(`(p.name ILIKE $${args.length} OR p.name_ar ILIKE $${args.length} OR p.description ILIKE $${args.length})`); }
  const rows = (await q(`SELECT p.id,p.name,p.name_ar,p.sector,p.description,p.description_ar,p.rewards,c.name AS company FROM programs p JOIN companies c ON c.id=p.company_id WHERE ${w.join(' AND ')} ORDER BY p.id DESC`, args)).rows;
  res.json(await withDomains(rows, false));
}));

r.get('/mine', auth(['company']), h(async (req, res) => {
  const rows = (await q('SELECT p.* FROM programs p JOIN companies c ON c.id=p.company_id WHERE c.owner_id=$1 ORDER BY p.id DESC', [req.user.id])).rows;
  res.json(await withDomains(rows, true));
}));

r.get('/:id', auth(), h(async (req, res) => {
  const p = (await q('SELECT p.id,p.name,p.name_ar,p.sector,p.description,p.description_ar,p.rewards,p.status,c.name AS company,c.owner_id FROM programs p JOIN companies c ON c.id=p.company_id WHERE p.id=$1', [+req.params.id || 0])).rows[0];
  if (!p || (p.status !== 'active' && p.owner_id !== req.user.id && req.user.role !== 'admin')) throw new E(404, 'NOT_FOUND');
  delete p.owner_id; res.json((await withDomains([p], false))[0]);
}));

r.post('/', auth(['company']), h(async (req, res) => {
  const b = req.body || {}, rw = Array.isArray(b.rewards) ? b.rewards.map(Number) : [];
  if (!String(b.name || '').trim() || !SECT.includes(b.sector) || rw.length !== 4 || rw.some(x => !(x >= 0 && x <= 1e7))) throw new E(400, 'VALIDATION');
  const doms = [...new Set((Array.isArray(b.domains) ? b.domains : []).map(cleanDom))].filter(d => DOM.test(d)).slice(0, 20);
  if (!doms.length) throw new E(400, 'NO_DOMAIN');
  const co = (await q('SELECT id FROM companies WHERE owner_id=$1', [req.user.id])).rows[0];
  const out = await tx(async c => {
    const p = (await c.query('INSERT INTO programs(company_id,name,name_ar,sector,description,description_ar,rewards) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [co.id, clip(b.name, 80), clip(b.name_ar || b.name, 80), b.sector, clip(b.description, 4000), clip(b.description_ar || b.description, 4000), JSON.stringify(rw)])).rows[0];
    for (const d of doms) await c.query('INSERT INTO program_domains(program_id,domain,token) VALUES($1,$2,$3)', [p.id, d, 'egybounty-verify=' + rnd(12)]);
    return p;
  });
  res.json(out);
}));

r.post('/:id/domains', auth(['company']), h(async (req, res) => {
  const p = await own(req), d = cleanDom((req.body || {}).domain); if (!DOM.test(d)) throw new E(400, 'VALIDATION');
  await q('INSERT INTO program_domains(program_id,domain,token) VALUES($1,$2,$3)', [p.id, d, 'egybounty-verify=' + rnd(12)]); res.json({ ok: true });
}));

// DNS TXT verification: the company proves it controls the domain by publishing the token as a TXT record
r.post('/:id/domains/:did/verify', auth(['company']), h(async (req, res) => {
  const p = await own(req), d = (await q('SELECT * FROM program_domains WHERE id=$1 AND program_id=$2', [+req.params.did || 0, p.id])).rows[0];
  if (!d) throw new E(404, 'NOT_FOUND');
  if ((await q('SELECT 1 FROM program_domains WHERE domain=$1 AND verified AND id<>$2', [d.domain, d.id])).rows.length) throw new E(409, 'DOMAIN_TAKEN');
  if (!(await txtHas(d.domain, d.token))) throw new E(422, 'DNS_NOT_FOUND');
  await q('UPDATE program_domains SET verified=true,verified_at=now() WHERE id=$1', [d.id]);
  await q("UPDATE programs SET status='active' WHERE id=$1 AND status='pending'", [p.id]); res.json({ ok: true });
}));

r.patch('/:id', auth(['company', 'admin']), h(async (req, res) => {
  const p = await own(req), s = (req.body || {}).status;
  if (!['active', 'paused'].includes(s) || p.status === 'pending') throw new E(400, 'VALIDATION');
  await q('UPDATE programs SET status=$1 WHERE id=$2', [s, p.id]); res.json({ ok: true });
}));
module.exports = r;
