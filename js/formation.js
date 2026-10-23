// Mode formation (#106) : aide-mémoire du protocole de l'arbitre, d'après l'état du chrono. Module pur.
//
// Il montre ce que l'arbitre dit maintenant, et ce qui vient ensuite (protocole d'un assaut de A à Z, cahier n°10,
// partie H). Il n'impose rien et n'écoute rien de plus (ADR 0006) : l'étape suit le chrono. Avant l'assaut et pour les
// résultats, le chrono ne bouge pas : ces deux séquences avancent d'un toucher (index tenu par l'interface).
// Les phrases d'usage (non écrites dans le cahier, pratiquées sur le terrain) sont marquées.

import { buildSentence } from "./lang.js";

/** @typedef {import('./types.js').Config} Config @typedef {import('./types.js').Phase} Phase */
/**
 * @typedef {object} Phrase
 * @property {string} text
 * @property {boolean} usage  phrase d'usage, pas du cahier
 * @property {boolean} [or]  une autre façon de dire la phrase précédente
 *
 * @typedef {object} Step  une étape du protocole
 * @property {string} when  qui parle, ou quand
 * @property {Phrase[]} phrases
 * @property {string} [note]  geste, détail
 *
 * @typedef {'avant' | 'resultats' | 'arret'} Sequence  étapes qui avancent d'un toucher (ou, pour un arrêt, le cas choisi)
 *
 * @typedef {object} FormationView
 * @property {Sequence | null} sequence
 * @property {number} index  rang de l'étape dans la séquence (0 hors séquence)
 * @property {number} count  nombre d'étapes de la séquence (1 hors séquence)
 * @property {Step} step  à dire maintenant
 * @property {Step | null} next  ensuite
 * @property {string[]} [choices]  pendant un arrêt : les cas, au choix
 *
 * @typedef {object} FormationContext
 * @property {Phase} phase
 * @property {boolean} halt
 * @property {number} round
 * @property {number} totalRounds  reprises prévues, supplémentaires comprises
 * @property {number} remaining  secondes restantes
 * @property {boolean} started  l'assaut a commencé (premier « allez »)
 * @property {Config} cfg
 */

/** Phrase du cahier @param {string} text @returns {Phrase} */
const cahier = (text) => ({ text, usage: false });
/** Phrase d'usage @param {string} text @returns {Phrase} */
const usage = (text) => ({ text, usage: true });
/** Autre façon de dire la phrase précédente @param {Phrase} p @returns {Phrase} */
const or = (p) => ({ ...p, or: true });

const ORDINALS = ["Première", "Deuxième", "Troisième", "Quatrième"];
/** « Deuxième reprise », ou « Reprise supplémentaire » au-delà des reprises prévues @param {number} n @param {Config} cfg */
export const repriseName = (n, cfg) =>
  n > cfg.rounds ? "Reprise supplémentaire" : `${ORDINALS[n - 1]} reprise`;

// en deux phrases : sur un petit écran, quatre lignes prendraient la place du chrono
const OFFICIELS = [
  cahier("Juge 1, prêt ? Juge 2, prêt ? Juge 3, prêt ?"),
  cahier("Chrono, prêt ?"),
];
const EN_GARDE_ALLEZ = [cahier("En garde"), cahier("Allez")];
const SALUT = [
  cahier("Tireurs en place pour le salut"),
  cahier("Prêts pour le salut"),
  cahier("Saluez-vous"),
];

/** Avant l'assaut (protocole § 1 et 2) @param {Config} cfg @returns {Step[]} */
function avant(cfg) {
  const [a, b] = cfg.colors.map((c) => c || "…");
  return [
    {
      when: "Appel",
      phrases: [usage(`Sont attendus sur l'aire… : en ${a}, … ; en ${b}, …`)],
      note: "Délégué officiel ou présentateur. Les tireurs vont à leur chaise.",
    },
    {
      when: "Arbitre",
      phrases: [usage("Tireurs, vérification du matériel")],
      note: "À la table du juge 1 : tenue, protections, 4 cannes, seconds.",
    },
    {
      when: "Arbitre",
      phrases: [usage("Tireurs, au centre, pour la présentation")],
      note: "Casque sous le bras.",
    },
    {
      when: "Arbitre",
      phrases: [usage(`À ma gauche, en ${a}, … ; à ma droite, en ${b}, …`)],
      note: "Présentation, juste avant le salut.",
    },
    { when: "Arbitre", phrases: SALUT },
    {
      when: "Arbitre",
      phrases: [
        usage("Tireurs, équipez-vous sur l'aire"),
        or(usage("Tireurs, dans vos zones, équipez-vous")),
      ],
      note: "Geste : mettre le casque des deux mains. Sur l'aire, les tireurs s'équipent sans la quitter ; sinon, à leur chaise.",
    },
    {
      when: "Arbitre",
      phrases: [
        cahier("Tireurs au centre"),
        usage(buildSentence(cfg).replace(/\.$/, "")),
        usage("[Début de la] première reprise"),
      ],
    },
    { when: "Contrôle des officiels", phrases: OFFICIELS },
    {
      when: "Arbitre",
      phrases: EN_GARDE_ALLEZ,
      note: "Le chrono part à « allez ».",
    },
  ];
}

/** Fin de l'assaut et résultat (protocole § 7) @type {Step[]} */
const RESULTATS = [
  {
    when: "Arbitre",
    phrases: SALUT,
    note: "Puis les tireurs ôtent le casque à leur place.",
  },
  {
    when: "Juges et arbitre",
    phrases: [],
    note: "Les juges rendent leur décompte ; l'arbitre collationne touches, pénalités, avertissements et cartons.",
  },
  {
    when: "Arbitre",
    phrases: [cahier("Tireurs au centre, résultats")],
    note: "En tenue, sans casque ni canne, face au public.",
  },
  {
    when: "Vainqueur",
    phrases: [
      usage("Après décompte des points et des pénalités…"),
      usage(
        "… est déclaré vainqueur, à la majorité (ou à l'unanimité), le tireur …",
      ),
    ],
    note: "L'arbitre désigne le vainqueur du bras.",
  },
  {
    when: "Égalité",
    phrases: [
      usage("… les deux tireurs sont à égalité"),
      usage("Reprise supplémentaire !"),
      usage("Juges, décision"),
    ],
    note: "Reprise supplémentaire ou décision des juges, selon le règlement de la compétition.",
  },
];

/** Arrêt pendant la reprise (protocole § 5 et 6) : sans sanction, puis chaque cas et son script, au choix @param {Config} cfg @returns {Step[]} */
function arret(cfg) {
  const t = `tireur ${cfg.colors.map((c) => c || "…").join(" ou ")}`;
  return [
    {
      when: "Sans sanction",
      phrases: EN_GARDE_ALLEZ,
      note: "Faire repartir. Une sanction : choisir le cas pour voir son script.",
    },
    {
      when: "Observation",
      phrases: [cahier(`Observation ${t} : …`)],
      note: "Nommer la faute ; désigner le tireur du bras, sur place. 0 point. Reprise à l'emplacement de l'arrêt.",
    },
    {
      when: "Demande d'avertissement",
      phrases: [
        usage("Tireurs, en zone neutre"),
        usage("Les juges, ensemble"),
        cahier(`Demande d'avertissement au ${t} pour …`),
      ],
      note: "Hors de l'aire, près du juge 2 ou 3 : un bras horizontal, main verticale, vers le tireur ; l'autre le long du corps.",
    },
    {
      when: "Décision des juges",
      phrases: [
        cahier(`Avertissement prononcé, ${t}`),
        or(cahier("Avertissement refusé")),
      ],
      note: "Devant le juge 1. Prononcé (+2) : un bras oblique vers le haut, l'autre vers le tireur. Refusé : bras en croix devant la poitrine.",
    },
    {
      when: "Carton",
      phrases: [
        usage("Tireurs, en zone neutre"),
        usage(`Carton jaune (ou rouge), ${t}`),
      ],
      note: "Au centre : le carton bras tendu vers le haut, l'autre bras désigne le fautif. Jaune +2 ; rouge : exclusion.",
    },
    {
      when: "Problème d'équipement",
      phrases: [usage("Second")],
      note: "Le second répare au plus vite, sans parler ; l'adversaire attend en zone neutre. Protection obligatoire manquante : carton jaune.",
    },
    {
      when: "Sortie d'aire",
      phrases: [cahier(`Pénalité pour sortie d'aire, ${t}`)],
      note: "À cheval sur la ligne des 9 m ; replacer le tireur un pied à l'intérieur. +1.",
    },
    {
      when: "Lâcher de canne",
      phrases: [cahier(`Pénalité pour lâcher de canne, ${t}`)],
      note: "Ramasser la canne, la tenir bras tendu en oblique vers le haut. +1.",
    },
    {
      when: "Blessure",
      phrases: [],
      note: "Le tireur reste dans l'aire, le second n'intervient pas ; appeler le médecin. Des soins valent abandon.",
    },
    {
      when: "Disqualification",
      phrases: [cahier("Disqualification")],
      note: "Au centre face au tireur : ciseaux, bras à l'horizontale, mains à plat. Fin de l'assaut, puis le résultat.",
    },
  ];
}

/** Une étape hors séquence, suivie par le chrono @param {Step} step @param {Step | null} [next] @returns {FormationView} */
const single = (step, next = null) => ({
  sequence: null,
  index: 0,
  count: 1,
  step,
  next,
});

/** @param {Sequence} sequence @param {Step[]} steps @param {number} index @returns {FormationView} */
function inSequence(sequence, steps, index) {
  const i = Math.min(Math.max(0, Math.trunc(index) || 0), steps.length - 1);
  return {
    sequence,
    index: i,
    count: steps.length,
    step: steps[i],
    next: steps[i + 1] ?? null,
  };
}

/** « Fin de la deuxième reprise » @param {number} n @param {Config} cfg */
const finDe = (n, cfg) => `Fin de la ${repriseName(n, cfg).toLowerCase()}`;
/** Le début de la minute de repos : où en est l'assaut, et les tireurs à leur chaise @param {number} n @param {Config} cfg @returns {Step} */
const debutRepos = (n, cfg) => ({
  when: "Début du repos",
  phrases: [usage(finDe(n, cfg)), usage("Tireurs, dans vos zones")],
  note: "Les tireurs regagnent leur chaise et peuvent parler à leur second. Puis rien à dire avant 30 s.",
});

/** Minute de repos (protocole § 4) : l'étape atteinte d'après le temps restant, et la suivante @param {FormationContext} c */
function rest(c) {
  const officiels = {
    phrases: [usage(repriseName(c.round + 1, c.cfg)), ...OFFICIELS],
  };
  const steps = [
    {
      at: 30,
      phrases: [cahier("Tireurs, équipez-vous")],
    },
    {
      at: 15,
      phrases: [
        cahier("Tireurs au centre"),
        usage(
          "Observations des juges : … (ou « Pas d'observation des juges »)",
        ),
      ],
    },
    { at: 5, ...officiels },
  ];
  const reached = steps.filter((s) => c.remaining <= s.at);
  const cur = reached[reached.length - 1];
  const nxt = steps[reached.length];
  const after = nxt
    ? { when: `À ${nxt.at} s`, phrases: nxt.phrases }
    : {
        when: "Au « Temps » du chrono",
        phrases: EN_GARDE_ALLEZ,
      };
  if (!cur) return single(debutRepos(c.round, c.cfg), after);
  return single({ when: `${cur.at} s`, phrases: cur.phrases }, after);
}

/**
 * L'étape du protocole à montrer, d'après l'état du chrono.
 * @param {FormationContext} c @param {number} [index]  rang dans la séquence en cours (avant l'assaut, résultats)
 * @returns {FormationView}
 */
export function formationView(c, index = 0) {
  const last = c.round >= c.totalRounds;
  const finReprise = cahier(
    last ? "Stop, fin de l'assaut" : "Stop, fin de la reprise",
  );
  // au « Temps » : « Stop, fin de la reprise » termine la reprise ; « Stop » seul ferait un arrêt (« Stop, temps » : #109)
  const stopTemps = [finReprise];
  const stop = {
    when: "Au « Temps » du chronométreur",
    phrases: stopTemps,
  };
  switch (c.phase) {
    case "ready":
      if (!c.started) return inSequence("avant", avant(c.cfg), index);
      return single(
        {
          when: "Arbitre",
          phrases: EN_GARDE_ALLEZ,
          note: "Le chrono attend « allez ».",
        },
        { when: "Pour arrêter", phrases: [cahier("Stop")] },
      );
    case "round":
      if (c.halt) break;
      return single(
        {
          when: "Pour arrêter",
          phrases: [cahier("Stop")],
          note:
            "Seul « stop » arrête l'assaut." +
            (c.cfg.mode === "relais"
              ? " Chaque minute : « Tireurs, changez ou restez » (usage)."
              : ""),
        },
        stop,
      );
    case "overtime":
      if (c.halt)
        return single({
          when: "« Temps » pendant l'arrêt",
          phrases: [...EN_GARDE_ALLEZ, finReprise],
          note: "Finir le traitement de l'arrêt, puis faire repartir avant de terminer.",
        });
      return single(
        {
          when: "Le chronométreur a dit « Temps »",
          phrases: stopTemps,
          note: last
            ? "Le chrono termine l'assaut à ce « stop »."
            : "Le chrono lance la minute de repos à ce « stop ».",
        },
        last ? { when: "Puis", phrases: SALUT } : debutRepos(c.round, c.cfg),
      );
    case "rest":
      if (c.halt)
        return single({
          when: "Repos arrêté",
          phrases: [cahier("Allez")],
          note: "« Allez » relance la minute de repos.",
        });
      return rest(c);
    case "done":
      return inSequence("resultats", RESULTATS, index);
  }
  // arrêt pendant la reprise : le cas se choisit dans la carte, chacun avec son script
  const cases = arret(c.cfg);
  const v = inSequence("arret", cases, index);
  const dq = v.step.when === "Disqualification";
  return {
    ...v,
    next:
      v.index === 0
        ? stop
        : dq
          ? { when: "Puis", phrases: SALUT }
          : { when: "Pour repartir", phrases: EN_GARDE_ALLEZ },
    choices: cases.map((s) => s.when),
  };
}
