// Ce que l'arbitre dit → ce que fait l'app (js/voice.js, #58). Le chrono est le vrai ; la voix, l'écran, le journal
// et les commandes annulables sont des espions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup } from "./helpers.js";
import { createVoice } from "../../js/voice.js";

const T0 = Date.UTC(2026, 9, 18, 10);
function voiceSetup(overrides = {}) {
  const h = setup({ rounds: 2, roundSec: 60, restSec: 60, ...overrides });
  const done = [],
    said = [],
    heard = [],
    journal = [],
    referee = [],
    rappels = [];
  let renders = 0,
    rappelOk = true;
  const command = (name, fn) => {
    const ok = fn() !== false;
    if (ok) done.push(name);
    return ok;
  };
  const voice = createVoice({
    getCfg: () => h.getCfg(),
    updateCfg: (c) => h.setCfg(c),
    chrono: h.chrono,
    command,
    commands: {
      STOP: () => command("STOP", h.chrono.stop),
      ALLEZ: () => command("ALLEZ", h.chrono.allez),
      REPOS: () => command("REPOS", h.chrono.endReprise),
    },
    endReprise: h.chrono.endReprise,
    rappel: (color) => {
      rappels.push(color);
      return rappelOk;
    },
    speech: { say: (text, opts) => said.push(opts ? [text, opts] : text) },
    ui: {
      showHeard: (t) => heard.push(t),
      phaseText: () => "PHASE",
      render: () => renders++,
    },
    onReferee: (p) => {
      referee.push(p);
      h.setCfg(p);
    },
    now: () => T0 + h.clock.t, // une heure réelle : « 0 ms depuis 0 » serait « juste avant »
    journal: { add: (e) => journal.push(e) },
  });
  let i = 0;
  return {
    h,
    voice,
    done,
    said,
    heard,
    journal,
    referee,
    rappels,
    get renders() {
      return renders;
    },
    set rappelOk(v) {
      rappelOk = v;
    },
    /** une phrase finie (index nouveau) */
    hear: (text, { final = true, alts = [] } = {}) =>
      voice.onResult([text, ...alts], final, i++),
    /** un résultat provisoire puis final pour le même index */
    hearSame: (texts, finals) => {
      const n = i++;
      texts.forEach((t, k) => voice.onResult([t], finals[k], n));
    },
    last: () => heard[heard.length - 1],
  };
}

test("commandement compris : exécuté, affiché, noté au journal", () => {
  const v = voiceSetup();
  v.hear("Allez");
  assert.equal(v.h.st.phase, "round");
  assert.equal(v.last(), "🎙 ALLEZ (« Allez »)");
  assert.deepEqual(v.journal.at(-1), {
    alts: ["Allez"],
    final: true,
    phase: "ready",
    action: "ALLEZ",
  });
  v.hear("Stop");
  assert.equal(v.h.st.halt, true);
  assert.equal(v.journal.at(-1).action, "STOP");
});

test("aucun commandement ignoré sans le dire : « sans effet » avec la phase", () => {
  const v = voiceSetup();
  v.hear("Stop");
  assert.equal(v.last(), "🎙 STOP entendu — sans effet : PHASE");
  assert.equal(v.journal.at(-1).action, "STOP sans effet");
});

test("« Stop, fin de la reprise » termine la reprise ; « fin de l'assaut » aussi, sans effet hors reprise", () => {
  const v = voiceSetup();
  v.hear("Stop, fin de la reprise");
  assert.equal(v.last(), "🎙 FIN DE REPRISE entendu — sans effet : PHASE");
  v.hear("Allez");
  v.hear("Stop, fin de la reprise");
  assert.equal(v.h.st.phase, "rest");
  assert.equal(v.last(), "🎙 FIN DE REPRISE (« Stop, fin de la reprise »)");
  assert.deepEqual(v.done.slice(-1), ["FIN DE REPRISE"]);
  v.h.chrono.endRest();
  v.hear("Allez");
  v.hear("Stop, fin de l'assaut");
  assert.equal(v.h.st.phase, "done");
  assert.equal(v.journal.at(-1).action, "FIN DE L'ASSAUT");
});

test("« en garde » obligatoire : « allez » seul ignoré, accepté dans les 10 s qui suivent « en garde »", () => {
  const v = voiceSetup({ requireEnGarde: true });
  v.hear("Allez");
  assert.equal(v.h.st.phase, "ready");
  assert.equal(v.last(), "🎙 ALLEZ ignoré : pas de « en garde » juste avant");
  assert.equal(v.journal.at(-1).action, "ALLEZ ignoré (pas de « en garde »)");
  v.hear("En garde");
  assert.equal(v.last(), "🎙 EN GARDE");
  assert.equal(v.journal.at(-1).action, "EN GARDE");
  assert.ok(v.renders > 0, "l'écran affiche « En garde »");
  assert.equal(v.voice.lastEnGarde, T0);
  v.h.clock.t = 10_000;
  v.hear("Allez");
  assert.equal(v.h.st.phase, "round", "à 10 s pile : accepté");
  v.hear("Stop");
  v.h.clock.t = 30_000;
  v.hear("En garde");
  v.h.clock.t = 40_001;
  v.hear("Allez");
  assert.equal(v.h.st.halt, true, "au-delà de 10 s : ignoré");
  v.hear("En garde, allez");
  assert.equal(v.h.st.halt, false, "« en garde, allez » d'une traite");
});

test("« en garde » dans un résultat provisoire ne consomme pas la phrase : la suite « allez » arrive dans le même résultat", () => {
  const v = voiceSetup({ requireEnGarde: true });
  v.hearSame(["En garde", "En garde, allez"], [false, true]);
  assert.equal(v.h.st.phase, "round");
});

test("une alternative de la reconnaissance peut porter le commandement", () => {
  const v = voiceSetup();
  v.hear("à l'heure", { alts: ["Allez"] });
  assert.equal(v.h.st.phase, "round");
  assert.deepEqual(v.journal.at(-1).alts, ["à l'heure", "Allez"]);
});

test("un résultat n'agit qu'une fois ; une nouvelle écoute remet les index à zéro", () => {
  const v = voiceSetup();
  v.voice.onResult(["Allez"], false, 0);
  v.voice.onResult(["Allez"], true, 0);
  assert.equal(v.done.filter((d) => d === "ALLEZ").length, 1);
  v.voice.onResult(["Stop"], true, 0);
  assert.equal(v.h.st.halt, false, "même index : ignoré");
  v.voice.onRestart();
  v.voice.onResult(["Stop"], true, 0);
  assert.equal(
    v.h.st.halt,
    true,
    "nouvelle écoute : l'index 0 est une nouvelle phrase",
  );
});

test("« Chrono, prêt ? » : rien tant que la phrase n'est pas finie, puis « Prêt » et relance de l'écoute", () => {
  const v = voiceSetup();
  v.hearSame(["Chrono prêt", "Chrono, prêt ?"], [false, true]);
  assert.deepEqual(v.said, [["Prêt", { relisten: true }]]);
  assert.ok(v.heard.includes("🎙 Chrono, prêt ?"));
  assert.equal(v.last(), "🎙 Chrono, prêt ? → « Prêt »");
  assert.equal(v.journal.at(-1).action, "Prêt");
  assert.equal(v.journal.length, 1, "le résultat provisoire n'est pas noté");
});

test("« Chrono, prêt ? » : la fin de l'écoute avant la phrase finie déclenche la réponse", () => {
  const v = voiceSetup();
  v.hearSame(["Chrono prêt"], [false]);
  assert.deepEqual(v.said, []);
  v.voice.onRestart();
  assert.deepEqual(v.said, [["Prêt", { relisten: true }]]);
  v.voice.onRestart();
  assert.equal(v.said.length, 1, "une seule réponse");
});

test("« Chrono, prêt ? » sans réponse si le réglage est coupé, mais noté", () => {
  const v = voiceSetup({ answerReady: false });
  v.hear("Chrono, prêt ?");
  assert.deepEqual(v.said, []);
  assert.equal(v.journal.at(-1).action, "Prêt");
});

test("« Chrono » puis « prêt » dans les 4 s : réponse ; au-delà, « prêt » n'est plus la même question", () => {
  const v = voiceSetup();
  v.hear("Chrono");
  assert.equal(v.last(), "🎙 Chrono…");
  assert.equal(v.journal.at(-1).action, "Chrono…");
  v.h.clock.t = 3999;
  v.hear("Prêt");
  assert.deepEqual(v.said, [["Prêt", { relisten: true }]]);
  v.hear("Prêt");
  assert.equal(v.said.length, 1, "la question est close");
  v.hear("Chrono");
  v.h.clock.t += 4000;
  v.hear("Prêt");
  assert.equal(v.said.length, 1);
  v.hearSame(["Chrono"], [false]);
  assert.equal(
    v.journal.at(-1).action,
    "non reconnu",
    "« Chrono » provisoire : rien",
  );
});

test("rappel : la couleur va au chrono ; sans couleur, l'app demande ; hors repos, « sans effet »", () => {
  const v = voiceSetup();
  v.hear("Rappel, tireur bleu");
  assert.deepEqual(v.rappels, ["bleu"]);
  assert.equal(v.journal.at(-1).action, "rappel bleu");
  v.hear("Rappel");
  assert.equal(v.last(), "🎙 Rappel entendu — quel tireur ? (rouge, bleu)");
  assert.equal(v.journal.at(-1).action, "rappel sans tireur");
  v.rappelOk = false;
  v.hear("Rappel rouge");
  assert.equal(v.last(), "🎙 Rappel entendu — sans effet : PHASE");
  assert.equal(v.journal.at(-1).action, "rappel sans effet");
});

test("sanction : notée seulement une fois l'assaut commencé, annulable", () => {
  const v = voiceSetup();
  v.hear("Pénalité pour sortie d'aire, tireur bleu");
  assert.equal(v.h.bout.events.length, 0, "avant l'assaut : rien à rattacher");
  assert.equal(v.journal.at(-1).action, "non reconnu");
  v.hear("Allez");
  v.hear("Stop");
  v.hear("Pénalité pour sortie d'aire, tireur bleu");
  assert.equal(v.h.bout.events.length, 1);
  assert.deepEqual(
    Object.keys(v.h.bout.events[0]).sort(),
    ["color", "detail", "pts", "round", "stop", "t", "type"],
    "l'événement, sans champ en plus",
  );
  assert.equal(v.last(), "📝 Pénalité (sortie d'aire) bleu");
  assert.equal(v.done.at(-1), "PÉNALITÉ");
  assert.equal(
    v.journal.at(-1).action,
    "sanction : Pénalité (sortie d'aire) bleu",
  );
});

test("phrase de l'arbitre : réglages lus et confirmés à voix haute, hors reprise seulement", () => {
  const v = voiceSetup();
  v.hear(
    "Pour un assaut en 3 reprises d'une minute trente, avec 1 minute de repos",
  );
  assert.deepEqual(v.referee, [{ rounds: 3, roundSec: 90, restSec: 60 }]);
  assert.equal(
    v.last(),
    "✅ Pour un assaut en trois reprises d'une minute trente, avec une minute de repos.",
  );
  assert.deepEqual(v.said, [
    "Compris. Un assaut en trois reprises d'une minute trente, avec une minute de repos.",
  ]);
  assert.equal(v.journal.at(-1).action, "réglages");
  v.hear("Assaut en 6 reprises");
  assert.equal(v.last(), "⚠️ 6 reprises : 4 au maximum");
  assert.equal(v.said.at(-1), "Quatre reprises au maximum");
  v.hear("Allez");
  v.hear("Assaut en 2 reprises de 2 minutes");
  assert.equal(v.referee.length, 1, "pendant la reprise : pas de réglage");
  assert.equal(v.journal.at(-1).action, "non reconnu");
});

test("phrase non reconnue : affichée, et les mots courts gardés pour être appris", () => {
  const v = voiceSetup();
  v.hearSame(["Hop"], [false]);
  assert.equal(v.last(), "… Hop");
  assert.equal(v.journal.length, 0, "provisoire : pas noté");
  v.hear("Hop");
  assert.equal(v.journal.at(-1).action, "non reconnu");
  assert.deepEqual(v.voice.unheard, ["Hop"]);
  v.hear("hop");
  assert.deepEqual(v.voice.unheard, ["Hop"], "même mot : une fois");
  v.hear("une phrase de quatre mots");
  assert.deepEqual(
    v.voice.unheard,
    ["Hop"],
    "plus de 3 mots : pas un commandement",
  );
  v.hear("   ");
  for (const w of ["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8"]) v.hear(w);
  assert.equal(v.voice.unheard.length, 8, "8 au plus, les plus récents");
  assert.equal(v.voice.unheard[0], "h8");
});

test("apprendre un mot entendu, puis l'oublier", () => {
  const v = voiceSetup();
  v.hear("Hop");
  v.voice.learn(0, "ALLEZ");
  assert.deepEqual(v.h.getCfg().learned.ALLEZ, ["op"]);
  assert.deepEqual(v.voice.unheard, []);
  v.hear("Hop");
  assert.equal(v.h.st.phase, "round", "le mot appris lance la reprise");
  v.voice.forget("op", "ALLEZ");
  assert.deepEqual(v.h.getCfg().learned.ALLEZ, []);
});

test("cas limites relevés par les tests de mutation", () => {
  const v = voiceSetup();
  v.hear("un deux trois");
  assert.deepEqual(
    v.voice.unheard,
    ["un deux trois"],
    "3 mots : encore un commandement possible",
  );
  v.hear("  Allez  ");
  assert.equal(
    v.last(),
    "🎙 ALLEZ (« Allez »)",
    "texte affiché sans les espaces",
  );
  v.hear("Stop");
  v.hear("  Stop, fin de la reprise ");
  assert.equal(v.last(), "🎙 FIN DE REPRISE (« Stop, fin de la reprise »)");

  const w = voiceSetup();
  w.voice.onRestart();
  assert.deepEqual(
    w.said,
    [],
    "nouvelle écoute sans question en attente : pas de réponse",
  );
  w.hear("bonjour", { alts: ["Chrono, prêt ?"] });
  assert.deepEqual(
    w.said,
    [["Prêt", { relisten: true }]],
    "la question peut venir d'une alternative",
  );
  w.hear("Assaut en 2 reprises");
  assert.equal(w.referee.at(-1).rounds, 2, "le nombre de reprises seul suffit");
  w.hear("Observation, assaut en 4 reprises");
  assert.equal(
    w.referee.at(-1).rounds,
    4,
    "avant l'assaut, une phrase de sanction peut porter le format",
  );
});
