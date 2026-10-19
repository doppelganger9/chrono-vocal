#!/usr/bin/env node
// Génère les icônes PNG de l'écran d'accueil à partir de assets/logo.svg (iOS n'accepte pas le SVG) — #6
//   node scripts/icons.js [logo.svg]
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.join(__dirname, "..");
const svg = fs.readFileSync(
  process.argv[2] || path.join(root, "assets/logo.svg"),
  "utf8",
);
(async () => {
  const browser = await chromium.launch();
  for (const size of [180, 192, 512]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
    });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    await page.screenshot({
      path: path.join(root, `assets/icon-${size}.png`),
      omitBackground: true,
    });
    await page.close();
  }
  await browser.close();
  console.log("assets/icon-{180,192,512}.png");
})();
