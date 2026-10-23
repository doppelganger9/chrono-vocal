// Journal vocal (#3) : chaque phrase entendue et ce que l'app en a fait, gardé sur le téléphone et exportable,
// pour nourrir le corpus de tests (tests/corpus, docs/recette.md). Pur, à part le stockage fourni.
import { VERSION } from "./version.js";

export const JOURNAL_KEY = "chrono-canne-journal";
// Vie privée (#87) : le micro entend aussi les conversations autour de l'aire. Les phrases ne sont notées que si
// l'arbitre l'a demandé (réglage du téléphone, hors des réglages partagés), et sont effacées au bout de 7 jours.
export const JOURNAL_ON_KEY = "chrono-canne-journal-on";
export const JOURNAL_DAYS = 7;
export const EXPORT_WARNING =
  "Le journal peut contenir des conversations entendues autour de l'aire : relisez-le avant de le partager.";

// Événements du micro (#56), notés entre les phrases : start, restart (fin d'écoute relancée par le navigateur),
// relisten (reconnaissance neuve après une annonce), relaunch (relance à la main), error, stop, silence.
// Chaque start note la version de l'app (v, #112) : un journal gardé 7 jours peut couvrir une mise à jour.
/**
 * @typedef {{ t: number, alts: string[], final: boolean, phase: string, action: string }} JournalEntry
 * @typedef {{ t: number, event: string, detail?: string, phase?: string, n?: number, until?: number, v?: string }} JournalEvent
 * @param {{ storage: Pick<Storage, 'getItem' | 'setItem'>, now?: () => number, max?: number, version?: string,
 *   userAgent?: string }} deps
 */
export function createJournal({
  storage,
  now = () => Date.now(),
  max = 500,
  version = VERSION,
  userAgent = "",
}) {
  /** @type {(JournalEntry | JournalEvent)[]} */
  let entries = [];
  let enabled = false;
  try {
    enabled = storage.getItem(JOURNAL_ON_KEY) === "1";
    const saved = JSON.parse(storage.getItem(JOURNAL_KEY) || "[]");
    if (Array.isArray(saved)) entries = saved;
  } catch {}
  const save = () => {
    try {
      storage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    } catch {}
  };
  const oldest = now() - JOURNAL_DAYS * 24 * 3600 * 1000;
  const kept = entries.filter((e) => typeof e?.t === "number" && e.t >= oldest);
  if (kept.length !== entries.length) {
    entries = kept;
    save();
  }
  /** @param {JournalEntry | JournalEvent} e */
  const push = (e) => {
    entries.push(e);
    if (entries.length > max) entries = entries.slice(-max);
    save();
  };
  return {
    get entries() {
      return entries;
    },
    get enabled() {
      return enabled;
    },
    /** @param {boolean} on */
    setEnabled(on) {
      enabled = on;
      try {
        storage.setItem(JOURNAL_ON_KEY, on ? "1" : "0");
      } catch {}
    },
    /** Phrase entendue : notée seulement si le journal est activé
     * @param {Omit<JournalEntry, 't'>} e */
    add(e) {
      if (enabled) push({ t: now(), ...e });
    },
    /** Événement du micro. Les relances ordinaires à la suite tiennent sur une ligne (n, until), pour ne pas noyer les phrases
     * @param {string} event @param {string} [detail] @param {string} [phase] */
    event(event, detail, phase) {
      const last = /** @type {JournalEvent | undefined} */ (
        entries[entries.length - 1]
      );
      if (event === "restart" && last?.event === "restart") {
        last.n = (last.n ?? 1) + 1;
        last.until = now();
        save();
        return;
      }
      push({
        t: now(),
        event,
        ...(detail !== undefined && { detail }),
        ...(phase !== undefined && { phase }),
        ...(event === "start" && { v: version }),
      });
    },
    clear() {
      entries = [];
      save();
    },
    // Version, date de l'export et navigateur (#112) : savoir si un défaut relevé a déjà été corrigé, et sur quel
    // navigateur (Samsung Internet, Chrome Android, Safari). Rien d'autre sur le téléphone.
    exportFile: () => ({
      name: "chrono-canne-journal-vocal.json",
      text: JSON.stringify(
        {
          app: "chrono-canne",
          version,
          exported: new Date(now()).toISOString(),
          userAgent,
          journal: entries,
        },
        null,
        2,
      ),
    }),
  };
}

// Nom court du navigateur d'un journal (#112), pour le corpus du dépôt public : pas l'empreinte complète du téléphone.
// L'ordre compte : Samsung Internet et Edge se disent aussi Chrome, et tous les navigateurs de l'iPhone Safari.
/** @type {[RegExp, string][]} */
const BROWSERS = [
  [/SamsungBrowser\//, "Samsung Internet"],
  [/EdgA?\//, "Edge"],
  [/CriOS\//, "Chrome iPhone"],
  [/FxiOS\//, "Firefox iPhone"],
  [/Android.*Firefox\//, "Firefox Android"],
  [/Firefox\//, "Firefox"],
  [/Android.*Chrome\//, "Chrome Android"],
  [/Chrome\//, "Chrome"],
  [/iPhone.*Safari\//, "Safari iPhone"],
  [/iPad.*Safari\//, "Safari iPad"],
  [/Safari\//, "Safari"],
];
/** @param {unknown} userAgent */
export function browserName(userAgent) {
  if (typeof userAgent !== "string") return "inconnu";
  return BROWSERS.find(([re]) => re.test(userAgent))?.[1] ?? "inconnu";
}
