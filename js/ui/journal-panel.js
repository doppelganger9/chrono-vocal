// Journal vocal dans les réglages (#3) : nombre de phrases notées, export, effacement en deux appuis.
import { $ } from "./dom.js";
import { twoTap } from "./two-tap.js";
import { shareOrDownload } from "./download.js";

/** @param {{ journal: ReturnType<typeof import('../journal.js').createJournal> }} deps */
export function createJournalPanel({ journal }) {
  const show = () => {
    const n = journal.entries.filter((e) => "alts" in e).length; // les phrases ; les événements du micro ne comptent pas
    $("journalCount").textContent = n
      ? `${n} phrase${n > 1 ? "s" : ""} notée${n > 1 ? "s" : ""}`
      : "Aucune phrase notée";
  };
  $("settingsBtn").addEventListener("click", show);
  $("journalExport").onclick = () => {
    const f = journal.exportFile();
    shareOrDownload(f.name, f.text, "Journal vocal Chrono Canne");
  };
  twoTap($("journalClear"), {
    label: "Effacer",
    onConfirm: () => {
      journal.clear();
      show();
    },
  });
}
