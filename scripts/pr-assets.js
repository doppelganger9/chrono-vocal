#!/usr/bin/env node
// Publie les captures avant / après d'une PR dans la branche « pr-assets » (pour ne pas alourdir main),
// et affiche le tableau Markdown à coller dans la PR.
//   npm run pr-assets -- 42 [1-pret 4-fin-du-temps …]   (sans liste : tous les écrans)
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const [pr, ...only] = process.argv.slice(2);
if (!pr) { console.error('Usage : npm run pr-assets -- <numéro de PR> [écrans…]'); process.exit(1); }
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, encoding: 'utf8' }).trim();
const repo = sh('gh repo view --json nameWithOwner --jq .nameWithOwner');
const shots = path.join(root, 'screenshots');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-assets-'));
const exists = sh('git ls-remote --heads origin pr-assets');
if (exists) sh(`git worktree add ${JSON.stringify(dir)} origin/pr-assets --detach`);
else { sh(`git worktree add --detach ${JSON.stringify(dir)}`); sh('git checkout --orphan pr-assets-new && git rm -rfq .', dir); }
try {
  const dest = path.join(dir, `pr-${pr}`);
  fs.rmSync(dest, { recursive: true, force: true });
  // colonnes : « avant », « apres », puis les autres dossiers de screenshots/ (variantes…)
  const sides = fs.readdirSync(shots).filter(d => fs.statSync(path.join(shots, d)).isDirectory())
    .sort((a, b) => ['avant', 'apres'].indexOf(b) - ['avant', 'apres'].indexOf(a) || a.localeCompare(b));
  const rows = new Map(); // écran + appareil → { dossier: url }
  for (const side of sides) {
    const src = path.join(shots, side);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.join(dest, side), { recursive: true });
    for (const f of fs.readdirSync(src)) {
      const [device, screen] = f.replace(/\.png$/, '').split('--');
      if (only.length && !only.includes(screen)) continue;
      fs.copyFileSync(path.join(src, f), path.join(dest, side, f));
      const key = `${screen} · ${device}`;
      rows.set(key, { ...rows.get(key), [side]: `https://raw.githubusercontent.com/${repo}/pr-assets/pr-${pr}/${side}/${f}` });
    }
  }
  sh(`git add -A && git -c user.name="$(git -C ${JSON.stringify(root)} config user.name)" -c user.email="$(git -C ${JSON.stringify(root)} config user.email)" commit -qm "Captures de la PR #${pr}"`, dir);
  sh('git push -q origin HEAD:pr-assets', dir);
  const img = u => (u ? `<img src="${u}" width="180">` : '—');
  console.log([`| Écran | ${sides.join(' | ')} |`, `|---|${sides.map(() => '---').join('|')}|`,
    ...[...rows].sort().map(([k, v]) => `| ${k} | ${sides.map(s => img(v[s])).join(' | ')} |`)].join('\n'));
} finally {
  execSync(`git worktree remove --force ${JSON.stringify(dir)}`, { cwd: root, stdio: 'ignore' });
}
