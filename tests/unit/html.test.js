// Échappement du texte inséré dans du HTML (#55)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '../../js/html.js';

test('esc : les caractères spéciaux du HTML sont échappés', () => {
  assert.equal(esc('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  assert.equal(esc("l'aire & la canne"), 'l&#39;aire &amp; la canne');
  assert.equal(esc('bleu'), 'bleu');
  assert.equal(esc(42), '42', 'un nombre devient du texte');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});
