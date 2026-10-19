// Mise à jour disponible (#96) : une nouvelle version téléchargée, proposée à l'arbitre quand rien n'est en cours
import { test } from "node:test";
import assert from "node:assert/strict";
import { canUpdate, watchUpdate } from "../../js/update.js";

/** @param {Partial<import('../../js/types.js').ChronoState>} s */
const st = (s) => ({ phase: "ready", round: 1, running: false, ...s });

test("proposée avant la première reprise, et une fois l'assaut terminé", () => {
  assert.equal(canUpdate(st({})), true);
  assert.equal(canUpdate(st({ phase: "done", round: 3 })), true);
});

test("jamais au milieu d'un assaut", () => {
  assert.equal(canUpdate(st({ running: true })), false, "« Allez » donné");
  assert.equal(canUpdate(st({ round: 2 })), false, "avant la 2e reprise");
  for (const phase of ["round", "overtime", "rest"])
    assert.equal(canUpdate(st({ phase, running: false })), false, phase);
});

/** Un service worker en cours d'installation */
const worker = () => Object.assign(new EventTarget(), { state: "installing" });
/** @param {object} [r] */
const registration = (r = {}) =>
  Object.assign(new EventTarget(), { waiting: null, installing: null, ...r });
/** @param {ReturnType<typeof worker>} w @param {string} state */
const become = (w, state) => {
  w.state = state;
  w.dispatchEvent(new Event("statechange"));
};

test("une version téléchargée pendant la visite est signalée une fois installée", () => {
  const reg = registration();
  let ready = 0;
  watchUpdate(reg, true, () => ready++);
  const w = worker();
  reg.installing = w;
  reg.dispatchEvent(new Event("updatefound"));
  assert.equal(ready, 0, "pas pendant le téléchargement");
  become(w, "installed");
  assert.equal(ready, 1);
  become(w, "activated");
  assert.equal(ready, 1, "une seule fois");
});

test("une version déjà en attente est signalée tout de suite", () => {
  let ready = 0;
  watchUpdate(registration({ waiting: worker() }), true, () => ready++);
  assert.equal(ready, 1);
});

test("première installation de l'app (page sans service worker) : rien à mettre à jour", () => {
  const reg = registration({ waiting: worker() });
  let ready = 0;
  watchUpdate(reg, false, () => ready++);
  const w = worker();
  reg.installing = w;
  reg.dispatchEvent(new Event("updatefound"));
  become(w, "installed");
  assert.equal(ready, 0);
});

test("téléchargement échoué (réseau coupé) : rien n'est signalé", () => {
  const reg = registration();
  let ready = 0;
  watchUpdate(reg, true, () => ready++);
  const w = worker();
  reg.installing = w;
  reg.dispatchEvent(new Event("updatefound"));
  become(w, "redundant");
  assert.equal(ready, 0);
});

test("signalée une seule fois, même si le navigateur répète l'état « installé »", () => {
  const reg = registration();
  let ready = 0;
  watchUpdate(reg, true, () => ready++);
  const w = worker();
  reg.installing = w;
  reg.dispatchEvent(new Event("updatefound"));
  become(w, "installed");
  become(w, "installed");
  assert.equal(ready, 1);
});

test("annonce de téléchargement sans service worker en cours : rien, sans erreur", () => {
  const reg = registration();
  let ready = 0;
  watchUpdate(reg, true, () => ready++);
  assert.doesNotThrow(() => reg.dispatchEvent(new Event("updatefound")));
  assert.equal(ready, 0);
});
