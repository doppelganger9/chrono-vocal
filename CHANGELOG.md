# Journal des changements

Les versions suivent [SemVer](https://semver.org/lang/fr/) : **mineure** (1.**1**.0) pour une nouveauté visible, **correctif** (1.0.**1**) pour une correction visible ; les changements sans effet pour l'utilisateur (outillage, tests) ne changent pas la version. La version est affichée dans les réglages et sur l'écran titre ; ce journal, le numéro de version et chaque étiquette git (`v1.0.0`) sont écrits par la CI à la fusion, d'après les notes que les PR déposent dans [changements/](changements/README.md) : ne pas les modifier à la main.

Ces notes s'affichent dans l'app : « Quoi de neuf » sur l'écran titre, à la première ouverture d'une nouvelle version, et toutes dans « À propos ». Les lignes sont écrites pour l'arbitre ; les numéros d'issue et la mise en forme ne s'affichent pas. Après chaque modification, `npm run notes` les recopie dans `js/notes.js`.

## [1.8.1] · 2026-10-23

- « Stop, fin de la deuxième reprise » (ou « de la 2e reprise », « de la dernière reprise »…) termine la reprise, comme « fin de la reprise » ; « Stop, temps » est compris comme « stop », et « … tireurs, dans vos zones » peut suivre la fin de la reprise (#109).
- « Stop » entendu avant la fin de la phrase n'empêche plus « … fin de la reprise » de terminer la reprise (#109).
- « Observations des juges », « pas d'observation » et « après décompte des points et des pénalités » ne sont plus notés comme des sanctions (#109).
- Une phrase qui finit par « chrono » (« … juge 3, chrono ») vaut l'appel « Chrono » : le « prêt » qui suit est compris (#109).
- « Regarde » vaut « en garde » (« regarde, allez » fait partir), et « tireurs » mal entendu (« erreur », « terreur », « Thierry », « tu iras »…) est accepté devant « en garde » (#111).

## [1.8.0] · 2026-10-23

- Mode formation : pendant un arrêt, une liste propose le cas (observation, demande d'avertissement, décision des juges, carton, problème d'équipement, sortie d'aire, lâcher de canne, blessure, disqualification) et affiche son script, avec le geste ; puis « En garde, allez » (#106).
- Mode formation, phrases revues avec un juge-arbitre : « Tireurs, au centre, pour la présentation » ; « Tireurs, équipez-vous sur l'aire » ou « Tireurs, dans vos zones, équipez-vous », avec le geste du casque ; « Première reprise » après l'annonce du format ; au début du repos, « Fin de la première reprise » et « Tireurs, dans vos zones », avant les annonces de 30, 15 et 5 secondes (#106).

## [1.7.0] · 2026-10-23

- Mode formation, à activer dans les réglages : un aide-mémoire du protocole de l'arbitre s'affiche sous le chrono, avec la phrase à dire maintenant et la suivante. Avant l'assaut (de l'appel à « En garde, allez ») et pour les résultats, les flèches ‹ et › passent d'une étape à l'autre ; pendant l'assaut et la minute de repos, il suit le chrono. Les phrases d'usage, pratiquées sur le terrain sans être écrites dans le cahier, sont marquées « usage ». Rien n'est imposé : les commandes marchent comme d'habitude (#106).

## [1.6.0] · 2026-10-21

- Une page « Mentions légales et confidentialité », liée depuis l'écran titre et « À propos » : ce que l'app garde sur le téléphone, où part la voix selon le téléphone, aucun cookie ni traceur (#86).

## [1.5.0] · 2026-10-21

- Journal vocal désactivé par défaut : le micro entend aussi les conversations autour de l'aire. À activer dans les réglages le temps d'une recette ou d'un entraînement ; les phrases notées sont effacées au bout de 7 jours, et un avertissement rappelle de relire le journal avant de le partager (#87).

## [1.4.1] · 2026-10-20

- Sur certains téléphones Android (Samsung Galaxy S7), une sanction dite en une phrase n'est plus comptée plusieurs fois : la reconnaissance y livre la phrase par morceaux, et chaque morceau corrige désormais la sanction déjà notée (#110).
- Un commandement redit aussitôt à l'identique (« Stop… stop ») n'affiche plus « sans effet » (#110).

## [1.4.0] · 2026-10-20

- Quand une nouvelle version a été téléchargée pendant que l'app est ouverte, un bouton « Mise à jour disponible » apparaît sous le chrono, avant la première reprise ou une fois l'assaut terminé, jamais pendant. Un toucher la prend aussitôt et affiche ses nouveautés (#96).
- Sur un écran large (ordinateur, tablette en paysage), les réglages s'affichent en entier : le journal vocal, le partage des réglages et les mots appris étaient cachés à droite de la fenêtre (#94).
- Sur un petit téléphone (Galaxy S7), la minute de repos tient à l'écran : « Reprise » ne passe plus sous les boutons du haut, ni le message entendu sous le bouton STOP (#94).
- Le bouton « Exporter le journal » télécharge le fichier quand le téléphone refuse de le partager, au lieu de ne rien faire (#94).
- « Copier le lien » des réglages dit « Copiez le lien ci-dessus » quand le téléphone refuse la copie, au lieu de ne rien faire (#98).
- « Partager » des statistiques copie le texte quand le partage échoue, et dit « Échec du partage » si la copie échoue aussi (#98).

## [1.3.2] · 2026-10-19

- Reconnaissance : « Tireurs au centre, tireurs en garde, allez » et « Deuxième reprise, tireurs en garde » sont compris ; « hangar », « en garde » mal entendu de loin, aussi (#79).

## [1.3.1] · 2026-10-19

- Temps dépassé : après le premier « Temps », les rappels toutes les 5 s sont des bips, sans voix. Sur iPhone, chaque annonce coupait le micro un instant, et une phrase de l'arbitre dite à ce moment se perdait (#78).

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
