# Journal des changements

Les versions suivent [SemVer](https://semver.org/lang/fr/) : **mineure** (1.**1**.0) pour une nouveauté visible, **correctif** (1.0.**1**) pour une correction visible ; les changements sans effet pour l'utilisateur (outillage, tests) ne changent pas la version. La version est affichée dans les réglages et sur l'écran titre ; chaque version a son étiquette git (`v1.0.0`), posée par la CI quand elle arrive sur `main`.

Ces notes s'affichent dans l'app : « Quoi de neuf » sur l'écran titre, à la première ouverture d'une nouvelle version, et toutes dans « À propos ». Les lignes sont écrites pour l'arbitre ; les numéros d'issue et la mise en forme ne s'affichent pas. Après chaque modification, `npm run notes` les recopie dans `js/notes.js`.

## [1.3.0] · 2026-10-19

- « Fin de l'assaut » termine l'assaut à tout moment : en reprise, en temps dépassé, pendant la minute de repos ou avant la reprise suivante. « Annuler » revient en arrière (#77).

## [1.2.0] · 2026-10-19

- À chaque nouvelle version, l'écran titre revient une fois avec ce qui a changé (#84).
- Dans les réglages, « À propos » donne la version et toutes les notes de version (#84).
- Sur iPhone, une nouvelle version est prise à l'ouverture suivante de l'app, même si Safari a gardé l'onglet (#84).

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
- Chronomètre annexe : pour un retard, pénalité chaque minute et disqualification à 3 minutes ; pour un second exclu qui refuse de sortir, carton rouge à son tireur au bout d'une minute (#9).
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
- Contrastes vérifiés dans les deux thèmes (chiffres en arrêt, boutons bleus la nuit), et boutons utilisables au clavier (#38).

### Sécurité

- Politique de sécurité du contenu : rien d'autre que les fichiers du site ne peut se charger ni s'exécuter (#37).
