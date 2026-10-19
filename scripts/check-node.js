#!/usr/bin/env node
// Garde-fou (#57) : refuse un Node trop ancien avec un message clair, avant les tests. Écrit pour tourner même sous
// un vieux Node (pas de syntaxe récente). npm install est aussi protégé par engine-strict (.npmrc).
// npm ci, lui, plante sous npm 6 avant tout script : voir CONTRIBUTING.md § 7.
var MIN_NODE = 20;

/** @param {string} version « 22.1.0 » */
function tooOld(version) {
  return Number(String(version).split(".")[0]) < MIN_NODE;
}

if (require.main === module && tooOld(process.versions.node)) {
  console.error(
    "Node " +
      process.versions.node +
      " est trop ancien : il faut Node " +
      MIN_NODE +
      " ou plus récent.\n" +
      "Avec nvm : nvm use (la version est dans .nvmrc). Avec Homebrew : PATH=/opt/homebrew/bin:$PATH npm test",
  );
  process.exit(1);
}

module.exports = { tooOld: tooOld, MIN_NODE: MIN_NODE };
