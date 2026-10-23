// Fenêtre de la captation audio (#136) : démarrer et arrêter, les fichiers gardés sur le téléphone, leur export et
// leur écoute, leur effacement en deux appuis. Le témoin ● sous le chrono, visible pendant l'enregistrement, ouvre la
// fenêtre.
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
/** micro qui ne répond pas (partagé avec la reconnaissance ?) : le dire plutôt qu'un bouton sans effet */
const START_TIMEOUT_MS = 8000;

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

  // ---------- Écoute d'un fichier ----------
  // Sur iPhone, la lecture n'est permise que pendant le toucher : le fichier lu dans IndexedDB arrive trop tard la
  // première fois. Il reste alors prêt, et le toucher suivant le lit aussitôt
  /** @type {HTMLAudioElement | null} */
  let player = null;
  /** @type {number | null} */
  let playingId = null;
  /** @type {{ id: number, url: string } | null} */
  let ready = null;
  function showPlaying() {
    for (const b of $("captureList").querySelectorAll("[data-play]")) {
      const id = Number(
        /** @type {HTMLElement} */ (b.closest(".capture-row")).dataset.id,
      );
      b.textContent = id === playingId ? "■ Arrêter" : "▶ Écouter";
    }
  }
  function stopPlaying() {
    player?.pause();
    player = null;
    playingId = null;
    showPlaying();
  }
  /** @param {import('../capture.js').CaptureMeta} meta */
  async function play(meta) {
    if (playingId === meta.id) return stopPlaying();
    stopPlaying();
    showError("");
    if (ready?.id !== meta.id) {
      if (ready) URL.revokeObjectURL(ready.url);
      ready = null;
      try {
        ready = {
          id: meta.id,
          url: URL.createObjectURL(await store.file(meta)),
        };
      } catch {
        return showError("Fichier illisible.");
      }
    }
    const audio = new Audio(ready.url);
    player = audio;
    playingId = meta.id;
    audio.onended = () => player === audio && stopPlaying();
    showPlaying();
    try {
      await audio.play();
    } catch (e) {
      if (player !== audio) return;
      stopPlaying();
      // iPhone : le toucher est passé pendant la lecture du fichier ; il est prêt pour le suivant
      if (e instanceof DOMException && e.name === "NotAllowedError")
        showError("Touchez à nouveau « Écouter ».");
      else
        showError(
          "Lecture impossible sur ce navigateur : exportez le fichier pour l'écouter.",
        );
    }
  }

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
        <button class="secondary" type="button" data-play>▶ Écouter</button>
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
      const pl = /** @type {HTMLButtonElement} */ (
        row.querySelector("[data-play]")
      );
      // le fichier en cours d'enregistrement : seulement une fois terminé
      pl.disabled = capture?.current?.id === id;
      pl.onclick = () => play(meta);
      const rm = /** @type {HTMLButtonElement} */ (
        row.querySelector("[data-remove]")
      );
      // le fichier en cours d'enregistrement ne s'efface pas
      rm.disabled = capture?.current?.id === id;
      twoTap(rm, {
        label: "Effacer",
        onConfirm: async () => {
          if (playingId === id) stopPlaying();
          try {
            await store.remove(id);
          } catch {
            showError("Effacement impossible.");
          }
          renderList();
        },
      });
    }
    showPlaying();
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

  /** micro demandé, pas encore ouvert */
  let starting = false;
  function render() {
    const on = !!capture?.recording;
    toggle.textContent = starting
      ? "Ouverture du micro…"
      : on
        ? "Arrêter la captation"
        : "Démarrer la captation";
    toggle.disabled = !capture || starting;
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
      starting = true;
      render();
      /** @type {ReturnType<typeof setTimeout> | undefined} */
      let timer;
      const r = await Promise.race([
        capture.start(),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve("timeout"), START_TIMEOUT_MS);
        }),
      ]);
      clearTimeout(timer);
      starting = false;
      if (r === "timeout")
        showError(
          "Le micro ne répond pas. Coupez le micro de la reconnaissance (bouton « À l'écoute »), puis réessayez.",
        );
      else if (r !== "ok")
        showError(ERRORS[r] ?? `Captation impossible (${r}).`);
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
  dlg.addEventListener("close", stopPlaying);
  $button("captureExportAll").onclick = async () => {
    try {
      await exportFiles(await store.list());
    } catch {
      showError("Export impossible : réessayez fichier par fichier.");
    }
  };

  return {
    /** chaque seconde : l'état seulement. Refaire la liste chaque seconde perdait les touchers sur ses boutons */
    render,
    /** un nouveau fichier a commencé, ou s'est terminé */
    changed() {
      render();
      if (dlg.open) renderList();
    },
  };
}
