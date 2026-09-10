import type { DashboardStatsResponseDto } from "@lufa/contracts";

interface DashboardOptions {
  nextGamesLimit?: number;
  topPlayersLimit?: number;
}

export interface DashboardRepositoryPort {
  getDashboardStats(nextGamesLimit: number, topPlayersLimit: number): Promise<DashboardStatsResponseDto>;
}

export class DashboardService {
  constructor(private readonly reportingRepo: DashboardRepositoryPort) {}

  async getStats(options: DashboardOptions = {}): Promise<DashboardStatsResponseDto> {
    const nextGamesLimit = options.nextGamesLimit ?? 4;
    const topPlayersLimit = options.topPlayersLimit ?? 4;
    return this.reportingRepo.getDashboardStats(nextGamesLimit, topPlayersLimit);
  }
}
