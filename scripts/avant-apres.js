#!/usr/bin/env node
// Captures et mesures avant / après pour une PR (CONTRIBUTING.md § 4).
//   npm run avant-apres -- main     → screenshots/{avant,apres}/*.png, screenshots/perf.md
// « avant » est la version <ref> extraite dans un dossier temporaire (git worktree), « après » la copie de travail.
const { execSync, execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { measure, formatComparison } = require("./perf.js");

const root = path.join(__dirname, "..");
const ref = process.argv[2] || "main";
const out = path.join(root, "screenshots");
fs.rmSync(out, { recursive: true, force: true });

const sh = (cmd, env = {}) => {
  try {
    execSync(cmd, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
  } catch {
    /* une capture absente de l'ancienne version n'empêche pas les autres */
  }
};
const serve = (dir, port) =>
  spawn(process.execPath, [path.join(root, "tests/server.js")], {
    env: { ...process.env, ROOT: dir, PORT: String(port) },
    stdio: "ignore",
  });

(async () => {
  const before = fs.mkdtempSync(path.join(os.tmpdir(), "chrono-avant-"));
  // sans shell : le chemin et la référence restent de simples arguments (alerte CodeQL)
  execFileSync("git", ["worktree", "add", "--detach", before, ref], {
    cwd: root,
    stdio: "ignore",
  });
  const servers = [serve(before, 4174), serve(root, 4175)];
  try {
    await new Promise((r) => setTimeout(r, 500));
    sh("npx playwright test -c playwright.screenshots.config.js", {
      SHOT_PORT: "4174",
      SHOT_DIR: path.join(out, "avant"),
    });
    sh("npx playwright test -c playwright.screenshots.config.js", {
      SHOT_PORT: "4175",
      SHOT_DIR: path.join(out, "apres"),
    });
    const perf = formatComparison(
      await measure(before, "http://localhost:4174/"),
      await measure(root, "http://localhost:4175/"),
      ref,
    );
    fs.writeFileSync(path.join(out, "perf.md"), perf + "\n");
    console.log("\n" + perf);
  } finally {
    servers.forEach((s) => s.kill());
    execFileSync("git", ["worktree", "remove", "--force", before], {
      cwd: root,
      stdio: "ignore",
    });
  }
  const count = (d) => (fs.existsSync(d) ? fs.readdirSync(d).length : 0);
  console.log(
    `\nCaptures : ${count(path.join(out, "avant"))} avant, ${count(path.join(out, "apres"))} après, dans screenshots/`,
  );
})();
