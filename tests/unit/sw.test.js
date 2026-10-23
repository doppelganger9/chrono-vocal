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
  // les fichiers servis : pages (index.html est « ./ »), styles, modules (sauf les types, lus seulement par
  // TypeScript), manifeste, icônes. Les pages sont cherchées à partir du dossier courant, pas de la racine du dépôt
  // (« top ») : dans la copie de travail des tests de mutation (.stryker-tmp/, ignorée par git), rien n'est suivi, et le
  // test se tait, au lieu de trouver les pages du dépôt en « ../../index.html »
  let tracked;
  try {
    tracked = execFileSync(
      "git",
      [
        "ls-files",
        ":(glob)*.html",
        "js",
        "css",
        "assets",
        "manifest.webmanifest",
      ],
      {
        cwd: root,
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter(
        (f) => f && !/^index\.html$|js\/types\.js$|package\.json$/.test(f),
      );
  } catch {
    return; // copie de travail des tests de mutation, sans git
  }
  if (!tracked.length) return;
  assert.deepEqual([...files].sort(), ["./", ...tracked].sort());
});

test("une nouvelle version attend le prochain lancement : jamais prise au milieu d'un assaut", () => {
  assert.doesNotMatch(sw, /clients\.claim\(/);
  // skipWaiting seulement à la demande de la page, que js/main.js fait à son ouverture (#84)
  assert.equal(sw.match(/skipWaiting\(/g)?.length, 1);
  assert.match(
    sw,
    /addEventListener\("message", \(e\) => \{\s*if \(e\.data === "activer"\) self\.skipWaiting\(\);/,
  );
  const main = fs.readFileSync(new URL("js/main.js", root), "utf8");
  assert.equal(main.match(/postMessage\("activer"\)/g)?.length, 1);
  assert.match(
    main,
    /function activateUpdate\(reg\) \{[^}]*?\}[^}]*?reg\.waiting\?\.postMessage\("activer"\);\s*\}/,
  );
  assert.match(
    main,
    /\.register\("sw\.js"\)\s*\.then\(\(reg\) => \{[\s\S]*?if \(reg\.waiting && controlled\) return activateUpdate\(reg\);/,
    "demandée quand l'enregistrement aboutit, à l'ouverture",
  );
  // ou par l'arbitre, avec le bouton « Mise à jour disponible », affiché seulement quand rien n'est en cours (#96)
  assert.equal(main.match(/activateUpdate\(/g)?.length, 3);
  assert.match(
    main,
    /\$button\("updateBtn"\)\.hidden = !\(pendingUpdate && canUpdate\(chrono\.state\)\)/,
  );
});
