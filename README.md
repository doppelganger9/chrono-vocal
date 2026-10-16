# Chrono vocal — canne de combat

Chronomètre d'aire de combat piloté par la voix de l'arbitre (« en garde », « allez », « stop »), conforme au protocole du chronométreur du cahier n°10 de la FFSBF&DA.

**App en ligne :** https://doppelganger9.github.io/chrono-vocal/ (Safari sur iPhone, Chrome sur Android).

- [GLOSSARY.md](GLOSSARY.md) : vocabulaire du domaine
- [docs/corpus-fonctionnel.md](docs/corpus-fonctionnel.md) : règles de chronométrage et d'arbitrage, formats d'assaut, phrases de l'arbitre
- [Issues GitHub](https://github.com/doppelganger9/chrono-vocal/issues) : améliorations prévues ; [docs/backlog.md](docs/backlog.md) donne leur ordre de priorité
- [docs/adr/](docs/adr/) : décisions d'architecture et d'organisation
- [CONTRIBUTING.md](CONTRIBUTING.md) : mode de fonctionnement (cycle par issue, TDD, preuves de qualité dans chaque PR)

Le **backlog** vit dans les Issues GitHub ; la **référence** (lexique, règlement, décisions) vit dans le dépôt, avec le code. Voir [ADR 0001](docs/adr/0001-backlog-dans-les-issues-github.md).

## Structure

- `index.html` : l'app (interface, chrono, voix), sans compilation
- `lang.js` : langue et phrases de l'arbitre, en fonctions pures (testées seules)

## Tests

Node 20 ou plus récent (sur ce Mac, le Node par défaut de nvm est trop ancien : `PATH=/opt/homebrew/bin:$PATH npm test`).

```bash
npm install
npx playwright install chromium webkit
npm test
```

- `npm run test:unit` : tests unitaires de `lang.js` (`node --test`, sans dépendance)
- `npm run test:e2e` : tests de bout en bout (Playwright) sur la vraie page, dans les moteurs de Chrome Android et de Safari iPhone. La reconnaissance vocale, la synthèse vocale et les sons sont remplacés par des doublures muettes (le test fait « parler » l'arbitre et vérifie ce que l'app dit et joue), et l'horloge est simulée.
- `npm run serve` : sert l'app sur http://localhost:4173
- `npm run coverage`, `npm run mutation`, `npm run avant-apres -- main`, `npm run ai-stats` : preuves de qualité pour les PR (voir [CONTRIBUTING.md](CONTRIBUTING.md) § 7)

Les tests tournent aussi sur GitHub à chaque envoi (onglet Actions).
