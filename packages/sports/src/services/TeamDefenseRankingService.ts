import type { IDivisionRepository, IGameRepository, ITeamRepository, ITournamentRepository } from "@lufa/sports/ports";
import { calculateTeamDefensePoints } from "./teamDefensePoints";

export type TeamDefenseRankingStage = "all" | "regular" | "playoff" | "final" | "postseason";

export interface TeamDefenseRankingQuery {
  tournament?: string | null;
  division?: string | null;
  year?: number | null;
  stage: TeamDefenseRankingStage;
  limit: number;
}

export interface TeamDefenseRankingRow {
  team: { _id: string; name: string; shortName: string };
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

export class TeamDefenseRankingService {
  constructor(
    private readonly gameRepo: IGameRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly tournamentRepo: ITournamentRepository,
    private readonly divisionRepo: IDivisionRepository,
  ) {}

  async getRankings(query: TeamDefenseRankingQuery): Promise<TeamDefenseRankingRow[]> {
    if (query.tournament && !(await this.tournamentRepo.exists(query.tournament).catch(() => false))) {
      throw new Error("campeonato inválido");
    }
    if (query.division && !(await this.divisionRepo.exists(query.division).catch(() => false))) {
      throw new Error("division inválida");
    }

    const tournamentIdsForYear = query.year
      ? new Set((await this.tournamentRepo.findByYear(query.year)).map((tournament) => tournament.id).filter(Boolean))
      : null;
    const games = (await this.gameRepo.findAll()).filter((game) => {
      if (!["in_progress", "completed"].includes(game.status)) return false;
      if (query.tournament && referenceId(game.tournament) !== query.tournament) return false;
      if (query.division && referenceId(game.division) !== query.division) return false;
      if (tournamentIdsForYear && !tournamentIdsForYear.has(referenceId(game.tournament))) return false;
      if (query.stage === "all") return true;
      if (query.stage === "postseason") return game.phase === "playoff" || game.phase === "final";
      return game.phase === query.stage;
    });
    const teamIds = new Set(games.flatMap((game) => [referenceId(game.homeTeam), referenceId(game.awayTeam)]).filter(Boolean));
    const teams = await Promise.all([...teamIds].map(async (teamId) => [teamId, await this.teamRepo.findById(teamId)] as const));

    return teams
      .flatMap(([teamId, team]) => {
        if (!team) return [];
        return [{
          team: { _id: teamId, name: team.name, shortName: team.shortName || "" },
          ...calculateTeamDefensePoints(games, teamId),
        }];
      })
      .sort(
        (left, right) =>
          left.adjustedPointsAgainst - right.adjustedPointsAgainst ||
          left.pointsAgainst - right.pointsAgainst ||
          left.team.name.localeCompare(right.team.name, "es"),
      )
      .slice(0, query.limit);
  }
}
