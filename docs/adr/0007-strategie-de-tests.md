---
status: accepted
---

# Tests : logique pure en unitaire, parcours en bout en bout avec doublures

Deux niveaux de tests automatisés :
- des **tests unitaires** (`node --test`, sans dépendance) sur la logique pure (`js/chrono.js`, `js/lang.js`, `js/stats.js`, `js/settings.js`, `js/annex.js`), avec une horloge simulée pour le chrono : toutes les règles du corpus fonctionnel y sont vérifiées ;
- des **tests de bout en bout** (Playwright) sur la vraie page, dans **Chromium et WebKit**, les moteurs de Chrome Android et de Safari iPhone.

Toute erreur JavaScript de la page fait échouer le test. Dans ces tests, la reconnaissance vocale, la synthèse vocale et les sons sont remplacés par des **doublures muettes** : le test « fait parler » l'arbitre et vérifie ce que l'app dit et joue. L'**horloge est simulée** : un assaut complet se joue en deux secondes, et les tests ne font aucun bruit.

## Options écartées

- **Navigateur réel avec un faux micro** qui lit des enregistrements audio : la reconnaissance de Chrome passe par les serveurs de Google, indisponibles dans les navigateurs de test.
- **Moteur de reconnaissance hors ligne** (Whisper, Vosk) sur des enregistrements d'arbitres : lourd, et ce n'est pas le moteur qu'utilisent Safari et Chrome.

## Conséquences

- La qualité réelle de la reconnaissance en salle n'est **pas** couverte automatiquement. Elle repose sur une recette manuelle sur téléphone, et sur un **corpus de transcriptions réelles** exportées de l'app et rejouées en tests unitaires ([#3](https://github.com/doppelganger9/chrono-vocal/issues/3)).
- Les tests tournent en local (`npm test`) et sur GitHub à chaque envoi.
