// Fenêtre du chronomètre annexe : retard, ou second exclu qui refuse de sortir (#9).
import { $, $dialog } from "./dom.js";
import { fmt } from "../lang.js";
import { annexLimit } from "../annex.js";
import { esc } from "../html.js";
import { dotHtml, paintDots } from "./dots.js";

/** @type {Record<import('../annex.js').AnnexMode, string>} */
const NOTES = {
  retard:
    "Retard d'un tireur ou d'un second à l'appel de l'assaut : 1 pénalité dès le constat, puis 1 par minute de retard ; disqualification à la fin de la 3ème minute.",
  second:
    "Second exclu qui refuse de sortir : carton rouge à son tireur au bout d'une minute.",
};

/** @param {{ annex: ReturnType<typeof import('../annex.js').createAnnex>, getColors: () => string[], onStart: () => void }} deps */
export function createAnnexDialog({ annex, getColors, onStart }) {
  // Second exclu : le tireur dont le second refuse de sortir, pour noter son carton (#9). Un toucher le choisit,
  // un second toucher l'enlève
  const tireurs = $("annexTireurs");
  function renderTireurs() {
    tireurs.hidden = annex.mode !== "second";
    if (tireurs.hidden) return;
    const html = getColors()
      .filter((c) => c)
      .map(
        (c) =>
          `<button data-color="${esc(c)}" aria-pressed="${annex.color === c}">${dotHtml(c)}Tireur ${esc(c)}</button>`,
      )
      .join("");
    if (tireurs.dataset.html !== html) {
      tireurs.innerHTML = html;
      tireurs.dataset.html = html;
      paintDots(tireurs);
    }
  }
  tireurs.onclick = (e) => {
    const c = /** @type {HTMLElement} */ (e.target).closest("button")?.dataset
      .color;
    if (!c) return;
    annex.setColor(annex.color === c ? null : c);
    render();
  };
  function render() {
    renderTireurs();
    const e = annex.elapsed();
    $("annexRetard").setAttribute(
      "aria-pressed",
      String(annex.mode === "retard"),
    );
    $("annexSecond").setAttribute(
      "aria-pressed",
      String(annex.mode === "second"),
    );
    $("annexNote").textContent = NOTES[annex.mode];
    $("annexTime").textContent = fmt(Math.floor(e));
    $("annexTime").classList.toggle("alert", e >= annexLimit(annex.mode));
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
  $("annexRetard").onclick = () => {
    annex.setMode("retard");
    render();
  };
  $("annexSecond").onclick = () => {
    annex.setMode("second");
    render();
  };
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
