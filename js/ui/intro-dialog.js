// Fenêtre de l'écran titre (#6). « Commencer » débloque le son et active le micro, en un seul toucher (exigence d'iOS).
// Elle porte aussi les notes de version (#84) : celles des nouvelles versions, ou toutes depuis « À propos ».
import { $, $dialog } from "./dom.js";
import { esc } from "../html.js";
import {
  shouldShowIntro,
  whatsNew,
  readSeen,
  markSeen,
  frenchDate,
} from "../intro.js";
import { NOTES } from "../notes.js";

/** @typedef {import('../types.js').Release} Release */

/** @param {{ storage: Storage | Pick<Storage, 'getItem' | 'setItem'>, onStart: () => void, canLeave: () => boolean }} deps
 * canLeave : rien n'est en cours, la page des mentions légales (#86) peut remplacer le chrono */
export function createIntro({ storage, onStart, canLeave }) {
  /** @param {Release[]} notes @param {string} title */
  function show(notes, title) {
    $("introLegal").hidden = !canLeave();
    $("introNews").hidden = !notes.length;
    $("introNewsTitle").textContent = title;
    $("introNewsList").innerHTML = notes
      .map(
        (r) =>
          `<h4>Version ${esc(r.version)} · ${esc(frenchDate(r.date))}</h4>` +
          r.sections
            .map(
              (s) =>
                (s.title ? `<h5>${esc(s.title)}</h5>` : "") +
                `<ul>${s.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`,
            )
            .join(""),
      )
      .join("");
    if (!$dialog("intro").open) $dialog("intro").showModal();
  }
  const close = () => {
    markSeen(storage);
    $dialog("intro").close();
  };
  $("introStart").onclick = () => {
    close();
    onStart();
  };
  $("introSkip").onclick = close;
  // « À propos » : la présentation, la version et toutes les notes de version
  $("introAgain").onclick = () => {
    $dialog("settings").close();
    show(NOTES, "Notes de version");
  };
  const seen = readSeen(storage);
  if (shouldShowIntro(seen)) show(whatsNew(seen), "Quoi de neuf");
}
