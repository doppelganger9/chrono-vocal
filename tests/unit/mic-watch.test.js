// Témoin « micro silencieux » (#56) : rien reçu de la reconnaissance depuis un moment, alors que le micro écoute
import { test } from "node:test";
import assert from "node:assert/strict";
import { createMicWatch } from "../../js/mic-watch.js";

const setup = (thresholdMs = 30_000) => {
  let t = 0;
  const w = createMicWatch({ now: () => t, thresholdMs });
  return {
    w,
    advance: (ms) => {
      t += ms;
    },
  };
};

test("silencieux au bout du seuil, sans rien reçu, si le micro écoute", () => {
  const { w, advance } = setup();
  advance(29_999);
  assert.equal(w.isSilent(true), false);
  advance(1);
  assert.equal(w.isSilent(true), true);
  assert.equal(w.silentMs(), 30_000);
  assert.equal(w.isSilent(false), false, "micro coupé : pas de témoin");
});

test("toute activité de la reconnaissance remet le compteur à zéro", () => {
  const { w, advance } = setup();
  advance(40_000);
  w.activity();
  assert.equal(w.silentMs(), 0);
  assert.equal(w.isSilent(true), false);
  advance(30_000);
  assert.equal(w.isSilent(true), true);
});

test("le seuil est réglable ; Infinity désactive le témoin", () => {
  const { w, advance } = setup(5000);
  advance(5000);
  assert.equal(w.isSilent(true), true);
  const off = setup(Infinity);
  off.advance(1e9);
  assert.equal(off.w.isSilent(true), false);
});
