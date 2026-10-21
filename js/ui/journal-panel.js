// Journal vocal dans les réglages (#3) : activation (#87), nombre de phrases notées, export, effacement en deux appuis.
import { $, $field } from "./dom.js";
import { twoTap } from "./two-tap.js";
import { shareOrDownload } from "./download.js";
import { EXPORT_WARNING } from "../journal.js";

/** @param {{ journal: ReturnType<typeof import('../journal.js').createJournal> }} deps */
export function createJournalPanel({ journal }) {
  const show = () => {
    const n = journal.entries.filter((e) => "alts" in e).length; // les phrases ; les événements du micro ne comptent pas
    $("journalCount").textContent = n
      ? `${n} phrase${n > 1 ? "s" : ""} notée${n > 1 ? "s" : ""}`
      : "Aucune phrase notée";
    $("journalWarn").textContent = n ? EXPORT_WARNING : ""; // avant de partager des phrases entendues (#87)
    $field("journalOn").value = journal.enabled ? "1" : "0";
  };
  $("settingsBtn").addEventListener("click", show);
  $field("journalOn").onchange = () =>
    journal.setEnabled($field("journalOn").value === "1");
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
