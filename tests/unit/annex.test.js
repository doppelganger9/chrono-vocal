// Chronomètre annexe des retards (js/annex.js) : I 4.2.13
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnnex, annexAnnouncement, annexLimit } from "../../js/annex.js";

const setup = () => {
  const clock = {
    t: 0,
    wall() {
      return this.t;
    },
  };
  const events = [];
  const annex = createAnnex({
    clock,
    emit: (type, d) => events.push({ type, ...d }),
  });
  const advance = (ms) => {
    for (let l = ms; l > 0; l -= 250) {
      clock.t += Math.min(250, l);
      annex.tick();
    }
  };
  return { annex, clock, events, advance };
};

test("compte le retard, avec une annonce à 1, 2 et 3 minutes", () => {
  const h = setup();
  h.annex.toggle();
  h.advance(60_000);
  assert.deepEqual(h.events, [
    { type: "annex-minute", minute: 1, mode: "retard" },
  ]);
  h.advance(120_000);
  assert.deepEqual(
    h.events.map((e) => e.minute),
    [1, 2, 3],
  );
  h.advance(120_000);
  assert.equal(h.events.length, 3, "rien après 3 minutes");
  assert.equal(h.annex.elapsed(), 300);
});

test("arrêter, reprendre, remettre à zéro", () => {
  const h = setup();
  assert.equal(h.annex.running, false);
  h.annex.toggle();
  h.advance(10_000);
  h.annex.toggle();
  h.advance(50_000);
  assert.equal(h.annex.elapsed(), 10);
  assert.equal(h.events.length, 0);
  h.annex.toggle();
  h.advance(50_000);
  assert.equal(h.annex.elapsed(), 60);
  assert.equal(h.events.length, 1);
  h.annex.reset();
  assert.equal(h.annex.elapsed(), 0);
  assert.equal(h.annex.running, false);
  h.annex.toggle();
  h.advance(60_000);
  assert.equal(
    h.events.length,
    2,
    "les annonces repartent après remise à zéro",
  );
});

// Second exclu qui refuse de sortir : carton rouge au tireur au bout d'une minute (I 4.2.5.4, #9)
test("second exclu : une seule annonce, à 1 minute", () => {
  const h = setup();
  assert.equal(h.annex.mode, "retard", "retard par défaut");
  h.annex.setMode("second");
  assert.equal(h.annex.mode, "second");
  h.annex.toggle();
  h.advance(59_750);
  assert.equal(h.events.length, 0);
  h.advance(250);
  assert.deepEqual(h.events, [
    { type: "annex-minute", minute: 1, mode: "second" },
  ]);
  h.advance(180_000);
  assert.equal(h.events.length, 1, "rien après la première minute");
  assert.equal(h.annex.elapsed(), 240, "le temps continue de compter");
});

test("changer de mode remet le chronomètre annexe à zéro", () => {
  const h = setup();
  h.annex.toggle();
  h.advance(60_000);
  assert.deepEqual(h.events, [
    { type: "annex-minute", minute: 1, mode: "retard" },
  ]);
  h.annex.setMode("second");
  assert.equal(h.annex.elapsed(), 0);
  assert.equal(h.annex.running, false);
  h.annex.toggle();
  h.advance(60_000);
  assert.deepEqual(
    h.events.map((e) => e.mode),
    ["retard", "second"],
    "la minute est annoncée à nouveau",
  );
  h.annex.setMode("retard");
  h.annex.toggle();
  h.advance(60_000);
  assert.equal(h.events.length, 3);
});

test("annonces du chronomètre annexe", () => {
  assert.equal(annexAnnouncement("retard", 1), "une minute. Pénalité");
  assert.equal(annexAnnouncement("retard", 2), "deux minutes. Pénalité");
  assert.equal(
    annexAnnouncement("retard", 3),
    "Trois minutes. Disqualification",
  );
  assert.equal(annexAnnouncement("second", 1), "Une minute. Carton rouge");
});

test("limite du chronomètre annexe : 3 minutes pour un retard, 1 minute pour un second exclu", () => {
  assert.equal(annexLimit("retard"), 180);
  assert.equal(annexLimit("second"), 60);
});
