// Journal vocal exporté : version de l'app, date de l'export et navigateur (#112)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createJournal, JOURNAL_KEY, browserName } from "../../js/journal.js";
import { VERSION } from "../../js/version.js";

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    m,
  };
};
const UA_S7 =
  "Mozilla/5.0 (Linux; Android 8.0.0; SAMSUNG SM-G930F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36";

test("export : version de l'app, date de l'export et navigateur, avant le journal", () => {
  const t = Date.UTC(2026, 9, 24, 18, 30);
  const j = createJournal({
    storage: memory(),
    now: () => t,
    version: "9.8.7",
    userAgent: UA_S7,
  });
  j.setEnabled(true);
  j.add({ alts: ["stop"], final: true, phase: "round", action: "STOP" });
  const data = JSON.parse(j.exportFile().text);
  assert.deepEqual(data, {
    app: "chrono-canne",
    version: "9.8.7",
    exported: "2026-10-24T18:30:00.000Z",
    userAgent: UA_S7,
    journal: [
      { t, alts: ["stop"], final: true, phase: "round", action: "STOP" },
    ],
  });
  assert.deepEqual(Object.keys(data), [
    "app",
    "version",
    "exported",
    "userAgent",
    "journal",
  ]); // l'en-tête se lit en premier dans le fichier
});

test("export : par défaut, la version de js/version.js, et un navigateur inconnu laissé vide", () => {
  const j = createJournal({ storage: memory(), now: () => 0 });
  const data = JSON.parse(j.exportFile().text);
  assert.equal(data.version, VERSION);
  assert.equal(data.userAgent, "");
  assert.equal(data.exported, "1970-01-01T00:00:00.000Z");
});

test("chaque début d'écoute note la version, pour un journal qui couvre une mise à jour", () => {
  let version = "1.7.0";
  const storage = memory();
  const a = createJournal({ storage, now: () => 1, version });
  a.event("start", undefined, "ready");
  a.event("error", "no-speech", "round");
  version = "1.8.0"; // l'app a été mise à jour, le journal du téléphone est gardé
  const b = createJournal({ storage, now: () => 2, version });
  b.event("start");
  assert.deepEqual(b.entries, [
    { t: 1, event: "start", phase: "ready", v: "1.7.0" },
    { t: 1, event: "error", detail: "no-speech", phase: "round" },
    { t: 2, event: "start", v: "1.8.0" },
  ]);
});

test("journal d'avant #112, sans version : toujours lisible et exportable", () => {
  const old = [
    { t: 10, event: "start", phase: "ready" },
    { t: 11, alts: ["allez"], final: true, phase: "ready", action: "ALLEZ" },
  ];
  const j = createJournal({
    storage: memory({ [JOURNAL_KEY]: JSON.stringify(old) }),
    now: () => 12,
    version: "1.7.0",
  });
  assert.deepEqual(j.entries, old);
  assert.deepEqual(JSON.parse(j.exportFile().text).journal, old);
});

test("browserName : un nom court pour distinguer les navigateurs des téléphones", () => {
  const cases = [
    [UA_S7, "Samsung Internet"],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      "Chrome Android",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Safari iPhone",
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Safari iPad",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1",
      "Chrome iPhone",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15",
      "Firefox iPhone",
    ],
    [
      "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
      "Firefox Android",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      "Safari",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      "Chrome",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
      "Edge",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 EdgA/129.0.0.0",
      "Edge",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
      "Firefox",
    ],
    ["", "inconnu"],
    ["<script>alert(1)</script>", "inconnu"],
  ];
  for (const [ua, name] of cases) assert.equal(browserName(ua), name, ua);
  for (const hostile of [undefined, null, 42, {}, ["Chrome/1"]])
    assert.equal(browserName(/** @type {any} */ (hostile)), "inconnu");
});
