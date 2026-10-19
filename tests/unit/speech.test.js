// Voix du navigateur (js/speech.js, #58) : annonces, écoute continue, relance après les annonces (#30, #45),
// anti-écho, événements du micro (#56). La fenêtre est fausse ; les minuteries et l'heure sont simulées.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createSpeech } from "../../js/speech.js";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36";

/** Fausse fenêtre : synthèse (annonces finies au bout de speechMs), reconnaissance enregistrée */
function fakeWindow({
  ua = ANDROID,
  touch = 5,
  speechMs = 0,
  recognition = true,
  voices = [],
} = {}) {
  const spoken = [],
    recs = [],
    log = [];
  let speaking = false;
  const synth = {
    get speaking() {
      return speaking;
    },
    pending: false,
    onvoiceschanged: null,
    getVoices: () => voices,
    resume() {},
    cancel() {
      log.push("cancel");
      speaking = false;
    },
    speak(u) {
      spoken.push(u);
      speaking = true;
      const end = () => {
        speaking = false;
        u.onend?.();
      };
      if (speechMs) setTimeout(end, speechMs);
      else end();
    },
  };
  class Rec {
    constructor() {
      recs.push(this);
      this.started = 0;
      this.stopped = 0;
    }
    start() {
      this.started++;
    }
    stop() {
      this.stopped++;
    }
    abort() {
      this.aborted = true;
    }
    /** le navigateur rend un résultat @param {string} text @param {boolean} final */
    hear(text, final = true, alts = []) {
      const r = [text, ...alts].map((transcript) => ({ transcript }));
      r.isFinal = final;
      this.results = [...(this.results || []), r];
      this.onresult?.({
        resultIndex: this.results.length - 1,
        results: this.results,
      });
    }
  }
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  return {
    win: {
      speechSynthesis: synth,
      SpeechSynthesisUtterance: Utterance,
      ...(recognition && { webkitSpeechRecognition: Rec }),
      navigator: { userAgent: ua, maxTouchPoints: touch },
      __chronoEnv: { echoGuardMs: 400 },
    },
    spoken,
    recs,
    log,
    get rec() {
      return recs[recs.length - 1];
    },
  };
}

function listen(speech) {
  const heard = [],
    events = [];
  let restarts = 0,
    denied = 0;
  speech.listen({
    onResult: (alts, final, i) => heard.push([alts[0], final, i]),
    onRestart: () => restarts++,
    onDenied: () => denied++,
    onEvent: (e, d) => events.push(d === undefined ? e : `${e}:${d}`),
  });
  return {
    heard,
    events,
    get restarts() {
      return restarts;
    },
    get denied() {
      return denied;
    },
  };
}

// avance l'horloge par pas de 10 ms : avec les minuteries simulées de Node, une avance d'un bloc donne déjà son heure de
// fin aux délais qui partent, et ne lance pas ceux qu'ils programment (même piège que l'horloge de Playwright)
const advance = (ms) => {
  for (let left = ms; left > 0; left -= 10)
    mock.timers.tick(Math.min(10, left));
};

test.beforeEach(() =>
  mock.timers.enable({
    apis: ["setTimeout", "Date"],
    now: Date.UTC(2026, 9, 18, 10),
  }),
);
test.afterEach(() => mock.timers.reset());

test("annonce : en français, voix française choisie, et une annonce en cours est coupée pour la suivante", () => {
  const f = fakeWindow({
    speechMs: 2000,
    voices: [
      { lang: "en-US" },
      { lang: "fr-CA", localService: false },
      { lang: "fr-FR", localService: true },
    ],
  });
  const s = createSpeech(f.win);
  s.say("Temps");
  assert.equal(f.spoken[0].lang, "fr-FR");
  assert.equal(f.spoken[0].voice.lang, "fr-FR");
  assert.equal(f.spoken[0].rate, 1.05);
  s.say("Relais");
  assert.deepEqual(f.log, ["cancel"]);
  assert.equal(
    f.spoken.length,
    1,
    "cancel puis speak tout de suite perd l'annonce sur Chrome : on attend",
  );
  advance(120);
  assert.equal(f.spoken[1].text, "Relais");
});

test("sans synthèse vocale : say ne fait rien, sans planter", () => {
  const f = fakeWindow();
  delete f.win.speechSynthesis;
  assert.doesNotThrow(() => createSpeech(f.win).say("Temps"));
});

test("écoute continue en français ; le navigateur qui coupe est relancé, sauf si le micro a été coupé", () => {
  const f = fakeWindow();
  const s = createSpeech(f.win);
  assert.equal(s.canListen, true);
  const l = listen(s);
  assert.equal(s.listening, true);
  assert.deepEqual(
    [f.rec.lang, f.rec.continuous, f.rec.interimResults, f.rec.maxAlternatives],
    ["fr-FR", true, true, 3],
  );
  assert.equal(f.rec.started, 1);
  f.rec.onend();
  assert.equal(f.rec.started, 2, "relancée");
  assert.equal(l.restarts, 1);
  s.stopListening();
  assert.equal(s.listening, false);
  assert.equal(f.rec.stopped, 1);
  f.rec.onend();
  assert.equal(f.rec.started, 2, "micro coupé : pas de relance");
  assert.deepEqual(l.events, ["start", "restart", "stop"]);
});

test("sans reconnaissance vocale : canListen faux, listen ne fait rien", () => {
  const f = fakeWindow({ recognition: false });
  const s = createSpeech(f.win);
  assert.equal(s.canListen, false);
  listen(s);
  assert.equal(s.listening, false);
});

test("micro refusé : l'écoute s'arrête et l'app est prévenue ; les autres erreurs sont seulement notées", () => {
  const f = fakeWindow();
  const s = createSpeech(f.win);
  const l = listen(s);
  f.rec.onerror({ error: "network" });
  assert.equal(s.listening, true);
  f.rec.onerror({ error: "not-allowed" });
  assert.equal(s.listening, false);
  assert.equal(l.denied, 1);
  f.rec.onerror({ error: "service-not-allowed" });
  assert.equal(l.denied, 2);
  assert.deepEqual(l.events, [
    "start",
    "error:network",
    "error:not-allowed",
    "error:service-not-allowed",
  ]);
});

test("les résultats passent tels quels, avec leur index ; chacun est un signe de vie", () => {
  const f = fakeWindow();
  const s = createSpeech(f.win);
  const l = listen(s);
  f.rec.hear("Allez", false);
  f.rec.hear("Allez", true);
  assert.deepEqual(l.heard, [
    ["Allez", false, 0],
    ["Allez", true, 1],
  ]);
  assert.deepEqual(l.events, ["start", "result", "result"]);
});

test("anti-écho : pendant une annonce et 400 ms après, seule la voix de l'app est ignorée", () => {
  const f = fakeWindow({ speechMs: 1000 });
  const s = createSpeech(f.win);
  const l = listen(s);
  s.say("Trente secondes");
  f.rec.hear("secondes");
  f.rec.hear("Stop, fin de la reprise");
  assert.deepEqual(
    l.heard.map((h) => h[0]),
    ["Stop, fin de la reprise"],
  );
  advance(1000 + 399);
  f.rec.hear("trente");
  assert.equal(l.heard.length, 1, "encore dans la marge de 400 ms");
  advance(1);
  f.rec.hear("trente");
  assert.deepEqual(
    l.heard.at(-1)[0],
    "trente",
    "après la marge : c'est l'arbitre",
  );
});

test("iPhone : après chaque annonce, une reconnaissance neuve ; pas sur Android", () => {
  for (const [ua, touch, renew] of [
    [IPHONE, 5, true],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5, true],
    ["Mozilla/5.0 (Macintosh)", 0, false],
    ["Mozilla/5.0 (Macintosh)", 1, false],
    [ANDROID, 5, false],
  ]) {
    const f = fakeWindow({ ua, touch });
    const s = createSpeech(f.win);
    const l = listen(s);
    const first = f.rec;
    s.say("Temps");
    advance(10);
    assert.equal(f.recs.length, renew ? 2 : 1, ua);
    if (renew) {
      assert.equal(first.aborted, true, "l'ancienne est abandonnée");
      assert.equal(first.onresult, null, "et ne parle plus à l'app");
      assert.equal(f.rec.started, 1);
      assert.equal(l.restarts, 1);
      assert.deepEqual(l.events.slice(-1), ["relisten:Temps"]);
    }
  }
});

test("« Prêt » relance l'écoute partout, Android compris (#30)", () => {
  const f = fakeWindow();
  const s = createSpeech(f.win);
  listen(s);
  s.say("Prêt", { relisten: true });
  advance(10);
  assert.equal(f.recs.length, 2);
});

test("la relance attend la fin de la phrase de l'arbitre, 5 s au plus", () => {
  const f = fakeWindow({ ua: IPHONE });
  const s = createSpeech(f.win);
  listen(s);
  f.rec.hear("Stop, fin de", false);
  s.say("Temps");
  advance(4750);
  assert.equal(f.recs.length, 1, "phrase en cours : on attend");
  f.rec.hear("Stop, fin de la reprise", true);
  advance(250);
  assert.equal(f.recs.length, 2, "phrase finie : relance");

  const g = fakeWindow({ ua: IPHONE });
  const t = createSpeech(g.win);
  listen(t);
  g.rec.hear("euh", false);
  t.say("Temps");
  advance(4999);
  assert.equal(g.recs.length, 1);
  advance(250);
  assert.equal(g.recs.length, 2, "au-delà de 5 s : relance quand même");
});

test("deux annonces de suite : une seule relance ; micro coupé entre-temps : aucune", () => {
  const f = fakeWindow({ ua: IPHONE });
  const s = createSpeech(f.win);
  listen(s);
  s.say("Temps");
  s.say("Temps");
  advance(200);
  assert.equal(f.recs.length, 2);
  const g = fakeWindow({ ua: IPHONE });
  const t = createSpeech(g.win);
  listen(t);
  t.say("Temps");
  t.stopListening();
  advance(200);
  assert.equal(g.recs.length, 1);
});

test("relance à la main (#56) : reconnaissance neuve si le micro écoute, rien sinon", () => {
  const f = fakeWindow();
  const s = createSpeech(f.win);
  const l = listen(s);
  s.relaunch();
  assert.equal(f.recs.length, 2);
  assert.deepEqual(l.events.slice(-1), ["relaunch:toucher"]);
  s.stopListening();
  s.relaunch();
  assert.equal(f.recs.length, 2);
});

test("unlock : une annonce muette, une seule fois (exigence d'iOS)", () => {
  const f = fakeWindow();
  const s = createSpeech(f.win);
  s.unlock();
  s.unlock();
  assert.equal(f.spoken.length, 1);
  assert.equal(f.spoken[0].volume, 0);
  s.cancel();
  assert.deepEqual(f.log, ["cancel"]);
});

test("voix : une voix française locale de préférence, sinon une voix française quelconque", () => {
  const pick = (voices) => {
    const f = fakeWindow({ voices });
    createSpeech(f.win).say("x");
    return f.spoken[0].voice;
  };
  assert.equal(
    pick([
      { lang: "fr-FR", localService: false, id: 1 },
      { lang: "fr-FR", localService: true, id: 2 },
    ]).id,
    2,
  );
  assert.equal(
    pick([
      { lang: "en-US", id: 1 },
      { lang: "fr-CA", localService: false, id: 2 },
    ]).id,
    2,
  );
  assert.equal(
    pick([{ lang: "en-FR", id: 1 }]),
    undefined,
    "pas de voix française : celle du navigateur",
  );
});

test("anti-écho : sans fin d'annonce signalée, la durée estimée de l'annonce sert de fenêtre ; marge de 400 ms par défaut", () => {
  const f = fakeWindow({ speechMs: 60_000 });
  const s = createSpeech(f.win);
  const l = listen(s);
  s.say("Temps"); // 600 ms + 90 ms par caractère
  advance(1040);
  f.rec.hear("temps");
  assert.equal(l.heard.length, 0);
  advance(20);
  f.rec.hear("temps");
  assert.equal(l.heard.length, 1, "au-delà de la durée estimée");

  const g = fakeWindow({ speechMs: 100 });
  delete g.win.__chronoEnv;
  const t = createSpeech(g.win);
  const m = listen(t);
  t.say("Temps");
  advance(100 + 390);
  g.rec.hear("temps");
  assert.equal(m.heard.length, 0, "marge par défaut : 400 ms");
  advance(20);
  g.rec.hear("temps");
  assert.equal(m.heard.length, 1);
});
