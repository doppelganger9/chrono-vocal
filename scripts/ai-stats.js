#!/usr/bin/env node
// Statistiques de développement IA pour les PR (CONTRIBUTING.md § 5), lues dans le journal de session
// de Claude Code (~/.claude/projects/<dossier>/<session>.jsonl, hors du dépôt).
//
//   npm run ai-stats -- --since 2026-10-16T18:54:00Z [--until …] [--journal fichier.jsonl]
//
// Le journal est écrit avec un léger retard : lancer le script une fois le travail terminé.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PAUSE_MIN = 10; // au-delà, un écart entre deux événements n'est pas du temps actif
const TEST_COMMAND =
  /\b(npm (run )?test|npm run test:\w+|playwright test|node --test|npm run (coverage|mutation))\b/;
const RED =
  /\b[1-9]\d* failed\b|ℹ fail [1-9]|✘|✖|Tests? failed|exit code [1-9]/i;

/** @param {any[]} entries lignes du journal déjà décodées */
function computeStats(entries, { since, until } = {}) {
  const inRange = (e) =>
    e.timestamp &&
    (!since || e.timestamp >= since) &&
    (!until || e.timestamp <= until);
  const seenMessages = new Set(),
    seenTools = new Set(),
    testToolIds = new Set();
  const tokens = {
    input: 0,
    cacheWrite: 0,
    cacheRead: 0,
    output: 0,
    thinking: 0,
  };
  const tools = {},
    models = new Set(),
    times = [];
  const results = []; // résultats des lancements de tests, dans l'ordre
  for (const e of entries) {
    if (!inRange(e)) continue;
    times.push(Date.parse(e.timestamp));
    const m = e.message || {};
    const content = Array.isArray(m.content) ? m.content : [];
    if (e.type === "assistant") {
      for (const c of content) {
        if (c.type !== "tool_use" || seenTools.has(c.id)) continue;
        seenTools.add(c.id);
        tools[c.name] = (tools[c.name] || 0) + 1;
        if (c.name === "Bash" && TEST_COMMAND.test(c.input?.command || ""))
          testToolIds.add(c.id);
      }
      // un même message peut être écrit sur plusieurs lignes : ses tokens ne comptent qu'une fois
      if (m.usage && !seenMessages.has(m.id)) {
        seenMessages.add(m.id);
        if (m.model) models.add(m.model);
        const u = m.usage;
        tokens.input += u.input_tokens || 0;
        tokens.cacheWrite += u.cache_creation_input_tokens || 0;
        tokens.cacheRead += u.cache_read_input_tokens || 0;
        tokens.output += u.output_tokens || 0;
        tokens.thinking += u.output_tokens_details?.thinking_tokens || 0;
      }
    } else if (e.type === "user") {
      for (const c of content) {
        if (c.type !== "tool_result" || !testToolIds.has(c.tool_use_id))
          continue;
        const text =
          typeof c.content === "string"
            ? c.content
            : (c.content || []).map((x) => x.text || "").join("\n");
        results.push(RED.test(text) || c.is_error ? "red" : "green");
      }
    }
  }
  times.sort((a, b) => a - b);
  let active = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    if (gap <= PAUSE_MIN * 60_000) active += gap;
  }
  const red = results.filter((r) => r === "red").length;
  const redToGreen = results.filter(
    (r, i) => r === "green" && results[i - 1] === "red",
  ).length;
  return {
    calls: seenMessages.size,
    models: [...models],
    tokens,
    tools,
    toolCalls: Object.values(tools).reduce((a, b) => a + b, 0),
    testRuns: { total: results.length, red, redToGreen },
    elapsedMin: times.length
      ? Math.round((times[times.length - 1] - times[0]) / 60_000)
      : 0,
    activeMin: Math.round(active / 60_000),
  };
}

const plural = (k, word) => `${k} ${word}${k > 1 ? "s" : ""}`;
const n = (x) => x.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");
function formatMarkdown(s) {
  const tools = Object.entries(s.tools)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  const t = s.tokens;
  return [
    "| Mesure | Valeur |",
    "|---|---|",
    `| Durée (écoulée / active) | ${s.elapsedMin} min / ${s.activeMin} min |`,
    `| Appels au modèle | ${s.calls} (${s.models.join(", ") || "—"}) |`,
    `| Tokens (entrée / cache écrit / cache lu / sortie) | ${n(t.input)} / ${n(t.cacheWrite)} / ${n(t.cacheRead)} / ${n(t.output)} (dont ${n(t.thinking)} de réflexion) |`,
    `| Appels d'outils | ${s.toolCalls} (${tools || "—"}) |`,
    `| Cycles de test (lancements / échecs / rouge → vert) | ${plural(s.testRuns.total, "lancement")}, ${s.testRuns.red} en échec, ${plural(s.testRuns.redToGreen, "passage")} rouge → vert |`,
  ].join("\n");
}

/** Journal le plus récent du projet courant (le dossier de Claude Code est le chemin, « / » remplacés par « - ») */
function latestJournal(cwd = process.cwd()) {
  const dir = path.join(
    os.homedir(),
    ".claude",
    "projects",
    cwd.replace(/[/.]/g, "-"),
  );
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => path.join(dir, f));
  return files.sort(
    (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs,
  )[0];
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (k) => {
    const i = args.indexOf("--" + k);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const file = opt("journal") || latestJournal();
  const entries = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  console.log(
    formatMarkdown(
      computeStats(entries, { since: opt("since"), until: opt("until") }),
    ),
  );
}

module.exports = { computeStats, formatMarkdown, latestJournal };
