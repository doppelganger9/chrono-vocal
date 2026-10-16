---
status: accepted
---

# Commandes vocales : mots courts, correspondance phonétique, pas d'identification de la voix

L'app ne reconnaît que les **commandements courts** de l'arbitre (« stop », « allez », « en garde », « repos »), avec une **correspondance phonétique grossière** : « à les », « aller », « hallez » valent « allez ». Les mots qu'elle ne comprend pas peuvent être **appris** depuis les réglages. Une phrase longue ne déclenche jamais de commande, pour éviter les faux départs pendant que l'arbitre ou le public parlent. Les phrases plus riches (format de l'assaut, sanctions) sont analysées à part, et uniquement quand elles ne peuvent pas être confondues avec un commandement.

**Plusieurs arbitres sur des aires voisines** crient les mêmes mots. On a choisi de **ne pas chercher à reconnaître la voix de notre arbitre** ; la réponse combine plutôt :
- un **micro porté par l'arbitre** (micro-cravate, ou écouteurs à conduction osseuse comme les Shokz OpenRun), qui règle aussi la distance sur une aire de 9 m ;
- le filtre **« en garde » obligatoire** (option) : le règlement impose « en garde » avant « allez » (I 4.2.6.1) ;
- les **commandes illogiques ignorées** (« allez » pendant que le chrono tourne) ;
- le bouton **Annuler**, qui défait une commande parasite comme si elle n'avait jamais eu lieu.

## Options écartées

- **Identification de la voix de l'arbitre** : il faudrait un modèle d'identification lourd à embarquer, peu fiable à plusieurs mètres dans le bruit d'un gymnase, et tous les arbitres disent les mêmes mots.
- **Seuil de volume** (ignorer ce qui vient de loin) : réglage délicat sur place, filtre mal un voisin qui crie fort, et il n'est pas sûr que Safari permette de mesurer le volume pendant la reconnaissance.
