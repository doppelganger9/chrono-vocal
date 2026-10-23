// Carte du mode formation (#106) : l'étape du protocole à dire, d'après l'état du chrono (js/formation.js).
// Avant l'assaut et pour les résultats, le chrono ne bouge pas : ‹ et › parcourent les étapes, d'un toucher.
// Pendant un arrêt, une liste propose les cas (observation, demande d'avertissement…), chacun avec son script.
import { $, $button } from "./dom.js";
import { esc } from "../html.js";
import { formationView } from "../formation.js";

/** @typedef {import('../formation.js').Step} Step @typedef {import('../formation.js').FormationContext} FormationContext */

/** Espaces insécables du français : « ? » ne passe pas seul à la ligne @param {string} t */
const nbsp = (t) =>
  t.replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");

/** Phrases d'une étape : entre guillemets, celles d'usage marquées @param {Step} step */
const phrasesHtml = (step) =>
  step.phrases
    .map(
      (p) =>
        (p.or ? `<span class="f-or">ou</span> ` : "") +
        `<span class="f-phrase">${esc(nbsp(`« ${p.text} »`))}</span>` +
        (p.usage ? ` <small class="f-usage">usage</small>` : ""),
    )
    .join(" ");

/** @param {object} deps @param {() => void} deps.onChange  à rappeler quand l'étape change d'un toucher */
export function createFormationCard({ onChange }) {
  /** @type {string | null} */
  let sequence = null;
  let index = 0;
  let count = 1;
  /** @param {number} d */
  const move = (d) => {
    index = Math.min(Math.max(0, index + d), count - 1);
    onChange();
  };
  $button("formationPrev").onclick = () => move(-1);
  $button("formationNext").onclick = () => move(1);
  const choice = /** @type {HTMLSelectElement} */ ($("formationCase"));
  choice.onchange = () => {
    index = choice.selectedIndex;
    onChange();
  };

  /** @param {boolean} enabled @param {FormationContext} ctx */
  function render(enabled, ctx) {
    const card = $("formation");
    card.hidden = !enabled;
    if (!enabled) return;
    let view = formationView(ctx, index);
    // nouvelle séquence (assaut réinitialisé, fin de l'assaut) : elle commence au début
    if (view.sequence !== sequence) {
      sequence = view.sequence;
      view = formationView(ctx, (index = 0));
    }
    count = view.count;
    const cases = view.choices ?? null;
    const inSeq = view.sequence !== null && !cases;
    $button("formationPrev").hidden = !inSeq;
    $button("formationNext").hidden = !inSeq;
    choice.hidden = !cases;
    if (cases && choice.options.length !== cases.length)
      choice.innerHTML = cases
        .map((c) => `<option>${esc(c)}</option>`)
        .join("");
    if (cases) choice.selectedIndex = view.index;
    $button("formationPrev").disabled = view.index === 0;
    $button("formationNext").disabled = view.next === null;
    const when = cases
      ? "Arrêt"
      : inSeq
        ? `${view.step.when} · ${view.index + 1}/${view.count}`
        : view.step.when;
    const say = phrasesHtml(view.step);
    const then = view.next
      ? `Ensuite (${view.next.when[0].toLowerCase() + view.next.when.slice(1)}) : ${view.next.phrases.map((p) => (p.or ? "ou " : "") + "« " + p.text + " »").join(" ")}`
      : "";
    const key = [when, say, view.step.note, then].join("\n");
    if (card.dataset.key === key) return; // pas à chaque image : un bouton touché serait remplacé
    card.dataset.key = key;
    $("formationWhen").textContent = when;
    $("formationSay").innerHTML = say;
    $("formationSay").hidden = !say;
    $("formationNote").textContent = view.step.note ?? "";
    $("formationNote").hidden = !view.step.note;
    $("formationThen").textContent = then;
    $("formationThen").hidden = !then;
  }
  return { render };
}
