import type { Game } from "@lufa/sports/entities/Game";

type GameWithEvents = Game & {
  events?: Array<{ type?: unknown; team?: unknown; points?: unknown }>;
};

export interface TeamDefensePoints {
  gamesPlayed: number;
  pointsAgainst: number;
  pickSixPointsExcluded: number;
  adjustedPointsAgainst: number;
}

function referenceId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && ("id" in value || "_id" in value)) {
    const reference = value as { id?: unknown; _id?: unknown };
    return String(reference.id ?? reference._id ?? "");
  }
  return String(value);
}

export function calculateTeamDefensePoints(games: Game[], teamId: string): TeamDefensePoints {
  const totals: TeamDefensePoints = {
    gamesPlayed: 0,
    pointsAgainst: 0,
    pickSixPointsExcluded: 0,
    adjustedPointsAgainst: 0,
  };

  for (const game of games) {
    const homeTeamId = referenceId(game.homeTeam);
    const awayTeamId = referenceId(game.awayTeam);
    const isHome = homeTeamId === teamId;
    const isAway = awayTeamId === teamId;
    if (!isHome && !isAway) continue;

    const opponentId = isHome ? awayTeamId : homeTeamId;
    const opponentScore = isHome ? game.score.away.total : game.score.home.total;
    totals.gamesPlayed += 1;
    totals.pointsAgainst += opponentScore;

    for (const event of (game as GameWithEvents).events || []) {
      if (event.type !== "pick_six" || referenceId(event.team) !== opponentId) continue;
      totals.pickSixPointsExcluded += Math.max(0, Number(event.points) || 0);
    }
  }

  totals.adjustedPointsAgainst = Math.max(0, totals.pointsAgainst - totals.pickSixPointsExcluded);
  return totals;
}
