---
status: accepted
---

# HTML, CSS et JavaScript, sans framework ni étape de compilation

L'app est écrite en **HTML, CSS et JavaScript natifs**, sans framework (React, Vue…) ni outil de compilation (Vite, webpack…). Ce qui est dans le dépôt est exactement ce que sert GitHub Pages. Pour une seule page, avec un état simple (un chrono, quelques réglages) et un public de club, un framework apporterait plus de dépendances et de maintenance que de bénéfices.

## Conséquences

- **Pas d'étape de build** : on modifie un fichier, on recharge la page. Les seules dépendances sont celles des tests (Playwright).
- Le code a commencé dans un seul `index.html`. La logique pure est sortie dans `lang.js` pour être testée seule. Le découpage complet en fichiers (CSS à part, modules ES natifs, chrono testable seul) est prévu dans [#1](https://github.com/doppelganger9/chrono-vocal/issues/1). Il reste dans ce cadre sans compilation.
- **Le typage passe par JSDoc**, vérifié par TypeScript sans rien compiler ([#2](https://github.com/doppelganger9/chrono-vocal/issues/2)), plutôt que par du TypeScript qu'il faudrait transpiler.
- À reconsidérer si l'interface devient vraiment complexe (plusieurs écrans riches, état partagé entre appareils).
