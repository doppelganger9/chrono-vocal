# Mode de fonctionnement

Ce projet est développé par Claude (Claude Code), qui travaille sur les issues GitHub. David décide, relit et valide sur le terrain. Ce document décrit le cycle de travail et les preuves de qualité attendues dans chaque pull request.

Voir aussi : [ADR 0001](docs/adr/0001-backlog-dans-les-issues-github.md) (backlog dans les Issues), [ADR 0007](docs/adr/0007-strategie-de-tests.md) (stratégie de tests), et [CLAUDE.md](CLAUDE.md) (consignes relues par Claude à chaque session).

---

## 1. Le cycle

| Étape | Qui | Résultat |
|---|---|---|
| **Rétrospective** (chaque début de journée) | Claude, puis David | **D'abord le bilan des actions de la précédente : on les finit avant d'en ajouter de nouvelles**, sauf urgence (un bug de sécurité, par exemple). Puis, avant le backlog : ce qui a freiné, ce qui a aidé, ce qui manque, comment économiser des tokens (scripts, automatisation, façon de travailler), puis une **revue de code complète** du dépôt et des critères de qualité. Chaque action retenue devient une issue, et ce document est mis à jour. **Ensuite, une session Claude neuve** pour le travail de la journée : une longue session relit tout son historique à chaque appel (139 millions de tokens relus le 18 octobre, environ 417 000 par appel). Tout ce qu'il faut savoir est dans le dépôt et la mémoire de Claude. Courte sur ce qui n'a pas changé depuis la précédente. |
| **Dégrossissage** | Claude | Chaque issue reçoit un découpage, ses dépendances, ses critères d'acceptation, et les **décisions à prendre**, chacune avec une proposition par défaut. Les questions de toutes les issues sont regroupées en **un seul questionnaire**. |
| **Décisions** | David | Réponse au questionnaire, une fois. Les choix de goût (couleurs, illustration, mise en page) sont proposés en 2 ou 3 variantes directement dans la PR, avec captures : David choisit avant de fusionner. Une issue tranchée reçoit le label `prêt`. |
| **Développement** | Claude | Les issues `prêt` sont enchaînées dans l'ordre de [docs/backlog.md](docs/backlog.md) : une branche et une pull request par issue (§ 2 à 4). Claude ne s'arrête que pour une décision imprévue. |
| **Revue et fusion** | Claude ou David | GitHub Pages publie `main` : **une PR fusionnée est en ligne une minute plus tard.** **Quand David décide de fusionner une PR visible** pendant que les tests tournent encore, Claude active sa fusion automatique : GitHub refuse sinon la fusion (#63). **Claude fusionne lui-même les PR sans changement visible** (technique, documentation) dès que les tests passent sur GitHub. **David fusionne les PR qui se voient** (interface, thèmes, orientation, écran titre), après un coup d'œil aux captures, depuis l'app GitHub au besoin. **Claude part de `main` dès que possible**, et n'empile le sujet suivant sur une PR visible en attente que si les deux touchent le même écran ou les mêmes fichiers : les piles ont coûté des conflits à chaque fusion. **Une PR empilée se fusionne après celle du dessous** : fusionnée avant, elle part dans la branche du dessous, pas dans `main` (c'est arrivé avec #25 et #44). Sa description le rappelle en tête. |
| **Recette** | David | Essai sur téléphone, en salle si besoin, avec la checklist [docs/recette.md](docs/recette.md). Le journal vocal exporté nourrit le corpus de tests (`tests/corpus/`). Les problèmes trouvés deviennent des issues. **Après chaque PR qui touche la voix**, une recette courte de la ligne concernée (5 minutes) : sur iPhone, c'est la seule vraie preuve, les tests ne reproduisent pas la reconnaissance d'iOS. |

## 2. Développer une issue : TDD adapté

Le développement est piloté par les tests, sans dogmatisme sur la taille des cycles.

1. **Partir des critères d'acceptation de l'issue** et les traduire en tests, avant le code :
   - **tests unitaires** pour la logique pure (langue, chrono, statistiques, réglages) : c'est là que se trouve l'essentiel des règles ;
   - **tests de bout en bout** pour les parcours (ce que voit et entend l'utilisateur), sur Chromium et WebKit.
2. **Constater l'échec** (rouge), pour la bonne raison : le test vérifie bien le nouveau comportement.
3. **Écrire le code** jusqu'au vert, puis **nettoyer** avec les tests comme filet.
4. Les cycles se font **par critère ou groupe de critères**, pas par ligne de code.
5. **Un bug trouvé = d'abord un test qui le reproduit**, ensuite la correction.
6. **Un test existant n'est modifié que si le comportement change volontairement**, et la PR le dit.
7. **Filets de sécurité automatiques des tests de bout en bout** (`tests/e2e/fixtures.js`) :
   - **toute erreur JavaScript de la page fait échouer le test**, même si le scénario semble passer. Une erreur au chargement peut arrêter silencieusement la fin d'un script ;
   - **toute violation de la politique de sécurité du contenu** (#37) aussi : un style ou un script en ligne, une ressource d'un autre domaine. Pour ajouter des styles dans un test (police large…), `app.addStyle(css)`, pas `page.addStyleTag`, que la politique refuse ;
   - la voix, la reconnaissance et les sons sont des doublures muettes, et l'horloge est simulée ;
   - les doublures suivent le navigateur là où l'app en dépend : chaque `start()` de la reconnaissance ouvre une écoute neuve, `stop()` la termine (`onend`), et `window.__recLog` garde la trace des reconnaissances créées et relancées. `window.__speechMs` fait durer les annonces, pour faire parler l'arbitre pendant que l'app parle. **Toute fonction qui touche à la voix se teste aussi sur WebKit** (projet `iphone-safari`) : certains comportements ne valent que sur iPhone ;
   - **horloge simulée** (`page.clock`) : un délai programmé pendant une avance de l'horloge ne part qu'à l'avance suivante. Après une annonce, faire un pas (`app.wait(500)`) avant de vérifier son effet . La mise en pause se fait à l'heure courante de la page, jamais à une heure fixe : sur une machine chargée, une heure fixe est vite passée. Même piège avec les minuteries simulées de Node (`mock.timers`) dans les tests unitaires : avancer par petits pas ;
   - l'écran titre est marqué comme déjà vu (option `introSeen`), sauf dans les tests qui le concernent ; l'option `blockStorage` simule un stockage indisponible ; l'option `micSilentMs` règle le témoin « micro silencieux » (#56), coupé par défaut puisque la fausse reconnaissance ne transmet rien d'elle-même.
8. **Style des fichiers** ([`.editorconfig`](.editorconfig)) : UTF-8, fins de ligne LF, retour à la ligne final, indentation de 2 espaces, pas d'espace en fin de ligne (sauf Markdown). `tests/unit/style.test.js` le vérifie sur tous les fichiers suivis par git. **Mise en forme par [Prettier](https://prettier.io/), avec ses réglages par défaut** (lignes de 80 caractères ; Markdown exclu, voir `.prettierignore`), et **[ESLint](https://eslint.org/)** avec les règles recommandées (`eslint.config.js`) : `npm run lint` vérifie les deux, `npm run format` remet en forme (#36). **Un commit ne mélange pas mise en forme et changements** ; le grand reformatage du 19 octobre 2026 est listé dans `.git-blame-ignore-revs`, que `git blame` saute avec `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
9. **Un fichier de tests par fonctionnalité** (`tests/unit/<module>-<sujet>.test.js`, `tests/e2e/<sujet>.spec.js`) plutôt qu'à la fin d'un gros fichier : deux PR parallèles qui ajoutent des tests au même endroit se gênent à chaque fusion.
10. **Toute donnée venue de l'extérieur** (lien ou fichier partagé, stockage du navigateur, journal importé) **a des tests avec des valeurs hostiles** : types faux, hors bornes, HTML, caractères spéciaux.
11. **Un test se juge à son code de sortie**, jamais à une sortie filtrée (`grep`) : un filtre peut cacher un échec.
12. **Les mises en page se testent dans le pire cas** : plusieurs formats d'écran (iPhone SE, iPhone Pro Max, Android, en portrait et en paysage, et **Safari avec sa barre d'adresse et ses onglets**, qui ne laisse que 280 px de haut en paysage) et une **police large** forcée. Sur GitHub, WebKit tourne sous Linux, sans la police d'Apple : un débordement invisible sur le Mac y apparaît.

## 3. Prouver la qualité

Chaque PR apporte des **mesures**, pas seulement l'affirmation que « les tests passent ».

| Preuve | Outil | Attendu |
|---|---|---|
| Tests | `npm test` (unitaires + bout en bout) | Tout vert, en local et sur GitHub |
| **Couverture de code** | Couverture intégrée de Node pour les tests unitaires ; couverture de Chromium (via Playwright) pour les tests de bout en bout | Valeurs avant → après. Pas de baisse sur les fichiers touchés. Objectif ≥ 90 % des lignes sur les modules purs. |
| **Tests de mutation** | [StrykerJS](https://stryker-mutator.io/) sur les modules purs | Le score de mutation **prouve que les tests sont de vrais tests** : Stryker modifie le code (un `<` devient `<=`, une condition est inversée…) et vérifie qu'au moins un test échoue. Objectif ≥ 80 % sur les fichiers touchés ; **sous 80 % au total, la passe « Qualité » échoue**. Périmètre : les modules purs, et ceux de la voix (`voice.js`, `speech.js`, #58). Chaque mutant survivant est **tué par un nouveau test ou justifié** dans la PR (mutant équivalent, code d'affichage…). |
| Typage | `npm run typecheck`, à partir de [#2](https://github.com/doppelganger9/chrono-vocal/issues/2) | Sans erreur, en mode strict |

Les tests de mutation tournent sur les modules purs et leurs tests unitaires, rapides. Les relancer sur les tests de bout en bout serait trop long : c'est une raison de plus pour garder la logique hors de l'interface ([#1](https://github.com/doppelganger9/chrono-vocal/issues/1)).

## 4. Contenu d'une pull request

Le modèle [.github/pull_request_template.md](.github/pull_request_template.md) reprend ces rubriques :

- **Résumé** et `Closes #N`.
- **Ce qui change pour l'utilisateur**, en langage courant.
- **Captures avant / après** quand c'est visuel : iPhone et Android, en portrait et en paysage si c'est concerné. Elles sont prises automatiquement par Playwright (et au besoin dans le simulateur iOS), sur `main` puis sur la branche. Elles sont stockées dans la branche `pr-assets`, pour ne pas alourdir `main`.
- **Gains mesurés**, quand c'est pertinent et seulement dans ce cas : poids de la page, temps de chargement, travail par seconde du chrono, durée des tests… Avec la méthode de mesure.
- **Qualité** : tests ajoutés ou modifiés, couverture avant → après, score de mutation, mutants survivants et leur justification.
- **Coût de développement (statistiques IA)**, voir § 5.
- **À vérifier sur téléphone** : ce que les tests automatiques ne peuvent pas couvrir.
- **Écarts par rapport à l'issue** et décisions prises en cours de route.

## 5. Statistiques de développement IA

Le journal de session de Claude Code (sur le Mac de David, hors du dépôt) enregistre chaque appel au modèle avec son heure et ses tokens. Un script calcule les statistiques entre le début et la fin du travail sur l'issue :

| Mesure | Détail |
|---|---|
| Durée | De la prise de l'issue à l'ouverture de la PR (temps écoulé), et temps actif estimé (périodes sans pause de plus de 10 minutes) |
| Appels au modèle | Nombre d'échanges, et modèle utilisé |
| Tokens | Entrée, écriture et lecture du cache, sortie (dont réflexion) |
| Outils | Nombre d'appels par outil (commandes, lectures, éditions, navigateur…) |
| Cycles de test | Nombre de lancements de tests, et passages rouge → vert |
| Consommation du forfait | Part des limites (5 heures, semaine) utilisée pendant l'issue, d'après l'outil d'usage de l'app Claude |

Ces chiffres sont **mesurés, pas estimés**, sauf le temps actif, qui est une approximation. Le journal est écrit avec un léger retard : le script se lance une fois le travail terminé, et les tout derniers échanges peuvent manquer. Si une session mêle plusieurs sujets, la PR le signale.

## 6. Conventions

- **Versions** ([#39](https://github.com/doppelganger9/chrono-vocal/issues/39)) : [SemVer](https://semver.org/lang/fr/), dans `package.json`, `js/version.js` et `sw.js` (des tests vérifient qu'elles concordent ; `npm version minor --no-git-tag-version`, ou `patch`, les change toutes), affichée dans les réglages et sur l'écran titre. **Une PR visible change la version** (mineure pour une nouveauté, correctif pour une correction) et ajoute ses lignes en tête de [CHANGELOG.md](CHANGELOG.md), en langage courant ; une PR sans changement visible n'y touche pas. Une nouveauté importante entre aussi dans « Quoi de neuf » (`NEWS`, `js/intro.js`), avec les mêmes mots que le journal. À l'arrivée sur `main`, la CI pose l'étiquette `vX.Y.Z` et publie la *release* (`.github/workflows/version.yml`). Deux PR visibles en parallèle se disputent le numéro : la seconde prend le suivant en fusionnant `main`.
- **Hors ligne** ([#40](https://github.com/doppelganger9/chrono-vocal/issues/40)) : le service worker `sw.js` met en cache tous les fichiers de l'app (sa liste `FILES` ; **un nouveau fichier s'y ajoute**, un test le rappelle). Comme il porte la version, chaque version l'installe à nouveau : il télécharge tout en arrière-plan, et n'est activé qu'**au prochain lancement**, jamais au milieu d'un assaut (pas de `skipWaiting`).
- **Branches** : `issue-<numéro>-<sujet-court>`, par exemple `issue-4-portrait-paysage`.
- **Sujets visibles qui s'enchaînent** : une **pile de PR** ([stacked pull requests](https://docs.github.com/en/pull-requests/reference/stacked-pull-requests) de GitHub, avec l'extension `gh stack`), chaque PR visant la branche de la précédente. On fusionne de bas en haut, pour qu'aucune PR ne soit fusionnée dans une branche intermédiaire.
- **Surveillance de la CI** : chaque PR ouverte par Claude est suivie par l'app Claude avec **Auto-fix**. Claude est réveillé automatiquement en cas d'échec des tests ou de conflit, et corrige sans relance. **Les commentaires de David ne réveillent pas Claude** (constaté sur #31 et #52, commentaires de discussion comme de revue) : David le prévient dans la conversation, et Claude relit les commentaires des PR ouvertes au début de chaque tâche.
- **Données venues de l'extérieur** ([#55](https://github.com/doppelganger9/chrono-vocal/issues/55)) : un lien ou un fichier de réglages partagé, comme le stockage du navigateur, peut tout contenir. `migrate` (`js/settings.js`) **valide chaque réglage** (type, bornes, liste de valeurs ; couleurs en lettres seulement) et écarte les clés inconnues. **Tout texte inséré dans du HTML passe par `esc`** (`js/html.js`), et un texte cherché dans une expression régulière est échappé (`findColor`, `js/lang.js`).
- **Politique de sécurité du contenu** ([#37](https://github.com/doppelganger9/chrono-vocal/issues/37)) : une balise `<meta http-equiv="Content-Security-Policy">` en tête de `index.html` (GitHub Pages ne permet pas les en-têtes HTTP). Rien par défaut ; scripts, styles, images et manifeste du site seulement ; **aucun style ni script en ligne**, pas d'`eval`, aucune connexion. Une couleur calculée se donne par le DOM (`el.style.background = …`, permis), comme les pastilles des tireurs (`js/ui/dots.js`). `tests/unit/csp.test.js` vérifie la politique.
- **Sécurité** ([#34](https://github.com/doppelganger9/chrono-vocal/issues/34)) : **CodeQL** analyse le JavaScript et les workflows à chaque PR, sur `main` et chaque lundi (`.github/workflows/codeql.yml`, alertes dans l'onglet *Security*). Le job « tests » lance **`npm audit --audit-level=high`** : une faille haute ou critique dans une dépendance bloque la fusion ; les moindres sont corrigées par les PR groupées de Dependabot.
- **Dépendances** ([#17](https://github.com/doppelganger9/chrono-vocal/issues/17)) : Dependabot propose **une PR groupée par mois** (npm et actions GitHub), avec seulement des versions publiées depuis au moins 7 jours. Les **correctifs de sécurité** (alertes Dependabot activées) partent dès qu'une faille est connue, mais **groupés eux aussi** : une seule PR pour tous les correctifs du moment. Elles sont **fusionnées automatiquement** si « Tests » passe (`.github/workflows/dependabot-fusion.yml`), puisqu'aucune dépendance n'est servie aux utilisateurs. Si npm répond « No matching version » pour une version qui existe pourtant, c'est le cache local (option `prefer-offline` de la configuration npm du poste) : réessayer avec un cache neuf, `npm install --cache <dossier vide> --prefer-online`. Ne pas contourner avec un `overrides`.
- **`main` est protégée** : on n'y pousse pas directement, et une PR ne peut être fusionnée que si les tests (`tests` sur GitHub Actions) passent, y compris pour l'administrateur. Les PR sans changement visible sont marquées pour une **fusion automatique** dès que les tests passent. La branche est supprimée après la fusion.
- **Commits** en français, terminés par la ligne `Co-Authored-By` de Claude. Adresse GitHub masquée (`…@users.noreply.github.com`) : rien de personnel dans le dépôt, qui est public.
- **Vocabulaire** du [GLOSSARY.md](GLOSSARY.md) dans le code, l'interface et la documentation : *reprise*, *minute de repos*, *arrêt*…
- **Règles métier** : le [corpus fonctionnel](docs/corpus-fonctionnel.md) fait foi, et **l'arbitre décide, le chrono suit** ([ADR 0006](docs/adr/0006-l-arbitre-decide.md)).
- **Nouvelle décision structurante** (difficile à défaire, surprenante sans contexte, issue d'un vrai choix) : un ADR dans `docs/adr/`.

## 7. Outillage

| Commande | Rôle |
|---|---|
| **`npm run verifier`** | Typage, lint et format, tests unitaires, tests de bout en bout, avec **un résumé de quelques lignes** ; s'arrête au premier échec, avec la fin de sa sortie (#57). Avec `-- --complet` : en plus la couverture et la mutation (complète : l'incrémentale rendait des scores périmés quand seuls les tests changent). Mesures dans `reports/verifier.json` |
| **`npm run pr-body`** | Description complète de la PR dans `reports/pr-body.md`, au modèle de § 4, avec les mesures remplies (tests avant → après, couverture, mutation et survivants des fichiers touchés, captures, performances, statistiques IA). Restent les parties « À ÉCRIRE ». `-- --visible` pour une PR qui se voit |
| `npm test` | Typage, lint et format, tests unitaires, puis de bout en bout |
| `npm run typecheck` | Types JSDoc vérifiés par TypeScript en mode strict, sans compilation (`jsconfig.json`) |
| `npm run lint` / `npm run format` | ESLint et Prettier en vérification (aussi dans `npm test`, `verifier` et la CI) / remise en forme de tout le dépôt |
| `npm run test:unit` / `npm run test:e2e` | L'un ou l'autre |
| `npm run serve` | L'app sur http://localhost:4173 |
| `npm run coverage` | Couverture fusionnée (unitaire + bout en bout sur Chromium) : rapport HTML dans `coverage/`, résumé dans `coverage/coverage-summary.md` |
| `npm run mutation` | Tests de mutation (Stryker) sur les modules purs : rapport dans `reports/mutation/` |
| `npm run avant-apres -- main` | Captures des écrans clés (iPhone et Android, portrait et paysage) sur `main` et sur la branche, et mesures de performance comparées : `screenshots/` |
| `npm run pr-assets -- <PR> [écrans…]` | Publie ces captures dans la branche `pr-assets`, affiche leur tableau et l'enregistre dans `reports/pr-assets.md` (repris par `pr-body`) |
| `npm run ai-stats -- --since <date ISO>` | Statistiques IA de la période (journal de session de Claude Code), au format du modèle de PR |

**Couverture et mutation sur GitHub** (workflow « Qualité », `.github/workflows/qualite.yml`) : **pas à chaque PR**, pour garder la CI légère (environ 4 min). Chaque PR est déjà mesurée en local (`npm run verifier -- --complet`), et ses chiffres sont dans sa description. Sur GitHub, la passe tourne :
- **chaque lundi sur `main`**. Si elle échoue, une issue est ouverte toute seule ;
- **à la demande** : onglet *Actions* → *Qualité* → *Run workflow* ;
- **sur une PR qui porte l'étiquette `qualite`**, à chaque nouveau commit de la PR.

**Un score de mutation total sous 80 % fait échouer la passe** (`thresholds.break` de Stryker, #60), comme `npm run verifier -- --complet` en local. Seule la tâche `tests` est exigée pour fusionner.

**Le circuit d'une issue** :
1. **Au début**, sur la branche toute neuve : `npm run verifier`. Les mesures sont enregistrées comme point de départ (`reports/verifier-<commit>.json`).
2. Tests, code, captures (`avant-apres`, `pr-assets`).
3. **À la fin** : `npm run verifier -- --complet`, puis `npm run pr-body`, et Claude écrit les parties « À ÉCRIRE ».

**Node 20 ou plus récent** (`.nvmrc` : 22). `npm test` et `npm run verifier` refusent un Node plus ancien avec un message clair (`scripts/check-node.js`), et `npm install` aussi (`engine-strict`, `.npmrc`). **`npm ci` sous un vieux npm plante avant tout script**, sur un message obscur : « Cannot read property '@playwright/test' of undefined ». C'est la version de Node, pas le dépôt. Sur le Mac de David, le Node par défaut de nvm est trop ancien : `nvm use`, ou `PATH=/opt/homebrew/bin:$PATH npm test`.
