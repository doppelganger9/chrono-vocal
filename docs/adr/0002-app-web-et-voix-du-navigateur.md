---
status: accepted
---

# App web, avec la reconnaissance et la synthèse vocales du navigateur

Le chrono est une **page web** ouverte dans Safari (iPhone) ou Chrome (Android), qui utilise la **Web Speech API** du navigateur pour écouter l'arbitre et pour parler. Rien à installer ni à publier sur un store, une seule base de code pour les deux téléphones, et des mises à jour immédiates. Le français est bien reconnu par les deux navigateurs, y compris quand on crie à plus de 3 m du micro (testé sur iPhone et dans Chrome).

## Options écartées

- **App native iOS / Android** : reconnaissance vocale hors ligne et mieux contrôlée, mais deux apps à écrire, publication sur les stores, et beaucoup plus de travail pour un projet de club.
- **Moteur de reconnaissance embarqué dans la page** (modèle Whisper ou Vosk en WebAssembly) : hors ligne, mais lourd à charger sur un téléphone, et plus lent que le moteur du navigateur pour des mots courts.

## Conséquences

- La page doit être servie en **HTTPS** : les navigateurs n'accordent le micro qu'à une page sécurisée (voir [ADR 0003](0003-hebergement-github-pages.md)).
- La reconnaissance passe en général par les serveurs de Google ou d'Apple : il faut du réseau, et compter environ 0,5 à 1 s de délai sur « stop » et « allez ».
- On dépend du comportement de chaque navigateur : Safari coupe l'écoute après un silence (l'app la relance), iOS n'autorise le son qu'après un toucher, et l'écran ne reste allumé qu'à partir d'iOS 16.4.
- La qualité réelle de la reconnaissance ne se teste pas automatiquement (voir [ADR 0007](0007-strategie-de-tests.md)).
