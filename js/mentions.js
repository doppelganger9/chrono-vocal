// Page des mentions légales et de la confidentialité (#86) : le thème choisi dans l'app (jour, nuit, automatique)
import { load } from "./settings.js";
import { applyTheme } from "./ui/theme.js";

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null };
  }
})();
applyTheme(load(storage));
