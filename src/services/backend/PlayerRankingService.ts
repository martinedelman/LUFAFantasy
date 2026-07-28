import RepositoryContainer from "@/repositories";
import { getReportingRepository } from "@/repositories/reporting";
import type {
  PlayerRankingQuery as RankingQuery,
  RankingEventType,
  RankingStage,
} from "@/repositories/reporting/IReportingRepository";

export type { RankingEventType, RankingStage };

export class PlayerRankingService {
  private tournamentRepo = RepositoryContainer.getTournamentRepository();
  private divisionRepo = RepositoryContainer.getDivisionRepository();
  private reportingRepo = getReportingRepository();

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
