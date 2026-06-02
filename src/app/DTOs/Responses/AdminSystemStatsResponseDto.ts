export interface AdminSystemStatsResponseDto {
  totalUsers: number;
  totalAdmins: number;
  totalJudges: number;
  activeTournaments: number;
  totalTeams: number;
  totalPlayers: number;
  totalGames: number;
  completedGames: number;
  scheduledGames: number;
  inProgressGames: number;
}
