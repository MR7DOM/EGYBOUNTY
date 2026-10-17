require('dotenv').config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !process.env.DATABASE_URL) { console.error('DATABASE_URL and JWT_SECRET (32+ chars) are required. See .env.example'); process.exit(1); }
const express = require('express'), helmet = require('helmet'), rate = require('express-rate-limit'), cookie = require('cookie-parser'), path = require('path');
const { init, q } = require('./db'), { hash } = require('./security');
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: null } } }));
app.use(rate({ windowMs: 60e3, max: 300 }));
app.use(express.json({ limit: '100kb' }));
app.use(cookie());
// CSRF defence in depth (cookie is SameSite=Strict): reject cross-origin state-changing requests
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.headers.origin) { try { if (new URL(req.headers.origin).host !== req.headers.host) throw 0; } catch { return res.status(403).json({ code: 'CSRF' }); } }
  next();
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api', require('./routes/reports'));
app.use('/api', require('./routes/money'));
app.use('/api', (req, res) => res.status(404).json({ code: 'NOT_FOUND' }));
app.use(express.static(path.join(__dirname, '../public'), { dotfiles: 'ignore' }));
app.use((e, req, res, next) => {
  if (e.code === '23505') return res.status(409).json({ code: 'DUPLICATE' });
  if (e.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ code: 'FILE_TOO_BIG' });
  if (e.status) return res.status(e.status).json({ code: e.code });
  console.error(e); res.status(500).json({ code: 'SERVER_ERROR' });
});
async function start() {
  await init();
  const { ADMIN_EMAIL: em, ADMIN_PASSWORD: pw } = process.env;
  if (em && pw && !(await q('SELECT 1 FROM users WHERE email=$1', [em.toLowerCase()])).rows.length)
    await q("INSERT INTO users(handle,email,pass_hash,role,email_verified,coc_at) VALUES('admin',$1,$2,'admin',true,now())", [em.toLowerCase(), await hash(pw)]);
  app.listen(process.env.PORT || 3000, () => console.log('EgyBounty running on port ' + (process.env.PORT || 3000)));
}
if (require.main === module) start().catch(e => { console.error(e); process.exit(1); });
module.exports = { app, start };
