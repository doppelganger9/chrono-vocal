// Mesures de performance réutilisables (CONTRIBUTING.md § 4) : poids des fichiers servis et temps de chargement.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { chromium } = require('@playwright/test');

/** Fichiers servis par l'app : la page, les scripts et styles qu'elle référence, et les modules qu'ils importent */
function servedFiles(dir) {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const queue = [...html.matchAll(/<(?:script[^>]*src|link[^>]*href)="([^"]+\.(?:js|css))"/g)].map(m => m[1]);
  const seen = new Set();
  while (queue.length) {
    const f = path.normalize(queue.shift());
    if (seen.has(f) || !fs.existsSync(path.join(dir, f))) continue;
    seen.add(f);
    if (f.endsWith('.js')) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of src.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g)) queue.push(path.join(path.dirname(f), m[1]));
    }
  }
  return ['index.html', ...seen];
}

async function measure(dir, url, runs = 5) {
  const files = servedFiles(dir).map(f => {
    const buf = fs.readFileSync(path.join(dir, f));
    return { file: f, bytes: buf.length, gzip: zlib.gzipSync(buf).length };
  });
  const browser = await chromium.launch();
  const loads = [];
  for (let i = 0; i < runs; i++) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
    loads.push(await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n.loadEventEnd - n.startTime; }));
    await page.close();
  }
  await browser.close();
  loads.sort((a, b) => a - b);
  return { files, total: files.reduce((a, f) => a + f.bytes, 0), totalGzip: files.reduce((a, f) => a + f.gzip, 0), loadMs: loads[Math.floor(runs / 2)] };
}

const ko = b => (b / 1024).toFixed(1).replace('.', ',') + ' Ko';
const delta = (a, b, fmt) => `${fmt(a)} → ${fmt(b)} (${b >= a ? '+' : ''}${(((b - a) / a) * 100).toFixed(0)} %)`;
function formatComparison(a, b, ref) {
  return [
    `| Mesure (Chromium, serveur local, médiane de 5 chargements) | ${ref} → branche |`,
    '|---|---|',
    `| Poids servi | ${delta(a.total, b.total, ko)} |`,
    `| Poids servi compressé (gzip) | ${delta(a.totalGzip, b.totalGzip, ko)} |`,
    `| Fichiers servis | ${a.files.length} → ${b.files.length} |`,
    `| Chargement complet | ${delta(a.loadMs, b.loadMs, x => Math.round(x) + ' ms')} |`,
  ].join('\n');
}

module.exports = { measure, formatComparison, servedFiles };
