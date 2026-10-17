const r = require('express').Router(), multer = require('multer'), fs = require('fs'), path = require('path');
const { q, tx } = require('../db');
const { E, h, auth, clip } = require('../security');
const { cvss } = require('../cvss');
const mail = require('../mail');
const UP = path.resolve(process.env.UPLOAD_DIR || './data/uploads'); fs.mkdirSync(UP, { recursive: true });
const SEV = ['critical', 'high', 'medium', 'low'], STAT = ['new', 'triaged', 'accepted', 'resolved', 'duplicate', 'na'];
const COMM = Number(process.env.COMMISSION_PCT || 15);
const OKM = ['image/png', 'image/jpeg', 'application/pdf', 'video/mp4', 'text/plain'];
const up = multer({ dest: UP, limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (rq, f, cb) => OKM.includes(f.mimetype) ? cb(null, true) : cb(new E(400, 'FILE_TYPE')) });
const hostOf = a => { try { const s = String(a || '').trim(); return new URL(/^https?:\/\//i.test(s) ? s : 'http://' + s).hostname.toLowerCase(); } catch { return null; } };
const words = s => new Set(String(s).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);

// Possible-duplicate hint (shown to the company only): same program + asset, similar title words
async function dupHint(pid, asset, title, hid) {
  const rows = (await q("SELECT id,title FROM reports WHERE program_id=$1 AND hacker_id<>$2 AND status<>'na' AND lower(asset)=lower($3) ORDER BY id DESC LIMIT 100", [pid, hid, asset])).rows;
  const a = words(title); let best = null, bs = 0;
  for (const x of rows) { const b = words(x.title), s = [...a].filter(w => b.has(w)).length / Math.max(1, Math.min(a.size, b.size)); if (s > bs) { bs = s; best = x.id; } }
  return bs >= 0.6 ? best : null;
}
// Access: the hacker who wrote it, the company that owns the program, or an admin. Others get 404.
async function getReport(u, id) {
  const x = (await q(`SELECT r.*,p.company_id,p.name AS program,p.name_ar AS program_ar,c.owner_id AS company_owner,hk.handle
    FROM reports r JOIN programs p ON p.id=r.program_id JOIN companies c ON c.id=p.company_id JOIN users hk ON hk.id=r.hacker_id WHERE r.id=$1`, [+id || 0])).rows[0];
  if (!x || !(u.role === 'admin' || u.id === x.hacker_id || u.id === x.company_owner)) throw new E(404, 'NOT_FOUND'); return x;
}
const otherParty = async (rp, u) => (await q('SELECT email FROM users WHERE id=$1', [u.id === rp.hacker_id ? rp.company_owner : rp.hacker_id])).rows[0];

r.get('/cvss', h(async (req, res) => { const c = cvss(req.query.vector); if (!c) throw new E(400, 'VALIDATION'); res.json(c); }));

r.post('/programs/:id/reports', auth(['hacker']), h(async (req, res) => {
  const p = (await q("SELECT p.*,u.email AS owner_email FROM programs p JOIN companies c ON c.id=p.company_id JOIN users u ON u.id=c.owner_id WHERE p.id=$1 AND p.status='active'", [+req.params.id || 0])).rows[0];
  if (!p) throw new E(404, 'NOT_FOUND');
  const b = req.body || {}, host = hostOf(b.asset);
  const doms = (await q('SELECT domain FROM program_domains WHERE program_id=$1 AND verified', [p.id])).rows.map(x => x.domain);
  if (!host || !doms.some(d => host === d || host.endsWith('.' + d))) throw new E(422, 'NOT_IN_SCOPE');
  const cv = b.cvss_vector ? cvss(b.cvss_vector) : null, sev = cv ? cv.severity : b.severity;
  if (!SEV.includes(sev) || !String(b.title || '').trim() || !String(b.description || '').trim()) throw new E(400, 'VALIDATION');
  const dup = await dupHint(p.id, clip(b.asset, 300), b.title, req.user.id);
  const id = (await q('INSERT INTO reports(program_id,hacker_id,title,asset,severity,cvss_vector,cvss_score,description,steps,impact,dup_hint) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
    [p.id, req.user.id, clip(b.title, 200), clip(b.asset, 300), sev, cv ? clip(b.cvss_vector, 100) : null, cv ? cv.score : null, clip(b.description, 20000), clip(b.steps, 20000), clip(b.impact, 5000), dup])).rows[0].id;
  mail(p.owner_email, `EgyBounty - تقرير جديد #${id} / New report`, `${p.name}: ${clip(b.title, 200)} (${sev})\n${process.env.BASE_URL}`);
  res.json({ id });
}));

r.get('/reports', auth(), h(async (req, res) => {
  const u = req.user, f = u.role === 'hacker' ? 'r.hacker_id=$1' : u.role === 'company' ? 'c.owner_id=$1' : '$1=$1';
  const rows = (await q(`SELECT r.id,r.title,r.asset,r.severity,r.cvss_score,r.status,r.bounty,r.dup_hint,r.created_at,p.name AS program,p.name_ar AS program_ar,hk.handle
    FROM reports r JOIN programs p ON p.id=r.program_id JOIN companies c ON c.id=p.company_id JOIN users hk ON hk.id=r.hacker_id WHERE ${f} ORDER BY r.id DESC LIMIT 500`, [u.id])).rows;
  res.json(u.role === 'hacker' ? rows.map(x => ({ ...x, dup_hint: null })) : rows);
}));

r.get('/reports/:id', auth(), h(async (req, res) => {
  const rp = await getReport(req.user, req.params.id), id = rp.id;
  if (req.user.role === 'hacker') rp.dup_hint = null;
  ['company_owner', 'company_id', 'hacker_id'].forEach(k => delete rp[k]);
  const comments = (await q('SELECT c.id,c.body,c.created_at,u.handle,u.role FROM comments c JOIN users u ON u.id=c.user_id WHERE c.report_id=$1 ORDER BY c.id', [id])).rows;
  const attachments = (await q('SELECT id,filename,size FROM attachments WHERE report_id=$1 ORDER BY id', [id])).rows;
  res.json({ report: rp, comments, attachments });
}));

r.patch('/reports/:id/status', auth(['company', 'admin']), h(async (req, res) => {
  const rp = await getReport(req.user, req.params.id), { status, duplicate_of } = req.body || {};
  if (!STAT.includes(status)) throw new E(400, 'VALIDATION');
  if (['duplicate', 'na'].includes(status) && Number(rp.bounty) > 0) throw new E(409, 'ALREADY_PAID');
  let dup = null;
  if (status === 'duplicate') { dup = (await q('SELECT id FROM reports WHERE id=$1 AND program_id=$2 AND id<>$3', [+duplicate_of || 0, rp.program_id, rp.id])).rows[0]; if (!dup) throw new E(400, 'VALIDATION'); }
  await q('UPDATE reports SET status=$1,duplicate_of=$2,updated_at=now() WHERE id=$3', [status, dup ? dup.id : null, rp.id]);
  const hk = (await q('SELECT email FROM users WHERE id=$1', [rp.hacker_id])).rows[0];
  mail(hk.email, `EgyBounty - تحديث التقرير #${rp.id} / Report update`, `${rp.title}\n=> ${status}\n${process.env.BASE_URL}`); res.json({ ok: true });
}));

// Award a bounty: debits the company balance, credits the hacker (net of platform commission) - atomic
r.post('/reports/:id/bounty', auth(['company']), h(async (req, res) => {
  const rp = await getReport(req.user, req.params.id), amt = Math.round(Number((req.body || {}).amount) * 100) / 100;
  if (!(amt > 0 && amt <= 1e7)) throw new E(400, 'VALIDATION');
  if (Number(rp.bounty) > 0) throw new E(409, 'ALREADY_PAID');
  if (['duplicate', 'na'].includes(rp.status)) throw new E(409, 'BAD_STATUS');
  const fee = Math.round(amt * COMM) / 100, net = Math.round((amt - fee) * 100) / 100;
  await tx(async c => {
    if (!(await c.query('UPDATE companies SET balance=balance-$1 WHERE id=$2 AND balance>=$1 RETURNING id', [amt, rp.company_id])).rows.length) throw new E(402, 'INSUFFICIENT_BALANCE');
    await c.query('INSERT INTO payouts(report_id,hacker_id,company_id,gross,fee,net) VALUES($1,$2,$3,$4,$5,$6)', [rp.id, rp.hacker_id, rp.company_id, amt, fee, net]);
    await c.query("UPDATE reports SET bounty=$1,status=CASE WHEN status IN ('new','triaged') THEN 'accepted' ELSE status END,updated_at=now() WHERE id=$2", [amt, rp.id]);
  });
  const hk = (await q('SELECT email FROM users WHERE id=$1', [rp.hacker_id])).rows[0];
  mail(hk.email, `EgyBounty - مكافأة جديدة / New bounty`, `#${rp.id}: ${net} EGP (after ${COMM}% commission)\n${process.env.BASE_URL}`);
  res.json({ ok: true, net, fee });
}));

r.post('/reports/:id/comments', auth(), h(async (req, res) => {
  const rp = await getReport(req.user, req.params.id), body = clip((req.body || {}).body, 5000).trim(); if (!body) throw new E(400, 'VALIDATION');
  await q('INSERT INTO comments(report_id,user_id,body) VALUES($1,$2,$3)', [rp.id, req.user.id, body]);
  const o = await otherParty(rp, req.user); if (o) mail(o.email, `EgyBounty - تعليق جديد #${rp.id} / New comment`, process.env.BASE_URL);
  res.json({ ok: true });
}));

r.post('/reports/:id/attachments', auth(['hacker', 'company']), up.single('file'), h(async (req, res) => {
  const rp = await getReport(req.user, req.params.id).catch(e => { if (req.file) fs.unlink(req.file.path, () => {}); throw e; });
  if (!req.file) throw new E(400, 'VALIDATION');
  await q('INSERT INTO attachments(report_id,user_id,filename,stored,mime,size) VALUES($1,$2,$3,$4,$5,$6)',
    [rp.id, req.user.id, clip(path.basename(req.file.originalname), 120), req.file.filename, req.file.mimetype, req.file.size]); res.json({ ok: true });
}));

r.get('/attachments/:id', auth(), h(async (req, res) => {
  const a = (await q('SELECT * FROM attachments WHERE id=$1', [+req.params.id || 0])).rows[0]; if (!a) throw new E(404, 'NOT_FOUND');
  await getReport(req.user, a.report_id); res.download(path.join(UP, path.basename(a.stored)), a.filename);
}));
module.exports = r;
