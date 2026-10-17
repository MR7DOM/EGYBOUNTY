const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), crypto = require('crypto');
const { q } = require('./db');
class E extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const hash = p => bcrypt.hash(p, 12), check = (p, x) => bcrypt.compare(p, x);
const rnd = n => crypto.randomBytes(n).toString('hex');
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
const sign = (res, id) => res.cookie('eb', jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '12h' }),
  { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 12 * 3600e3 });

// Every authenticated route requires 2FA to be enabled, except the 2FA setup routes (setup=true).
const auth = (roles = [], setup = false) => async (req, res, next) => {
  try {
    const t = req.cookies && req.cookies.eb; if (!t) throw new E(401, 'AUTH');
    let p; try { p = jwt.verify(t, process.env.JWT_SECRET); } catch { throw new E(401, 'AUTH'); }
    const u = (await q('SELECT * FROM users WHERE id=$1', [p.id])).rows[0]; if (!u) throw new E(401, 'AUTH');
    if (!setup && !u.totp_enabled) throw new E(403, '2FA_SETUP');
    if (roles.length && !roles.includes(u.role)) throw new E(403, 'FORBIDDEN');
    req.user = u; next();
  } catch (e) { next(e); }
};

// RFC 6238 TOTP (SHA-1, 6 digits, 30s): works with Google Authenticator, Microsoft Authenticator, Authy
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32enc = buf => { let bits = '', o = ''; for (const x of buf) bits += x.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) o += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return o; };
const b32dec = s => { let bits = ''; for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const o = []; for (let i = 0; i + 8 <= bits.length; i += 8) o.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(o); };
const hotp = (secret, counter) => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(counter));
  const m = crypto.createHmac('sha1', b32dec(secret)).update(b).digest(), o = m[19] & 15;
  return String((m.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0'); };
const totp = secret => hotp(secret, Math.floor(Date.now() / 30000));
const totpOk = (secret, code) => { const c = Math.floor(Date.now() / 30000), x = String(code || '').trim();
  return [-1, 0, 1].some(d => { const a = Buffer.from(hotp(secret, c + d)), b = Buffer.from(x); return a.length === b.length && crypto.timingSafeEqual(a, b); }); };
const newSecret = () => b32enc(crypto.randomBytes(20));

module.exports = { E, h, hash, check, sign, auth, rnd, clip, newSecret, totp, totpOk };
