// Texte inséré dans du HTML : toujours échappé, même s'il vient des réglages (un lien partagé peut tout contenir, #55). Pur.

/** @type {Record<string, string>} */
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** @param {unknown} v texte, nombre… ; null et undefined donnent une chaîne vide */
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ENTITIES[c]);
