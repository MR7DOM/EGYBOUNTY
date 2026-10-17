const r = require('express').Router(), rate = require('express-rate-limit'), QR = require('qrcode');
const { q, tx } = require('../db');
const { E, h, hash, check, sign, auth, rnd, newSecret, totpOk } = require('../security');
const mail = require('../mail');
const lim = rate({ windowMs: 15 * 60e3, max: 30, standardHeaders: true, legacyHeaders: false });
const HANDLE = /^[A-Za-z0-9_.-]{3,24}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const pub = u => ({ id: u.id, handle: u.handle, email: u.email, role: u.role, totp_enabled: u.totp_enabled, kyc_status: u.kyc_status });

r.post('/register', lim, h(async (req, res) => {
  const b = req.body || {}, email = String(b.email || '').trim().toLowerCase(), handle = String(b.handle || '').trim();
  if (!HANDLE.test(handle) || !EMAIL.test(email) || String(b.password || '').length < 10 || !['hacker', 'company'].includes(b.role)
    || (b.role === 'company' && !String(b.company_name || '').trim())) throw new E(400, 'VALIDATION');
  if (b.accept_coc !== 'on' && b.accept_coc !== true) throw new E(400, 'COC_REQUIRED');
  if ((await q('SELECT 1 FROM users WHERE lower(handle)=lower($1) OR email=$2', [handle, email])).rows.length) throw new E(409, 'DUPLICATE');
  const auto = process.env.DEV_AUTO_VERIFY === 'true', token = rnd(24), ph = await hash(String(b.password));
  await tx(async c => {
    const u = (await c.query('INSERT INTO users(handle,email,pass_hash,role,email_verified,verify_token,coc_at) VALUES($1,$2,$3,$4,$5,$6,now()) RETURNING id',
      [handle, email, ph, b.role, auto, auto ? null : token])).rows[0];
    if (b.role === 'company') await c.query('INSERT INTO companies(owner_id,name,name_ar) VALUES($1,$2,$3)',
      [u.id, String(b.company_name).trim().slice(0, 100), String(b.company_name_ar || b.company_name).trim().slice(0, 100)]);
  });
  if (!auto) mail(email, 'EgyBounty - تأكيد البريد الإلكتروني / Verify your email', `${process.env.BASE_URL}/api/auth/verify?token=${token}`);
  res.json({ ok: true, verify: !auto });
}));

r.get('/verify', h(async (req, res) => {
  const t = String(req.query.token || ''); if (t) await q('UPDATE users SET email_verified=true,verify_token=NULL WHERE verify_token=$1', [t]);
  res.redirect('/?verified=1');
}));

r.post('/login', lim, h(async (req, res) => {
  const { email, password, otp } = req.body || {};
  const u = (await q('SELECT * FROM users WHERE email=$1', [String(email || '').trim().toLowerCase()])).rows[0];
  if (u && u.locked_until && new Date(u.locked_until) > new Date()) throw new E(429, 'LOCKED');
  const bad = async () => { if (u) await q('UPDATE users SET failed=failed+1, locked_until=CASE WHEN failed+1>=5 THEN now()+interval \'15 minutes\' ELSE locked_until END WHERE id=$1', [u.id]); };
  if (!u || !(await check(String(password || ''), u.pass_hash))) { await bad(); throw new E(401, 'BAD_LOGIN'); }
  if (!u.email_verified) throw new E(403, 'EMAIL_NOT_VERIFIED');
  if (u.totp_enabled) {
    if (!otp) throw new E(401, 'OTP_REQUIRED');
    if (!totpOk(u.totp_secret, otp)) { await bad(); throw new E(401, 'BAD_OTP'); }
  }
  await q('UPDATE users SET failed=0, locked_until=NULL WHERE id=$1', [u.id]);
  sign(res, u.id); res.json({ user: pub(u) });
}));

r.post('/logout', (req, res) => { res.clearCookie('eb'); res.json({ ok: true }); });
r.get('/me', auth([], true), (req, res) => res.json({ user: pub(req.user) }));

// 2FA is mandatory: until enabled, the account cannot use anything else
r.post('/2fa/setup', auth([], true), h(async (req, res) => {
  if (req.user.totp_enabled) throw new E(409, 'ALREADY_ENABLED');
  const secret = newSecret(); await q('UPDATE users SET totp_secret=$1 WHERE id=$2', [secret, req.user.id]);
  const uri = `otpauth://totp/EgyBounty:${encodeURIComponent(req.user.email)}?secret=${secret}&issuer=EgyBounty`;
  res.json({ secret, qr: await QR.toDataURL(uri) });
}));
r.post('/2fa/enable', auth([], true), h(async (req, res) => {
  const u = req.user; if (!u.totp_secret || !totpOk(u.totp_secret, (req.body || {}).otp)) throw new E(401, 'BAD_OTP');
  await q('UPDATE users SET totp_enabled=true WHERE id=$1', [u.id]); res.json({ ok: true });
}));
module.exports = r;
