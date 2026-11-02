// MIT. A notebook checks observations; it does not reimplement a calculator.
'use strict';
const fs = require('node:fs');
function csv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || field === '') quoted = !quoted;
      else throw new Error('Quote inside an unquoted field');
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(x => x !== '')) rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function check(text) {
  const rows = csv(text.replace(/^\uFEFF/, ''));
  const header = ['case', 'kind', 'expected', 'observed', 'tolerance', 'note'];
  if (JSON.stringify(rows.shift()) !== JSON.stringify(header)) throw new Error('Expected header: ' + header.join(','));
  const seen = new Set();
  return rows.map((r, i) => {
    if (r.length !== 6 || !r[0] || seen.has(r[0])) throw new Error(`Invalid or duplicate case at row ${i + 2}`);
    seen.add(r[0]);
    const [id, kind, expected, observed, tolerance, note] = r;
    if (!expected.trim() || !observed.trim()) throw new Error(`${id}: expected and observed must not be blank`);
    let pass, difference = null;
    if (kind === 'text') {
      if (tolerance !== '') throw new Error(`${id}: text cases have no tolerance`);
      pass = expected === observed;
    } else if (kind === 'number') {
      const valid = s => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s) && Number.isFinite(Number(s));
      if (![expected, observed, tolerance].every(valid) || Number(tolerance) < 0) throw new Error(`${id}: use finite decimal numbers and a nonnegative tolerance`);
      difference = Math.abs(Number(observed) - Number(expected));
      pass = difference <= Number(tolerance);
    } else throw new Error(`${id}: kind must be number or text`);
    return { id, kind, expected, observed, tolerance, note, pass, difference };
  });
}
function markdown(rows) {
  const esc = s => String(s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  return ['| Case | Expected | Observed | Result | Note |', '|---|---|---|---|---|', ...rows.map(r => `| ${[r.id, r.expected, r.observed, r.pass ? 'match' : 'DIFF', r.note].map(esc).join(' | ')} |`)].join('\n');
}
module.exports = { csv, check, markdown };
if (require.main === module) {
  try {
    const rows = check(fs.readFileSync(process.argv[2] || 'data/example.csv', 'utf8'));
    if (process.argv.includes('--markdown')) console.log(markdown(rows));
    else { console.log(`${rows.length} observations: ${rows.filter(r => r.pass).length} match, ${rows.filter(r => !r.pass).length} differ.`); for (const r of rows.filter(r => !r.pass)) console.log(`${r.id}: expected ${r.expected}, observed ${r.observed}`); }
    if (rows.some(r => !r.pass)) process.exitCode = 1;
  } catch (e) { console.error(e.message); process.exitCode = 2; }
}
