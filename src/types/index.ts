// Tipos principales para el sistema de Flag Football

export interface Tournament {
  _id?: string;
  name: string;
  description?: string;
  season: string;
  year: number;
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  status: "upcoming" | "active" | "completed" | "cancelled";
  format: "league" | "playoff" | "tournament";
  divisions: string[]; // Referencias a Division
  rules?: TournamentRules;
  prizes?: Prize[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentRules {
  gameDuration: number; // minutos por partido
  quarters: number;
  timeoutsPerTeam: number;
  playersPerTeam: number;
  minimumPlayers: number;
  overtimeRules?: string;
  scoringRules: ScoringRules;
}

export interface ScoringRules {
  touchdown: number;
  extraPoint1Yard: number;
  extraPoint5Yard: number;
  extraPoint10Yard: number;
  safety: number;
  fieldGoal?: number;
}

export interface Prize {
  position: number;
  description: string;
  amount?: number;
  trophy?: string;
}

export interface Division {
  _id?: string;
  name: string;
  category: "masculino" | "femenino" | "mixto";
  ageGroup?: string;
  tournament?: string; // Referencia opcional a Tournament (legacy)
  teams: string[]; // Referencias a Team
  maxTeams?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  _id?: string;
  name: string;
  shortName?: string;
  logo?: string;
  colors: {
    primary: string;
    secondary?: string;
  };
  division: string; // Referencia a Division
  coach?: Coach;
  players: string[]; // Referencias a Player
  contact: ContactInfo;
  registrationDate: Date;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

export interface Coach {
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  certifications?: string[];
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface Player {
  _id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: Date;
  team: string; // Referencia a Team
  jerseyNumber: number;
  position: PlayerPosition;
  height?: number; // cm
  weight?: number; // kg
  experience?: string;
  emergencyContact?: EmergencyContact;
  medicalInfo?: MedicalInfo;
  registrationDate: Date;
  status: "active" | "inactive" | "injured" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

export type PlayerPosition =
  | "QB" // Quarterback
  | "WR" // Wide Receiver
  | "RB" // Running Back
  | "C" // Center
  | "RS" // Rusher
  | "LB" // Linebacker
  | "CB" // Cornerback
  | "FS" // Free Safety
  | "SS"; // Strong Safety

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface MedicalInfo {
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
  insuranceInfo?: string;
}

export interface Game {
  _id?: string;
  tournament: string; // Referencia a Tournament
  division: string; // Referencia a Division
  homeTeam: string | null; // Referencia a Team o TBD
  awayTeam: string | null; // Referencia a Team o TBD
  venue: {
    name: string;
    address: string;
  };
  scheduledDate: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
  week?: number;
  round?: string;
  officials: Official[];
  weather?: WeatherConditions;
  score: GameScore;
  statistics: GameStatistics;
  events: GameEvent[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Official {
  name: string;
  role: "referee" | "umpire" | "linesman" | "field_judge";
  certification?: string;
}

export interface WeatherConditions {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  conditions?: string;
}

export interface GameScore {
  home: QuarterScore;
  away: QuarterScore;
}

export interface QuarterScore {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  overtime?: number;
  total: number;
}

export interface GameStatistics {
  home: TeamGameStats;
  away: TeamGameStats;
}

export interface TeamGameStats {
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

export interface GameEvent {
  quarter: number;
  time: string; // MM:SS format
  type: GameEventType;
  team: string; // Referencia a Team
  player: string; // Referencia a Player
  description: string;
  yards?: number;
  points?: number;
  details?: string;
}

export type GameEventType =
  | "touchdown"
  | "extra_point"
  | "field_goal"
  | "safety"
  | "interception"
  | "fumble"
  | "penalty"
  | "timeout"
  | "quarter_end"
  | "game_end"
  | "substitution"
  | "injury"
  | "first_down"
  | "sack";

export interface PlayerStatistics {
  _id?: string;
  player: string; // Referencia a Player
  tournament: string; // Referencia a Tournament
  division: string; // Referencia a Division

  // Estadísticas ofensivas
  passing: PassingStats;
  rushing: RushingStats;
  receiving: ReceivingStats;

  // Estadísticas defensivas
  defensive: DefensiveStats;

  // Estadísticas especiales
  kicking?: KickingStats;
  punting?: PuntingStats;
  returning?: ReturningStats;

  // Estadísticas generales
  gamesPlayed: number;
  gamesStarted: number;
  minutesPlayed: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface PassingStats {
  attempts: number;
  completions: number;
  yards: number;
  touchdowns: number;
  interceptions: number;
  sacks: number;
  rating?: number;
  longestPass?: number;
}

export interface RushingStats {
  attempts: number;
  yards: number;
  touchdowns: number;
  fumbles: number;
  longestRush?: number;
  averageYards?: number;
}

export interface ReceivingStats {
  receptions: number;
  yards: number;
  touchdowns: number;
  targets: number;
  drops?: number;
  longestReception?: number;
  averageYards?: number;
}

export interface DefensiveStats {
  tackles: number;
  assistedTackles: number;
  sacks: number;
  interceptions: number;
  passDefensed: number;
  forcedFumbles: number;
  fumbleRecoveries: number;
  defensiveTouchdowns: number;
  safeties: number;
}

export interface KickingStats {
  fieldGoalAttempts: number;
  fieldGoalsMade: number;
  extraPointAttempts: number;
  extraPointsMade: number;
  longestFieldGoal?: number;
  accuracy?: number;
}

export interface PuntingStats {
  punts: number;
  yards: number;
  average: number;
  longest: number;
  inside20: number;
  touchbacks: number;
}

export interface ReturningStats {
  kickReturns: number;
  kickReturnYards: number;
  kickReturnTouchdowns: number;
  puntReturns: number;
  puntReturnYards: number;
  puntReturnTouchdowns: number;
}

export interface TeamStatistics {
  _id?: string;
  team: string; // Referencia a Team
  tournament: string; // Referencia a Tournament
  division: string; // Referencia a Division

  // Record
  wins: number;
  losses: number;
  ties: number;

  // Puntos
  pointsFor: number;
  pointsAgainst: number;
  pointsDifferential: number;

  // Estadísticas ofensivas
  offensiveStats: OffensiveTeamStats;

  // Estadísticas defensivas
  defensiveStats: DefensiveTeamStats;

  // Otros
  turnovers: number;
  turnoverDifferential: number;
  penalties: number;
  penaltyYards: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface OffensiveTeamStats {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  touchdowns: number;
  fieldGoals: number;
  firstDowns: number;
  thirdDownConversions: { made: number; attempted: number };
  redZoneEfficiency: { scores: number; attempts: number };
  averageYardsPerGame: number;
  averagePointsPerGame: number;
}

export interface DefensiveTeamStats {
  totalYardsAllowed: number;
  passingYardsAllowed: number;
  rushingYardsAllowed: number;
  touchdownsAllowed: number;
  interceptions: number;
  fumbleRecoveries: number;
  sacks: number;
  safeties: number;
  averageYardsAllowedPerGame: number;
  averagePointsAllowedPerGame: number;
}

export interface Standing {
  _id?: string;
  division: string; // Referencia a Division
  team: string; // Referencia a Team
  position: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifferential: number;
  percentage: number;
  streak?: string; // "W3", "L2", etc.
  lastFiveGames?: string; // "WWLWW"
  homeRecord?: { wins: number; losses: number; ties: number };
  awayRecord?: { wins: number; losses: number; ties: number };
  divisionRecord?: { wins: number; losses: number; ties: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface Venue {
  _id?: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  capacity?: number;
  fieldType: "grass" | "artificial" | "indoor";
  facilities: VenueFacilities;
  availability: VenueAvailability[];
  contact: ContactInfo;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueFacilities {
  parking: boolean;
  restrooms: boolean;
  concessions: boolean;
  seating: boolean;
  lighting: boolean;
  scoreboard: boolean;
  changeRooms: boolean;
  firstAid: boolean;
}

export interface VenueAvailability {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  available: boolean;
  cost?: number;
}

export interface Season {
  _id?: string;
  name: string;
  year: number;
  startDate: Date;
  endDate: Date;
  tournaments: string[]; // Referencias a Tournament
  status: "upcoming" | "active" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de utilidad
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
