// Remettre un fichier à l'utilisateur : feuille de partage du téléphone si possible, sinon téléchargement.
/** @param {string} name @param {string} text @param {string} title */
export async function shareOrDownload(name, text, title) {
  const file = new File([text], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      // feuille de partage fermée par l'utilisateur : rien de plus. Tout autre échec (Samsung Internet refuse
      // certains fichiers, #94) : le téléchargement prend le relais, sinon le bouton semble sans effet
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.append(a); // certains navigateurs mobiles ignorent le clic sur un lien hors de la page
  a.click();
  a.remove();
  // le téléchargement d'un vieux téléphone peut démarrer tard : l'adresse du fichier reste valable une minute
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}
