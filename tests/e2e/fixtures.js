// Banc d'essai : la page est chargée avec des doublures à la place de la voix du navigateur,
// et une horloge simulée qu'on avance à la main (une reprise de 2 minutes se joue en quelques ms).
const { test: base, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// npm run coverage : couverture JavaScript de la page (Chromium seulement, WebKit ne la fournit pas)
const COVERAGE_DIR = process.env.COVERAGE_E2E_DIR;

// Exécuté dans la page avant son chargement
function installFakes() {
  // l'arbitre parle juste après les annonces : pas de délai anti-écho (js/speech.js)
  window.__chronoEnv = { echoGuardMs: 0 };
  // Synthèse vocale : on enregistre ce que l'app dit, et l'annonce se termine aussitôt,
  // ou au bout de window.__speechMs millisecondes (horloge simulée), pour parler pendant une annonce
  window.__spoken = [];
  window.__speechMs = 0;
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speaking: false,
      pending: false,
      onvoiceschanged: null,
      getVoices: () => [],
      cancel() {},
      resume() {},
      speak(u) {
        window.__spoken.push(u.text);
        if (window.__speechMs) setTimeout(() => u.onend?.(), window.__speechMs);
        else u.onend?.();
      },
    },
  });
  // Sons (bips, gong) : moteur audio muet, on enregistre la fréquence de chaque son joué
  window.__sounds = [];
  const node = () => ({ connect: (next) => next });
  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
      this.destination = node();
    }
    resume() {
      return Promise.resolve();
    }
    createGain() {
      return {
        ...node(),
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      };
    }
    createOscillator() {
      const o = {
        ...node(),
        type: "sine",
        frequency: { value: 440 },
        stop() {},
      };
      o.start = () => window.__sounds.push(o.frequency.value);
      return o;
    }
  }
  window.AudioContext = window.webkitAudioContext = FakeAudioContext;
  // Partage de fichiers (feuille de partage du téléphone) : on enregistre ce que l'app partage
  window.__shared = [];
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: () => true,
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: async (d) => {
      for (const f of d.files || [])
        window.__shared.push({ name: f.name, text: await f.text() });
    },
  });
  // Reconnaissance vocale : le test « parle » avec window.__hear. Comme dans le navigateur, chaque start() ouvre
  // une nouvelle écoute (résultats remis à zéro), et stop() la termine (onend) ; window.__recLog garde la trace.
  window.__recLog = [];
  class FakeRecognition {
    constructor() {
      window.__rec = this;
      this.results = [];
      window.__recLog.push("new");
    }
    start() {
      window.__recLog.push("start");
      this.results = [];
    }
    stop() {
      window.__recLog.push("stop");
      setTimeout(() => this.onend?.(), 0);
    }
    abort() {
      this.stop();
    }
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = FakeRecognition;
  // Captation audio (#136) : micro et enregistreur muets. L'enregistreur rend un morceau « son-N » à chaque tranche
  // (horloge simulée) ; window.__micError fait refuser le micro (NotAllowedError…), window.__micTrack est la piste
  // ouverte (window.__micTrack.end() : micro coupé par le téléphone)
  window.__micError = "";
  // écoute d'un fichier : lecteur muet, on note ce qui est lu ; window.__playError fait refuser la lecture
  window.__played = [];
  window.__playError = "";
  HTMLMediaElement.prototype.play = function () {
    if (window.__playError)
      return Promise.reject(new DOMException("refusé", window.__playError));
    window.__played.push(this.src);
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {};
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        if (window.__micError === "hang") return new Promise(() => {}); // micro qui ne répond pas
        if (window.__micError)
          throw new DOMException("refusé", window.__micError);
        const track = {
          stopped: false,
          onended: null,
          stop() {
            this.stopped = true;
          },
          end() {
            this.onended?.(new Event("ended"));
          },
        };
        window.__micTrack = track;
        return { getTracks: () => [track], getAudioTracks: () => [track] };
      },
    },
  });
  window.MediaRecorder = class {
    static isTypeSupported = (m) => m === "audio/webm;codecs=opus";
    constructor(stream, opts) {
      this.mimeType = opts.mimeType || "audio/webm";
      this.state = "inactive";
      this.n = 0;
    }
    emit() {
      this.ondataavailable?.({
        data: new Blob([`son-${this.n++};`], { type: this.mimeType }),
      });
    }
    start(slice) {
      this.state = "recording";
      this.timer = setInterval(() => this.emit(), slice);
    }
    stop() {
      if (this.state === "inactive") return;
      this.state = "inactive";
      clearInterval(this.timer);
      setTimeout(() => {
        this.emit();
        this.onstop?.();
      }, 0);
    }
  };
  window.__hear = (alternatives, isFinal) => {
    const rec = window.__rec;
    const result = alternatives.map((transcript) => ({ transcript }));
    result.isFinal = isFinal;
    rec.results.push(result);
    rec.onresult({ resultIndex: rec.results.length - 1, results: rec.results });
  };
}

class App {
  constructor(page) {
    this.page = page;
  }
  $(sel) {
    return this.page.locator(sel);
  }
  get time() {
    return this.$("#time");
  }
  get max() {
    return this.$("#max");
  }
  get round() {
    return this.$("#roundLabel");
  }
  get phase() {
    return this.$("#phaseLabel");
  }
  get main() {
    return this.$("#mainBtn");
  }
  get heard() {
    return this.$("#heard");
  }
  get stops() {
    return this.$("#stops");
  }

  /** Avance l'horloge simulée, par pas de 500 ms : chaque minuterie échue s'exécute une fois par pas
   *  (assez fin pour les annonces du repos, bien plus rapide que de jouer chaque image d'animation) */
  async wait(ms) {
    for (let left = ms; left > 0; left -= 500)
      await this.page.clock.fastForward(Math.min(500, left));
  }
  async micOn() {
    await this.$("#micBtn").click();
  }
  /** L'arbitre parle (résultat final de la reconnaissance ; plusieurs alternatives possibles) */
  async hear(text, { final = true } = {}) {
    const alts = Array.isArray(text) ? text : [text];
    await this.page.evaluate(([a, f]) => window.__hear(a, f), [alts, final]);
  }
  async spoken() {
    return this.page.evaluate(() => window.__spoken.slice());
  }
  /** Fichiers partagés par l'app (feuille de partage simulée) */
  async shared() {
    return this.page.evaluate(() => window.__shared.slice());
  }
  async clearSpoken() {
    await this.page.evaluate(() => {
      window.__spoken.length = 0;
    });
  }
  async expectSpoken(text) {
    await expect.poll(() => this.spoken()).toContain(text);
  }
  /** Fréquences des sons joués (bips, gong) */
  async sounds() {
    return this.page.evaluate(() => window.__sounds.slice());
  }
  async clearSounds() {
    await this.page.evaluate(() => {
      window.__sounds.length = 0;
    });
  }
  /** Ajoute des styles à la page (police large…). Une feuille construite par le DOM : la politique de sécurité
   * du contenu (#37) refuse les styles en ligne, comme ceux de page.addStyleTag */
  async addStyle(css) {
    await this.page.evaluate((css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }, css);
  }

  /** Ouvre les réglages, applique les valeurs { idDuChamp: valeur } puis enregistre */
  async configure(values) {
    await this.$("#settingsBtn").click();
    for (const [id, value] of Object.entries(values)) {
      const el = this.$("#" + id);
      if ((await el.evaluate((e) => e.tagName)) === "SELECT")
        await el.selectOption(String(value));
      else await el.fill(String(value));
    }
    await this.$("#saveBtn").click();
  }
}

const test = base.extend({
  // réglages déjà enregistrés sur le téléphone avant l'ouverture (facultatif)
  savedSettings: [null, { option: true }],
  // témoin « micro silencieux » (#56) : la fausse reconnaissance ne transmet rien d'elle-même, il est donc coupé (0)
  // sauf dans les tests qui le concernent
  micSilentMs: [0, { option: true }],
  // écran titre déjà vu pour cette version (#84), pour ne pas gêner les autres tests ; false : premier lancement
  introSeen: [require("../../package.json").version, { option: true }],
  // stockage du navigateur indisponible (navigation privée stricte)
  blockStorage: [false, { option: true }],
  // journal vocal activé (#87) : il est désactivé par défaut
  journalOn: [false, { option: true }],
  app: async (
    {
      page,
      savedSettings,
      introSeen,
      blockStorage,
      micSilentMs,
      journalOn,
      browserName,
    },
    use,
  ) => {
    // toute erreur JavaScript de la page fait échouer le test
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    // et toute violation de la politique de sécurité du contenu (#37), rendue en erreur de la page
    await page.addInitScript(() =>
      document.addEventListener("securitypolicyviolation", (e) =>
        setTimeout(() => {
          throw new Error(
            `CSP : ${e.violatedDirective} bloque ${e.blockedURI || "un élément en ligne"}`,
          );
        }),
      ),
    );
    const coverage = COVERAGE_DIR && browserName === "chromium";
    if (coverage)
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.addInitScript(installFakes);
    await page.addInitScript((ms) => {
      window.__chronoEnv.micSilentMs = ms;
    }, micSilentMs);
    // (les scripts d'initialisation tournent aussi sur about:blank, où le stockage est interdit)
    if (introSeen)
      await page.addInitScript((v) => {
        try {
          localStorage.setItem("chrono-canne-intro", String(v));
        } catch {}
      }, introSeen);
    if (journalOn)
      await page.addInitScript(() => {
        try {
          localStorage.setItem("chrono-canne-journal-on", "1");
        } catch {}
      });
    if (blockStorage)
      await page.addInitScript(() =>
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("bloqué", "SecurityError");
          },
        }),
      );
    if (savedSettings) {
      await page.addInitScript((s) => {
        try {
          localStorage.setItem("chrono-canne", JSON.stringify(s));
        } catch {}
      }, savedSettings);
    }
    await page.clock.install({ time: new Date("2026-10-17T10:00:00") });
    await page.goto("/");
    // pause juste après l'heure de la page : sur une machine chargée, le chargement peut durer plus d'une seconde, et une
    // heure fixe (10:00:01) serait déjà passée (« Cannot fast-forward to the past »)
    const pageNow = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(new Date(pageNow + 100));
    const app = new App(page);
    if (!(await page.locator("#intro").isVisible())) await app.micOn(); // écran titre : c'est « Commencer » qui active le micro
    await use(app);
    expect(pageErrors, "erreurs JavaScript dans la page").toEqual([]);
    if (coverage) {
      fs.mkdirSync(COVERAGE_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(COVERAGE_DIR, crypto.randomUUID() + ".json"),
        JSON.stringify(await page.coverage.stopJSCoverage()),
      );
    }
  },
});

module.exports = { test, expect };
