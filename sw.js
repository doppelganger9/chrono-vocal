// Service worker : l'app s'ouvre sans réseau, dans un gymnase (#40).
// À chaque version (#39), ce fichier change (VERSION) : le navigateur installe le nouveau service worker, qui
// télécharge tous les fichiers dans un nouveau cache, en arrière-plan. Il n'est activé qu'au prochain lancement,
// une fois l'app fermée : jamais au milieu d'un assaut (décision de David, 19 octobre 2026). D'où l'absence de
// skipWaiting et de clients.claim (tests/unit/sw.test.js le vérifie).
const VERSION = "1.1.1";
const CACHE = "chrono-canne-" + VERSION;
// tous les fichiers de l'app (tests/unit/sw.test.js vérifie qu'il n'en manque aucun)
const FILES = [
  "./",
  "assets/icon-180.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/logo.svg",
  "css/app.css",
  "css/themes.css",
  "js/annex.js",
  "js/audio.js",
  "js/chrono.js",
  "js/colors.js",
  "js/html.js",
  "js/intro.js",
  "js/journal.js",
  "js/lang.js",
  "js/main.js",
  "js/mic-watch.js",
  "js/settings.js",
  "js/speech.js",
  "js/stats.js",
  "js/transfer.js",
  "js/ui/annex-dialog.js",
  "js/ui/controls.js",
  "js/ui/dom.js",
  "js/ui/dots.js",
  "js/ui/download.js",
  "js/ui/intro-dialog.js",
  "js/ui/journal-panel.js",
  "js/ui/mic-indicator.js",
  "js/ui/render.js",
  "js/ui/settings-dialog.js",
  "js/ui/share-dialog.js",
  "js/ui/stats-dialog.js",
  "js/ui/theme.js",
  "js/ui/two-tap.js",
  "js/version.js",
  "js/voice.js",
  "manifest.webmanifest",
];

// Installation : tous les fichiers, ou rien. « reload » contourne le cache HTTP, qui pourrait mêler deux versions
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))),
      ),
  );
});

// Activation (au lancement qui suit) : les caches des versions précédentes sont effacés
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
});

// Les fichiers de l'app viennent du cache de la version en cours ; le reste (lien de réglages partagés…) du réseau.
// La page elle-même est cherchée sans ses paramètres (?r=…, #…)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches
      .open(CACHE)
      .then((c) =>
        c.match(e.request, { ignoreSearch: e.request.mode === "navigate" }),
      )
      .then((r) => r || fetch(e.request)),
  );
});
