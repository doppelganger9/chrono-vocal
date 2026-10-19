// Pastille de couleur devant le nom d'un tireur. La politique de sécurité du contenu (#37) interdit les styles en ligne :
// la pastille porte sa couleur dans un attribut, et paintDots la lui donne par le DOM, ce que la politique permet.
import { tireurColor } from "../colors.js";
import { esc } from "../html.js";

/** HTML de la pastille, vide pour une couleur inconnue @param {string | null} name */
export const dotHtml = (name) => {
  const c = tireurColor(name);
  return c ? `<span class="tireur-dot" data-dot="${esc(c)}"></span>` : "";
};

/** Colore les pastilles insérées dans root @param {HTMLElement} root */
export function paintDots(root) {
  for (const el of root.querySelectorAll("[data-dot]"))
    /** @type {HTMLElement} */ (el).style.background =
      /** @type {HTMLElement} */ (el).dataset.dot || "";
}
