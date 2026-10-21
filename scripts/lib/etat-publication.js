// Vérification quotidienne de la publication (#118) : chaque version du CHANGELOG a son étiquette et sa release,
// aucune PR « Version » n'attend « Approve and run » depuis trop longtemps, la dernière exécution de « Version » a
// réussi. La rétrospective le vérifiait à la main (CONTRIBUTING § 1) ; la v1.4.0 est restée sans étiquette. Pur.

/** Une PR « Version » ouverte depuis plus longtemps attend sans doute le clic de David */
const ATTENTE_H = 12;
const ECHECS = ["failure", "timed_out", "cancelled", "startup_failure"];

/** @typedef {{ title: string, url: string, createdAt: string }} Pr */
/** @typedef {{ conclusion: string | null, url: string }} Run */

/** Versions du CHANGELOG, de la plus récente à la plus ancienne @param {string} changelog @returns {string[]} */
function versions(changelog) {
  return [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]);
}

/**
 * Les points à régler, un par ligne ; vide si tout est en ordre.
 * @param {{ changelog: string, version: string, tags: string[], releases: string[], prs: Pr[],
 *   lastRun: Run | null, now: number }} etat
 * @returns {string[]}
 */
function bilan({ changelog, version, tags, releases, prs, lastRun, now }) {
  const out = [];
  const vs = versions(changelog);
  for (const v of vs) {
    if (!tags.includes("v" + v))
      out.push(`Étiquette v${v} manquante (version ${v} du CHANGELOG)`);
    if (!releases.includes("v" + v))
      out.push(`Release v${v} manquante (version ${v} du CHANGELOG)`);
  }
  if (vs.length && vs[0] !== version)
    out.push(`package.json est en ${version}, le CHANGELOG en ${vs[0]}`);
  for (const pr of prs) {
    const h = Math.floor((now - Date.parse(pr.createdAt)) / 3600_000);
    if (/^Version \d/.test(pr.title) && h >= ATTENTE_H)
      out.push(
        `PR « ${pr.title} » ouverte depuis ${h} h : cliquer « Approve and run » (${pr.url})`,
      );
  }
  if (lastRun?.conclusion && ECHECS.includes(lastRun.conclusion))
    out.push(
      `Dernière exécution de « Version » : ${lastRun.conclusion} (${lastRun.url})`,
    );
  return out;
}

/** @param {string[]} points @returns {string} */
function rapport(points) {
  if (!points.length) return "Publication : tout est en ordre.";
  const n = points.length;
  return (
    `Publication : ${n} point${n > 1 ? "s" : ""} à régler.\n\n` +
    points.map((p) => "- " + p).join("\n")
  );
}

module.exports = { versions, bilan, rapport };
