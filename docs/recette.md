# Recette sur téléphone

Ce que les tests automatiques ne peuvent pas vérifier : la **vraie** reconnaissance vocale, le son, l'écran et le geste sur un vrai téléphone ([ADR 0007](adr/0007-strategie-de-tests.md)). Environ 10 minutes, sur iPhone (Safari) **et** Android (Chrome), avant une compétition ou après une nouveauté importante.

## Préparation

- [ ] Ouvrir https://doppelganger9.github.io/chrono-vocal/ et recharger la page, pour avoir la dernière version.
- [ ] Volume du téléphone au maximum, mode silencieux désactivé.
- [ ] Réglages → Journal vocal → **Effacer**, pour ne garder que cette séance.

## Voix (téléphone posé au bord de l'aire, arbitre à 4-5 m)

- [ ] « Chrono, prêt ? » : l'app répond « Prêt ».
- [ ] « En garde, allez » démarre, « stop » arrête, « allez » reprend. Essayer aussi « allez » prononcé vite.
- [ ] Une sanction, par exemple « Pénalité pour sortie d'aire, tireur bleu » : elle s'affiche sous le chrono.
- [ ] À la fin du temps : gong, « Temps », puis « Temps » répété toutes les 5 s. « Stop, fin de la reprise » lance la minute de repos.
- [ ] Pendant le repos : annonces à 30, 15 et 5 s, **audibles alors que le micro écoute**.
- [ ] Laisser le chrono en attente 2 minutes, puis dire « allez » : l'écoute a dû repartir toute seule.

## Écran et geste

- [ ] L'écran ne se met pas en veille pendant une reprise.
- [ ] Tourner le téléphone pendant une reprise : passage portrait / paysage sans à-coup. Essayer le mode tableau.
- [ ] Thème : passer le téléphone en mode clair puis sombre, et vérifier la lisibilité du thème jour en salle.
- [ ] Télécommande Bluetooth, si utilisée : « suivant » = bouton principal, « précédent » = annuler.

## Après la séance : nourrir le corpus de tests

1. Réglages → Journal vocal → **Exporter le journal**, et l'envoyer sur le Mac (AirDrop, messagerie…).
2. `node scripts/corpus-from-journal.js chrono-canne-journal-vocal.json` crée `tests/corpus/<date>-journal.json` :
   - `phrases` : ce que l'app a compris. **Corriger `expect`** si l'app s'est trompée : le test devient rouge, et on corrige `js/lang.js` ;
   - `a_relire` : phrases non reconnues. Les classer (par exemple « Allô » voulait dire ALLEZ) et les déplacer dans `phrases`, ou les supprimer.
3. **Relire avant de commiter** (décision D3.1) : seulement des phrases courtes de commandement et de sanction, **ni noms ni conversations**. Le dépôt est public.
4. `npm run test:unit` rejoue tout le corpus.
