// Fenêtre de la captation audio (#136) : démarrer et arrêter, les fichiers gardés sur le téléphone, leur export et
// leur effacement en deux appuis. Le témoin ● de l'en-tête, visible pendant l'enregistrement, ouvre la fenêtre.
import { $, $button, $dialog } from "./dom.js";
import { twoTap } from "./two-tap.js";
import { shareOrDownloadFiles } from "./download.js";
import { esc } from "../html.js";
import { formatDuration, formatSize } from "../capture.js";

/** Motif d'un échec du micro, en clair */
const ERRORS = /** @type {Record<string, string>} */ ({
  NotAllowedError:
    "Accès au micro refusé : autorisez-le dans les réglages du navigateur.",
  NotFoundError: "Aucun micro trouvé sur ce téléphone.",
  NotReadableError: "Le micro est occupé par une autre application.",
});
const TITLE = "Captation audio Chrono Canne";

/**
 * @param {object} deps
 * @param {ReturnType<typeof import('../capture.js').createCapture> | null} deps.capture  null : navigateur incapable
 * @param {ReturnType<typeof import('../capture-store.js').createCaptureStore>} deps.store
 * @param {() => void} deps.onStart  depuis le toucher : son, voix, écran allumé, journal
 */
export function createCaptureDialog({ capture, store, onStart }) {
  const dlg = $dialog("captureDlg");
  const toggle = $button("captureToggle");
  const error = $("captureError");
  /** @param {string} text */
  const showError = (text) => {
    error.hidden = !text;
    error.textContent = text;
  };

  /** Fichiers gardés : nom, durée, taille, export, effacement */
  async function renderList() {
    let files = /** @type {import('../capture.js').CaptureMeta[]} */ ([]);
    try {
      files = await store.list();
    } catch {
      showError("Fichiers illisibles : stockage du navigateur indisponible.");
    }
    const list = $("captureList");
    list.innerHTML = files.length
      ? files
          .map(
            (f) => `<div class="capture-row" data-id="${f.id}">
        <span>${esc(f.name)}<small>${formatDuration(f.end - f.start)} · ${formatSize(f.size)}</small></span>
        <button class="secondary" type="button" data-export>Exporter</button>
        <button class="secondary" type="button" data-remove>Effacer</button></div>`,
          )
          .join("")
      : "<p>Aucun fichier.</p>";
    $button("captureExportAll").disabled = !files.length;
    for (const row of list.querySelectorAll(".capture-row")) {
      const id = Number(/** @type {HTMLElement} */ (row).dataset.id);
      const meta = files.find((f) => f.id === id);
      if (!meta) continue;
      const exp = /** @type {HTMLButtonElement} */ (
        row.querySelector("[data-export]")
      );
      exp.onclick = () => exportFiles([meta]);
      const rm = /** @type {HTMLButtonElement} */ (
        row.querySelector("[data-remove]")
      );
      // le fichier en cours d'enregistrement ne s'efface pas
      rm.disabled = capture?.current?.id === id;
      twoTap(rm, {
        label: "Effacer",
        onConfirm: async () => {
          try {
            await store.remove(id);
          } catch {
            showError("Effacement impossible.");
          }
          renderList();
        },
      });
    }
  }

  /** @param {import('../capture.js').CaptureMeta[]} metas */
  async function exportFiles(metas) {
    showError("");
    try {
      const files = await Promise.all(metas.map((m) => store.file(m)));
      await shareOrDownloadFiles(files, TITLE);
    } catch {
      showError("Export impossible : réessayez fichier par fichier.");
    }
  }

  function render() {
    const on = !!capture?.recording;
    toggle.textContent = on ? "Arrêter la captation" : "Démarrer la captation";
    toggle.disabled = !capture;
    $("captureStatus").textContent = !capture
      ? "La captation audio n'est pas possible sur ce navigateur."
      : on
        ? `● Enregistrement en cours · ${formatDuration(capture.elapsedMs())}` +
          (capture.storageFailed
            ? " · ⚠ stockage du téléphone plein : le son n'est plus gardé"
            : "")
        : "Captation arrêtée";
    $("captureStatus").classList.toggle("on", on);
    $button("captureBtn").hidden = !on;
    $("captureTime").textContent = formatDuration(capture?.elapsedMs() ?? 0);
  }

  toggle.onclick = async () => {
    if (!capture) return;
    showError("");
    if (capture.recording) {
      capture.stop();
    } else {
      onStart();
      const r = await capture.start();
      if (r !== "ok") showError(ERRORS[r] ?? `Captation impossible (${r}).`);
    }
    render();
    renderList();
  };
  const open = () => {
    render();
    renderList();
    dlg.showModal();
  };
  // depuis les réglages : leur fenêtre se ferme, sans enregistrer, comme « Annuler »
  $button("captureOpen").onclick = () => {
    $dialog("settings").close();
    open();
  };
  $button("captureBtn").onclick = open;
  $button("captureClose").onclick = () => dlg.close();
  $button("captureExportAll").onclick = async () => {
    try {
      await exportFiles(await store.list());
    } catch {
      showError("Export impossible : réessayez fichier par fichier.");
    }
  };

  return {
    /** chaque seconde, et à chaque début ou fin de fichier */
    render() {
      render();
      if (dlg.open && !capture?.recording) renderList();
    },
    /** un nouveau fichier a commencé, ou s'est terminé */
    changed() {
      render();
      if (dlg.open) renderList();
    },
  };
}
