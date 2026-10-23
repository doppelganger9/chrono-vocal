// Sessions de Claude Code dans le cloud (rétro du 23 octobre 2026, A2) : Playwright y prend le Chromium préinstallé,
// et WebKit, absent du conteneur, est sauté en le disant. Ailleurs (le Mac, la CI), rien ne change. Pur.

/** Chromium installé dans le conteneur : celui de Playwright n'y est pas téléchargé */
const CHROMIUM_CLOUD = "/opt/pw-browsers/chromium";
const NOTE_WEBKIT =
  "WebKit (iphone-safari) non lancé dans le cloud : la CI le vérifie";

/** @typedef {{ name: string, use?: Record<string, any> }} Projet */

/** Session de Claude Code dans le cloud @param {Record<string, string | undefined>} env */
const estCloud = (env) => env.CLAUDE_CODE_REMOTE === "true";

/** Le projet, lancé avec le Chromium du conteneur @param {Projet} p @param {Record<string, any>} [use] */
const avecChromium = (p, use = {}) => ({
  ...p,
  use: {
    ...p.use,
    ...use,
    launchOptions: {
      ...p.use?.launchOptions,
      executablePath: CHROMIUM_CLOUD,
    },
  },
});

/**
 * Tests de bout en bout : dans le cloud, les projets WebKit sont sautés et les autres prennent le Chromium préinstallé
 * @template {Projet} P @param {P[]} projets @param {Record<string, string | undefined>} env @returns {P[]}
 */
function sansWebkit(projets, env) {
  if (!estCloud(env)) return projets;
  return /** @type {P[]} */ (
    projets
      .filter((p) => p.use?.defaultBrowserType !== "webkit")
      .map((p) => avecChromium(p))
  );
}

/**
 * Captures : dans le cloud, tous les formats sont gardés, rendus par le Chromium préinstallé (l'iPhone aussi)
 * @template {Projet} P @param {P[]} projets @param {Record<string, string | undefined>} env @returns {P[]}
 */
function toutEnChromium(projets, env) {
  if (!estCloud(env)) return projets;
  return /** @type {P[]} */ (
    projets.map((p) => avecChromium(p, { defaultBrowserType: "chromium" }))
  );
}

module.exports = {
  CHROMIUM_CLOUD,
  NOTE_WEBKIT,
  estCloud,
  sansWebkit,
  toutEnChromium,
};
