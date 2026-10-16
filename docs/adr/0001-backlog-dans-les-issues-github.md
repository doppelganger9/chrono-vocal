---
status: accepted
---

# Backlog dans les Issues GitHub, référence dans le dépôt

Le backlog (améliorations à faire) passe dans les **Issues GitHub** : un sujet par point, classé par labels (technique, produit, règlement). Le principal avantage : on peut noter une idée ou un mot mal reconnu depuis son téléphone, juste après un entraînement, et un commit peut fermer le sujet (« Corrige #12 »). Ce qui sert de **référence** reste dans le dépôt, versionné avec le code : le lexique (`GLOSSARY.md`), le corpus fonctionnel tiré du cahier n°10 (`docs/corpus-fonctionnel.md`) et les décisions (`docs/adr/`).

## Options écartées

- **Tout garder dans `docs/backlog.md`** : un peu plus efficace pour travailler avec Claude (une seule lecture donne tout le backlog, mis à jour dans le même commit que le code), mais impossible à alimenter depuis un téléphone, et sans suivi par sujet.
- **GitHub Projects (tableau en colonnes)** : trop lourd pour un projet solo d'une douzaine de sujets. Des labels suffisent. À reconsidérer si le backlog grossit ou si d'autres personnes contribuent.

## Conséquences

- `docs/backlog.md` a été migré vers les Issues (#1 à #12). Il ne garde que l'ordre de priorité, que les issues ne portent pas, avec un lien vers chaque sujet.
- Le dépôt étant public, les issues le sont aussi : rien de personnel ou de confidentiel n'y va.
