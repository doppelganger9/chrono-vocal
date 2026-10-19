# Journal des changements

Les versions suivent [SemVer](https://semver.org/lang/fr/) : **mineure** (1.**1**.0) pour une nouveauté visible, **correctif** (1.0.**1**) pour une correction visible ; les changements sans effet pour l'utilisateur (outillage, tests) ne changent pas la version. La version est affichée dans les réglages et sur l'écran titre ; chaque version a son étiquette git (`v1.0.0`), posée par la CI quand elle arrive sur `main`.

Les nouveautés importantes reviennent dans « Quoi de neuf », sur l'écran titre (`js/intro.js`), avec les mêmes mots qu'ici.

## [1.1.0] · 2026-10-19

- L'app s'ouvre aussi sans réseau, une fois ouverte une première fois : les boutons, la télécommande et les annonces marchent ; la reconnaissance vocale peut demander le réseau, selon le téléphone (#40).
- Une nouvelle version se télécharge en arrière-plan, et elle est prise au prochain lancement de l'app : jamais pendant un assaut (#40).

## [1.0.0] · 2026-10-19

Première version numérotée : tout ce que fait l'app au 19 octobre 2026.

### Le chrono

- Reprises, minute de repos, reprises supplémentaires et prolongation de 30 s, selon le règlement (cahier n°10), avec les préréglages par catégorie et phase.
- L'arbitre décide : après « temps », la reprise continue jusqu'à « Stop, fin de la reprise »
- Arrêts décomptés ou non, comptés et chronométrés ; annulation d'une commande parasite.
- Rappels à l'appel de la reprise, avec la sanction qui suit le rang du rappel (#8).
- Pendant la minute de repos, ce que l'arbitre doit dire, sous le chrono (#43).
- Chronomètre annexe des retards : pénalité chaque minute, disqualification à 3 minutes.
- Mode relais par équipes.
- Statistiques de l'assaut : arrêts, sanctions et points par tireur.

### La voix

- Commandes à la voix de l'arbitre (« en garde, allez », « stop »…), sanctions reconnues avec la couleur du tireur, format de l'assaut dicté.
- Annonces vocales du repos, audibles pendant que le micro écoute ; réponse « Prêt » à « Chrono, prêt ? ».
- Micro relancé tout seul sur iPhone ; témoin « micro silencieux » et journal vocal exportable (#3, #56).

### L'écran

- Thème jour / nuit automatique, et couleurs personnalisables
- En paysage, des chiffres plus grands ; et un mode tableau pour poser le téléphone face à l'aire
- Écran titre au premier lancement, et « Quoi de neuf » après une nouveauté importante (#6).
- Télécommande Bluetooth : « suivant » = bouton principal, « précédent » = annuler.
- Réglages partagés par lien ou par fichier, vérifiés à l'import (#15, #55).

### Sécurité

- Politique de sécurité du contenu : rien d'autre que les fichiers du site ne peut se charger ni s'exécuter (#37).
