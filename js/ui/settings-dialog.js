// Fenêtre des réglages, et apprentissage des mots mal reconnus.
import { $, $field, $dialog } from './dom.js';
import { fmt, parseMmSs, buildSentence, COMMAND_PATTERNS } from '../lang.js';
import { PRESETS } from '../settings.js';
import { PALETTE_KEYS, PALETTE_LABELS, THEMES, resolveTheme, contrastWarnings } from '../colors.js';
import { prefersLight } from './theme.js';

/** @typedef {import('../types.js').Config} Config */

/**
 * @param {object} deps
 * @param {() => Config} deps.getCfg
 * @param {(c: Partial<Config>) => void} deps.onSave
 * @param {ReturnType<typeof import('../voice.js').createVoice>} deps.voice
 */
export function createSettingsDialog({ getCfg, onSave, voice }) {
  $field('sPreset').innerHTML = PRESETS.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
  $field('sPreset').addEventListener('change', () => {
    const p = PRESETS.find(x => x.id === $field('sPreset').value);
    if (p?.rounds) { $field('sRounds').value = String(p.rounds); $field('sRound').value = fmt(p.roundSec ?? 0); $field('sRest').value = '1:00'; $field('sExtra').value = String(p.extraMax ?? 0); }
    updatePreview();
  });
  ['sRounds', 'sRound'].forEach(id => $field(id).addEventListener('input', () => { $field('sPreset').value = 'custom'; }));
  function showModeFields() {
    const m = $field('sMode').value;
    document.querySelectorAll('#settings [data-mode]').forEach(el => { const e = /** @type {HTMLElement} */ (el); e.hidden = e.dataset.mode !== m; });
  }
  $field('sMode').addEventListener('change', () => { showModeFields(); updatePreview(); });
  const yes = (/** @type {string} */ id) => $field(id).value === '1';
  /** @param {Config} c */
  function fill(c) {
    $field('sMode').value = c.mode; $field('sPreset').value = c.preset || 'custom';
    $field('sRounds').value = String(c.rounds); $field('sRound').value = fmt(c.mode === 'relais' ? 90 : c.roundSec); $field('sRest').value = fmt(c.restSec);
    $field('sExtra').value = String(c.extraMax); $field('sRelayBase').value = String(c.relayBase); $field('sRelayCount').value = String(c.relayCount);
    $field('sCount').value = c.countStops ? '1' : '0'; $field('sProlong').value = c.prolong;
    $field('sEnGarde').value = c.requireEnGarde ? '1' : '0'; $field('sAutoRest').value = c.autoRest ? '1' : '0';
    $field('sCalls').value = c.calls.join(','); $field('sColor1').value = c.colors[0] || ''; $field('sColor2').value = c.colors[1] || '';
    $field('sReady').value = c.answerReady ? '1' : '0';
    $field('sTheme').value = c.theme;
    $field('sBoard').value = c.board ? '1' : '0';
    for (const k of PALETTE_KEYS) { if (c.palette[k]) { colorInput(k).value = /** @type {string} */ (c.palette[k]); colorInput(k).dataset.custom = '1'; } else delete colorInput(k).dataset.custom; }
    showModeFields(); updatePreview(); showPalette();
  }
  /** @returns {Partial<Config> & Pick<Config, 'mode' | 'rounds' | 'roundSec' | 'restSec' | 'relayCount'>} */
  function read() {
    const cfg = getCfg(), mode = /** @type {import('../types.js').Mode} */ ($field('sMode').value);
    const c = {
      mode, preset: $field('sPreset').value,
      restSec: parseMmSs($field('sRest').value) || cfg.restSec,
      extraMax: +$field('sExtra').value,
      relayBase: +$field('sRelayBase').value, relayCount: +$field('sRelayCount').value,
      countStops: yes('sCount'), prolong: /** @type {import('../types.js').ProlongMode} */ ($field('sProlong').value), requireEnGarde: yes('sEnGarde'), autoRest: yes('sAutoRest'),
      calls: $field('sCalls').value.split(/[,;\s]+/).map(Number).filter(n => n > 0).sort((a, b) => b - a),
      colors: [$field('sColor1').value.trim().toLowerCase(), $field('sColor2').value.trim().toLowerCase()],
      answerReady: yes('sReady'),
      theme: /** @type {'auto' | 'jour' | 'nuit'} */ ($field('sTheme').value),
      palette: customPalette(),
      board: yes('sBoard'),
    };
    if (mode === 'relais') { // reprise unique (I 2.3.2) ; reprise supplémentaire = base × 2
      return { ...c, rounds: 1, roundSec: c.relayBase * c.relayCount * 2, extraSec: c.relayBase * 2, extraMax: Math.min(1, c.extraMax) };
    }
    const roundSec = parseMmSs($field('sRound').value) || cfg.roundSec;
    return { ...c, rounds: +$field('sRounds').value, roundSec, extraSec: roundSec };
  }
  // ---------- Apparence : thème et palette ----------
  /** @typedef {import('../colors.js').PaletteKey} PaletteKey */
  const colorInput = (/** @type {PaletteKey} */ k) => /** @type {HTMLInputElement} */ ($field('sColor-' + k));
  const dialogTheme = () => resolveTheme(/** @type {'auto' | 'jour' | 'nuit'} */ ($field('sTheme').value), prefersLight());
  /** Couleurs modifiées dans la fenêtre (les autres suivent le thème) */
  function customPalette() {
    /** @type {Partial<Record<PaletteKey, string>>} */
    const p = {};
    for (const k of PALETTE_KEYS) if (colorInput(k).dataset.custom) p[k] = colorInput(k).value;
    return p;
  }
  function showPalette() {
    const t = dialogTheme();
    for (const k of PALETTE_KEYS) if (!colorInput(k).dataset.custom) colorInput(k).value = THEMES[t][k];
    const w = contrastWarnings(t, customPalette());
    $('contrastWarn').hidden = !w.length;
    $('contrastWarn').textContent = w.length
      ? 'Peu lisible sur le fond : ' + w.map(x => `${PALETTE_LABELS[x.key]} (contraste ${String(x.ratio).replace('.', ',')}:1)`).join(', ')
      : '';
  }
  for (const k of PALETTE_KEYS) colorInput(k).addEventListener('input', () => { colorInput(k).dataset.custom = '1'; showPalette(); });
  $field('sTheme').addEventListener('change', showPalette);
  $('paletteReset').onclick = () => { for (const k of PALETTE_KEYS) delete colorInput(k).dataset.custom; showPalette(); };

  function updatePreview() { $('sentencePreview').textContent = '« ' + buildSentence(read()) + ' »'; }
  ['sRounds', 'sRound', 'sRest', 'sCalls', 'sRelayBase', 'sRelayCount'].forEach(id => $field(id).addEventListener('input', updatePreview));

  // Mots entendus non reconnus, et variantes apprises
  const esc = (/** @type {string} */ t) => t.replace(/[&<>"]/g, c => (/** @type {Record<string, string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }))[c]);
  function renderLearn() {
    const unheard = voice.unheard, learned = getCfg().learned;
    $('unheardList').innerHTML = unheard.length ? unheard.map((u, i) => `<div class="learn-row"><span>« ${esc(u)} »</span>
        ${COMMAND_PATTERNS.map(c => `<button data-learn="${i}" data-cmd="${c.name}">${c.name}</button>`).join('')}</div>`).join('')
      : '<p>Rien pour l\'instant.</p>';
    const rows = COMMAND_PATTERNS.flatMap(c => (learned[c.name] || []).map(w => `<div class="learn-row"><span>${esc(w)} → ${c.name}</span>
        <button data-forget="${esc(w)}" data-cmd="${c.name}">✕</button></div>`));
    $('learnedList').innerHTML = rows.length ? rows.join('') : '<p>Aucune.</p>';
  }
  $dialog('settings').addEventListener('click', e => {
    const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-learn],[data-forget]'));
    if (!b) return;
    const cmd = /** @type {import('../types.js').CommandName} */ (b.dataset.cmd);
    if (b.dataset.learn !== undefined) voice.learn(+b.dataset.learn, cmd);
    else voice.forget(b.dataset.forget ?? '', cmd);
    renderLearn();
  });

  $('settingsBtn').onclick = () => { fill(getCfg()); renderLearn(); $dialog('settings').showModal(); };
  $('closeBtn').onclick = () => $dialog('settings').close();
  $('saveBtn').onclick = () => { onSave(read()); $dialog('settings').close(); };
}
