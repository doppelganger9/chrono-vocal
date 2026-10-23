// Sessions de Claude Code dans le cloud (rétro du 23 octobre 2026, A2) : le Chromium préinstallé, WebKit sauté en le
// disant, et rien de changé ailleurs (le Mac, la CI)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const C = require("../../scripts/lib/cloud.js");
const { buildBody } = require("../../scripts/pr-body.js");

const root = new URL("../../", import.meta.url);
const cloud = { CLAUDE_CODE_REMOTE: "true" };
const projets = [
  {
    name: "android-chrome",
    use: {
      defaultBrowserType: "chromium",
      launchOptions: { args: ["--mute-audio"] },
    },
  },
  { name: "iphone-safari", use: { defaultBrowserType: "webkit" } },
  { name: "bureau", use: {} },
  { name: "nu" },
];

test("cloud : reconnu à la variable CLAUDE_CODE_REMOTE, et seulement à elle", () => {
  assert.equal(C.estCloud(cloud), true);
  assert.equal(C.estCloud({}), false);
  assert.equal(C.estCloud({ CLAUDE_CODE_REMOTE: "false" }), false);
  assert.equal(C.estCloud({ CLAUDE_CODE_REMOTE: "" }), false);
  assert.equal(C.estCloud({ CI: "true" }), false, "la CI garde WebKit");
});

test("hors du cloud, les projets de Playwright restent tels quels", () => {
  assert.equal(C.sansWebkit(projets, {}), projets);
  assert.equal(C.toutEnChromium(projets, { CI: "true" }), projets);
});

test("tests de bout en bout dans le cloud : WebKit sauté, Chromium préinstallé", () => {
  const p = C.sansWebkit(projets, cloud);
  assert.deepEqual(
    p.map((x) => x.name),
    ["android-chrome", "bureau", "nu"],
  );
  assert.deepEqual(p[0].use.launchOptions, {
    args: ["--mute-audio"],
    executablePath: "/opt/pw-browsers/chromium",
  });
  assert.equal(p[1].use.launchOptions?.executablePath, C.CHROMIUM_CLOUD);
  assert.equal(
    projets[0].use.launchOptions.executablePath,
    undefined,
    "les projets d'origine ne changent pas",
  );
});

test("captures dans le cloud : tous les formats gardés, rendus par Chromium", () => {
  const p = C.toutEnChromium(projets, cloud);
  assert.deepEqual(
    p.map((x) => [x.name, x.use.defaultBrowserType]),
    [
      ["android-chrome", "chromium"],
      ["iphone-safari", "chromium"],
      ["bureau", "chromium"],
      ["nu", "chromium"],
    ],
  );
  assert.ok(p.every((x) => x.use.launchOptions?.executablePath));
});

test("les deux configurations de Playwright passent par ces fonctions", () => {
  for (const f of ["playwright.config.js", "playwright.screenshots.config.js"])
    assert.match(
      fs.readFileSync(new URL(f, root), "utf8"),
      /require\("\.\/scripts\/lib\/cloud\.js"\)/,
      f,
    );
});

test("verifier : dans le cloud, le résumé dit que WebKit n'a pas tourné", () => {
  assert.match(C.NOTE_WEBKIT, /WebKit.*CI/);
  const body = buildBody({
    issue: 1,
    visible: false,
    verif: {
      e2e: {
        passed: 10,
        failed: 0,
        flaky: 0,
        skipped: 0,
        seconds: 5,
        webkitSaute: true,
      },
    },
    base: null,
    coverage: null,
    mutation: null,
    touched: [],
    assets: null,
    perf: null,
    ai: "",
  });
  assert.ok(body.includes(C.NOTE_WEBKIT), "la description de PR le dit aussi");
  const verifier = fs.readFileSync(
    new URL("scripts/verifier.js", root),
    "utf8",
  );
  assert.match(verifier, /NOTE_WEBKIT/);
});

test("démarrage de session : un crochet SessionStart qui ne fait rien hors du cloud", () => {
  const settings = JSON.parse(
    fs.readFileSync(new URL(".claude/settings.json", root), "utf8"),
  );
  const cmds = settings.hooks.SessionStart.flatMap(
    (/** @type {any} */ h) => h.hooks,
  ).map((/** @type {any} */ h) => h.command);
  assert.deepEqual(cmds, ['sh "$CLAUDE_PROJECT_DIR"/scripts/session-cloud.sh']);
  const script = new URL("scripts/session-cloud.sh", root).pathname;
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root.pathname };
  delete env.CLAUDE_CODE_REMOTE;
  assert.equal(
    execFileSync("sh", [script], { env, encoding: "utf8" }),
    "",
    "sur le Mac : aucune sortie, aucune installation",
  );
  assert.match(
    fs.readFileSync(script, "utf8"),
    /^\[ "\$CLAUDE_CODE_REMOTE" = "true" \] \|\| exit 0$/m,
  );
});
