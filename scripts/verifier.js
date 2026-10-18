#!/usr/bin/env node
// Vérification d'une branche en une commande (#57), avec un résumé de quelques lignes.
//   npm run verifier              typage, tests unitaires, tests de bout en bout
//   npm run verifier -- --complet  en plus : couverture et mutation. Pas de mutation incrémentale : avec le lanceur de tests
//   « commande », Stryker ne voit pas qu'un test a changé, et rendait des scores périmés (constaté sur #58)
// S'arrête au premier échec, avec la fin de sa sortie, et un code de sortie non nul. Les mesures vont dans
// reports/verifier.json, et aussi dans reports/verifier-<commit>.json tant que la branche n'a rien changé à main :
// lancé au début d'une issue, ce fichier sert de point de départ (« avant ») à la description de PR (scripts/pr-body.js).
const { spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { tooOld, MIN_NODE } = require('./check-node.js');
const M = require('./lib/mesures.js');

const root = path.join(__dirname, '..');
const complet = process.argv.includes('--complet');
if (tooOld(process.versions.node)) { console.error(`Node ${process.versions.node} : il faut Node ${MIN_NODE} ou plus récent.`); process.exit(1); }

/** @param {string} cmd */
const run = cmd => {
  const t0 = Date.now();
  const r = spawnSync('sh', ['-c', cmd], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || ''), s: Math.round((Date.now() - t0) / 100) / 10 };
};
const git = (/** @type {string} */ c) => execSync(`git ${c}`, { cwd: root, encoding: 'utf8' }).trim();

/** @type {Record<string, any>} */
const result = { date: new Date().toISOString(), branch: git('branch --show-current'), commit: git('rev-parse --short HEAD') };
// point de départ : la branche n'a encore aucun commit au-delà de main, et aucun fichier suivi n'est modifié
let atBase = false;
try { atBase = git('rev-parse HEAD') === git('merge-base HEAD origin/main') && git('status --porcelain --untracked-files=no') === ''; } catch {}
/** @type {[string, string, (out: string) => string][]} */
const steps = [
  ['Typage', 'npm run -s typecheck', () => '0 erreur'],
  ['Tests unitaires', 'npm run -s test:unit', out => { result.unit = M.parseNodeTest(out); return `${result.unit.pass} réussis`; }],
  ['Bout en bout', 'npx playwright test', out => {
    const e = (result.e2e = M.parsePlaywright(out));
    return `${e.passed} réussis${e.skipped ? `, ${e.skipped} ignoré${e.skipped > 1 ? 's' : ''}` : ''}${e.flaky ? `, ${e.flaky} instable${e.flaky > 1 ? 's' : ''}` : ''} (${M.fr(e.seconds)} s)`;
  }],
];
if (complet) steps.push(
  ['Couverture', 'npm run -s coverage', () => {
    const c = (result.coverage = M.parseCoverage(fs.readFileSync(path.join(root, 'coverage/coverage-summary.md'), 'utf8')));
    return `${M.fr(c.statements)} % des instructions, ${M.fr(c.branches)} % des branches`;
  }],
  ['Mutation', 'npx stryker run', () => {
    const m = (result.mutation = M.mutationScore(JSON.parse(fs.readFileSync(path.join(root, 'reports/mutation/mutation.json'), 'utf8'))));
    return `${M.fr(m.total)} %, ${m.survivors.length} survivant${m.survivors.length > 1 ? 's' : ''}`;
  }],
);

const save = () => {
  fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(root, 'reports/verifier.json'), JSON.stringify(result, null, 2) + '\n');
  if (atBase) fs.writeFileSync(path.join(root, `reports/verifier-${result.commit}.json`), JSON.stringify(result, null, 2) + '\n');
};
for (const [name, cmd, summary] of steps) {
  const r = run(cmd);
  if (!r.ok) {
    console.log(`✘ ${name.padEnd(16)} échec (${r.s} s) — fin de la sortie :\n`);
    console.log(r.out.split('\n').slice(-40).join('\n'));
    result.failed = name; save();
    process.exit(1);
  }
  console.log(`✔ ${name.padEnd(16)} ${summary(r.out)}`);
}
save();
