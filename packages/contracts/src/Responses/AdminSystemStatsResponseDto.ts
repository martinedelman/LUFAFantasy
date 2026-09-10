export interface AdminSystemStatsResponseDto {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalAdmins: number;
  totalYouthCoaches: number;
  totalJudges: number;
  activeTournaments: number;
  upcomingTournaments: number;
  totalTeams: number;
  activeTeams: number;
  totalPlayers: number;
  activePlayers: number;
  preApprovedPlayers: number;
  totalGames: number;
  completedGames: number;
  scheduledGames: number;
  inProgressGames: number;
  pendingCorrections: number;
  pendingFlagInterests: number;
  playerFlagInterests: number;
  sponsorFlagInterests: number;
}
