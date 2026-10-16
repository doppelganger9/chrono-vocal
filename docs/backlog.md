# Backlog

Améliorations prévues : technique (T), produit (P) et suites du règlement (R). Les pistes du [corpus fonctionnel](corpus-fonctionnel.md) sont déjà réalisées. Chaque point a une proposition et des critères d'acceptation. L'ordre proposé est en bas.

---

## Technique

### T1. Revoir l'architecture

**Constat.** Tout le code est dans `index.html` (~1 000 lignes : styles, interface, chrono, voix, statistiques, réglages), à part `lang.js`. La logique du chrono (phases, arrêts, prolongation, reprises supplémentaires, relais) n'est testable qu'à travers la page. Les prochains points (thèmes, palette, orientation, écran titre) ajoutent surtout du CSS et de l'interface. **Le bon moment pour découper, c'est maintenant**, avant de les empiler.

**Proposition : modules ES natifs, sans compilation ni bundler.** GitHub Pages les sert tels quels.

```
index.html          structure de la page seulement
css/
  app.css           mise en page (portrait / paysage)
  themes.css        variables de couleurs : jour, nuit, palette personnalisée
js/
  main.js           assemblage : crée les objets et les relie
  lang.js           langue et phrases de l'arbitre (pur, existe déjà)
  chrono.js         machine à états du chrono (pure : l'horloge est passée en paramètre)
  stats.js          calcul des statistiques (pur)
  settings.js       valeurs par défaut, migrations, stockage
  audio.js          bips et gong
  speech.js         reconnaissance et synthèse vocales (adaptateurs du navigateur)
  ui/               rendu de l'écran, réglages, statistiques, chronomètre annexe, écran titre
assets/             icône et illustration (SVG)
```

- **`chrono.js` devient testable en unitaire.** On lui passe une horloge (`now()`) et il émet des événements (« temps », « annonce 30 s », « prolongation »…). Les tests unitaires couvrent alors toutes les règles du chrono en quelques millisecondes. Les tests de bout en bout ne gardent que les parcours utilisateur.
- **`audio.js` et `speech.js` sont des adaptateurs** : une fine couche entre l'app et le navigateur. Dans les tests, on les remplace sans toucher au navigateur (voir T3).
- **Conséquence** : les modules ES ne se chargent pas depuis un fichier ouvert directement (`file://`). Il faut un serveur : `npm run serve` en local, GitHub Pages en ligne. C'est déjà le cas en pratique.

**Critères d'acceptation**
- `index.html` ne contient plus ni `<style>` ni `<script>` en ligne.
- Les règles du chrono sont couvertes par des tests unitaires de `chrono.js`.
- Tous les tests existants passent sans changer de comportement.

### T2. Typage JSDoc vérifié

**Proposition.** Types en commentaires JSDoc (`@typedef` pour `Config`, `State`, `Bout`, `Stop`, `SanctionEvent` ; `@param` / `@returns` sur les fonctions), vérifiés par TypeScript **sans compiler** :
- un `jsconfig.json` avec `checkJs: true`, `strict: true` et `noEmit` ;
- `npm run typecheck` (`tsc -p jsconfig.json`), ajouté à `npm test` et à l'intégration continue ;
- bénéfice annexe : l'autocomplétion et les erreurs s'affichent dans l'éditeur.

À faire **avec ou juste après T1** : typer des modules aux frontières claires est bien plus simple que typer le fichier actuel.

**Critères d'acceptation**
- `npm run typecheck` passe, en mode strict.
- L'intégration continue échoue si un type est faux.

### T3. Tests silencieux, et tests de la vraie voix

**Fait.** Dans les tests de bout en bout, la synthèse vocale, la reconnaissance vocale **et les sons** (bips, gong) sont remplacés par des doublures muettes, qui enregistrent ce qui est dit et joué. Chromium est en plus lancé avec `--mute-audio`. Les tests ne font plus aucun bruit.

**À prévoir : avec T1**, les doublures passeront par `audio.js` / `speech.js` plutôt que de remplacer les API du navigateur.

**Comment tester la vraie voix ?** Les doublures vérifient la logique, pas la qualité de la reconnaissance en salle. Les options :

| Option | Ce que ça teste | Faisabilité |
|---|---|---|
| a. Doublures (en place) | Toute la logique, ce qui est dit, quand | ✅ Rapide, fiable, muet |
| b. Navigateur réel + micro simulé par un fichier audio (Chromium `--use-file-for-fake-audio-capture`) | La chaîne complète | ❌ La reconnaissance de Chrome passe par les serveurs de Google, indisponibles dans les navigateurs de test |
| c. **Corpus de transcriptions réelles** | La robustesse de l'analyse face à ce que la reconnaissance renvoie vraiment en salle | ✅ Recommandé |
| d. Enregistrements audio de vrais arbitres passés dans un moteur hors ligne (Whisper, Vosk) | Une approximation de la reconnaissance en salle | ⚠️ Lourd, et ce n'est pas le moteur de Safari / Chrome |
| e. Recette manuelle sur téléphone, avec une checklist | La vraie expérience | ✅ Indispensable avant une compétition |

**Proposition : c + e.**
- **c.** Un bouton « Exporter le journal vocal » dans l'app (JSON : texte entendu, alternatives, ce que l'app en a fait). Après un entraînement, on verse le journal dans `tests/corpus/`, et un test unitaire rejoue chaque transcription contre `lang.js`. Chaque mot mal compris en salle devient un cas de test permanent. Ça prolonge l'apprentissage des variantes existant.
- **e.** `docs/recette.md` : une checklist de 10 minutes sur iPhone et Android (micro à 4,5 m, « en garde, allez », sanctions, annonces audibles avec le micro actif, écran qui reste allumé…).

**Critères d'acceptation**
- Aucun son pendant `npm test` (fait).
- Un journal vocal exporté peut être rejoué par `npm run test:unit`.
- Une checklist de recette existe.

---

## Produit

### P1. Portrait et paysage

**Proposition.** Une mise en page par orientation, en CSS (`@media (orientation: landscape)` et unités `vmin` / `dvh`) :
- **Portrait** (téléphone à la main) : la disposition actuelle, chrono au centre, gros bouton en bas.
- **Paysage** (téléphone posé au bord de l'aire, ou tablette) : chiffres **aussi grands que possible** sur les deux tiers gauches, lisibles depuis l'aire à 4,5 m, avec la reprise, la phase et les arrêts en dessous. Les boutons sont en colonne sur le tiers droit.
- **Option « mode tableau »** : en paysage, masquer les boutons (seule la voix pilote, la télécommande reste active). Le téléphone devient un afficheur pour les tireurs et le public.
- Les fenêtres (réglages, statistiques) passent sur deux colonnes en paysage.

**Critères d'acceptation**
- Pas de défilement, en portrait comme en paysage, sur iPhone SE comme sur iPhone Pro Max.
- Chiffres d'au moins 40 % de la hauteur de l'écran en paysage.
- Tests de bout en bout dans les deux orientations.

### P2. Mode jour / nuit et palette personnalisable

**Proposition.**
- **Trois réglages** : *Automatique* (suit le téléphone, `prefers-color-scheme`), *Jour*, *Nuit*. Le thème jour est à fort contraste, pour un gymnase éclairé ou en plein air.
- **Couleurs en variables CSS** (`--reprise`, `--repos`, `--arret`, `--fond`, `--texte`…), définies par thème dans `themes.css`.
- **Palette personnalisable** dans les réglages : couleur de la reprise, du repos, de l'arrêt, plus les **couleurs des tireurs** (rouge / bleu), qui pourront aussi colorer les sanctions dans les statistiques. Avec un bouton « Revenir aux couleurs d'origine ».
- **Stockage** : avec les autres réglages, dans le stockage local du navigateur. C'est le bon outil : petit volume, propre à l'appareil. **En plus**, je propose « Exporter / importer les réglages » (fichier ou lien), pour configurer à l'identique tous les téléphones d'un club ou d'une compétition.
- Garde-fou : un avertissement si le contraste entre le chiffre et le fond devient trop faible.

**Critères d'acceptation**
- Le thème suit le téléphone en mode automatique.
- La palette personnalisée est gardée après rechargement.
- Un contraste minimum est garanti pour les chiffres.

### P3. Écran titre au premier lancement

**Proposition.**
- **Détection** : un marqueur dans le stockage local (`intro-vue`), avec un numéro de version. On peut ainsi **le remontrer quand une nouveauté importante arrive** (« Quoi de neuf »), plutôt qu'une seule fois pour toujours. Il reste accessible depuis les réglages (« Revoir la présentation »).
- **Il sert aussi à quelque chose** : sur iPhone, le son et le micro ne peuvent être activés que par un toucher. Le bouton « Commencer » de l'écran titre débloque la voix, demande l'accès au micro et lance l'écoute, en une seule étape.
- **Contenu** : le nom, une illustration, trois lignes pour comprendre (« Dites "en garde, allez" pour démarrer, "stop" pour arrêter… ») et le bouton.
- **Illustration** : un dessin vectoriel (SVG) fait pour l'app, par exemple deux cannes croisées devant un cadran de chronomètre, ou une onde sonore qui sort du cadran. Il est léger, net à toutes les tailles, suit le thème jour / nuit, et peut **servir d'icône** de l'app sur l'écran d'accueil du téléphone.
- Si l'aperçu de cet écran ne s'affiche pas (navigation privée, stockage effacé), l'app démarre quand même normalement.

**Critères d'acceptation**
- L'écran titre s'affiche au premier lancement, puis plus jamais, sauf nouvelle version de présentation ou demande depuis les réglages.
- « Commencer » active la voix et le micro.
- L'icône de l'écran d'accueil reprend l'illustration.

---

## Règlement : suites de l'analyse du cahier n°10

Points restés ouverts après la réalisation des pistes du [corpus fonctionnel](corpus-fonctionnel.md) (§ 5). Les références C… renvoient aux règles du corpus.

### R1. L'arbitre décide, le chrono suit — ✅ fait

**Décisions.** « Temps » est répété toutes les 5 s pendant le temps dépassé, pour que l'arbitre ne puisse pas le manquer (sauf pendant un arrêt). Un « stop » seul est un arrêt ordinaire ; la reprise se termine sur « Stop, fin de la reprise » ou « … fin de l'assaut » (les deux sont acceptés), le bouton « Fin de la reprise » ou « REPOS ». Pas de limite au temps dépassé.

**Principe.** C'est l'arbitre qui dirige l'assaut (I 1.1.2), pas le chronomètre. Le chronométreur mesure et annonce : « temps » est une **information** donnée à l'arbitre, pas une décision. L'app ne doit jamais imposer une transition, ni ignorer un commandement de l'arbitre.

**Constat (avant R1) : le code ne le permettait pas.**
- **Après « temps », l'app bloque.** Elle passe en « attente du stop », ignore « allez », et le premier « stop » lance la minute de repos. Si l'arbitre fait continuer la reprise après « temps » (pour finir une action, ou parce que « temps » est tombé pendant sa procédure), le chrono reste figé à 0:00. Ce temps n'est ni mesuré ni enregistré.
- **« Stop » juste avant « temps » (C4).** « Stop » prime sur « temps ». S'il reste quelques dixièmes au chrono, l'arbitre termine sa procédure, puis fait « en garde, allez, stop, fin de la reprise ». Ce dernier « stop » peut arriver avant que les dixièmes soient écoulés : l'app le prend pour un nouvel arrêt et la reprise ne se termine pas.
- **D'autres commandements sont ignorés sans le dire** selon la phase (par exemple « stop » avant le premier « allez »).
- **Des transitions automatiques** décident à la place de l'arbitre : le repos automatique après « temps » (option), la prolongation de 30 s appliquée d'office.

**Proposition.**
1. **Après « temps », « allez » fait continuer la reprise.** Le chrono passe en **temps dépassé** et compte à rebours inversé (« +0:04 », dans une couleur distincte). Ce temps est enregistré dans les statistiques de la reprise.
2. **La fin de la reprise vient de l'arbitre** : « Stop, fin de la reprise » ou « … fin de l'assaut », le bouton, la télécommande, ou « REPOS ». Pendant le temps dépassé, un « stop » seul est un arrêt ordinaire.
3. **« Fin de la reprise » dit par l'arbitre termine toujours la reprise**, quel que soit le temps restant. Ça règle le cas C4 sans seuil arbitraire.
4. **Aucun commandement ignoré sans trace** : si un commandement n'a pas d'effet dans la phase en cours, l'app l'affiche (« STOP entendu, sans effet avant le premier ALLEZ ») et le garde dans le journal vocal (T3).
5. **Les automatismes proposent, l'arbitre dispose.**
   - La prolongation de 30 s est **proposée** (« Prolonger de 30 s ? », un toucher pour valider), sauf si l'option « prolongation automatique » est activée.
   - Le repos automatique ne se déclenche jamais si l'arbitre a dit « allez » après « temps ».

**À décider**
- Pendant le temps dépassé, un « stop » seul : arrêt ordinaire (ma proposition, l'arbitre dira « fin de la reprise »), ou fin de la reprise ?
- Faut-il borner le temps dépassé, par exemple une alerte au-delà de 10 s ?

**Critères d'acceptation**
- Après « temps », « allez » relance un temps dépassé visible et compté. La reprise ne se termine que sur décision de l'arbitre.
- « Stop, fin de la reprise » termine la reprise à tout moment, y compris avec quelques dixièmes restants.
- Tests de bout en bout pour chacun de ces cas.

### R2. Retard à l'appel de la reprise (C15)

**Constat.** 5 s avant la fin de la minute de repos, l'arbitre appelle les tireurs. S'ils ne sont pas sur l'aire : 1er rappel = observation, 2ème = pénalité, 3ème = carton jaune. Rien ne le prévoit dans l'app.

**Proposition.** Pendant le repos et en « prêt », un bouton « Rappel » choisit le tireur (rouge ou bleu) et enregistre la sanction qui correspond au rang du rappel. Elle apparaît dans les statistiques, comme les sanctions à la voix. À la voix : reconnaître « rappel, tireur bleu ».

### R3. Second exclu qui refuse de sortir (C14)

**Constat.** Le chronomètre annexe compte les retards (pénalité à chaque minute, disqualification à 3 minutes). Le règlement prévoit un 2ème usage : un second exclu qui refuse de sortir entraîne un carton rouge pour son tireur au bout d'une minute (I 4.2.5.4).

**Proposition.** Un choix « Retard » / « Second exclu » dans le chronomètre annexe. Le 2ème mode annonce « Une minute. Carton rouge ».

### R4. Relais : qui est sur l'aire (C13)

**Constat.** En relais, aucun tireur ne doit rester plus de 2 minutes consécutives sur l'aire. L'app annonce chaque minute mais ne sait pas qui tire.

**Proposition.** À chaque fenêtre de relais, un toucher (ou « relais rouge » / « relais bleu » à la voix) indique l'équipe qui a changé de tireur. L'app compte le temps passé sans changement par chaque équipe, et alerte avant 2 minutes : « Bleu, relais obligatoire ».

### R5. Plusieurs aires, chronomètre central (C12)

**Constat.** Avec un chronomètre central pour plusieurs aires, les assauts sans prolongation vont au bout de leur reprise, et leur repos est allongé pour que tous reprennent ensemble.

**Proposition, plus tard.** Il faudrait relier les téléphones des aires entre eux, par exemple par un petit service en ligne partagé. C'est un projet en soi : à garder pour une compétition qui en aurait besoin.

### Idées hors périmètre (à rediscuter)

- **Protocole guidé** : afficher et dire la prochaine étape attendue du protocole (« Tireurs en place pour le salut », « Juges, prêts ? »…), pour former les jeunes arbitres et chronométreurs.
- **Feuille de marque complète** : le comptage des touches par les juges. Ce n'est pas le rôle du chronomètre, mais on pourrait y rattacher les sanctions déjà reconnues.

---

## Ordre proposé

1. ~~**R1 L'arbitre décide, le chrono suit**~~ ✅ fait.
2. **T1 Architecture + T2 Typage**, ensemble : c'est la base des suivants. Le comportement ne change pas, et les tests existants le garantissent.
3. **P2 Jour / nuit + palette** : profite tout de suite des variables CSS de T1.
4. **P1 Portrait / paysage**.
5. **P3 Écran titre et icône**.
6. **T3 Journal vocal + checklist de recette** : à lancer dès qu'il y a des entraînements avec l'app, pour nourrir le corpus.
7. **R2 Rappels, R3 Second exclu, R4 Relais**.
8. **R5 Plusieurs aires**, si le besoin se confirme.
