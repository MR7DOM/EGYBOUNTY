// CVSS v3.1 base score calculator (FIRST specification)
const AV = { N: .85, A: .62, L: .55, P: .2 }, AC = { L: .77, H: .44 }, UI = { N: .85, R: .62 }, CIA = { H: .56, L: .22, N: 0 };
const PR = { U: { N: .85, L: .62, H: .27 }, C: { N: .85, L: .68, H: .5 } };
const roundup = x => { const i = Math.round(x * 100000); return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10; };
function cvss(vec) {
  const m = {}; String(vec || '').replace(/^CVSS:3\.[01]\//, '').split('/').forEach(p => { const [k, v] = p.split(':'); m[k] = v; });
  if (!['U', 'C'].includes(m.S)) return null;
  const v = [AV[m.AV], AC[m.AC], (PR[m.S] || {})[m.PR], UI[m.UI], CIA[m.C], CIA[m.I], CIA[m.A]];
  if (v.some(x => x === undefined)) return null;
  const [av, ac, pr, ui, c, i, a] = v, iss = 1 - (1 - c) * (1 - i) * (1 - a);
  const imp = m.S === 'U' ? 6.42 * iss : 7.52 * (iss - .029) - 3.25 * Math.pow(iss - .02, 15), ex = 8.22 * av * ac * pr * ui;
  const score = imp <= 0 ? 0 : m.S === 'U' ? roundup(Math.min(imp + ex, 10)) : roundup(Math.min(1.08 * (imp + ex), 10));
  return { score, severity: score < 4 ? 'low' : score < 7 ? 'medium' : score < 9 ? 'high' : 'critical' };
}
module.exports = { cvss };
