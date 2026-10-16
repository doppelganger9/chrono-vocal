# Consignes pour Claude

Chrono vocal pour la canne de combat : une page web pilotée par la voix de l'arbitre. Le code, les documents et les échanges sont en français.

## À lire avant de travailler

- [CONTRIBUTING.md](CONTRIBUTING.md) : **le mode de fonctionnement fait foi** (cycle, TDD adapté, preuves de qualité, contenu des PR, statistiques IA).
- [GLOSSARY.md](GLOSSARY.md) : le vocabulaire (*reprise*, pas « round » ; *minute de repos*, pas « pause »).
- [docs/corpus-fonctionnel.md](docs/corpus-fonctionnel.md) : les règles du cahier n°10, qui font foi.
- [docs/adr/](docs/adr/) : les décisions déjà prises, à ne pas remettre en cause sans le dire.
- Backlog : les [Issues GitHub](https://github.com/doppelganger9/chrono-vocal/issues), dans l'ordre de [docs/backlog.md](docs/backlog.md).

## Règles

- **Une branche et une PR par issue.** Ne jamais pousser directement sur `main` : GitHub Pages met en ligne aussitôt. Fusionner soi-même les PR **sans changement visible** quand les tests passent ; laisser David fusionner celles **qui se voient** (et empiler la suite dessus en attendant).
- **Tests d'abord**, à partir des critères d'acceptation de l'issue, puis le code. Chaque PR donne la couverture, le score de mutation et les statistiques IA (CONTRIBUTING § 3 à 5).
- **L'arbitre décide, le chrono suit** ([ADR 0006](docs/adr/0006-l-arbitre-decide.md)) : aucune transition imposée, aucun commandement ignoré sans le signaler.
- **Tests silencieux** : la voix et les sons sont toujours remplacés par les doublures de `tests/e2e/fixtures.js`. Pour essayer l'app dans le navigateur intégré, utiliser `npm run serve` (une page ouverte directement depuis le disque ne charge pas les scripts voisins), et neutraliser `say`, `beep` et `gong`.
- **Rien de personnel dans le dépôt**, qui est public : adresse GitHub masquée pour les commits, pas de chemin local ni d'e-mail.

## Commandes

Node 20 ou plus récent ; sur ce Mac, le Node par défaut de nvm est trop ancien :

```bash
PATH=/opt/homebrew/bin:$PATH npm test
```
