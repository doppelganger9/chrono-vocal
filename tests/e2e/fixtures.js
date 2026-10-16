// Banc d'essai : la page est chargée avec des doublures à la place de la voix du navigateur,
// et une horloge simulée qu'on avance à la main (une reprise de 2 minutes se joue en quelques ms).
const { test: base, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// npm run coverage : couverture JavaScript de la page (Chromium seulement, WebKit ne la fournit pas)
const COVERAGE_DIR = process.env.COVERAGE_E2E_DIR;

// Exécuté dans la page avant son chargement
function installFakes() {
  // Synthèse vocale : on enregistre ce que l'app dit
  window.__spoken = [];
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speaking: false, pending: false, onvoiceschanged: null,
      getVoices: () => [], cancel() {}, resume() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 0); },
    },
  });
  // Sons (bips, gong) : moteur audio muet, on enregistre la fréquence de chaque son joué
  window.__sounds = [];
  const node = () => ({ connect: next => next });
  class FakeAudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = node(); }
    resume() { return Promise.resolve(); }
    createGain() { return { ...node(), gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    createOscillator() {
      const o = { ...node(), type: 'sine', frequency: { value: 440 }, stop() {} };
      o.start = () => window.__sounds.push(o.frequency.value);
      return o;
    }
  }
  window.AudioContext = window.webkitAudioContext = FakeAudioContext;
  // Reconnaissance vocale : le test « parle » avec window.__hear
  class FakeRecognition {
    constructor() { window.__rec = this; this.results = []; }
    start() {} stop() {} abort() {}
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = FakeRecognition;
  window.__hear = (alternatives, isFinal) => {
    const rec = window.__rec;
    const result = alternatives.map(transcript => ({ transcript }));
    result.isFinal = isFinal;
    rec.results.push(result);
    rec.onresult({ resultIndex: rec.results.length - 1, results: rec.results });
  };
}

class App {
  constructor(page) { this.page = page; }
  $(sel) { return this.page.locator(sel); }
  get time() { return this.$('#time'); }
  get max() { return this.$('#max'); }
  get round() { return this.$('#roundLabel'); }
  get phase() { return this.$('#phaseLabel'); }
  get main() { return this.$('#mainBtn'); }
  get heard() { return this.$('#heard'); }
  get stops() { return this.$('#stops'); }

  /** Avance l'horloge simulée, par pas de 500 ms : chaque minuterie échue s'exécute une fois par pas
   *  (assez fin pour les annonces du repos, bien plus rapide que de jouer chaque image d'animation) */
  async wait(ms) {
    for (let left = ms; left > 0; left -= 500) await this.page.clock.fastForward(Math.min(500, left));
  }
  async micOn() { await this.$('#micBtn').click(); }
  /** L'arbitre parle (résultat final de la reconnaissance ; plusieurs alternatives possibles) */
  async hear(text, { final = true } = {}) {
    const alts = Array.isArray(text) ? text : [text];
    // l'app ignore le micro pendant ses propres annonces : ici l'arbitre parle après
    await this.page.evaluate(([a, f]) => { speakingUntil = 0; window.__hear(a, f); }, [alts, final]);
  }
  async spoken() { return this.page.evaluate(() => window.__spoken.slice()); }
  async clearSpoken() { await this.page.evaluate(() => { window.__spoken.length = 0; }); }
  async expectSpoken(text) { await expect.poll(() => this.spoken()).toContain(text); }
  /** Fréquences des sons joués (bips, gong) */
  async sounds() { return this.page.evaluate(() => window.__sounds.slice()); }
  async clearSounds() { await this.page.evaluate(() => { window.__sounds.length = 0; }); }

  /** Ouvre les réglages, applique les valeurs { idDuChamp: valeur } puis enregistre */
  async configure(values) {
    await this.$('#settingsBtn').click();
    for (const [id, value] of Object.entries(values)) {
      const el = this.$('#' + id);
      if (await el.evaluate(e => e.tagName) === 'SELECT') await el.selectOption(String(value));
      else await el.fill(String(value));
    }
    await this.$('#saveBtn').click();
  }
}

const test = base.extend({
  // réglages déjà enregistrés sur le téléphone avant l'ouverture (facultatif)
  savedSettings: [null, { option: true }],
  app: async ({ page, savedSettings, browserName }, use) => {
    const coverage = COVERAGE_DIR && browserName === 'chromium';
    if (coverage) await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.addInitScript(installFakes);
    if (savedSettings) {
      await page.addInitScript(s => localStorage.setItem('chrono-canne', JSON.stringify(s)), savedSettings);
    }
    await page.clock.install({ time: new Date('2026-10-17T10:00:00') });
    await page.goto('/');
    await page.clock.pauseAt(new Date('2026-10-17T10:00:01'));
    const app = new App(page);
    await app.micOn();
    await use(app);
    if (coverage) {
      fs.mkdirSync(COVERAGE_DIR, { recursive: true });
      fs.writeFileSync(path.join(COVERAGE_DIR, crypto.randomUUID() + '.json'), JSON.stringify(await page.coverage.stopJSCoverage()));
    }
  },
});

module.exports = { test, expect };
