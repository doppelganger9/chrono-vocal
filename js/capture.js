// Captation audio de terrain (#136) : le son de l'aire, enregistré à côté de la reconnaissance pour constituer une
// banque sonore (améliorer la reconnaissance). Rien ne quitte le téléphone sans un export de l'arbitre. Chaque morceau
// de quelques secondes est gardé aussitôt (une page rechargée ne perd que le dernier), et un fichier ne dépasse pas
// une demi-heure (un export plus léger, et un fichier abîmé ne perd pas toute la journée). Pur : le micro,
// l'enregistreur, le stockage et l'horloge sont fournis.

export const CAPTURE_SEGMENT_MS = 30 * 60_000;
export const CAPTURE_SLICE_MS = 5000;
/** assez pour la parole, et une journée tient sur le téléphone (environ 21 Mo par heure) */
export const CAPTURE_BITRATE = 48_000;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];

/** Premier format que le navigateur sait enregistrer ; "" : le sien par défaut
 * @param {(mime: string) => boolean} isSupported */
export function pickMimeType(isSupported) {
  try {
    return MIME_TYPES.find((m) => isSupported(m)) ?? "";
  } catch {
    return "";
  }
}

/** @param {string} mime */
export function extensionFor(mime) {
  const m = mime.match(/^audio\/(mp4|ogg|aac)/);
  if (!m) return "webm";
  return m[1] === "mp4" ? "m4a" : m[1];
}

const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");
/** Nom du fichier : l'heure de début (heure du téléphone), à la seconde, comme les heures du journal vocal
 * @param {number} start  ms @param {string} mime */
export function captureName(start, mime) {
  const d = new Date(start);
  return (
    `chrono-canne-captation-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-` +
    `${pad(d.getHours())}h${pad(d.getMinutes())}m${pad(d.getSeconds())}.${extensionFor(mime)}`
  );
}

/** @param {number} bytes */
export function formatSize(bytes) {
  const ko = bytes / 1024;
  if (ko < 1024) return `${Math.ceil(ko)} Ko`;
  return `${(ko / 1024).toFixed(1).replace(".", ",")} Mo`;
}

/** @param {number} ms */
export function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const rest = `${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  return h ? `${h}:${rest}` : rest.replace(/^0/, "");
}

/**
 * @typedef {{ id: number, name: string, mime: string, start: number, end: number, size: number }} CaptureMeta
 * @typedef {{ putMeta: (m: CaptureMeta) => Promise<void>, addChunk: (id: number, seq: number, blob: Blob) => Promise<void> }} CaptureStore
 * @typedef {{ size: number }} Chunk
 * @typedef {{ mimeType: string, state: string, start: (sliceMs: number) => void, stop: () => void,
 *   ondataavailable: ((e: { data: Chunk }) => void) | null, onstop: (() => void) | null }} RecorderLike
 * @typedef {{ getTracks: () => { stop: () => void }[], getAudioTracks: () => { onended: ((ev: Event) => unknown) | null }[] }} StreamLike
 */

/**
 * @param {object} deps
 * @param {() => Promise<StreamLike>} deps.getStream  le micro (getUserMedia)
 * @param {new (stream: any, opts: { mimeType?: string, audioBitsPerSecond: number }) => RecorderLike} deps.Recorder
 * @param {string} deps.mimeType  "" : celui du navigateur
 * @param {CaptureStore} deps.store
 * @param {() => number} deps.now  ms, heure du téléphone
 * @param {(event: string, detail: string) => void} deps.onEvent  pour le journal vocal
 * @param {number} [deps.segmentMs]
 * @param {number} [deps.sliceMs]
 */
export function createCapture({
  getStream,
  Recorder,
  mimeType,
  store,
  now,
  onEvent,
  segmentMs = CAPTURE_SEGMENT_MS,
  sliceMs = CAPTURE_SLICE_MS,
}) {
  /** @type {StreamLike | null} */
  let stream = null;
  /** @type {RecorderLike | null} */
  let rec = null;
  /** @type {CaptureMeta | null} */
  let meta = null;
  /** @type {Promise<string> | null} */
  let starting = null;
  /** le stockage du téléphone a refusé un morceau (plein, navigation privée) : le son est perdu, il faut le dire */
  let storageFailed = false;
  const lost = () => {
    if (!storageFailed) onEvent("capture-error", "StorageError");
    storageFailed = true;
  };

  const releaseMic = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  /** Un fichier sur le micro ouvert ; à la fin de la tranche, le suivant prend le relais */
  function beginSegment() {
    if (!stream) return;
    const r = new Recorder(stream, {
      ...(mimeType && { mimeType }),
      audioBitsPerSecond: CAPTURE_BITRATE,
    });
    const start = now();
    const mime = r.mimeType || mimeType;
    /** @type {CaptureMeta} */
    const m = {
      id: start,
      name: captureName(start, mime),
      mime,
      start,
      end: start,
      size: 0,
    };
    let seq = 0,
      rotating = false;
    r.ondataavailable = (e) => {
      if (!e.data.size) return;
      store.addChunk(m.id, seq++, /** @type {Blob} */ (e.data)).catch(lost);
      m.size += e.data.size;
      m.end = now();
      store.putMeta({ ...m }).catch(lost);
      if (!rotating && stream && m.end - m.start >= segmentMs) {
        rotating = true;
        r.stop();
      }
    };
    r.onstop = () => {
      onEvent("capture-stop", m.name);
      if (rotating) beginSegment();
    };
    r.start(sliceMs);
    rec = r;
    meta = m;
    store.putMeta({ ...m }).catch(lost);
    onEvent("capture-start", m.name);
  }

  /** @returns {Promise<string>} "ok", ou le nom de l'erreur (NotAllowedError : micro refusé…) */
  async function open() {
    try {
      stream = await getStream();
      const track = stream.getAudioTracks()[0];
      if (track) track.onended = stop; // micro coupé par le téléphone (écran verrouillé, appel)
      beginSegment();
      return "ok";
    } catch (e) {
      releaseMic();
      rec = meta = null;
      const name = e instanceof Error ? e.name : "Error";
      onEvent("capture-error", name);
      return name;
    }
  }
  function start() {
    if (rec) return Promise.resolve("ok");
    storageFailed = false;
    starting ??= open().finally(() => (starting = null));
    return starting;
  }
  function stop() {
    const r = rec;
    if (!r) return;
    releaseMic(); // avant l'arrêt de l'enregistreur : pas de nouvelle tranche
    rec = meta = null;
    r.stop();
  }

  return {
    start,
    stop,
    get recording() {
      return !!rec;
    },
    /** le fichier en cours */
    get current() {
      return meta;
    },
    get storageFailed() {
      return storageFailed;
    },
    /** durée du fichier en cours, en ms */
    elapsedMs: () => (meta ? now() - meta.start : 0),
  };
}
