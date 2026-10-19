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
- La reconnaissance passe en général par les serveurs de Google ou d'Apple, et il faut compter environ 0,5 à 1 s de délai sur « stop » et « allez ». **Sauf sur iPhone**, où elle marche sans réseau (voir la réévaluation ci-dessous).
- On dépend du comportement de chaque navigateur : Safari coupe l'écoute après un silence (l'app la relance), iOS n'autorise le son qu'après un toucher, et l'écran ne reste allumé qu'à partir d'iOS 16.4.
- La qualité réelle de la reconnaissance ne se teste pas automatiquement (voir [ADR 0007](0007-strategie-de-tests.md)).

## Réévaluation du 19 octobre 2026 : notre propre moteur de reconnaissance ?

Question de David : se passer des services externes avec un moteur à nous. Analyse détaillée dans la conversation du 19 octobre ; l'essentiel :

- **Constat** : sur l'iPhone de David, **la reconnaissance marche en mode avion** (ni Wi-Fi ni réseau cellulaire). Safari utilise la dictée hors ligne d'iOS : le son de la salle reste sur le téléphone. Sur Android, Chrome envoie normalement le son aux serveurs de Google ; un mode local existe (`processLocally`, paquet de langue d'environ 60 Mo), encore expérimental, français non confirmé. Non testé.
- **Le besoin réel** est un vocabulaire fermé (une trentaine de formules de l'arbitre), pas une dictée : une grammaire fermée (Vosk en WebAssembly, modèle français léger de 41 Mo, Apache 2.0, environ 300 Mo de mémoire) serait la meilleure piste si l'on en avait besoin. Whisper est trop lent pour « stop » (pas de reconnaissance en continu), un modèle de mots-clés maison demanderait des enregistrements, un service commercial remplacerait une dépendance par une autre.
- **Décision : on garde la reconnaissance du navigateur.** Les deux gains principaux d'un moteur à nous (hors ligne, confidentialité) sont déjà là sur iPhone ; le coût (5 à 6 sessions, téléchargement, mémoire, batterie, précision incertaine à 4-5 m) n'est pas justifié.
- **À reconsidérer si** : le moteur d'iOS se fige encore malgré #45 ; un club utilise surtout des téléphones Android en salle sans réseau ; ou l'on veut tester la vraie reconnaissance sur des enregistrements audio. On commencerait alors par un prototype séparé (page `/labo/`, Vosk avec grammaire), mesuré sur téléphone avant toute intégration.
