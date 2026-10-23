// Remettre un fichier à l'utilisateur : feuille de partage du téléphone si possible, sinon téléchargement.

/** @param {unknown} e @returns {boolean} feuille de partage fermée par l'utilisateur */
const cancelled = (e) => e instanceof DOMException && e.name === "AbortError";

/**
 * Partager un texte : feuille de partage du téléphone, sinon presse-papiers (#98). Un échec se dit à l'écran :
 * l'appelant affiche le résultat, jamais un bouton sans effet.
 * @param {string} text @param {string} title
 * @returns {Promise<"partagé" | "copié" | "annulé" | "échec">}
 */
export async function shareOrCopy(text, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "partagé";
    } catch (e) {
      if (cancelled(e)) return "annulé";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copié";
  } catch {
    return "échec";
  }
}

/** @param {string} name @param {string} text @param {string} title */
export async function shareOrDownload(name, text, title) {
  await shareOrDownloadFiles(
    [new File([text], name, { type: "application/json" })],
    title,
  );
}

/**
 * Fichiers (journal, captation audio #136) : feuille de partage, sinon un téléchargement par fichier
 * @param {File[]} files @param {string} title
 */
export async function shareOrDownloadFiles(files, title) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title });
      return;
    } catch (e) {
      // feuille de partage fermée par l'utilisateur : rien de plus. Tout autre échec (Samsung Internet refuse
      // certains fichiers, #94) : le téléchargement prend le relais, sinon le bouton semble sans effet
      if (cancelled(e)) return;
    }
  }
  for (const file of files) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.append(a); // certains navigateurs mobiles ignorent le clic sur un lien hors de la page
    a.click();
    a.remove();
    // le téléchargement d'un vieux téléphone peut démarrer tard : l'adresse du fichier reste valable une minute
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }
}
