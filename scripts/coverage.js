#!/usr/bin/env node
// Couverture de code fusionnée (CONTRIBUTING.md § 3) : tests unitaires (Node) + tests de bout en bout (Chromium).
//   npm run coverage            → rapport HTML dans coverage/, résumé dans la console et coverage/coverage-summary.md
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { CoverageReport } = require('monocart-coverage-reports');

const root = path.join(__dirname, '..');
const out = path.join(root, 'coverage');
const unitRaw = path.join(out, '.raw-unit');
const e2eRaw = path.join(out, '.raw-e2e');
fs.rmSync(out, { recursive: true, force: true });

const run = (cmd, env) => execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
run('node --test tests/unit/*.test.js', { NODE_V8_COVERAGE: unitRaw });
run('npx playwright test --project=android-chrome --reporter=dot', { COVERAGE_E2E_DIR: e2eRaw });

// Fichiers de l'app seulement (ni les tests, ni les dépendances), sous un même nom qu'ils viennent de Node ou du navigateur
const APP = /(^|\/)(index\.html|lang\.js|js\/.*\.js|scripts\/[\w-]+\.js)$/;
(async () => {
  const report = new CoverageReport({
    name: 'Chrono Canne : couverture',
    outputDir: out,
    reports: [['v8'], ['console-summary'], ['markdown-summary', { outputFile: 'coverage-summary.md' }], ['json-summary']],
    entryFilter: e => /^http:\/\/localhost:4173\//.test(e.url) || (e.url.startsWith('file://' + root) && !/\/(tests|node_modules)\//.test(e.url)),
    sourcePath: p => {
      const s = p.replace(/^localhost-4173\//, '').replace(/^localhost-4173$/, 'index.html');
      return s === '' || s.endsWith('/') ? s + 'index.html' : s;
    },
    sourceFilter: p => APP.test(p),
    cleanCache: true,
  });
  await report.addFromDir(unitRaw);
  for (const f of fs.readdirSync(e2eRaw)) await report.add(JSON.parse(fs.readFileSync(path.join(e2eRaw, f), 'utf8')));
  await report.generate();
})();
