import type { Modality } from "./types";

/**
 * Game rules per modality: event types, how they score, periods and positions.
 * Shared by the API (validation and points), the domain (stats, rankings) and
 * the institutional UI (live match), so every consumer agrees on one catalog.
 */

export const GAME_EVENT_TYPES = [
  "touchdown",
  "extra_point",
  "field_goal",
  "safety",
  "interception",
  "pick_six",
  "penalty",
  "unsportsmanlike",
  "quarter_end",
  "game_end",
  "substitution",
  "injury",
  "first_down",
  "sack",
  // Tackle
  "pat_kick",
  "two_point_conversion",
  "defensive_conversion",
  "fumble",
  "fumble_recovery",
  "fumble_return_td",
  "kick_return_td",
  "punt_return_td",
] as const;

export type GameEventType = (typeof GAME_EVENT_TYPES)[number];

export const PLAYER_POSITIONS = [
  "QB",
  "WR",
  "RB",
  "C",
  "RS",
  "LB",
  "CB",
  "FS",
  "SS",
  // Tackle
  "FB",
  "TE",
  "G",
  "T",
  "DE",
  "DT",
  "K",
  "P",
  "LS",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  QB: "Quarterback",
  WR: "Wide Receiver",
  RB: "Running Back",
  C: "Center",
  RS: "Rusher",
  LB: "Linebacker",
  CB: "Cornerback",
  FS: "Free Safety",
  SS: "Strong Safety",
  FB: "Fullback",
  TE: "Tight End",
  G: "Guard",
  T: "Tackle",
  DE: "Defensive End",
  DT: "Defensive Tackle",
  K: "Kicker",
  P: "Punter",
  LS: "Long Snapper",
};

export const GAME_EVENT_LABELS: Record<GameEventType, string> = {
  touchdown: "Touchdown",
  extra_point: "Punto extra",
  field_goal: "Field goal",
  safety: "Safety",
  interception: "Intercepción",
  pick_six: "PICK SIX",
  penalty: "Castigo",
  unsportsmanlike: "Actitud Antideportiva",
  quarter_end: "Fin de cuarto",
  game_end: "Fin del partido",
  substitution: "Sustitución",
  injury: "Lesión",
  first_down: "Primero y diez",
  sack: "Sack",
  pat_kick: "PAT",
  two_point_conversion: "Conversión de 2",
  defensive_conversion: "Conversión defensiva",
  fumble: "Fumble",
  fumble_recovery: "Fumble recuperado",
  fumble_return_td: "TD por fumble",
  kick_return_td: "TD por retorno de kickoff",
  punt_return_td: "TD por retorno de punt",
};

export interface GameEventRule {
  type: GameEventType;
  /**
   * Points the server assigns. One value: fixed. Several: the client picks one.
   * Omitted: free non-negative input (flag's historical behaviour).
   */
  points?: readonly number[];
  /** The play can be a pass (needs a QB) or a run. */
  passOrRun?: boolean;
  /** Which team's QB is credited or charged. */
  qb?: "same" | "opponent";
  /** The player field is the scorer ("Anotador"). */
  scorer?: boolean;
  /** Flag safety: may be saved with only the QB. */
  scorerOptionalWithQb?: boolean;
  /** Needs a free-text description (penalties). */
  description?: boolean;
  /** Points scored by the defense or special teams: not charged to the opposing defense. */
  nonDefensiveScore?: boolean;
}

export interface GameEventButton {
  type: GameEventType;
  label: string;
  points?: number;
}

export interface GamePeriod {
  quarter: number;
  label: string;
}

export interface ModalityRules {
  events: readonly GameEventRule[];
  /** Buttons shown in the live match, in order. */
  buttons: readonly GameEventButton[];
  periods: readonly GamePeriod[];
  /** "Mitad" in flag, "Cuarto" in tackle. */
  periodName: string;
  positions: readonly PlayerPosition[];
}

const CONTROL_EVENTS: GameEventRule[] = [
  { type: "quarter_end" },
  { type: "game_end" },
  { type: "penalty", description: true },
  { type: "unsportsmanlike", description: true },
];

export const MODALITY_RULES: Record<Modality, ModalityRules> = {
  flag: {
    events: [
      { type: "touchdown", passOrRun: true, qb: "same", scorer: true },
      { type: "extra_point", passOrRun: true, qb: "same", scorer: true },
      { type: "safety", qb: "opponent", scorer: true, scorerOptionalWithQb: true },
      { type: "interception", qb: "opponent", scorer: true },
      { type: "pick_six", qb: "opponent", scorer: true, nonDefensiveScore: true },
      { type: "sack", qb: "opponent" },
      { type: "field_goal" },
      { type: "first_down" },
      { type: "substitution" },
      { type: "injury" },
      ...CONTROL_EVENTS,
    ],
    buttons: [
      { type: "touchdown", label: "TD", points: 6 },
      { type: "extra_point", label: "Punto Extra +1", points: 1 },
      { type: "extra_point", label: "Punto Extra +2", points: 2 },
      { type: "safety", label: "Safety", points: 2 },
      { type: "interception", label: "Intercepción" },
      { type: "pick_six", label: "Pick Six", points: 6 },
      { type: "sack", label: "Sack" },
      { type: "penalty", label: "Castigo" },
      { type: "unsportsmanlike", label: "Actitud Antideportiva" },
    ],
    periods: [
      { quarter: 1, label: "1T" },
      { quarter: 2, label: "2T" },
      { quarter: 5, label: "ET" },
    ],
    periodName: "Mitad",
    positions: ["QB", "WR", "RB", "C", "RS", "LB", "CB", "FS", "SS"],
  },
  tackle: {
    events: [
      { type: "touchdown", points: [6], passOrRun: true, qb: "same", scorer: true },
      { type: "pat_kick", points: [1], scorer: true },
      { type: "two_point_conversion", points: [2], passOrRun: true, qb: "same", scorer: true },
      { type: "field_goal", points: [3], scorer: true },
      { type: "safety", points: [2], scorer: true },
      { type: "defensive_conversion", points: [2], scorer: true, nonDefensiveScore: true },
      { type: "interception", points: [], qb: "opponent", scorer: true },
      { type: "pick_six", points: [6], qb: "opponent", scorer: true, nonDefensiveScore: true },
      { type: "fumble", points: [] },
      { type: "fumble_recovery", points: [], scorer: true },
      { type: "fumble_return_td", points: [6], scorer: true, nonDefensiveScore: true },
      { type: "kick_return_td", points: [6], scorer: true, nonDefensiveScore: true },
      { type: "punt_return_td", points: [6], scorer: true, nonDefensiveScore: true },
      { type: "sack", points: [], qb: "opponent" },
      { type: "first_down", points: [] },
      ...CONTROL_EVENTS,
    ],
    buttons: [
      { type: "touchdown", label: "TD", points: 6 },
      { type: "pat_kick", label: "PAT", points: 1 },
      { type: "two_point_conversion", label: "Conversión 2", points: 2 },
      { type: "field_goal", label: "Field Goal", points: 3 },
      { type: "safety", label: "Safety", points: 2 },
      { type: "defensive_conversion", label: "Conv. defensiva", points: 2 },
      { type: "interception", label: "Intercepción" },
      { type: "pick_six", label: "Pick Six", points: 6 },
      { type: "fumble", label: "Fumble" },
      { type: "fumble_recovery", label: "Fumble recuperado" },
      { type: "fumble_return_td", label: "TD por fumble", points: 6 },
      { type: "kick_return_td", label: "TD retorno kickoff", points: 6 },
      { type: "punt_return_td", label: "TD retorno punt", points: 6 },
      { type: "sack", label: "Sack" },
      { type: "penalty", label: "Castigo" },
      { type: "unsportsmanlike", label: "Actitud Antideportiva" },
    ],
    periods: [
      { quarter: 1, label: "1C" },
      { quarter: 2, label: "2C" },
      { quarter: 3, label: "3C" },
      { quarter: 4, label: "4C" },
      { quarter: 5, label: "OT" },
    ],
    periodName: "Cuarto",
    positions: ["QB", "RB", "FB", "WR", "TE", "C", "G", "T", "DE", "DT", "LB", "CB", "FS", "SS", "K", "P", "LS", "RS"],
  },
};

export function eventRule(modality: Modality, type: GameEventType): GameEventRule | undefined {
  return MODALITY_RULES[modality].events.find((rule) => rule.type === type);
}

/** Scores that don't count against the opposing defense (pick six, return TDs, defensive conversions). */
export const NON_DEFENSIVE_SCORING_EVENTS: readonly GameEventType[] = [
  ...new Set(
    Object.values(MODALITY_RULES).flatMap((rules) =>
      rules.events.filter((rule) => rule.nonDefensiveScore).map((rule) => rule.type),
    ),
  ),
];

/** Every touchdown flavour (offensive, defensive and return). */
export const TOUCHDOWN_EVENTS: readonly GameEventType[] = [
  "touchdown",
  "pick_six",
  "fumble_return_td",
  "kick_return_td",
  "punt_return_td",
];

/** Value credited to the QB's stats for an event (negative when the QB is charged). */
export function qbStatValue(rule: GameEventRule | undefined, type: GameEventType, points?: number) {
  if (rule?.qb !== "opponent") return points;
  if (type === "interception" || type === "sack") return -1;
  return -Math.abs(points || 0);
}

export type EventPointsResult = { ok: true; points: number } | { ok: false; message: string };

/** Resolves the points the server stores for an event. */
export function resolveEventPoints(modality: Modality, type: GameEventType, requested?: number): EventPointsResult {
  const rule = eventRule(modality, type);
  if (!rule) return { ok: false, message: `Evento no válido para ${modality}: ${type}` };
  const allowed = rule.points;
  if (!allowed) {
    const value = Number(requested ?? 0);
    return { ok: true, points: Number.isFinite(value) ? Math.max(0, value) : 0 };
  }
  if (allowed.length === 0) return { ok: true, points: 0 };
  if (allowed.length === 1) return { ok: true, points: allowed[0] };
  if (requested !== undefined && allowed.includes(Number(requested))) return { ok: true, points: Number(requested) };
  return { ok: false, message: `Puntos inválidos para ${GAME_EVENT_LABELS[type]}: ${allowed.join(" o ")}` };
}

export const RANKING_EVENT_TYPES = [
  "touchdown",
  "extra_point",
  "safety",
  "interception",
  "pick_six",
  "sack",
  "field_goal",
  "pat_kick",
  "two_point_conversion",
  "fumble_recovery",
] as const satisfies readonly GameEventType[];

export type RankingEventType = (typeof RANKING_EVENT_TYPES)[number];

/**
 * Event types a count ranking aggregates. With `includeDefensiveScores`,
 * touchdowns add pick six and return TDs, interceptions add pick six and
 * fumble recoveries add fumble-return TDs.
 */
export function rankingEventTypes(eventType: RankingEventType, includeDefensiveScores: boolean): GameEventType[] {
  if (!includeDefensiveScores) return [eventType];
  if (eventType === "touchdown") return [...TOUCHDOWN_EVENTS];
  if (eventType === "interception") return ["interception", "pick_six"];
  if (eventType === "fumble_recovery") return ["fumble_recovery", "fumble_return_td"];
  return [eventType];
}
