export interface StandingResponseDto {
  _id?: string;
  division: string;
  team: string;
  tournament: string;
  position: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifferential: number;
  percentage: number;
  streak?: string;
  lastFiveGames?: string;
  createdAt?: string;
  updatedAt?: string;
}
