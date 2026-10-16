// Accès typé aux éléments de index.html. La structure de la page est fixe : un élément absent est une erreur de code.

/** @param {string} id */
function get(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} absent de index.html`);
  return el;
}
/** @param {string} id @returns {HTMLElement} */
export const $ = id => get(id);
/** Champ de réglage (saisie ou liste) @param {string} id @returns {HTMLInputElement | HTMLSelectElement} */
export const $field = id => /** @type {HTMLInputElement | HTMLSelectElement} */ (get(id));
/** @param {string} id @returns {HTMLButtonElement} */
export const $button = id => /** @type {HTMLButtonElement} */ (get(id));
/** @param {string} id @returns {HTMLDialogElement} */
export const $dialog = id => /** @type {HTMLDialogElement} */ (get(id));
