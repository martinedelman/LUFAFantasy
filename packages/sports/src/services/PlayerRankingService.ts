import type { IDivisionRepository, ITournamentRepository } from "@lufa/sports/ports";

export type RankingEventType = "touchdown" | "extra_point" | "safety" | "interception" | "pick_six";
export type RankingStage = "all" | "regular" | "playoff" | "final" | "postseason";

export interface PlayerRankingQuery {
  mode: "count" | "points";
  eventType?: RankingEventType;
  tournament?: string | null;
  division?: string | null;
  year?: number | null;
  points?: number | null;
  stage: RankingStage;
  includePickSix: boolean;
  limit: number;
}

export interface PlayerRankingPort {
  getPlayerRankings(query: PlayerRankingQuery): Promise<unknown[]>;
}

type RankingQuery = PlayerRankingQuery;

export class PlayerRankingService {
  constructor(
    private readonly tournamentRepo: ITournamentRepository,
    private readonly divisionRepo: IDivisionRepository,
    private readonly reportingRepo: PlayerRankingPort,
  ) {}

  async getRankings(query: RankingQuery) {
    const tournamentExists = query.tournament
      ? await this.tournamentRepo.exists(query.tournament).catch(() => false)
      : true;
    if (!tournamentExists) {
      throw new Error("campeonato inválido");
    }
    const divisionExists = query.division
      ? await this.divisionRepo.exists(query.division).catch(() => false)
      : true;
    if (!divisionExists) {
      throw new Error("division inválida");
    }
    return this.reportingRepo.getPlayerRankings(query);
  }
}
