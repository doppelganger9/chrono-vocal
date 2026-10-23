// Les workflows de GitHub Actions échouent quand une commande échoue (#118). Sans `shell: bash` explicite, GitHub
// lance les `run:` sans pipefail : `node scripts/etat-publication.js | tee bilan.md` a réussi le 22 octobre 2026
// alors que le bilan signalait l'étiquette et la release v1.6.0 manquantes, et l'issue n'a pas été ouverte.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dir = new URL("../../.github/workflows/", import.meta.url);
// les tests de mutation tournent dans une copie (.stryker-tmp) sans .github : le test ne s'y applique pas
const skip = !fs.existsSync(dir) && "copie de travail des tests de mutation";
const files = skip ? [] : fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));

test(
  "chaque workflow qui lance des commandes le fait avec bash et pipefail",
  { skip },
  () => {
    const sans = files.filter((f) => {
      const yml = fs.readFileSync(new URL(f, dir), "utf8");
      return (
        /^\s+(- )?run:/m.test(yml) &&
        !/^defaults:\n {2}run:\n {4}shell: bash\n/m.test(yml)
      );
    });
    assert.deepEqual(
      sans,
      [],
      "ajouter en tête du workflow :\ndefaults:\n  run:\n    shell: bash",
    );
  },
);

// Durée et solidité de la CI (#131) : le 22 octobre 2026, `playwright install --with-deps` est resté 33 minutes dans
// apt-get (miroir Ubuntu d'Azure), et le lendemain une autre exécution y était encore bloquée au bout de 35 minutes.
// Sans `timeout-minutes`, GitHub attend 6 heures.

/** Les jobs d'un workflow, par nom, avec leur texte @param {string} yml @returns {Record<string, string>} */
function jobs(yml) {
  const partie = yml.split(/^jobs:\n/m)[1] ?? "";
  /** @type {Record<string, string>} */
  const res = {};
  for (const bloc of partie.split(/^(?= {2}[\w-]+:\n)/m)) {
    const nom = /^ {2}([\w-]+):\n/.exec(bloc);
    if (nom) res[nom[1]] = bloc;
  }
  return res;
}

const lire = (/** @type {string} */ f) =>
  fs.readFileSync(new URL(f, dir), "utf8");

test("chaque job a un délai maximal (timeout-minutes)", { skip }, () => {
  const sans = files.flatMap((f) =>
    Object.entries(jobs(lire(f)))
      .filter(([, bloc]) => !/^ {4}timeout-minutes: \d+$/m.test(bloc))
      .map(([nom]) => `${f} : ${nom}`),
  );
  assert.deepEqual(sans, []);
});

test(
  "aucun workflow n'installe les navigateurs (apt-get) : l'image Playwright les contient",
  { skip },
  () => {
    assert.deepEqual(
      files.filter((f) => /playwright install/.test(lire(f))),
      [],
    );
  },
);

test(
  "l'image Playwright suit la version de @playwright/test, épinglée exactement",
  { skip },
  () => {
    const pkg = JSON.parse(
      fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    );
    assert.match(pkg.devDependencies["@playwright/test"], /^\d+\.\d+\.\d+$/);
    for (const f of ["tests.yml", "qualite.yml"]) {
      const yml = lire(f);
      // la version est lue dans package.json par le job « playwright » : une montée de Dependabot suit d'elle-même
      assert.match(
        yml,
        /image: mcr\.microsoft\.com\/playwright:v\$\{\{ needs\.playwright\.outputs\.version \}\}-noble/,
        f,
      );
      assert.match(
        jobs(yml).playwright ?? "",
        /devDependencies\['@playwright\/test'\]/,
        f,
      );
    }
  },
);

test(
  "tests.yml : un job de bout en bout par navigateur, en parallèle",
  { skip },
  () => {
    const e2e = jobs(lire("tests.yml")).e2e ?? "";
    assert.match(e2e, /projet: \[android-chrome, iphone-safari\]/);
    assert.match(e2e, /--project "\$PROJET"/);
    assert.match(e2e, /PROJET: \$\{\{ matrix\.projet \}\}/);
  },
);

test(
  "tests.yml : le job « tests », exigé par la protection de main, attend tous les autres et échoue avec eux",
  { skip },
  () => {
    const tous = jobs(lire("tests.yml"));
    const t = tous.tests ?? "";
    const attendus = Object.keys(tous).filter(
      (n) => !["tests", "publication"].includes(n),
    );
    const needs = /^ {4}needs: \[(.*)\]$/m.exec(t)?.[1].split(", ") ?? [];
    assert.deepEqual(needs.sort(), attendus.sort());
    // sans always(), un job sauté parce qu'un autre a échoué compte comme réussi pour la protection de main
    assert.match(t, /^ {4}if: always\(\)$/m);
    assert.match(t, /contains\(needs\.\*\.result, 'failure'\)/);
    assert.match(t, /contains\(needs\.\*\.result, 'cancelled'\)/);
    assert.match(tous.publication ?? "", /^ {4}needs: tests$/m);
  },
);
