// Journal vocal (#3) : chaque phrase entendue et ce que l'app en a fait, gardé sur le téléphone et exportable,
// pour nourrir le corpus de tests (tests/corpus, docs/recette.md). Pur, à part le stockage fourni.

export const JOURNAL_KEY = 'chrono-canne-journal';

/**
 * @typedef {{ t: number, alts: string[], final: boolean, phase: string, action: string }} JournalEntry
 * @param {{ storage: Pick<Storage, 'getItem' | 'setItem'>, now?: () => number, max?: number }} deps
 */
export function createJournal({ storage, now = () => Date.now(), max = 500 }) {
  /** @type {JournalEntry[]} */
  let entries = [];
  try { entries = JSON.parse(storage.getItem(JOURNAL_KEY) || '[]') || []; } catch {}
  const save = () => { try { storage.setItem(JOURNAL_KEY, JSON.stringify(entries)); } catch {} };
  return {
    get entries() { return entries; },
    /** @param {Omit<JournalEntry, 't'>} e */
    add(e) { entries.push({ t: now(), ...e }); if (entries.length > max) entries = entries.slice(-max); save(); },
    clear() { entries = []; save(); },
    exportFile: () => ({ name: 'chrono-canne-journal-vocal.json', text: JSON.stringify({ app: 'chrono-canne', journal: entries }, null, 2) }),
  };
}
