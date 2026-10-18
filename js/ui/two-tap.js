// Confirmation en deux appuis (confirm() est bloqué sur beaucoup de navigateurs mobiles) : le premier appui demande
// « Confirmer ? », le second, dans les 3 s, agit. Sert à « Réinitialiser » et à « Effacer » le journal (#59).

/**
 * @param {HTMLElement} button
 * @param {object} opts
 * @param {string} opts.label  texte du bouton au repos
 * @param {() => void} opts.onConfirm
 * @param {() => boolean} [opts.skip]  rien à perdre : agir dès le premier appui
 * @param {string} [opts.armedClass]  classe pendant l'attente de confirmation
 * @param {number} [opts.ms]
 */
export function twoTap(button, { label, onConfirm, skip = () => false, armedClass, ms = 3000 }) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let armed = null;
  const disarm = () => {
    if (armed) clearTimeout(armed);
    armed = null;
    if (armedClass) button.classList.remove(armedClass);
    button.textContent = label;
  };
  button.onclick = () => {
    if (armed || skip()) { disarm(); onConfirm(); return; }
    if (armedClass) button.classList.add(armedClass);
    button.textContent = 'Confirmer ?';
    armed = setTimeout(disarm, ms);
  };
}
