// Les fichiers suivis par git respectent .editorconfig (#35) : fins de ligne LF, retour à la ligne final,
// pas d'espace en fin de ligne (sauf Markdown), pas de tabulation pour indenter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
// les tests de mutation tournent dans une copie (.stryker-tmp) : git n'y suit aucun fichier, le test ne s'applique pas
const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
const inRepo = fs.realpathSync(top) === fs.realpathSync(new URL('.', root)).replace(/\/$/, '');
const TEXT = /\.(js|mjs|cjs|json|css|html|md|yml|yaml|svg|webmanifest|txt)$|^(LICENSE|\.editorconfig|\.gitignore|\.npmrc)$/;
const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n')
  .filter(f => f && TEXT.test(f.split('/').pop()) && !f.startsWith('assets/') && f !== 'package-lock.json');

test('des fichiers texte sont bien trouvés', { skip: !inRepo && 'copie de travail des tests de mutation' }, () => assert.ok(files.length > 30, `${files.length} fichiers`));

test('style des fichiers (.editorconfig)', { skip: !inRepo && 'copie de travail des tests de mutation' }, () => {
  const problems = [];
  for (const f of files) {
    if (!fs.existsSync(new URL(f, root))) continue; // supprimé dans la copie de travail
    const s = fs.readFileSync(new URL(f, root), 'utf8');
    if (s.includes('\r')) problems.push(`${f} : fins de ligne Windows (CRLF)`);
    if (s.length && !s.endsWith('\n')) problems.push(`${f} : pas de retour à la ligne final`);
    s.split('\n').forEach((line, i) => {
      if (/^\t/.test(line)) problems.push(`${f}:${i + 1} : tabulation`);
      if (!f.endsWith('.md') && /[ \t]+$/.test(line)) problems.push(`${f}:${i + 1} : espaces en fin de ligne`);
    });
  }
  assert.deepEqual(problems, []);
});
