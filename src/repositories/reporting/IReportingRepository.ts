import type { DashboardStatsResponseDto } from "@/app/DTOs";

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

export interface PlayerRankingRow {
  player: {
    _id: string;
    firstName: string;
    lastName: string;
    jerseyNumber?: number | null;
    team: { _id: string; name: string; shortName: string };
  };
  value: number;
}

export interface IReportingRepository {
  getDashboardStats(nextGamesLimit: number, topPlayersLimit: number): Promise<DashboardStatsResponseDto>;
  getActivePlayerCounts(teamIds: string[]): Promise<Record<string, number>>;
  getPlayerRankings(query: PlayerRankingQuery): Promise<PlayerRankingRow[]>;
  checkDatabaseHealth(): Promise<{ latencyMs: number; databaseName: string }>;
}
