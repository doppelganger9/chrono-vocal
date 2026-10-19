// Service worker de l'app hors ligne (#40) : sw.js, à la racine du site
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("../../", import.meta.url);
const sw = fs.readFileSync(new URL("sw.js", root), "utf8");
const pkg = JSON.parse(fs.readFileSync(new URL("package.json", root), "utf8"));
const files = [
  ...(sw.match(/const FILES = \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g),
].map((m) => m[1]);

test("le service worker porte la version de l'app : il change donc à chaque version", () => {
  assert.equal(sw.match(/const VERSION = "([^"]+)"/)?.[1], pkg.version);
});

test("il met en cache tous les fichiers de l'app, et seulement eux", () => {
  // les fichiers servis : page, styles, modules (sauf les types, lus seulement par TypeScript), manifeste, icônes
  let tracked;
  try {
    tracked = execFileSync(
      "git",
      ["ls-files", "js", "css", "assets", "manifest.webmanifest"],
      {
        cwd: root,
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter((f) => f && !/js\/types\.js$|package\.json$/.test(f));
  } catch {
    return; // copie de travail des tests de mutation, sans git
  }
  if (!tracked.length) return;
  assert.deepEqual([...files].sort(), ["./", ...tracked].sort());
});

test("une nouvelle version attend le prochain lancement : jamais prise au milieu d'un assaut", () => {
  assert.doesNotMatch(sw, /skipWaiting\(|clients\.claim\(/);
});
