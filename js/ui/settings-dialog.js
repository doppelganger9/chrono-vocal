// Fenêtre des réglages, et apprentissage des mots mal reconnus.
import { fmt, parseMmSs, buildSentence, COMMAND_PATTERNS } from '../lang.js';
import { PRESETS } from '../settings.js';

export function createSettingsDialog({ $, getCfg, onSave, voice }) {
  $('sPreset').innerHTML = PRESETS.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
  $('sPreset').addEventListener('change', () => {
    const p = PRESETS.find(x => x.id === $('sPreset').value);
    if (p.rounds) { $('sRounds').value = p.rounds; $('sRound').value = fmt(p.roundSec); $('sRest').value = '1:00'; $('sExtra').value = p.extraMax; }
    updatePreview();
  });
  ['sRounds', 'sRound'].forEach(id => $(id).addEventListener('input', () => { $('sPreset').value = 'custom'; }));
  function showModeFields() {
    const m = $('sMode').value;
    document.querySelectorAll('#settings [data-mode]').forEach(el => el.hidden = el.dataset.mode !== m);
  }
  $('sMode').addEventListener('change', () => { showModeFields(); updatePreview(); });
  const yes = id => $(id).value === '1';
  function fill(c) {
    $('sMode').value = c.mode; $('sPreset').value = c.preset || 'custom';
    $('sRounds').value = c.rounds; $('sRound').value = fmt(c.mode === 'relais' ? 90 : c.roundSec); $('sRest').value = fmt(c.restSec);
    $('sExtra').value = c.extraMax; $('sRelayBase').value = c.relayBase; $('sRelayCount').value = c.relayCount;
    $('sCount').value = c.countStops ? '1' : '0'; $('sProlong').value = c.prolong;
    $('sEnGarde').value = c.requireEnGarde ? '1' : '0'; $('sAutoRest').value = c.autoRest ? '1' : '0';
    $('sCalls').value = c.calls.join(','); $('sColor1').value = c.colors[0] || ''; $('sColor2').value = c.colors[1] || '';
    $('sReady').value = c.answerReady ? '1' : '0';
    showModeFields(); updatePreview();
  }
  function read() {
    const cfg = getCfg(), mode = $('sMode').value;
    const c = {
      mode, preset: $('sPreset').value,
      restSec: parseMmSs($('sRest').value) || cfg.restSec,
      extraMax: +$('sExtra').value,
      relayBase: +$('sRelayBase').value, relayCount: +$('sRelayCount').value,
      countStops: yes('sCount'), prolong: $('sProlong').value, requireEnGarde: yes('sEnGarde'), autoRest: yes('sAutoRest'),
      calls: $('sCalls').value.split(/[,;\s]+/).map(Number).filter(n => n > 0).sort((a, b) => b - a),
      colors: [$('sColor1').value.trim().toLowerCase(), $('sColor2').value.trim().toLowerCase()],
      answerReady: yes('sReady'),
    };
    if (mode === 'relais') { // reprise unique (I 2.3.2) ; reprise supplémentaire = base × 2
      Object.assign(c, { rounds: 1, roundSec: c.relayBase * c.relayCount * 2, extraSec: c.relayBase * 2, extraMax: Math.min(1, c.extraMax) });
    } else {
      c.rounds = +$('sRounds').value;
      c.roundSec = parseMmSs($('sRound').value) || cfg.roundSec;
      c.extraSec = c.roundSec;
    }
    return c;
  }
  function updatePreview() { $('sentencePreview').textContent = '« ' + buildSentence(read()) + ' »'; }
  ['sRounds', 'sRound', 'sRest', 'sCalls', 'sRelayBase', 'sRelayCount'].forEach(id => $(id).addEventListener('input', updatePreview));

  // Mots entendus non reconnus, et variantes apprises
  const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderLearn() {
    const unheard = voice.unheard, learned = getCfg().learned;
    $('unheardList').innerHTML = unheard.length ? unheard.map((u, i) => `<div class="learn-row"><span>« ${esc(u)} »</span>
        ${COMMAND_PATTERNS.map(c => `<button data-learn="${i}" data-cmd="${c.name}">${c.name}</button>`).join('')}</div>`).join('')
      : '<p>Rien pour l\'instant.</p>';
    const rows = COMMAND_PATTERNS.flatMap(c => (learned[c.name] || []).map(w => `<div class="learn-row"><span>${esc(w)} → ${c.name}</span>
        <button data-forget="${esc(w)}" data-cmd="${c.name}">✕</button></div>`));
    $('learnedList').innerHTML = rows.length ? rows.join('') : '<p>Aucune.</p>';
  }
  $('settings').addEventListener('click', e => {
    const b = e.target.closest('[data-learn],[data-forget]');
    if (!b) return;
    if (b.dataset.learn !== undefined) voice.learn(+b.dataset.learn, b.dataset.cmd);
    else voice.forget(b.dataset.forget, b.dataset.cmd);
    renderLearn();
  });

  $('settingsBtn').onclick = () => { fill(getCfg()); renderLearn(); $('settings').showModal(); };
  $('closeBtn').onclick = () => $('settings').close();
  $('saveBtn').onclick = () => { onSave(read()); $('settings').close(); };
}
