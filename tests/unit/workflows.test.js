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
