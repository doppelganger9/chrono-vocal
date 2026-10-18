// Mesures lues dans les sorties des outils (#57), pour npm run verifier et la description de PR. Pur.

/** Sortie de node --test → nombres de tests @param {string} out */
function parseNodeTest(out) {
  const n = (/** @type {string} */ k) => Number((out.match(new RegExp('^ℹ ' + k + ' (\\d+)', 'm')) || [])[1] || 0);
  return { pass: n('pass'), fail: n('fail'), skipped: n('skipped') };
}

/** Sortie de Playwright → nombres de tests et durée (« 175 passed (39.1s) », « (1.2m) ») @param {string} out */
function parsePlaywright(out) {
  const n = (/** @type {string} */ k) => Number((out.match(new RegExp('^\\s+(\\d+) ' + k + '\\b', 'm')) || [])[1] || 0);
  const d = out.match(/^\s+\d+ passed \((\d+(?:\.\d+)?)(ms|s|m)\)/m);
  const seconds = d ? Math.round(Number(d[1]) * (d[2] === 'm' ? 60 : d[2] === 'ms' ? 0.001 : 1) * 10) / 10 : 0;
  return { passed: n('passed'), failed: n('failed'), flaky: n('flaky'), skipped: n('skipped'), seconds };
}

/** coverage/coverage-summary.md → pourcentages @param {string} md */
function parseCoverage(md) {
  const p = (/** @type {string} */ k) => Number((md.match(new RegExp('\\| ' + k + ' \\|[^|\\d]*([\\d.]+) %')) || [])[1] || 0);
  return { statements: p('Statements'), branches: p('Branches'), lines: p('Lines') };
}

const KILLED = ['Killed', 'Timeout'], NOT_COUNTED = ['Ignored', 'CompileError', 'RuntimeError'];
/** reports/mutation/mutation.json → score total, par fichier, et mutants survivants
 * @param {{ files: Record<string, { mutants: { status: string, mutatorName?: string, replacement?: string, location?: { start: { line: number } } }[] }> }} report */
function mutationScore(report) {
  let killed = 0, total = 0;
  /** @type {Record<string, number>} */
  const files = {};
  /** @type {{ file: string, line: number, mutator: string, replacement: string }[]} */
  const survivors = [];
  for (const [file, { mutants }] of Object.entries(report.files)) {
    const counted = mutants.filter(m => !NOT_COUNTED.includes(m.status));
    const k = counted.filter(m => KILLED.includes(m.status)).length;
    killed += k; total += counted.length;
    files[file] = counted.length ? Math.round(10000 * k / counted.length) / 100 : 100;
    for (const m of counted) if (!KILLED.includes(m.status)) {
      survivors.push({ file, line: m.location ? m.location.start.line : 0, mutator: m.mutatorName || '', replacement: m.replacement || '' });
    }
  }
  return { total: total ? Math.round(10000 * killed / total) / 100 : 100, files, survivors };
}

/** 94.44 → « 94,44 » @param {number} n */
const fr = n => String(n).replace('.', ',');

module.exports = { parseNodeTest, parsePlaywright, parseCoverage, mutationScore, fr };
