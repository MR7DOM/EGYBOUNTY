const { Pool } = require('pg'), fs = require('fs'), path = require('path');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = (text, params) => pool.query(text, params);
async function tx(fn) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; }
  catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
  finally { c.release(); }
}
const init = () => pool.query(fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8'));
module.exports = { pool, q, tx, init };
