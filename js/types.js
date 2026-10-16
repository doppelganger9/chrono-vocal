// Types partagés (JSDoc), vérifiés par TypeScript sans compilation : npm run typecheck (ADR 0004).
// Ce fichier ne contient que des déclarations de types.

/**
 * @typedef {'assaut' | 'relais'} Mode
 * @typedef {'off' | 'propose' | 'auto'} ProlongMode
 * @typedef {'STOP' | 'ALLEZ' | 'REPOS'} CommandName
 * @typedef {Record<CommandName, string[]>} Learned  variantes apprises, en écriture phonétique
 *
 * @typedef {object} Config  réglages de l'assaut (js/settings.js)
 * @property {number} v  version des réglages enregistrés
 * @property {Mode} mode
 * @property {string} preset
 * @property {number} rounds  nombre de reprises (1 à 4)
 * @property {number} roundSec  durée d'une reprise, en secondes
 * @property {number} restSec  durée de la minute de repos
 * @property {number} extraMax  reprises supplémentaires autorisées
 * @property {number} extraSec  durée d'une reprise supplémentaire
 * @property {number} relayBase
 * @property {number} relayCount
 * @property {boolean} countStops  arrêts décomptés
 * @property {ProlongMode} prolong
 * @property {boolean} requireEnGarde
 * @property {boolean} autoRest
 * @property {number[]} calls  annonces du repos, en secondes restantes
 * @property {string[]} colors  couleurs des tireurs
 * @property {boolean} answerReady
 * @property {Learned} learned
 * @property {'auto' | 'jour' | 'nuit'} theme  « auto » : selon le réglage du téléphone
 * @property {Partial<Record<'round' | 'rest' | 'stop' | 'over', string>>} palette  couleurs personnalisées (#rrggbb)
 */

/**
 * @typedef {'ready' | 'round' | 'overtime' | 'rest' | 'done'} Phase
 *
 * @typedef {object} ChronoState  état du chrono (js/chrono.js)
 * @property {Phase} phase
 * @property {number} round
 * @property {boolean} running
 * @property {boolean} halt  arrêt de l'arbitre en cours
 * @property {number} remaining  secondes restantes (négatif en temps dépassé)
 * @property {number} deadline  échéance, en ms d'horloge monotone
 * @property {Set<number | string>} called  annonces déjà faites
 * @property {number} extra  reprises supplémentaires lancées
 * @property {number} bonus  prolongation appliquée (secondes)
 * @property {boolean} prolonged
 * @property {number} prolongOffer  fin de la proposition de prolongation (ms d'horloge), 0 sinon
 * @property {number | null} relayUntil
 */

/**
 * @typedef {object} Stop  un arrêt de l'arbitre
 * @property {number} round
 * @property {number} at  moment de la reprise (secondes écoulées)
 * @property {number} t0  début (ms d'horloge)
 * @property {number | null} dur  durée (secondes), null s'il est en cours
 * @property {boolean} [prolongation]
 *
 * @typedef {object} RoundLog
 * @property {number} start
 * @property {number | null} end
 * @property {boolean} prolonged
 * @property {number} [over]  temps dépassé (secondes)
 *
 * @typedef {'observation' | 'penalite' | 'demande-avert' | 'avertissement' | 'avert-refuse' | 'carton-jaune' | 'carton-rouge' | 'disqualification' | 'abandon' | 'forfait'} SanctionType
 *
 * @typedef {object} Motif  sanction reconnue dans une phrase de l'arbitre (js/lang.js)
 * @property {SanctionType} type
 * @property {number} pts  points accordés à l'adversaire
 * @property {string | null} [detail]
 * @property {string | null} [color]
 *
 * @typedef {Motif & { round: number, t: number, stop: number | null }} SanctionEvent
 *
 * @typedef {object} Bout  journal de l'assaut
 * @property {number | null} start
 * @property {number | null} end
 * @property {Record<number, RoundLog>} rounds
 * @property {Stop[]} stops
 * @property {SanctionEvent[]} events
 * @property {Config | null} cfg
 */

/**
 * @typedef {object} Clock
 * @property {() => number} now  ms monotones (performance.now)
 * @property {() => number} wall  ms d'horloge (Date.now)
 *
 * @typedef {(type: string, data?: any) => void} Emit
 */

export {};
