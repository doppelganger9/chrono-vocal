// Témoin « micro silencieux » (#56). Sur iPhone, la reconnaissance peut se figer sans prévenir (#30, #45) : le voyant
// reste allumé, mais plus rien n'arrive. Un micro qui marche transmet souvent quelque chose (paroles, bruit, fin
// d'écoute relancée) ; rien depuis longtemps est le signe d'un blocage. Pur : l'horloge est fournie.

/**
 * @param {object} deps
 * @param {() => number} deps.now  ms
 * @param {number} [deps.thresholdMs]  silence au-delà duquel le témoin s'affiche ; Infinity le désactive
 */
export function createMicWatch({ now, thresholdMs = 30_000 }) {
  let last = now();
  return {
    /** la reconnaissance a donné signe de vie : résultat, démarrage, fin, erreur */
    activity() {
      last = now();
    },
    /** temps écoulé depuis le dernier signe de vie, en ms */
    silentMs: () => now() - last,
    /** @param {boolean} listening le micro est censé écouter */
    isSilent: (listening) => listening && now() - last >= thresholdMs,
  };
}
