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
  "tests.yml : un job de bout en bout par navigateur, WebKit en deux morceaux, en parallèle",
  { skip },
  () => {
    const e2e = jobs(lire("tests.yml")).e2e ?? "";
    for (const ligne of [
      "{ projet: android-chrome, morceau: 1, morceaux: 1 }",
      "{ projet: iphone-safari, morceau: 1, morceaux: 2 }",
      "{ projet: iphone-safari, morceau: 2, morceaux: 2 }",
    ])
      assert.ok(e2e.includes(`- ${ligne}\n`), ligne);
    assert.ok(e2e.includes('--project "$PROJET" --shard "$MORCEAU/$MORCEAUX"'));
    // un nom d'artefact par job : deux jobs ne peuvent pas déposer le même
    assert.ok(
      e2e.includes(
        "name: playwright-traces-${{ matrix.projet }}-${{ matrix.morceau }}",
      ),
    );
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

// L'image de Playwright n'a pas les polices DejaVu des runners Ubuntu de GitHub : la police large des tests de mise en
// page (« DejaVu Sans ») y retombait sur une autre, et deux tests de formation.spec.js débordaient d'un pixel sur WebKit
// (#131). Elles viennent du paquet npm dejavu-fonts-ttf, à la version d'Ubuntu 24.04, sans apt-get.
test(
  "chaque job dans l'image Playwright installe les polices DejaVu, venues de npm",
  { skip },
  () => {
    const pkg = JSON.parse(
      fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    );
    assert.match(pkg.devDependencies["dejavu-fonts-ttf"], /^\d+\.\d+\.\d+$/);
    const sans = files.flatMap((f) =>
      Object.entries(jobs(lire(f)))
        .filter(
          ([, bloc]) =>
            /image: mcr\.microsoft\.com\/playwright/.test(bloc) &&
            !/npm ci\n(?:.*\n)*? {8}run: sh scripts\/polices-dejavu\.sh\n/.test(
              bloc,
            ),
        )
        .map(([nom]) => `${f} : ${nom}`),
    );
    assert.deepEqual(sans, [], "après npm ci : sh scripts/polices-dejavu.sh");
  },
);
