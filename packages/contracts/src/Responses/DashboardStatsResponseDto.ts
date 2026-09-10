import type { NextGameResponseDto } from "./NextGameResponseDto";
import type { TopPlayerResponseDto } from "./TopPlayerResponseDto";

export interface DashboardStatsResponseDto {
  activeTournaments: number;
  totalTeams: number;
  totalPlayers: number;
  completedGames: number;
  nextGames: NextGameResponseDto[];
  topPlayers: TopPlayerResponseDto[];
}
