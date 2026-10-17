// Écran titre (#6) : présenté au premier lancement, puis une fois à chaque nouveauté importante (« Quoi de neuf »). Pur.

export const INTRO_KEY = 'chrono-canne-intro';

/** Nouveautés importantes : chacune fait réapparaître l'écran titre une fois @type {{ version: number, items: string[] }[]} */
export const NEWS = [
  { version: 2, items: [
    'Thème jour / nuit automatique, et couleurs personnalisables',
    'En paysage, des chiffres plus grands ; et un mode tableau pour poser le téléphone face à l\'aire',
    'L\'arbitre décide : après « temps », la reprise continue jusqu\'à « Stop, fin de la reprise »',
  ] },
];
/** Version de la présentation : celle de la dernière nouveauté importante */
export const INTRO_VERSION = NEWS.at(-1)?.version ?? 1;

/** @param {number} seen version déjà vue (0 : jamais) */
export const shouldShowIntro = seen => seen < INTRO_VERSION;

/** Nouveautés depuis la dernière présentation vue ; rien au premier lancement (c'est la présentation complète) @param {number} seen */
export const whatsNew = seen => (seen === 0 ? [] : NEWS.filter(n => n.version > seen));

/** @param {Pick<Storage, 'getItem'>} storage @returns {number} */
export function readSeen(storage) {
  try { return Number.parseInt(storage.getItem(INTRO_KEY) || '0', 10) || 0; } catch { return 0; }
}
/** @param {Pick<Storage, 'setItem'>} storage */
export function markSeen(storage) {
  try { storage.setItem(INTRO_KEY, String(INTRO_VERSION)); } catch {}
}
