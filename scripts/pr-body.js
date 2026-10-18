#!/usr/bin/env node
// Description complète d'une PR (#57), au modèle de .github/pull_request_template.md, à partir des mesures :
// tests avant → après (reports/verifier*.json, voir scripts/verifier.js), couverture, mutation, captures
// (reports/pr-assets.md, voir scripts/pr-assets.js), mesures de perf (screenshots/perf.md), statistiques IA.
// Il ne reste à écrire que les parties marquées « À ÉCRIRE » : le pourquoi, ce qui change, les choix pris.
//   node scripts/pr-body.js [--issue 57] [--visible] [--since 2026-10-18T15:30:00Z]   → reports/pr-body.md
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { fr } = require('./lib/mesures.js');

const TODO = '_À ÉCRIRE_';

/** Une mesure n'est reprise que si elle a été faite pendant le travail sur la branche, pas pour une PR précédente
 * @param {number} mtimeMs @param {string | undefined} since */
const isFresh = (mtimeMs, since) => !since || mtimeMs >= Date.parse(since);

/**
 * @param {object} d
 * @param {number} d.issue
 * @param {boolean} d.visible
 * @param {any} [d.verif]  mesures de la branche (reports/verifier.json)
 * @param {any} [d.base]  mesures du point de départ, si elles existent
 * @param {{ statements: number, branches: number } | null} [d.coverage]
 * @param {{ total: number, files: Record<string, number>, survivors: { file: string, line: number, mutator: string, replacement: string }[] } | null} [d.mutation]
 * @param {string[]} d.touched  fichiers modifiés par la branche
 * @param {string | null} [d.assets]  tableau des captures
 * @param {string | null} [d.perf]  tableau des mesures avant / après
 * @param {string | null} [d.ai]  tableau des statistiques IA
 */
function buildBody({ issue, visible, verif, base, coverage, mutation, touched, assets, perf, ai }) {
  const evol = (/** @type {number | undefined} */ a, /** @type {number | undefined} */ b) => (a !== undefined && a !== b ? `${a} → ${b}` : `${b}`);
  const quality = [];
  if (verif?.unit) quality.push(`- **Tests unitaires : ${evol(base?.unit?.pass, verif.unit.pass)}**. ${TODO} (ce que vérifient les nouveaux tests)`);
  if (verif?.e2e) quality.push(`- **Tests de bout en bout : ${evol(base?.e2e?.passed, verif.e2e.passed)}**${verif.e2e.skipped ? ` (${verif.e2e.skipped} ignoré${verif.e2e.skipped > 1 ? 's' : ''})` : ''}, en ${fr(verif.e2e.seconds)} s. ${TODO}`);
  if (coverage) quality.push(`- **Couverture** : ${fr(coverage.statements)} % des instructions, ${fr(coverage.branches)} % des branches.`);
  if (mutation) {
    const mine = Object.entries(mutation.files).filter(([f]) => touched.includes(f));
    quality.push(`- **Mutation : ${fr(mutation.total)} %**${mine.length ? ` (${mine.map(([f, s]) => `${path.basename(f, '.js')} ${fr(s)} %`).join(', ')})` : ''}.`);
    // un compte par fichier, et les premiers survivants : la liste complète est dans le rapport de mutation
    const surv = mutation.survivors.filter(s => touched.includes(s.file));
    if (surv.length) {
      /** @type {Record<string, number>} */
      const byFile = {};
      for (const s of surv) byFile[s.file] = (byFile[s.file] || 0) + 1;
      quality.push(`- **Mutants survivants dans les fichiers touchés** : ${Object.entries(byFile).map(([f, n]) => `${path.basename(f)} ${n}`).join(', ')}. ${TODO} (tués par un test, ou pourquoi ils sont équivalents)`,
        ...surv.slice(0, 8).map(s => `  - \`${s.file}:${s.line} ${s.mutator}\` → \`${s.replacement.slice(0, 60)}\``),
        ...(surv.length > 8 ? [`  - et ${surv.length - 8} autres : rapport complet dans \`reports/mutation/\`, et dans l'artefact « rapports-qualite » de la CI`] : []));
    }
  }
  quality.push('- `npm run typecheck` : 0 erreur.');
  return [
    '## Résumé', '', TODO, '', `Closes #${issue}${visible ? ' · **Changement visible : à fusionner par David.**' : ' · Pas de changement visible : fusion automatique dès que « tests » passe.'}`, '',
    '## Ce qui change pour l\'utilisateur', '', visible ? TODO : 'Rien de visible. ' + TODO, '',
    '## Captures avant / après', '', assets || 'Sans changement visible.', '',
    '## Gains mesurés', '', perf || 'Sans objet.', '',
    '## Qualité', '', ...quality, '',
    '## Coût de développement (statistiques IA)', '', ai || TODO, '',
    '## À vérifier sur téléphone', '', TODO, '',
    '## Écarts par rapport à l\'issue', '', TODO, '',
    '🤖 Generated with [Claude Code](https://claude.com/claude-code)', '',
  ].join('\n');
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const args = process.argv.slice(2);
  const opt = (/** @type {string} */ k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
  const sh = (/** @type {string} */ c) => { try { return execSync(c, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
  const read = (/** @type {string} */ f) => (fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f), 'utf8') : null);
  const json = (/** @type {string} */ f) => { const t = read(f); return t ? JSON.parse(t) : null; };

  const branch = sh('git branch --show-current');
  const issue = Number(opt('issue') || (branch.match(/^issue-(\d+)/) || [])[1] || 0);
  const baseCommit = sh('git merge-base HEAD origin/main').slice(0, 7);
  // début du travail : la création de la branche (reflog), sauf --since
  const created = sh(`git reflog show --date=iso-strict --format=%gd refs/heads/${branch}`).split('\n').pop()?.match(/\{(.+)\}/);
  const since = opt('since') || (created ? new Date(created[1]).toISOString() : undefined);
  /** mesure faite pendant le travail sur cette branche seulement @param {string} f */
  const readFresh = f => (fs.existsSync(path.join(root, f)) && isFresh(fs.statSync(path.join(root, f)).mtimeMs, since) ? read(f) : null);
  const verif = json('reports/verifier.json');
  const mutationReport = json('reports/mutation/mutation.json');
  const body = buildBody({
    issue, visible: args.includes('--visible'), verif,
    base: baseCommit ? json(`reports/verifier-${baseCommit}.json`) : null,
    coverage: verif?.coverage || null,
    mutation: verif?.mutation || (mutationReport ? require('./lib/mesures.js').mutationScore(mutationReport) : null),
    touched: sh('git diff --name-only origin/main...HEAD').split('\n').filter(Boolean),
    assets: readFresh('reports/pr-assets.md'), perf: readFresh('screenshots/perf.md'),
    ai: since ? sh(`node scripts/ai-stats.js --since ${since}`) : null,
  });
  fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(root, 'reports/pr-body.md'), body);
  console.log(`reports/pr-body.md (issue #${issue}, depuis ${since || '?'}) : ${(body.match(/À ÉCRIRE/g) || []).length} parties à écrire`);
}

module.exports = { buildBody, isFresh };
