# Backlog

Le backlog vit dans les **[Issues GitHub](https://github.com/doppelganger9/chrono-vocal/issues)**, un sujet par point, avec les labels `technique`, `produit`, `règlement` et `idée` (voir [ADR 0001](adr/0001-backlog-dans-les-issues-github.md)). On peut y ajouter une idée depuis l'app GitHub du téléphone.

Ce fichier ne garde que l'**ordre de priorité**, que les issues ne portent pas. Les issues dégrossies et tranchées portent le label `prêt` :

1. [#55 · Sécurité des réglages importés](https://github.com/doppelganger9/chrono-vocal/issues/55) : deux bugs trouvés en revue (plantage de la voix, injection de HTML par un lien partagé). En premier.
2. [#56 · Journal vocal : événements du micro](https://github.com/doppelganger9/chrono-vocal/issues/56) : avant la prochaine recette, pour voir un micro figé au lieu de le deviner.
3. [#57 · Outillage](https://github.com/doppelganger9/chrono-vocal/issues/57) (.nvmrc, `npm run verifier`, description de PR générée) : économise du temps et des tokens sur toutes les PR suivantes.
4. [#58 · voice.js sur classify, testé et muté](https://github.com/doppelganger9/chrono-vocal/issues/58), puis [#60 · Seuils bloquants et tests par fonctionnalité](https://github.com/doppelganger9/chrono-vocal/issues/60), puis [#59 · Refactorisation de main.js, du CSS et de lang.js](https://github.com/doppelganger9/chrono-vocal/issues/59) : sans changement visible.
5. [#9 R3 · Second exclu](https://github.com/doppelganger9/chrono-vocal/issues/9), puis [#10 R4 · Relais](https://github.com/doppelganger9/chrono-vocal/issues/10).
6. [#36 T9 · ESLint et Prettier](https://github.com/doppelganger9/chrono-vocal/issues/36), puis [#37 T10 · CSP](https://github.com/doppelganger9/chrono-vocal/issues/37).
7. [#38 T11 · Accessibilité testée](https://github.com/doppelganger9/chrono-vocal/issues/38).
8. [#39 T12 · Version et CHANGELOG](https://github.com/doppelganger9/chrono-vocal/issues/39), puis [#40 T13 · Hors ligne (PWA)](https://github.com/doppelganger9/chrono-vocal/issues/40) : en plein écran depuis l'écran d'accueil, sans les barres de Safari.
9. [#11 R5 · Plusieurs aires](https://github.com/doppelganger9/chrono-vocal/issues/11), si le besoin se confirme.

À rediscuter : [#12 Idées : protocole guidé, feuille de marque](https://github.com/doppelganger9/chrono-vocal/issues/12).

Fait : #7 (l'arbitre décide), #13 (outillage qualité), #1 et #2 (architecture, typage), #5 (jour / nuit), #4 (portrait et paysage), #6 (écran titre), #15 (export des réglages), #3 (journal vocal), #17 (Dependabot), #18 (bonnes pratiques, réparties dans #34 à #40), #8 (rappels), #43 (sous-titres du repos), #30 et #45 (micro figé sur iPhone), #47 (reconnaissance), #50 (barres de Safari), #34 (CodeQL), #35 (.editorconfig).
