// Applique le thème (jour / nuit / automatique) et la palette personnalisée à la page. — #5
import { resolveTheme, PALETTE_KEYS, THEMES } from '../colors.js';

const LIGHT = '(prefers-color-scheme: light)';

/** Le téléphone est-il en mode clair ? */
export const prefersLight = () => window.matchMedia?.(LIGHT).matches ?? false;

/** @param {import('../types.js').Config} cfg */
export function applyTheme(cfg) {
  const name = resolveTheme(cfg.theme, prefersLight());
  const root = document.documentElement;
  root.dataset.theme = name;
  for (const k of PALETTE_KEYS) {
    const v = cfg.palette[k];
    if (v) root.style.setProperty('--' + k, v); else root.style.removeProperty('--' + k);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[name].bg);
}

/** Rappelle onChange quand le téléphone passe du mode clair au mode sombre @param {() => void} onChange */
export function watchSystemTheme(onChange) {
  window.matchMedia?.(LIGHT).addEventListener?.('change', onChange);
}
