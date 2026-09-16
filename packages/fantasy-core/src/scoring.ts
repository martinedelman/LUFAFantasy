export const FANTASY_SCORING_RULES = {
  touchdown: 6,
  passingTouchdown: 4,
  extraPointFallback: 1,
  fieldGoal: 3,
  safety: 2,
  interception: 2,
  thrownInterception: -2,
  pickSix: 8,
  sack: 1,
} as const;

export interface FantasyScoringEvent {
  type: string;
  playerId: string | null;
  points?: number | null;
  details?: unknown;
}

export interface FantasyPointAward {
  playerId: string;
  points: number;
}

function quarterbackId(details: unknown) {
  if (!details || typeof details !== "object" || !("qb" in details)) return null;
  const qb = (details as { qb?: unknown }).qb;
  return typeof qb === "string" && qb.trim() ? qb : null;
}

/**
 * Converts an official Live Match event into Fantasy awards. Events that do not
 * describe an individual statistical play deliberately score zero in this MVP.
 */
export function fantasyAwardsForEvent(event: FantasyScoringEvent): FantasyPointAward[] {
  const awards: FantasyPointAward[] = [];
  const qb = quarterbackId(event.details);
  const primaryPoints: Record<string, number> = {
    touchdown: FANTASY_SCORING_RULES.touchdown,
    extra_point: event.points && event.points > 0 ? event.points : FANTASY_SCORING_RULES.extraPointFallback,
    field_goal: FANTASY_SCORING_RULES.fieldGoal,
    safety: FANTASY_SCORING_RULES.safety,
    interception: FANTASY_SCORING_RULES.interception,
    pick_six: FANTASY_SCORING_RULES.pickSix,
    sack: FANTASY_SCORING_RULES.sack,
  };

  if (event.playerId && event.type in primaryPoints) {
    awards.push({ playerId: event.playerId, points: primaryPoints[event.type] });
  }
  if (qb && qb !== event.playerId && event.type === "touchdown") {
    awards.push({ playerId: qb, points: FANTASY_SCORING_RULES.passingTouchdown });
  }
  if (qb && qb !== event.playerId && (event.type === "interception" || event.type === "pick_six")) {
    awards.push({ playerId: qb, points: FANTASY_SCORING_RULES.thrownInterception });
  }
  return awards;
}

export function fantasyPointsForEvents(events: FantasyScoringEvent[]) {
  const points = new Map<string, number>();
  for (const award of events.flatMap(fantasyAwardsForEvent)) {
    points.set(award.playerId, (points.get(award.playerId) || 0) + award.points);
  }
  return points;
}
