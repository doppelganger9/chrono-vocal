# Recette sur téléphone

Ce que les tests automatiques ne peuvent pas vérifier : la **vraie** reconnaissance vocale, le son, l'écran et le geste sur un vrai téléphone ([ADR 0007](adr/0007-strategie-de-tests.md)). Environ 10 minutes, sur iPhone (Safari) **et** Android (Chrome), avant une compétition ou après une nouveauté importante.

## Préparation

- [ ] Ouvrir https://doppelganger9.github.io/chrono-vocal/ et vérifier la version (Réglages → À propos). Un simple rechargement ne suffit pas : la nouvelle version se télécharge en arrière-plan (#40), puis **« ⬆︎ Mise à jour disponible »** apparaît sous le chrono, à toucher (#96). Sans le bouton, fermer tous les onglets de l'app et la rouvrir.
- [ ] Volume du téléphone au maximum, mode silencieux désactivé.
- [ ] Réglages → Journal vocal → **Effacer**, pour ne garder que cette séance, puis **Noter les phrases entendues : Oui** (désactivé par défaut, #87 : le micro entend aussi les conversations autour de l'aire). Les phrases sont effacées au bout de 7 jours.

## Voix (téléphone posé au bord de l'aire, arbitre à 4-5 m)

- [ ] « Chrono, prêt ? » : l'app répond « Prêt » une fois la phrase finie, puis « En garde, allez » démarre bien la reprise (le micro ne doit pas se figer, #30).
- [ ] « En garde, allez » démarre, « stop » arrête, « allez » reprend. Essayer aussi « allez » prononcé vite.
- [ ] Une sanction, par exemple « Pénalité pour sortie d'aire, tireur bleu » : elle s'affiche sous le chrono.
- [ ] Pendant la minute de repos, « Rappel, tireur bleu » : « 1er rappel : Observation » s'affiche, et le bouton « Rappel bleu » annonce la pénalité suivante.
- [ ] À la fin du temps : gong, « Temps », puis un bip toutes les 5 s (#78). « Stop, fin de la reprise » **à la voix**, même dit juste après un bip, lance la minute de repos (#45).
- [ ] Pendant le repos : annonces à 30, 15 et 5 s, **audibles alors que le micro écoute**, et sous le chrono ce que l'arbitre doit dire (« Tireurs, équipez-vous », « Tireurs au centre », « Juge 1, prêt ? … »), lisible à distance. Après la fin du repos, « En garde, allez » **à la voix** démarre la reprise suivante (#45).
- [ ] Laisser le chrono en attente 2 minutes, puis dire « allez » : l'écoute a dû repartir toute seule.
- [ ] Si « 🎙 Micro silencieux depuis … » apparaît alors que tu parles, toucher pour relancer, puis **noter le moment** : le journal exporté (Réglages → Journal vocal) montre ce que le micro a fait (démarrages, fins, erreurs, relances, silences) entre les phrases (#56).

## Écran et geste

- [ ] L'écran ne se met pas en veille pendant une reprise.
- [ ] Tourner le téléphone pendant une reprise : passage portrait / paysage sans à-coup. Essayer le mode tableau.
- [ ] Thème : passer le téléphone en mode clair puis sombre, et vérifier la lisibilité du thème jour en salle.
- [ ] Télécommande Bluetooth, si utilisée : « suivant » = bouton principal, « précédent » = annuler.
- [ ] Chronomètre annexe (⏱) → « Second exclu » → choisir le tireur → Démarrer : à 1 minute, « Une minute. Carton rouge », et le carton apparaît dans les statistiques si l'assaut a commencé (#9).

## Après la séance : nourrir le corpus de tests

1. Réglages → Journal vocal → **Exporter le journal**, et l'envoyer sur le Mac (AirDrop, messagerie…). Si le téléphone refuse de le partager (Samsung Internet), le fichier est téléchargé à la place (#94) : il est dans les téléchargements. Le fichier dit avec quelle version de l'app (`version`, et `v` à chaque début d'écoute, si le journal couvre une mise à jour), quel navigateur (`userAgent`) et quand (`exported`) il a été fait (#112) : **avant d'ouvrir une issue sur un défaut relevé, vérifier qu'il n'a pas été corrigé depuis cette version** ([CHANGELOG.md](../CHANGELOG.md)). Un journal exporté avant n'a pas ces renseignements.
2. `node scripts/corpus-from-journal.js chrono-canne-journal-vocal.json` crée `tests/corpus/<date>-journal.json`, avec la version de l'app et le nom court du navigateur (« Samsung Internet », « Safari iPhone »… ; pas le `userAgent` complet, le dépôt est public) :
   - `phrases` : ce que l'app a compris. **Corriger `expect`** si l'app s'est trompée : le test devient rouge, et on corrige `js/lang.js` ;
   - `a_relire` : phrases non reconnues. Les classer (par exemple « Allô » voulait dire ALLEZ) et les déplacer dans `phrases`, ou les supprimer.
3. **Relire avant de commiter** (décision D3.1) : seulement des phrases courtes de commandement et de sanction, **ni noms ni conversations**. Le dépôt est public, et ce sont des données personnelles de tiers (#87) : **retirer les conversations** du fichier créé par `scripts/corpus-from-journal.js` (dans `a_relire` surtout), sans les déplacer dans `phrases`.
4. Sur le téléphone : **Noter les phrases entendues : Non**, puis **Effacer** le journal.
5. `npm run test:unit` rejoue tout le corpus.
