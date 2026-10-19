// Fenêtre du chronomètre annexe (retards).
import { $, $dialog } from "./dom.js";
import { fmt } from "../lang.js";

/** @param {{ annex: ReturnType<typeof import('../annex.js').createAnnex>, onStart: () => void }} deps */
export function createAnnexDialog({ annex, onStart }) {
  function render() {
    const e = annex.elapsed();
    $("annexTime").textContent = fmt(Math.floor(e));
    $("annexTime").classList.toggle("alert", e >= 180);
    $("annexStart").textContent = annex.running
      ? "Arrêter"
      : e
        ? "Reprendre"
        : "Démarrer";
    $("annexBtn").textContent = e ? "⏱ " + fmt(Math.floor(e)) : "⏱";
  }
  $("annexBtn").onclick = () => {
    render();
    $dialog("annexDlg").showModal();
  };
  $("annexClose").onclick = () => $dialog("annexDlg").close();
  $("annexStart").onclick = () => {
    onStart();
    annex.toggle();
    render();
  };
  $("annexReset").onclick = () => {
    annex.reset();
    render();
  };
  return { render };
}
