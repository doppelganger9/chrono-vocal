// Remettre un fichier à l'utilisateur : feuille de partage du téléphone si possible, sinon téléchargement.
/** @param {string} name @param {string} text @param {string} title */
export async function shareOrDownload(name, text, title) {
  const file = new File([text], name, { type: "application/json" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch {
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
