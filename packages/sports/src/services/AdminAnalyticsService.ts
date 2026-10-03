import type { AdminAnalyticsResponseDto, AdminAnalyticsSubject } from "@lufa/contracts";
import type { IDivisionRepository, ITournamentRepository } from "@lufa/sports/ports";
import type { Modality } from "@lufa/sports/entities/Modality";

export interface AdminAnalyticsPort {
  getAdminAnalytics(query: {
    subject: AdminAnalyticsSubject;
    tournament?: string | null;
    division?: string | null;
    modality?: Modality;
  }): Promise<AdminAnalyticsResponseDto>;
}

export class AdminAnalyticsService {
  constructor(
    private readonly tournamentRepo: ITournamentRepository,
    private readonly divisionRepo: IDivisionRepository,
    private readonly reportingRepo: AdminAnalyticsPort,
  ) {}

  async getAnalytics(query: {
    subject: AdminAnalyticsSubject;
    tournament?: string | null;
    division?: string | null;
    modality?: Modality;
  }) {
    if (query.tournament && !(await this.tournamentRepo.exists(query.tournament).catch(() => false))) {
      throw new Error("campeonato inválido");
    }
    if (query.division && !(await this.divisionRepo.exists(query.division).catch(() => false))) {
      throw new Error("division inválida");
    }
    return this.reportingRepo.getAdminAnalytics(query);
  }
}
