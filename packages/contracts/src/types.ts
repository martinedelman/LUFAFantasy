export type DivisionCategory = "masculino" | "femenino" | "mixto";
export type UserRole = "user" | "admin" | "juez" | "entrenador_juveniles";
export type TeamStatus = "active" | "inactive" | "suspended";
export type PlayerStatus = "active" | "inactive" | "injured" | "suspended" | "pre_approved";
export type PlayerPosition = "QB" | "WR" | "RB" | "C" | "RS" | "LB" | "CB" | "FS" | "SS";
export type GameStatus = "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
export type GamePhase = "regular" | "playoff" | "final";
export type GameEventType =
  | "touchdown"
  | "extra_point"
  | "field_goal"
  | "safety"
  | "interception"
  | "pick_six"
  | "penalty"
  | "unsportsmanlike"
  | "quarter_end"
  | "game_end"
  | "substitution"
  | "injury"
  | "first_down"
  | "sack";
export type TournamentStatus = "upcoming" | "active" | "completed" | "cancelled";
export type TournamentFormat = "league" | "playoff" | "tournament";
export type PlayoffCriteria = "NFL" | "DIRECT_FINAL" | "SEMIFINAL";

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface Coach {
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  certifications?: string[];
}

export interface TournamentRules {
  gameDuration: number;
  quarters: number;
  timeoutsPerTeam: number;
  playersPerTeam: number;
  minimumPlayers: number;
  overtimeRules: string;
  scoringRules: {
    touchdown: number;
    extraPoint1Yard: number;
    extraPoint5Yard: number;
    extraPoint10Yard: number;
    safety: number;
    fieldGoal: number;
  };
}

export interface TournamentPrize {
  description: string;
  condition: string;
  amount?: number;
}

export interface QuarterScoreContract {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  overtime: number;
  total: number;
}

export interface GameScore {
  home: QuarterScoreContract;
  away: QuarterScoreContract;
}

export interface TeamStatisticsContract {
  passingYards: number;
  rushingYards: number;
  totalYards: number;
  completions: number;
  attempts: number;
  interceptions: number;
  fumbles: number;
  penalties: number;
  penaltyYards: number;
  timeOfPossession?: string;
  thirdDownConversions: { made: number; attempted: number };
  redZoneEfficiency: { scores: number; attempts: number };
}

export interface GameStatistics {
  home: TeamStatisticsContract;
  away: TeamStatisticsContract;
}
