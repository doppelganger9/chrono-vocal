// Captation audio de terrain (#136) : le son de l'aire, enregistré sur le téléphone pour la banque sonore
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCapture,
  pickMimeType,
  extensionFor,
  captureName,
  formatSize,
  formatDuration,
} from "../../js/capture.js";

test("format : opus en webm (Chrome Android), sinon mp4 (Safari iPhone), sinon celui du navigateur", () => {
  assert.equal(
    pickMimeType(() => true),
    "audio/webm;codecs=opus",
  );
  assert.equal(
    pickMimeType((m) => m === "audio/mp4"),
    "audio/mp4",
  );
  assert.equal(
    pickMimeType((m) => m === "audio/webm"),
    "audio/webm",
  );
  assert.equal(
    pickMimeType(() => false),
    "",
  );
  assert.equal(
    pickMimeType(() => {
      throw new Error("non");
    }),
    "",
    "un navigateur qui refuse la question : son format par défaut",
  );
});

test("extension du fichier d'après le format", () => {
  assert.equal(extensionFor("audio/webm;codecs=opus"), "webm");
  assert.equal(extensionFor("audio/mp4"), "m4a");
  assert.equal(extensionFor("audio/mp4;codecs=mp4a.40.2"), "m4a");
  assert.equal(extensionFor("audio/ogg;codecs=opus"), "ogg");
  assert.equal(extensionFor("audio/aac"), "aac");
  assert.equal(extensionFor(""), "webm");
  assert.equal(extensionFor("video/quicktime"), "webm");
});

test("nom du fichier : l'heure de début, à la seconde, pour l'aligner avec le journal", () => {
  const t = new Date(2026, 9, 24, 9, 5, 7).getTime();
  assert.equal(
    captureName(t, "audio/mp4"),
    "chrono-canne-captation-2026-10-24-09h05m07.m4a",
  );
  const t2 = new Date(2026, 0, 2, 23, 59, 30).getTime();
  assert.equal(
    captureName(t2, "audio/webm"),
    "chrono-canne-captation-2026-01-02-23h59m30.webm",
  );
});

test("taille et durée lisibles", () => {
  assert.equal(formatSize(0), "0 Ko");
  assert.equal(formatSize(1023), "1 Ko");
  assert.equal(formatSize(1024), "1 Ko");
  assert.equal(formatSize(512 * 1024), "512 Ko");
  assert.equal(formatSize(1024 * 1024), "1,0 Mo");
  assert.equal(formatSize(12.34 * 1024 * 1024), "12,3 Mo");
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(59_999), "0:59");
  assert.equal(formatDuration(61_000), "1:01");
  assert.equal(formatDuration(3_600_000 + 65_000), "1:01:05");
});

// ---------- Enregistrement ----------
class FakeRecorder {
  static all = [];
  /** @param {any} stream @param {any} opts */
  constructor(stream, opts) {
    this.stream = stream;
    this.opts = opts;
    this.mimeType = opts.mimeType || "audio/webm";
    this.state = "inactive";
    this.ondataavailable = null;
    this.onstop = null;
    FakeRecorder.all.push(this);
  }
  start(slice) {
    this.slice = slice;
    this.state = "recording";
  }
  stop() {
    if (this.state === "inactive") return;
    this.state = "inactive";
    this.ondataavailable?.({ data: { size: 3, tag: "fin" } });
    this.onstop?.();
  }
  /** un morceau de son arrive */
  data(size = 10) {
    this.ondataavailable?.({ data: { size, tag: "son" } });
  }
}

function setup({ getStream, mimeType = "audio/webm;codecs=opus" } = {}) {
  FakeRecorder.all = [];
  let t = new Date(2026, 9, 24, 9, 0, 0).getTime();
  const track = {
    stopped: false,
    onended: null,
    stop() {
      this.stopped = true;
    },
  };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  /** @type {Map<number, any>} */
  const metas = new Map();
  /** @type {[number, number, any][]} */
  const chunks = [];
  const store = {
    putMeta: async (m) => void metas.set(m.id, { ...m }),
    addChunk: async (id, seq, blob) => void chunks.push([id, seq, blob]),
  };
  const events = [];
  const capture = createCapture({
    getStream: getStream ?? (async () => stream),
    Recorder: FakeRecorder,
    mimeType,
    store,
    now: () => t,
    onEvent: (event, detail) => events.push([event, detail]),
    segmentMs: 60_000,
    sliceMs: 5000,
  });
  return {
    capture,
    track,
    metas,
    chunks,
    events,
    rec: () => FakeRecorder.all[FakeRecorder.all.length - 1],
    advance: (ms) => {
      t += ms;
    },
  };
}

test("démarrer : enregistre le micro par morceaux, dans le format choisi", async () => {
  const s = setup();
  assert.equal(s.capture.recording, false);
  assert.equal(await s.capture.start(), "ok");
  assert.equal(s.capture.recording, true);
  assert.equal(s.capture.elapsedMs(), 0);
  const r = s.rec();
  assert.equal(r.opts.mimeType, "audio/webm;codecs=opus");
  assert.equal(r.opts.audioBitsPerSecond, 48_000);
  assert.equal(r.slice, 5000);
  const name = "chrono-canne-captation-2026-10-24-09h00m00.webm";
  assert.deepEqual(s.events, [["capture-start", name]]);
  const m = s.metas.get(s.capture.current?.id);
  assert.equal(m.name, name);
  assert.equal(m.mime, "audio/webm;codecs=opus");
  assert.equal(m.size, 0);
  assert.equal(m.start, m.end);
});

test("chaque morceau est gardé aussitôt, numéroté ; les morceaux vides sont ignorés", async () => {
  const s = setup();
  await s.capture.start();
  const id = s.capture.current?.id;
  s.advance(5000);
  s.rec().data(10);
  s.rec().data(0);
  s.advance(5000);
  s.rec().data(20);
  assert.deepEqual(
    s.chunks.map(([i, seq, b]) => [i, seq, b.size]),
    [
      [id, 0, 10],
      [id, 1, 20],
    ],
  );
  const m = s.metas.get(id);
  assert.equal(m.size, 30);
  assert.equal(m.end - m.start, 10_000);
  assert.equal(s.capture.elapsedMs(), 10_000);
});

test("arrêter : le dernier morceau est gardé, le micro libéré, le journal prévenu", async () => {
  const s = setup();
  await s.capture.start();
  s.advance(2000);
  s.capture.stop();
  assert.equal(s.capture.recording, false);
  assert.equal(s.capture.current, null);
  assert.equal(s.track.stopped, true);
  assert.equal(s.chunks.length, 1);
  assert.equal(s.chunks[0][2].tag, "fin");
  assert.deepEqual(s.events.at(-1), [
    "capture-stop",
    "chrono-canne-captation-2026-10-24-09h00m00.webm",
  ]);
  assert.equal(s.capture.elapsedMs(), 0);
  s.capture.stop(); // déjà arrêtée : rien
  assert.equal(s.events.length, 2);
});

test("un fichier par tranche : au-delà de la durée d'un fichier, un nouveau commence, sans couper le micro", async () => {
  const s = setup();
  await s.capture.start();
  const first = s.rec();
  s.advance(59_999);
  first.data();
  assert.equal(FakeRecorder.all.length, 1);
  s.advance(1);
  first.data();
  assert.equal(first.state, "inactive", "le premier fichier est terminé");
  assert.equal(FakeRecorder.all.length, 2);
  const second = s.rec();
  assert.equal(second.state, "recording");
  assert.equal(second.stream, first.stream, "même micro");
  assert.equal(s.track.stopped, false);
  assert.equal(s.metas.size, 2);
  assert.notEqual(s.capture.current?.id, [...s.metas.keys()][0]);
  assert.equal(s.capture.elapsedMs(), 0, "durée du fichier en cours");
  assert.deepEqual(
    s.events.map((e) => e[0]),
    ["capture-start", "capture-stop", "capture-start"],
  );
  second.data();
  assert.equal(s.chunks.at(-1)[1], 0, "numérotation reprise à zéro");
  assert.equal(s.capture.recording, true);
});

test("le micro coupé par le téléphone (écran verrouillé) termine le fichier proprement", async () => {
  const s = setup();
  await s.capture.start();
  s.track.onended?.();
  assert.equal(s.capture.recording, false);
  assert.deepEqual(s.events.at(-1)[0], "capture-stop");
  assert.equal(s.chunks.length, 1);
});

test("micro refusé ou absent : rien ne démarre, le motif est rendu et noté", async () => {
  const s = setup({
    getStream: async () => {
      throw Object.assign(new Error("non"), { name: "NotAllowedError" });
    },
  });
  assert.equal(await s.capture.start(), "NotAllowedError");
  assert.equal(s.capture.recording, false);
  assert.equal(FakeRecorder.all.length, 0);
  assert.deepEqual(s.events, [["capture-error", "NotAllowedError"]]);
  const s2 = setup({
    getStream: async () => {
      throw "bizarre";
    },
  });
  assert.equal(await s2.capture.start(), "Error");
});

test("enregistreur refusé par le navigateur : le micro est libéré", async () => {
  const s = setup({ mimeType: "audio/x-inconnu" });
  const Orig = FakeRecorder.prototype.start;
  FakeRecorder.prototype.start = () => {
    throw Object.assign(new Error("non"), { name: "NotSupportedError" });
  };
  try {
    assert.equal(await s.capture.start(), "NotSupportedError");
  } finally {
    FakeRecorder.prototype.start = Orig;
  }
  assert.equal(s.capture.recording, false);
  assert.equal(s.track.stopped, true);
  assert.deepEqual(s.events, [["capture-error", "NotSupportedError"]]);
});

test("un second démarrage pendant l'enregistrement ne fait rien", async () => {
  const s = setup();
  const [a, b] = await Promise.all([s.capture.start(), s.capture.start()]);
  assert.equal(a, "ok");
  assert.equal(b, "ok");
  assert.equal(FakeRecorder.all.length, 1);
});

test("format laissé au navigateur : celui qu'il annonce donne l'extension", async () => {
  const s = setup({ mimeType: "" });
  await s.capture.start();
  assert.equal("mimeType" in s.rec().opts, false);
  assert.equal(s.metas.get(s.capture.current?.id).mime, "audio/webm");
});

test("stockage du téléphone plein : dit une fois, et à nouveau à la captation suivante", async () => {
  const s = setup();
  const failing = {
    putMeta: async () => {
      throw new Error("plein");
    },
    addChunk: async () => {
      throw new Error("plein");
    },
  };
  FakeRecorder.all = [];
  const events = [];
  const c = createCapture({
    getStream: async () => ({
      getTracks: () => [s.track],
      getAudioTracks: () => [s.track],
    }),
    Recorder: FakeRecorder,
    mimeType: "audio/mp4",
    store: failing,
    now: () => 0,
    onEvent: (e, d) => events.push([e, d]),
  });
  await c.start();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(c.storageFailed, true);
  FakeRecorder.all[0].data();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(
    events.filter((e) => e[0] === "capture-error"),
    [["capture-error", "StorageError"]],
  );
  c.stop();
  const again = c.start();
  assert.equal(c.storageFailed, false, "remis à zéro");
  await again;
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(c.storageFailed, true);
  assert.equal(events.filter((e) => e[0] === "capture-error").length, 2);
});
