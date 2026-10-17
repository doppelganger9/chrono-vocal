// Partage des réglages (#15) : lien, fichier, et aperçu des différences avant d'importer.
import { $, $field, $button, $dialog } from './dom.js';
import { encodeSettings, decodeSettings, diffSettings, exportFile } from '../transfer.js';

const HASH = '#reglages=';

/** @param {{ getCfg: () => import('../types.js').Config, onApply: (c: import('../types.js').Config) => void }} deps */
export function createShare({ getCfg, onApply }) {
  /** @type {import('../types.js').Config | null} */
  let pending = null;
  const esc = (/** @type {string} */ t) => t.replace(/[&<>"]/g, c => (/** @type {Record<string, string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }))[c]);

  /** @param {ReturnType<typeof decodeSettings>} r */
  function preview(r) {
    pending = r.ok ? r.cfg : null;
    $('importError').hidden = r.ok;
    $('importError').textContent = r.ok ? '' : r.error;
    $button('importApply').hidden = !r.ok;
    const d = r.ok ? diffSettings(getCfg(), r.cfg) : [];
    $('importDiff').innerHTML = !r.ok ? '' : d.length
      ? `<table><tr><th>Réglage</th><th>Actuel</th><th>Importé</th></tr>${d.map(x => `<tr><td>${esc(x.label)}</td><td>${esc(x.from)}</td><td><b>${esc(x.to)}</b></td></tr>`).join('')}</table>`
      : '<p class="note">Ces réglages sont déjà les vôtres.</p>';
    $dialog('importDlg').showModal();
  }

  $('shareLink').onclick = async () => {
    const url = location.origin + location.pathname + HASH + encodeSettings(getCfg());
    const field = /** @type {HTMLInputElement} */ ($field('shareUrl'));
    field.value = url; field.hidden = false; field.select();
    try { await navigator.clipboard.writeText(url); $('shareLink').textContent = 'Lien copié ✓'; } catch {}
  };
  $('exportFileBtn').onclick = async () => {
    const f = exportFile(getCfg());
    const file = new File([f.text], f.name, { type: 'application/json' });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Réglages Chrono Canne' }); return; } } catch { return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = f.name; a.click(); URL.revokeObjectURL(a.href);
  };
  $field('importFile').addEventListener('change', async e => {
    const input = /** @type {HTMLInputElement} */ (e.target), file = input.files?.[0];
    if (file) preview(decodeSettings(await file.text()));
    input.value = '';
  });
  $('importApply').onclick = () => { if (pending) onApply(pending); $dialog('importDlg').close(); };
  $('importCancel').onclick = () => $dialog('importDlg').close();

  // Lien ouvert sur le téléphone : on propose d'appliquer, une seule fois (l'adresse est nettoyée)
  if (location.hash.startsWith(HASH)) {
    const r = decodeSettings(location.hash.slice(HASH.length));
    history.replaceState(null, '', location.pathname + location.search);
    preview(r);
  }
}
