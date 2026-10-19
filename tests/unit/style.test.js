// Les fichiers suivis par git respectent .editorconfig (#35) : un test par règle, nommé d'après sa clé.
// Chaque message dit ce qui est trouvé et ce qui est attendu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const root = new URL("../../", import.meta.url);
// les tests de mutation tournent dans une copie (.stryker-tmp) : git n'y suit aucun fichier, le test ne s'applique pas
const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const inRepo =
  fs.realpathSync(top) ===
  fs.realpathSync(new URL(".", root)).replace(/\/$/, "");
const skip = !inRepo && "copie de travail des tests de mutation";

// fichiers texte suivis par git ; assets/ (images générées par scripts/icons.js) et package-lock.json (écrit par npm) à part
const TEXT =
  /\.(js|mjs|cjs|json|css|html|md|yml|yaml|svg|webmanifest|txt)$|^(LICENSE|\.editorconfig|\.gitignore|\.npmrc)$/;
const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(
    (f) =>
      f &&
      TEXT.test(f.split("/").pop()) &&
      !f.startsWith("assets/") &&
      f !== "package-lock.json",
  )
  .filter((f) => fs.existsSync(new URL(f, root))); // supprimé dans la copie de travail
const bytes = (f) => fs.readFileSync(new URL(f, root));
const text = (f) => bytes(f).toString("utf8");
/** problèmes trouvés par check(fichier, contenu) → liste de messages */
const scan = (check) => files.flatMap((f) => check(f, text(f)));
const eachLine = (f, s, check) =>
  s.split("\n").flatMap((line, i) => (check(line) ? [`${f}:${i + 1}`] : []));

test("des fichiers texte sont bien trouvés", { skip }, () =>
  assert.ok(files.length > 30, `${files.length} fichiers`),
);

test("charset = utf-8 : UTF-8 valide, sans BOM", { skip }, () => {
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  assert.deepEqual(
    files.flatMap((f) => {
      const b = bytes(f);
      if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf)
        return [`${f} : BOM en tête (attendu : UTF-8 sans BOM)`];
      try {
        utf8.decode(b);
        return [];
      } catch {
        return [`${f} : pas de l'UTF-8 valide`];
      }
    }),
    [],
  );
});

test(
  "end_of_line = lf : aucune fin de ligne CRLF (Windows) ni CR",
  { skip },
  () => {
    assert.deepEqual(
      scan((f, s) =>
        s.includes("\r") ? [`${f} : CR trouvé (attendu : LF seul)`] : [],
      ),
      [],
    );
  },
);

test(
  "insert_final_newline = true : le fichier finit par un retour à la ligne",
  { skip },
  () => {
    assert.deepEqual(
      scan((f, s) =>
        s.length && !s.endsWith("\n")
          ? [`${f} : pas de retour à la ligne final`]
          : [],
      ),
      [],
    );
  },
);

test(
  "trim_trailing_whitespace = true : pas d'espace en fin de ligne (sauf Markdown)",
  { skip },
  () => {
    assert.deepEqual(
      scan((f, s) =>
        f.endsWith(".md") ? [] : eachLine(f, s, (l) => /[ \t]+$/.test(l)),
      ),
      [],
    );
  },
);

// indent_size = 2 n'est pas vérifié ici : les commentaires JSDoc et les alignements font des retraits impairs
// légitimes. ESLint et Prettier (#36) s'en chargeront.
test("indent_style = space : pas de tabulation pour indenter", { skip }, () => {
  assert.deepEqual(
    scan((f, s) => eachLine(f, s, (l) => /^ *\t/.test(l))),
    [],
  );
});
