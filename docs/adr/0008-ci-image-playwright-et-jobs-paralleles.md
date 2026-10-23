---
status: accepted
---

# CI : l'image de Playwright, un job par navigateur, et un délai maximal partout

Les tests de bout en bout tournent dans l'**image officielle de Playwright** (`mcr.microsoft.com/playwright:vX.Y.Z-noble`), qui contient déjà les navigateurs et leurs dépendances système. Le workflow « Tests » ([#131](https://github.com/doppelganger9/chrono-vocal/issues/131)) est découpé en jobs qui tournent en parallèle :

- `verifications` : audit, notes de version, typage, lint et format, tests unitaires (une vingtaine de secondes) ;
- `playwright` : lit la version de `@playwright/test` dans `package.json`, pour prendre l'image qui va avec ;
- `e2e` : un job par navigateur (`android-chrome` pour Chromium, `iphone-safari` pour WebKit), dans l'image, avec 4 workers ;
- `tests` : attend tous les autres, et échoue si l'un d'eux a échoué ou a été annulé. **C'est le seul contrôle exigé par la protection de `main`** : son nom n'a pas changé, ni le `needs: tests` du job `publication`.

Chaque job de chaque workflow a un `timeout-minutes`.

## Le problème

Mesures du 23 octobre 2026, sur 11 exécutions de « Tests » :

- en temps normal, le job unique durait **environ 6 minutes** : 20 s de vérifications, ~40 s pour installer les navigateurs (`npx playwright install --with-deps chromium webkit`, dont 24 s d'`apt-get` pour 181 paquets), et ~5 min de tests de bout en bout (354 tests, avec 2 workers seulement : Playwright prend la moitié des processeurs, et le runner en a 4) ;
- **2 exécutions sur 11 sont restées coincées dans `apt-get`**, à cause du miroir Ubuntu d'Azure, avec des pauses de 1 à 4 minutes entre deux paquets : 33 minutes le 22 octobre, et plus de 35 minutes le 23 octobre pour la PR #127. Sans `timeout-minutes`, GitHub attend jusqu'à 6 heures.

## Options écartées

- **Mettre en cache `~/.cache/ms-playwright`** : ne fait gagner que le téléchargement des navigateurs (~13 s, moins le temps de restaurer le cache). Les dépendances système passent toujours par `apt-get` : le cache ne règle pas les blocages.
- **Mettre en cache les paquets apt** : fragile (droits, liste de paquets qui change avec chaque version de Playwright), pour un gain de quelques secondes.
- **Écrire l'étiquette de l'image en dur** dans les workflows : Dependabot ne met pas à jour une image de `container:`. La PR mensuelle qui monte `@playwright/test` échouerait, et ne serait plus fusionnée toute seule ([#17](https://github.com/doppelganger9/chrono-vocal/issues/17)). Le job `playwright` lit donc la version dans `package.json`, où elle est épinglée exactement.
- **Un runner plus gros** : payant. Tout ce qui est décrit ici est gratuit sur un dépôt public (minutes illimitées, 20 jobs en même temps).
- **Tester WebKit sur moins de tests** (accessibilité sur Chromium seul, par exemple) : c'est un choix de couverture, pas d'outillage. Les mises en page et la voix doivent rester testées sur WebKit (CONTRIBUTING § 2).

## Conséquences

- Plus d'`apt-get` dans la CI. Le temps de tirer l'image (~2 Go, depuis le registre de Microsoft) remplace l'installation.
- Les deux navigateurs tournent en même temps sur deux runners : le temps d'attente d'une PR est celui du plus lent des deux, plus la mise en route.
- Un échec de bout en bout dépose ses traces dans `playwright-traces-<projet>`.
- `tests/unit/workflows.test.js` vérifie : un délai maximal sur chaque job, aucun `playwright install`, l'image qui suit `package.json`, un job par navigateur, et un job `tests` qui attend tous les autres.
- Sous charge, l'horloge simulée peut rendre un test instable (« Cannot fast-forward to the past ») : `retries: 1` sur la CI l'amortit. Si les 4 workers en provoquent trop, on revient à 2.
