// Machine à états du chrono, pure : ni DOM, ni son, ni minuterie. L'horloge est fournie, et chaque effet
// (sons, voix, affichage) est signalé par un événement que l'app traduit (voir js/main.js).
//
// Protocole du chronométreur (cahier n°10, I 3.2.1) — voir docs/corpus-fonctionnel.md.
// Principe : l'arbitre dirige, le chrono suit (ADR 0006). « Temps » informe l'arbitre ; seul l'arbitre termine la reprise.
//
// Phases : ready (avant une reprise), round (reprise), overtime (temps écoulé : la reprise continue, le dépassement
//          est compté, jusqu'à « stop, fin de la reprise »), rest (minute de repos), done (fin de l'assaut).
// halt : arrêt de l'arbitre en cours, du « stop » au « allez ». Si les arrêts sont décomptés, le chrono est figé.
//
// Événements émis : allez {resume}, stop, temps, time-up, overtime-call {over}, rest-call {sec}, relay,
//   reprise-end, finish, extra, prolongation-offer, prolongation, change.

const newBout = () => ({ start: null, end: null, rounds: {}, stops: [], events: [], cfg: null });
const initialState = remaining => ({ phase: 'ready', round: 1, running: false, halt: false, remaining, deadline: 0,
  called: new Set(), extra: 0, bonus: 0, prolonged: false, prolongOffer: 0, relayUntil: null });

/**
 * @param getCfg () => réglages courants
 * @param clock  { now(): ms monotones (performance.now), wall(): ms d'horloge (Date.now) }
 * @param emit   (type, données) => void
 */
export function createChrono({ getCfg, clock, emit = () => {} }) {
  const cfg = () => getCfg();
  let st = initialState(cfg().roundSec);
  // Journal de l'assaut : arrêts pendant les reprises (ceux du repos ne comptent pas) et sanctions annoncées
  let bout = newBout();

  const totalRounds = () => cfg().rounds + st.extra;
  const isExtra = (n = st.round) => n > cfg().rounds;
  const roundDur = (n = st.round) => isExtra(n) ? cfg().extraSec : cfg().roundSec;
  const curMax = () => st.phase === 'rest' ? cfg().restSec : roundDur() + st.bonus;
  const elapsed = () => curMax() - st.remaining;
  const inPlay = () => st.phase === 'round' || st.phase === 'overtime';
  const overtime = () => st.phase === 'overtime' ? Math.max(0, -st.remaining) : 0;

  function openStop() {
    bout.stops.push({ round: st.round, at: elapsed(), t0: clock.wall(), dur: null });
  }
  function closeStop() {
    const s = bout.stops[bout.stops.length - 1];
    if (s && s.dur === null) { s.dur = (clock.wall() - s.t0) / 1000; return s; }
    return null;
  }
  function closeRound() {
    closeStop(); st.halt = false;
    const r = bout.rounds[st.round];
    if (r && !r.end) r.end = clock.wall();
  }
  function startClock() { st.deadline = clock.now() + st.remaining * 1000; st.running = true; }
  function pauseClock() { tick(); st.running = false; }

  function allez() {
    if (st.phase === 'ready') {
      if (st.round === 1) { bout = newBout(); bout.start = clock.wall(); bout.cfg = { ...cfg() }; }
      bout.rounds[st.round] = { start: clock.wall(), end: null, prolonged: false, over: 0 };
      Object.assign(st, { phase: 'round', halt: false, bonus: 0, prolonged: false, prolongOffer: 0, called: new Set(), relayUntil: null });
      st.remaining = roundDur(); startClock();
      emit('allez', { resume: false });
    } else if ((inPlay() || st.phase === 'rest') && st.halt) {
      if (inPlay()) checkProlongation(closeStop());
      st.halt = false;
      if (!st.running) startClock();
      emit('allez', { resume: true });
    } else return false;
    emit('change'); return true;
  }

  // Un arrêt de plus de 30 s prolonge la reprise de 30 s, une fois par reprise (I 2.2). Seulement quand les arrêts
  // ne sont pas décomptés : s'ils le sont, le chrono était déjà figé pendant l'arrêt. Proposée par défaut : l'arbitre décide.
  function checkProlongation(s) {
    const c = cfg();
    if (!s || c.countStops || c.prolong === 'off' || c.mode === 'relais' || st.prolonged || s.dur <= 30) return;
    if (c.prolong === 'auto') prolong();
    else { st.prolongOffer = clock.wall() + 15000; emit('prolongation-offer'); }
  }
  function prolong() {
    if (!inPlay() || st.prolonged) return false;
    if (st.running) tick();
    st.prolonged = true; st.prolongOffer = 0; st.bonus = 30; st.deadline += 30000; st.remaining += 30;
    if (st.phase === 'overtime' && st.remaining > 0) st.phase = 'round';
    bout.rounds[st.round].prolonged = true;
    const s = bout.stops[bout.stops.length - 1];
    if (s) s.prolongation = true;
    emit('prolongation'); emit('change'); return true;
  }

  function stop() {
    if ((inPlay() || st.phase === 'rest') && !st.halt) {
      st.halt = true;
      if (st.phase === 'rest' || cfg().countStops) pauseClock();
      if (inPlay()) openStop();
      emit('stop'); emit('change'); return true;
    }
    return false;
  }

  // Fin de la reprise, décidée par l'arbitre : « Stop, fin de la reprise », bouton, ou « REPOS ».
  // Possible à tout moment de la reprise, y compris s'il reste quelques dixièmes (« stop » prime sur « temps », I 3.2.1).
  function endReprise() {
    if (!inPlay()) return false;
    if (st.running) tick();
    const r = bout.rounds[st.round];
    if (r) r.over = overtime();
    st.running = false; closeRound();
    if (st.round >= totalRounds()) { finishBout(); return true; }
    startRest(); emit('reprise-end');
    return true;
  }
  function startRest() {
    Object.assign(st, { phase: 'rest', running: false, halt: false, prolongOffer: 0, called: new Set() });
    st.remaining = cfg().restSec; startClock(); emit('change');
  }
  // Fin du temps de reprise : « temps ». La reprise continue (temps dépassé, compté) jusqu'à la décision de l'arbitre.
  function timeUp() {
    st.phase = 'overtime';
    emit('temps'); emit('time-up'); emit('change');
  }
  function finishBout() {
    closeRound();
    st.phase = 'done'; st.running = false; st.remaining = 0; bout.end = clock.wall();
    emit('finish'); emit('change');
  }
  // Égalité : reprise supplémentaire, de même durée, après une minute de repos (I 2.3.1)
  function extraRound() {
    if (st.phase !== 'done' || st.extra >= cfg().extraMax) return false;
    st.extra++; bout.end = null;
    startRest(); emit('extra');
    return true;
  }
  function endRest() {
    if (st.phase !== 'rest') return false;
    st.running = false; st.halt = false; st.round++; st.phase = 'ready'; st.remaining = roundDur();
    emit('temps'); emit('change');
    return true;
  }
  function reset() {
    st = initialState(0); st.remaining = roundDur();
    bout = newBout();
    emit('change');
  }

  function tick() {
    if (!st.running) return;
    st.remaining = (st.deadline - clock.now()) / 1000;
    if (st.phase !== 'overtime') st.remaining = Math.max(0, st.remaining); // en temps dépassé, le compte devient négatif
    if (st.phase === 'rest') restCalls();
    if (st.phase === 'round' && cfg().mode === 'relais') relayCalls();
    if (st.phase === 'overtime') overtimeCalls();
    if (st.remaining <= 0 && st.phase === 'round') timeUp();
    else if (st.remaining <= 0 && st.phase === 'rest') endRest();
  }
  // Temps dépassé : « Temps » répété toutes les 5 s, sauf pendant un arrêt
  function overtimeCalls() {
    const k = Math.floor(overtime() / 5);
    if (k >= 1 && !st.halt && !st.called.has('temps' + k)) {
      st.called.add('temps' + k); emit('overtime-call', { over: overtime() });
    }
  }
  // Annonces du repos (« 30 secondes »…), seulement si on n'a pas dépassé le moment de plus de 1,5 s
  function restCalls() {
    for (const c of cfg().calls) {
      if (!st.called.has(c) && st.remaining <= c && c < cfg().restSec) {
        st.called.add(c);
        if (st.remaining > c - 1.5) emit('rest-call', { sec: c });
      }
    }
  }
  // Relais : à chaque minute annoncée, l'équipe a 10 s pour changer de tireur (J 4.4.3.6)
  function relayCalls() {
    const k = Math.floor(elapsed() / 60);
    if (k >= 1 && !st.called.has(k) && st.remaining > 2) {
      st.called.add(k); st.relayUntil = k * 60 + 10;
      emit('relay');
    }
  }

  /** Sanction annoncée, rattachée à l'arrêt en cours de la reprise s'il y en a un */
  function addEvent(e) {
    const i = bout.stops.length - 1;
    const ev = { ...e, round: st.round, t: clock.wall(), stop: i >= 0 && bout.stops[i].round === st.round ? i : null };
    bout.events.push(ev);
    return ev;
  }

  /** Les réglages ont changé : le temps affiché suit avant le départ ; une reprise au-delà du nouveau total réinitialise */
  function configChanged() {
    if (st.phase === 'ready' && !st.running) st.remaining = roundDur();
    if (st.round > totalRounds()) reset();
  }

  return {
    get state() { return st; },
    get bout() { return bout; },
    totalRounds, isExtra, roundDur, curMax, elapsed, inPlay, overtime,
    allez, stop, endReprise, endRest, extraRound, prolong, reset, tick, addEvent, configChanged,
    // Annulation : l'échéance étant une heure absolue, un STOP annulé laisse le chrono avoir tourné entre-temps
    snapshot: () => structuredClone({ st, bout }),
    restore(snap) { st = structuredClone(snap.st); bout = structuredClone(snap.bout); emit('change'); },
  };
}
