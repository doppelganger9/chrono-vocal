# Mode de fonctionnement

Ce projet est développé par Claude (Claude Code), qui travaille sur les issues GitHub. David décide, relit et valide sur le terrain. Ce document décrit le cycle de travail et les preuves de qualité attendues dans chaque pull request.

Voir aussi : [ADR 0001](docs/adr/0001-backlog-dans-les-issues-github.md) (backlog dans les Issues), [ADR 0007](docs/adr/0007-strategie-de-tests.md) (stratégie de tests), et [CLAUDE.md](CLAUDE.md) (consignes relues par Claude à chaque session).

---

## 1. Le cycle

| Étape | Qui | Résultat |
|---|---|---|
| **Dégrossissage** | Claude | Chaque issue reçoit un découpage, ses dépendances, ses critères d'acceptation, et les **décisions à prendre**, chacune avec une proposition par défaut. Les questions de toutes les issues sont regroupées en **un seul questionnaire**. |
| **Décisions** | David | Réponse au questionnaire, une fois. Les choix de goût (couleurs, illustration, mise en page) sont proposés en 2 ou 3 variantes directement dans la PR, avec captures : David choisit avant de fusionner. Une issue tranchée reçoit le label `prêt`. |
| **Développement** | Claude | Les issues `prêt` sont enchaînées dans l'ordre de [docs/backlog.md](docs/backlog.md) : une branche et une pull request par issue (§ 2 à 4). Claude ne s'arrête que pour une décision imprévue. |
| **Revue et fusion** | Claude ou David | GitHub Pages publie `main` : **une PR fusionnée est en ligne une minute plus tard.** **Claude fusionne lui-même les PR sans changement visible** (technique, documentation) dès que les tests passent sur GitHub. **David fusionne les PR qui se voient** (interface, thèmes, orientation, écran titre), après un coup d'œil aux captures, depuis l'app GitHub au besoin. Si une PR visible attend, Claude empile le sujet suivant dessus. |
| **Recette** | David | Essai sur téléphone, en salle si besoin, notamment pour la vraie reconnaissance vocale. Les problèmes trouvés deviennent des issues. |

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

## 3. Prouver la qualité

Chaque PR apporte des **mesures**, pas seulement l'affirmation que « les tests passent ».

| Preuve | Outil | Attendu |
|---|---|---|
| Tests | `npm test` (unitaires + bout en bout) | Tout vert, en local et sur GitHub |
| **Couverture de code** | Couverture intégrée de Node pour les tests unitaires ; couverture de Chromium (via Playwright) pour les tests de bout en bout | Valeurs avant → après. Pas de baisse sur les fichiers touchés. Objectif ≥ 90 % des lignes sur les modules purs. |
| **Tests de mutation** | [StrykerJS](https://stryker-mutator.io/) sur les modules purs | Le score de mutation **prouve que les tests sont de vrais tests** : Stryker modifie le code (un `<` devient `<=`, une condition est inversée…) et vérifie qu'au moins un test échoue. Objectif ≥ 80 % sur les fichiers touchés. Chaque mutant survivant est **tué par un nouveau test ou justifié** dans la PR (mutant équivalent, code d'affichage…). |
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

- **Branches** : `issue-<numéro>-<sujet-court>`, par exemple `issue-4-portrait-paysage`.
- **`main` est protégée** : on n'y pousse pas directement, et une PR ne peut être fusionnée que si les tests (`tests` sur GitHub Actions) passent, y compris pour l'administrateur. Les PR sans changement visible sont marquées pour une **fusion automatique** dès que les tests passent. La branche est supprimée après la fusion.
- **Commits** en français, terminés par la ligne `Co-Authored-By` de Claude. Adresse GitHub masquée (`…@users.noreply.github.com`) : rien de personnel dans le dépôt, qui est public.
- **Vocabulaire** du [GLOSSARY.md](GLOSSARY.md) dans le code, l'interface et la documentation : *reprise*, *minute de repos*, *arrêt*…
- **Règles métier** : le [corpus fonctionnel](docs/corpus-fonctionnel.md) fait foi, et **l'arbitre décide, le chrono suit** ([ADR 0006](docs/adr/0006-l-arbitre-decide.md)).
- **Nouvelle décision structurante** (difficile à défaire, surprenante sans contexte, issue d'un vrai choix) : un ADR dans `docs/adr/`.

## 7. Outillage

| Commande | Rôle |
|---|---|
| `npm test` | Tests unitaires puis de bout en bout |
| `npm run test:unit` / `npm run test:e2e` | L'un ou l'autre |
| `npm run serve` | L'app sur http://localhost:4173 |

À mettre en place ([#13](https://github.com/doppelganger9/chrono-vocal/issues/13)) : couverture, tests de mutation, captures avant/après, statistiques IA, modèle de PR complété. C'est le premier sujet à traiter, pour que toutes les PR suivantes apportent ces preuves.

Node 20 ou plus récent. Sur le Mac de David, le Node par défaut de nvm est trop ancien : `PATH=/opt/homebrew/bin:$PATH npm test`.
