import type { DashboardStatsResponseDto } from "@/app/DTOs";
import { getReportingRepository } from "@/repositories/reporting";

interface DashboardOptions {
  nextGamesLimit?: number;
  topPlayersLimit?: number;
}

export class DashboardService {
  private reportingRepo = getReportingRepository();

  async getStats(options: DashboardOptions = {}): Promise<DashboardStatsResponseDto> {
    const nextGamesLimit = options.nextGamesLimit ?? 4;
    const topPlayersLimit = options.topPlayersLimit ?? 4;
    return this.reportingRepo.getDashboardStats(nextGamesLimit, topPlayersLimit);
  }
}
