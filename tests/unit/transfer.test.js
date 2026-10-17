// Export / import des réglages (js/transfer.js) — #15
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeSettings, decodeSettings, diffSettings, exportFile } from '../../js/transfer.js';
import { DEFAULTS, migrate } from '../../js/settings.js';

const cfg = migrate({ rounds: 4, roundSec: 120, colors: ['rouge', 'bleu'], theme: 'jour', learned: { ALLEZ: ['alo'] } });

test('un réglage exporté puis importé donne exactement la même configuration', () => {
  const r = decodeSettings(encodeSettings(cfg));
  assert.equal(r.ok, true);
  assert.deepEqual(r.cfg, cfg);
});

test('le lien ne contient que des caractères sûrs pour une adresse', () => {
  assert.match(encodeSettings(cfg), /^[A-Za-z0-9_-]+$/);
});

test('le fichier exporté se relit aussi (JSON lisible)', () => {
  const f = exportFile(cfg);
  assert.equal(f.name, 'chrono-canne-reglages.json');
  assert.equal(JSON.parse(f.text).app, 'chrono-canne');
  assert.deepEqual(decodeSettings(f.text).cfg, cfg);
});

test('un fichier invalide ou d\'une autre app est refusé avec un message clair', () => {
  assert.deepEqual(decodeSettings('pas du json'), { ok: false, error: 'Fichier ou lien illisible.' });
  assert.deepEqual(decodeSettings(JSON.stringify({ app: 'autre', cfg: {} })), { ok: false, error: 'Ce ne sont pas des réglages de Chrono Canne.' });
  assert.deepEqual(decodeSettings(JSON.stringify({ app: 'chrono-canne', cfg: 3 })), { ok: false, error: 'Fichier ou lien illisible.' });
});

test('une version plus récente que l\'app est refusée ; une plus ancienne est mise à jour', () => {
  assert.deepEqual(decodeSettings(JSON.stringify({ app: 'chrono-canne', cfg: { ...cfg, v: DEFAULTS.v + 1 } })),
    { ok: false, error: 'Ces réglages viennent d\'une version plus récente de l\'app : mettez-la à jour.' });
  const old = decodeSettings(JSON.stringify({ app: 'chrono-canne', cfg: { v: 1, rounds: 5, calls: [15, 10, 5] } }));
  assert.equal(old.ok, true);
  assert.equal(old.cfg.rounds, 4);
  assert.deepEqual(old.cfg.calls, [30, 15, 5]);
});

test('résumé des différences avant d\'appliquer', () => {
  const d = diffSettings(DEFAULTS, cfg);
  assert.deepEqual(d.map(x => x.label), ['Nombre de reprises', "Durée d'une reprise", 'Thème', 'Variantes apprises']);
  assert.deepEqual(d[1], { key: 'roundSec', label: "Durée d'une reprise", from: '1:30', to: '2:00' });
  assert.deepEqual(diffSettings(cfg, cfg), []);
});
