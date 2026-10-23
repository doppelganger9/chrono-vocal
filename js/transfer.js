// Export / import des réglages, par fichier ou par lien, pour configurer à l'identique les téléphones d'un club. Pur. — #15
import { DEFAULTS, migrate } from "./settings.js";
import { fmt } from "./lang.js";

/** @typedef {import('./types.js').Config} Config */
const APP = "chrono-canne";

/** @param {Config} cfg */
const payload = (cfg) => JSON.stringify({ app: APP, cfg });

/** Réglages → texte sûr pour une adresse (base64url de JSON UTF-8) @param {Config} cfg */
export function encodeSettings(cfg) {
  const bytes = new TextEncoder().encode(payload(cfg));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Fichier à partager @param {Config} cfg */
export const exportFile = (cfg) => ({
  name: "chrono-canne-reglages.json",
  text: JSON.stringify({ app: APP, cfg }, null, 2),
});

/**
 * Texte d'un fichier exporté, ou partie « reglages=… » d'un lien → réglages complets et à jour
 * @param {string} text
 * @returns {{ ok: true, cfg: Config } | { ok: false, error: string }}
 */
export function decodeSettings(text) {
  let obj;
  try {
    const t = text.trim();
    if (t.startsWith("{")) obj = JSON.parse(t);
    else {
      const bin = atob(t.replace(/-/g, "+").replace(/_/g, "/"));
      obj = JSON.parse(
        new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))),
      );
    }
  } catch {
    return { ok: false, error: "Fichier ou lien illisible." };
  }
  if (!obj || obj.app !== APP)
    return { ok: false, error: "Ce ne sont pas des réglages de Chrono Canne." };
  if (!obj.cfg || typeof obj.cfg !== "object" || Array.isArray(obj.cfg))
    return { ok: false, error: "Fichier ou lien illisible." };
  if (typeof obj.cfg.v === "number" && obj.cfg.v > DEFAULTS.v)
    return {
      ok: false,
      error:
        "Ces réglages viennent d'une version plus récente de l'app : mettez-la à jour.",
    };
  return { ok: true, cfg: migrate(obj.cfg) };
}

const yesNo = (/** @type {unknown} */ v) => (v ? "Oui" : "Non");
/** Réglages comparés, dans l'ordre des réglages, avec leur présentation @type {[keyof Config, string, (v: any) => string][]} */
const FIELDS = [
  ["rounds", "Nombre de reprises", String],
  ["roundSec", "Durée d'une reprise", fmt],
  ["restSec", "Durée du repos", fmt],
  ["extraMax", "Reprises supplémentaires", String],
  ["mode", "Forme", (v) => (v === "relais" ? "Relais" : "Assaut")],
  ["relayBase", "Durée de base du relais", fmt],
  ["relayCount", "Équipiers par équipe", String],
  ["countStops", "Arrêts décomptés", yesNo],
  [
    "prolong",
    "Prolongation de 30 s",
    (v) =>
      ({ off: "Non", propose: "Proposée", auto: "Automatique" })[
        /** @type {'off'} */ (v)
      ] ?? String(v),
  ],
  ["requireEnGarde", "« En garde » obligatoire", yesNo],
  ["autoRest", "Fin de reprise automatique", yesNo],
  ["calls", "Annonces pendant le repos", (v) => v.join(", ") + " s"],
  ["colors", "Couleurs des tireurs", (v) => v.join(" / ")],
  ["answerReady", "Répondre « Prêt »", yesNo],
  [
    "theme",
    "Thème",
    (v) =>
      ({ auto: "Automatique", jour: "Jour", nuit: "Nuit" })[
        /** @type {'auto'} */ (v)
      ] ?? String(v),
  ],
  [
    "palette",
    "Couleurs",
    (v) => (Object.keys(v).length ? "personnalisées" : "d'origine"),
  ],
  ["board", "Mode tableau", yesNo],
  ["formation", "Mode formation", yesNo],
  [
    "learned",
    "Variantes apprises",
    (v) => String(Object.values(v).flat().length),
  ],
];

/** Différences entre les réglages actuels et ceux à importer @param {Config} from @param {Config} to */
export function diffSettings(from, to) {
  return FIELDS.filter(
    ([k]) => JSON.stringify(from[k]) !== JSON.stringify(to[k]),
  ).map(([key, label, show]) => ({
    key,
    label,
    from: show(from[key]),
    to: show(to[key]),
  }));
}
