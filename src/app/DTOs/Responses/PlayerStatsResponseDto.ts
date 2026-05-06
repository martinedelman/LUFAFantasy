interface PassingStatsResponseDto {
  attempts: number;
  completions: number;
  yards: number;
  touchdowns: number;
  interceptions: number;
}

interface RushingStatsResponseDto {
  attempts: number;
  yards: number;
  touchdowns: number;
  fumbles: number;
}

interface ReceivingStatsResponseDto {
  receptions: number;
  yards: number;
  touchdowns: number;
  fumbles: number;
}

interface DefensiveStatsResponseDto {
  tackles: number;
  sacks: number;
  interceptions: number;
  fumbleRecoveries: number;
  safeties: number;
}

export interface PlayerStatsResponseDto {
  gamesPlayed: number;
  totalPoints: number;
  touchdowns: number;
  extraPoints: number;
  safeties: number;
  fieldGoals: number;
  firstDowns: number;
  penalties: number;
  pickSixes: number;
  unsportsmanlike: number;
  passing: PassingStatsResponseDto;
  rushing: RushingStatsResponseDto;
  receiving: ReceivingStatsResponseDto;
  defensive: DefensiveStatsResponseDto;
}
