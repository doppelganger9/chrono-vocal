// Fichiers de la captation audio (#136), gardés dans IndexedDB : le stockage du navigateur (localStorage) ne prend
// ni des mégaoctets ni du son. Une base, deux tables : la fiche de chaque fichier, et ses morceaux, dans l'ordre.
// Pas d'effacement automatique : les fichiers restent jusqu'à leur export, puis l'arbitre les efface.

const DB = "chrono-canne-captation";

/** @typedef {import('./capture.js').CaptureMeta} CaptureMeta */

/** @template T @param {IDBRequest<T>} req @returns {Promise<T>} */
const done = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

/** @param {IDBFactory | undefined} [idb]  absent (vieux navigateur, navigation privée) : chaque appel échoue */
export function createCaptureStore(idb = globalThis.indexedDB) {
  /** @type {Promise<IDBDatabase> | null} */
  let db = null;
  const open = () => {
    if (!idb) return Promise.reject(new Error("IndexedDB absent"));
    if (!db) {
      const req = idb.open(DB, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("files", { keyPath: "id" });
        req.result.createObjectStore("chunks");
      };
      db = done(req);
      db.catch(() => (db = null));
    }
    return db;
  };
  /** @param {"files" | "chunks"} name @param {IDBTransactionMode} mode */
  const table = async (name, mode) =>
    (await open()).transaction(name, mode).objectStore(name);
  /** les morceaux d'un fichier : [id, 0], [id, 1]… @param {number} id */
  const range = (id) => IDBKeyRange.bound([id, 0], [id, Infinity]);

  return {
    /** @param {CaptureMeta} m */
    async putMeta(m) {
      await done((await table("files", "readwrite")).put(m));
    },
    /** Gardé en octets, pas en Blob : WebKit refuse les Blob dans IndexedDB en navigation privée (et les rendait
     * vides dans les tests sur WebKit)
     * @param {number} id @param {number} seq @param {Blob} blob */
    async addChunk(id, seq, blob) {
      const bytes = await blob.arrayBuffer();
      await done((await table("chunks", "readwrite")).put(bytes, [id, seq]));
    },
    /** les fichiers, du plus ancien au plus récent @returns {Promise<CaptureMeta[]>} */
    async list() {
      const all = await done((await table("files", "readonly")).getAll());
      return all.sort((a, b) => a.start - b.start);
    },
    /** @param {CaptureMeta} m @returns {Promise<File>} */
    async file(m) {
      const parts = await done(
        (await table("chunks", "readonly")).getAll(range(m.id)),
      );
      return new File(parts, m.name, { type: m.mime.split(";")[0] });
    },
    /** @param {number} id */
    async remove(id) {
      await done((await table("chunks", "readwrite")).delete(range(id)));
      await done((await table("files", "readwrite")).delete(id));
    },
  };
}
