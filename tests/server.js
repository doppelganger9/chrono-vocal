// Petit serveur statique pour les tests de bout en bout (comme GitHub Pages, en HTTP local)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.env.ROOT || path.join(__dirname, "..")); // ROOT : servir une autre version (avant/après)
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const file = path.join(root, url === "/" ? "index.html" : url);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res
        .writeHead(200, {
          "Content-Type":
            types[path.extname(file)] || "application/octet-stream",
        })
        .end(data);
    });
  })
  .listen(port, () => console.log(`http://localhost:${port}`));
