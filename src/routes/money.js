const r = require('express').Router(), multer = require('multer'), fs = require('fs'), path = require('path');
const { q, tx } = require('../db');
const { E, h, auth, rnd, clip } = require('../security');
const mail = require('../mail');
const PRIV = path.resolve(process.env.PRIVATE_DIR || './data/private'); fs.mkdirSync(PRIV, { recursive: true, mode: 0o700 });
const MIN = Number(process.env.MIN_WITHDRAWAL || 100), COMM = Number(process.env.COMMISSION_PCT || 15);
const kycUp = multer({ dest: PRIV, limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (rq, f, cb) => ['image/png', 'image/jpeg', 'application/pdf'].includes(f.mimetype) ? cb(null, true) : cb(new E(400, 'FILE_TYPE')) });
const norm = s => String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const n2 = x => Math.round(Number(x) * 100) / 100;
async function bal(db, uid) {
  const a = (await db.query('SELECT COALESCE(SUM(net),0) AS s FROM payouts WHERE hacker_id=$1', [uid])).rows[0].s;
  const w = (await db.query("SELECT COALESCE(SUM(amount),0) AS s FROM withdrawals WHERE user_id=$1 AND status IN ('pending','paid')", [uid])).rows[0].s;
  return { earned: Number(a), withdrawn: Number(w), available: n2(Number(a) - Number(w)) };
}
const mailUser = async (id, s, t) => { const u = (await q('SELECT email FROM users WHERE id=$1', [id])).rows[0]; if (u) mail(u.email, s, t); };

r.get('/config', (req, res) => res.json({ commission: COMM, min_withdrawal: MIN, bank: process.env.PLATFORM_BANK_INFO || '' }));

r.get('/leaderboard', h(async (req, res) => {
  res.json((await q(`SELECT u.handle, COUNT(r.id) AS reports,
    COALESCE(SUM(CASE r.severity WHEN 'critical' THEN 100 WHEN 'high' THEN 50 WHEN 'medium' THEN 20 ELSE 5 END),0) AS points
    FROM users u JOIN reports r ON r.hacker_id=u.id AND r.status IN ('accepted','resolved') GROUP BY u.handle ORDER BY points DESC LIMIT 50`)).rows);
}));

r.get('/wallet', auth(['hacker', 'company']), h(async (req, res) => {
  const u = req.user;
  if (u.role === 'company') {
    const co = (await q('SELECT id,balance FROM companies WHERE owner_id=$1', [u.id])).rows[0];
    return res.json({ balance: Number(co.balance), deposits: (await q('SELECT id,amount,reference,status,created_at FROM deposits WHERE company_id=$1 ORDER BY id DESC LIMIT 100', [co.id])).rows });
  }
  res.json({ ...(await bal({ query: q }, u.id)), kyc_status: u.kyc_status,
    payouts: (await q('SELECT report_id,gross,fee,net,created_at FROM payouts WHERE hacker_id=$1 ORDER BY id DESC LIMIT 100', [u.id])).rows,
    withdrawals: (await q('SELECT id,amount,method,status,created_at FROM withdrawals WHERE user_id=$1 ORDER BY id DESC LIMIT 100', [u.id])).rows });
}));

// Company declares a bank transfer to the platform account; an admin confirms it before the balance is credited
r.post('/deposits', auth(['company']), h(async (req, res) => {
  const amt = n2((req.body || {}).amount), ref = clip((req.body || {}).reference, 100).trim();
  if (!(amt > 0 && amt <= 1e8) || !ref) throw new E(400, 'VALIDATION');
  const co = (await q('SELECT id FROM companies WHERE owner_id=$1', [req.user.id])).rows[0];
  await q('INSERT INTO deposits(company_id,amount,reference) VALUES($1,$2,$3)', [co.id, amt, ref]); res.json({ ok: true });
}));

// KYC is only requested once the hacker has earned something (national ID photo + name on the bank account)
r.post('/kyc', auth(['hacker']), kycUp.single('id_image'), h(async (req, res) => {
  const f = req.file, drop = () => f && fs.unlink(f.path, () => {});
  try {
    const name = clip((req.body || {}).name, 120).trim(); if (!f || name.length < 5) throw new E(400, 'VALIDATION');
    if (req.user.kyc_status === 'pending' || req.user.kyc_status === 'approved') throw new E(409, 'KYC_LOCKED');
    if ((await bal({ query: q }, req.user.id)).earned <= 0) throw new E(403, 'NO_EARNINGS');
  } catch (e) { drop(); throw e; }
  await q("UPDATE users SET kyc_status='pending',kyc_file=$1,kyc_name=$2 WHERE id=$3", [f.filename, clip(req.body.name, 120).trim(), req.user.id]); res.json({ ok: true });
}));

r.post('/withdraw', auth(['hacker']), h(async (req, res) => {
  const u = req.user, b = req.body || {}, amt = n2(b.amount);
  if (u.kyc_status !== 'approved') throw new E(403, 'KYC_REQUIRED');
  if (!['bank', 'instapay'].includes(b.method) || String(b.account_number || '').trim().length < 5 || !(amt > 0)) throw new E(400, 'VALIDATION');
  if (amt < MIN) throw new E(400, 'MIN_WITHDRAWAL');
  if (norm(b.account_name) !== norm(u.kyc_name)) throw new E(422, 'NAME_MISMATCH');
  await tx(async c => {
    await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [u.id]);
    if ((await bal(c, u.id)).available < amt) throw new E(402, 'INSUFFICIENT_BALANCE');
    await c.query('INSERT INTO withdrawals(user_id,amount,method,account_name,account_number) VALUES($1,$2,$3,$4,$5)', [u.id, amt, b.method, clip(b.account_name, 120), clip(b.account_number, 60).trim()]);
  });
  res.json({ ok: true });
}));

// ---------------- Admin ----------------
const adm = auth(['admin']);
r.get('/admin/kyc', adm, h(async (req, res) => res.json((await q("SELECT id,handle,email,kyc_name FROM users WHERE kyc_status='pending' ORDER BY id")).rows)));
r.get('/admin/kyc/:id/file', adm, h(async (req, res) => {
  const u = (await q('SELECT kyc_file FROM users WHERE id=$1', [+req.params.id || 0])).rows[0]; if (!u || !u.kyc_file) throw new E(404, 'NOT_FOUND');
  res.sendFile(path.join(PRIV, path.basename(u.kyc_file)), { headers: { 'Content-Disposition': 'inline', 'Cache-Control': 'no-store' } });
}));
r.post('/admin/kyc/:id', adm, h(async (req, res) => {
  const ok = !!(req.body || {}).approve, id = +req.params.id || 0;
  const x = await q("UPDATE users SET kyc_status=$1 WHERE id=$2 AND kyc_status='pending' RETURNING id", [ok ? 'approved' : 'rejected', id]); if (!x.rows.length) throw new E(404, 'NOT_FOUND');
  mailUser(id, 'EgyBounty - التحقق من الهوية / Identity check', ok ? 'Approved / تمت الموافقة' : 'Rejected - please upload a clearer ID / تم الرفض'); res.json({ ok: true });
}));
r.get('/admin/deposits', adm, h(async (req, res) => res.json((await q("SELECT d.id,d.amount,d.reference,d.created_at,c.name AS company FROM deposits d JOIN companies c ON c.id=d.company_id WHERE d.status='pending' ORDER BY d.id")).rows)));
r.post('/admin/deposits/:id/:act', adm, h(async (req, res) => {
  const ok = req.params.act === 'confirm'; if (!ok && req.params.act !== 'reject') throw new E(400, 'VALIDATION');
  const owner = await tx(async c => {
    const d = (await c.query("UPDATE deposits SET status=$1 WHERE id=$2 AND status='pending' RETURNING company_id,amount", [ok ? 'confirmed' : 'rejected', +req.params.id || 0])).rows[0];
    if (!d) throw new E(404, 'NOT_FOUND');
    if (ok) await c.query('UPDATE companies SET balance=balance+$1 WHERE id=$2', [d.amount, d.company_id]);
    return (await c.query('SELECT owner_id FROM companies WHERE id=$1', [d.company_id])).rows[0].owner_id;
  });
  mailUser(owner, 'EgyBounty - الإيداع / Deposit', ok ? 'Your deposit was confirmed / تم تأكيد الإيداع' : 'Your deposit was rejected / تم رفض الإيداع'); res.json({ ok: true });
}));
r.get('/admin/withdrawals', adm, h(async (req, res) => res.json((await q("SELECT w.id,w.amount,w.method,w.account_name,w.account_number,w.created_at,u.handle FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.status='pending' ORDER BY w.id")).rows)));
r.post('/admin/withdrawals/:id/:act', adm, h(async (req, res) => {
  const paid = req.params.act === 'paid'; if (!paid && req.params.act !== 'reject') throw new E(400, 'VALIDATION');
  const w = (await q(`UPDATE withdrawals SET status=$1${paid ? ',paid_at=now()' : ''} WHERE id=$2 AND status='pending' RETURNING user_id`, [paid ? 'paid' : 'rejected', +req.params.id || 0])).rows[0];
  if (!w) throw new E(404, 'NOT_FOUND');
  mailUser(w.user_id, 'EgyBounty - السحب / Withdrawal', paid ? 'Your withdrawal was sent / تم تحويل المبلغ' : 'Your withdrawal was rejected / تم رفض السحب'); res.json({ ok: true });
}));
module.exports = r;
