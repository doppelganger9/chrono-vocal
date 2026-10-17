// Thèmes jour / nuit, palette personnalisable et contraste (WCAG). Pur. — #5
// Les couleurs des thèmes sont aussi dans css/themes.css : un test vérifie qu'elles concordent.

/** @typedef {'jour' | 'nuit'} ThemeName @typedef {'round' | 'rest' | 'stop' | 'over'} PaletteKey */

/** Couleurs personnalisables, avec leur nom dans les réglages @type {PaletteKey[]} */
export const PALETTE_KEYS = ['round', 'rest', 'stop', 'over'];
/** @type {Record<PaletteKey, string>} */
export const PALETTE_LABELS = { round: 'Reprise', rest: 'Repos', stop: 'Arrêt', over: 'Temps dépassé' };

/** Contraste minimal entre une couleur de la palette et le fond : WCAG AA pour les grands caractères */
export const MIN_CONTRAST = 3;

/** @type {Record<ThemeName, Record<string, string>>} */
export const THEMES = {
  nuit: { bg: '#0d0f12', panel: '#171a1f', line: '#2a2f37', text: '#f2f4f7', muted: '#8a93a0',
    round: '#ffb020', rest: '#33c38a', stop: '#ff4d4f', over: '#c084fc', accent: '#4da3ff', 'on-color': '#111111' },
  // Jour : fort contraste, pour un gymnase éclairé ou le plein air
  jour: { bg: '#ffffff', panel: '#f2f4f7', line: '#d0d5dd', text: '#0b0d10', muted: '#475467',
    round: '#b54708', rest: '#067647', stop: '#d92d20', over: '#6941c6', accent: '#175cd3', 'on-color': '#ffffff' },
};

/** @param {string} hex « #rgb » ou « #rrggbb » @returns {[number, number, number]} */
function rgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  return /** @type {[number, number, number]} */ ([0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
}
/** Luminance relative (WCAG 2) @param {string} hex */
function luminance(hex) {
  const [r, g, b] = rgb(hex).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Rapport de contraste WCAG, de 1 à 21, arrondi au centième @param {string} a @param {string} b */
export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}

/** @param {'auto' | ThemeName} theme @param {boolean} prefersLight le téléphone est en mode clair @returns {ThemeName} */
export function resolveTheme(theme, prefersLight) {
  return theme === 'auto' ? (prefersLight ? 'jour' : 'nuit') : theme;
}

/** Couleurs du thème, remplacées par les couleurs personnalisées @param {ThemeName} theme @param {Partial<Record<PaletteKey, string>>} palette */
export function effectivePalette(theme, palette) {
  return /** @type {Record<PaletteKey, string>} */ (Object.fromEntries(PALETTE_KEYS.map(k => [k, palette[k] || THEMES[theme][k]])));
}

/** Couleurs personnalisées peu lisibles sur le fond du thème @param {ThemeName} theme @param {Partial<Record<PaletteKey, string>>} palette */
export function contrastWarnings(theme, palette) {
  const p = effectivePalette(theme, palette);
  return PALETTE_KEYS.map(key => ({ key, ratio: contrastRatio(p[key], THEMES[theme].bg) })).filter(w => w.ratio < MIN_CONTRAST);
}

/** @type {Record<string, string>} */
const TIREURS = { rouge: '#e5484d', bleu: '#3b82f6', jaune: '#eab308', vert: '#22c55e', blanc: '#e5e7eb', noir: '#111827', orange: '#f97316' };
/** Pastille de couleur d'un tireur d'après son nom (« rouge », « bleu »…) @param {string | null | undefined} name */
export function tireurColor(name) {
  return (name && TIREURS[name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')]) || null;
}
