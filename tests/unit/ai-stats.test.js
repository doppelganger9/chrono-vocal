// Statistiques de développement IA lues dans le journal de session de Claude Code
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeStats, formatMarkdown } = require('../../scripts/ai-stats.js');

const t = min => new Date(Date.UTC(2026, 9, 16, 19, 0) + min * 60_000).toISOString();
const usage = (input, cw, cr, out, think) => ({
  input_tokens: input, cache_creation_input_tokens: cw, cache_read_input_tokens: cr,
  output_tokens: out, output_tokens_details: { thinking_tokens: think },
});
const assistant = (min, id, content, u) => ({ type: 'assistant', timestamp: t(min), message: { id, model: 'claude-opus-5-5', content, usage: u } });
const toolUse = (id, name, input = {}) => ({ type: 'tool_use', id, name, input });
const toolResult = (min, id, text) => ({ type: 'user', timestamp: t(min), message: { content: [{ type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text }] }] } });

const journal = [
  assistant(-30, 'm0', [toolUse('u0', 'Bash', { command: 'npm test' })], usage(5, 5, 5, 5, 0)),   // avant la période
  assistant(0, 'm1', [toolUse('u1', 'Bash', { command: 'PATH=/opt/homebrew/bin:$PATH npm test' })], usage(10, 100, 1000, 50, 20)),
  assistant(0, 'm1', [{ type: 'text', text: 'suite du même message' }], usage(10, 100, 1000, 50, 20)), // même message, 2e ligne
  toolResult(1, 'u1', '✘ 3 [android-chrome] … \n  2 failed\n  50 passed (12s)'),
  assistant(2, 'm2', [toolUse('u2', 'Bash', { command: 'npx playwright test' }), toolUse('u3', 'Read')], usage(1, 0, 2000, 30, 0)),
  toolResult(2, 'u2', '  52 passed (11s)'),
  assistant(30, 'm3', [toolUse('u4', 'Edit')], usage(2, 10, 3000, 70, 10)),
];

test('compte les appels au modèle une seule fois par message, et somme les tokens', () => {
  const s = computeStats(journal, { since: t(-1) });
  assert.equal(s.calls, 3);
  assert.deepEqual(s.models, ['claude-opus-5-5']);
  assert.deepEqual(s.tokens, { input: 13, cacheWrite: 110, cacheRead: 6000, output: 150, thinking: 30 });
});

test('compte les appels d\'outils par outil', () => {
  const s = computeStats(journal, { since: t(-1) });
  assert.deepEqual(s.tools, { Bash: 2, Read: 1, Edit: 1 });
  assert.equal(s.toolCalls, 4);
});

test('compte les lancements de tests et les passages du rouge au vert', () => {
  const s = computeStats(journal, { since: t(-1) });
  assert.deepEqual(s.testRuns, { total: 2, red: 1, redToGreen: 1 });
});

test('durée écoulée, et temps actif sans les pauses de plus de 10 minutes', () => {
  const s = computeStats(journal, { since: t(-1) });
  assert.equal(s.elapsedMin, 30);
  assert.equal(s.activeMin, 2);
});

test('la période se borne avec since et until', () => {
  assert.equal(computeStats(journal, { since: t(-60) }).calls, 4);
  assert.equal(computeStats(journal, { since: t(-1), until: t(5) }).calls, 2);
});

test('formatMarkdown produit le tableau du modèle de PR', () => {
  const md = formatMarkdown(computeStats(journal, { since: t(-1) }));
  assert.match(md, /\| Durée \(écoulée \/ active\) \| 30 min \/ 2 min \|/);
  assert.match(md, /\| Appels au modèle \| 3 \(claude-opus-5-5\) \|/);
  assert.match(md, /\| Tokens .* \| 13 \/ 110 \/ 6 000 \/ 150 \(dont 30 de réflexion\) \|/);
  assert.match(md, /\| Appels d'outils \| 4 \(Bash 2, Edit 1, Read 1\) \|/);
  assert.match(md, /\| Cycles de test .* \| 2 lancements, 1 en échec, 1 passage rouge → vert \|/);
});
