// Journal vocal (#3) : chaque phrase entendue et ce que l'app en a fait, gardé sur le téléphone et exportable,
// pour nourrir le corpus de tests (tests/corpus, docs/recette.md). Pur, à part le stockage fourni.

export const JOURNAL_KEY = "chrono-canne-journal";
// Vie privée (#87) : le micro entend aussi les conversations autour de l'aire. Les phrases ne sont notées que si
// l'arbitre l'a demandé (réglage du téléphone, hors des réglages partagés), et sont effacées au bout de 7 jours.
export const JOURNAL_ON_KEY = "chrono-canne-journal-on";
export const JOURNAL_DAYS = 7;
export const EXPORT_WARNING =
  "Le journal peut contenir des conversations entendues autour de l'aire : relisez-le avant de le partager.";

// Événements du micro (#56), notés entre les phrases : start, restart (fin d'écoute relancée par le navigateur),
// relisten (reconnaissance neuve après une annonce), relaunch (relance à la main), error, stop, silence.
/**
 * @typedef {{ t: number, alts: string[], final: boolean, phase: string, action: string }} JournalEntry
 * @typedef {{ t: number, event: string, detail?: string, phase?: string, n?: number, until?: number }} JournalEvent
 * @param {{ storage: Pick<Storage, 'getItem' | 'setItem'>, now?: () => number, max?: number }} deps
 */
export function createJournal({ storage, now = () => Date.now(), max = 500 }) {
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
      });
    },
    clear() {
      entries = [];
      save();
    },
    exportFile: () => ({
      name: "chrono-canne-journal-vocal.json",
      text: JSON.stringify({ app: "chrono-canne", journal: entries }, null, 2),
    }),
  };
}
