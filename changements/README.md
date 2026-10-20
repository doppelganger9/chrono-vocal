# Notes de changements en attente

Une PR **visible** dépose ici une note, `changements/<numéro de l'issue>.md`, et **ne touche ni à la version ni à CHANGELOG.md** (#91) :

```markdown
---
type: correctif
---

- Ce qui change, pour l'arbitre, en langage courant (#91).
```

- `type` : `nouveauté` (version mineure, 1.**4**.0) ou `correctif` (1.3.**3**).
- Les lignes commencent par `- `, comme dans [CHANGELOG.md](../CHANGELOG.md), dont elles suivent les règles : écrites pour l'arbitre ; le numéro d'issue et la mise en forme ne s'affichent pas dans l'app.

À l'arrivée sur `main`, la CI réunit toutes les notes présentes en **une** version (mineure s'il y a au moins une nouveauté), l'ajoute en tête du journal, recopie la version partout, régénère `js/notes.js`, efface les notes, fait passer ce commit par une PR « Version X.Y.Z » que la CI fusionne seule une fois verte (#101), puis pose l'étiquette et publie la *release* (`.github/workflows/version.yml`, `scripts/publier.js`). Deux PR en parallèle ne se disputent donc plus le numéro.

Une PR sans changement visible ne dépose pas de note. Sur chaque PR, la CI vérifie que les notes sont bien formées et que la version n'a pas été changée à la main.
