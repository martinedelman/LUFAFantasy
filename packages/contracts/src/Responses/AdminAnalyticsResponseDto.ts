export type AdminAnalyticsSubject = "teams" | "players";

export interface AdminAnalyticsTotalsDto {
  entities: number;
  games: number;
  points: number;
  touchdowns: number;
  firstHalfPoints: number;
  secondHalfPoints: number;
  firstHalfScores: number;
  secondHalfScores: number;
  versatilePlayers: number;
  discipline: number;
  penalties: number;
  unsportsmanlike: number;
}

export interface AdminTeamAnalyticsRowDto {
  id: string;
  name: string;
  games: number;
  wins: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  firstHalfPoints: number;
  secondHalfPoints: number;
  firstHalfScores: number;
  secondHalfScores: number;
  topScorerShare: number;
  topScorerName: string;
  discipline: number;
  penalties: number;
  unsportsmanlike: number;
}

export interface AdminPlayerAnalyticsRowDto {
  id: string;
  name: string;
  teamName: string;
  points: number;
  touchdowns: number;
  firstHalfPoints: number;
  secondHalfPoints: number;
  firstHalfScores: number;
  secondHalfScores: number;
  eventVariety: number;
  discipline: number;
  penalties: number;
  unsportsmanlike: number;
}

export interface AdminAnalyticsResponseDto {
  subject: AdminAnalyticsSubject;
  totals: AdminAnalyticsTotalsDto;
  teams: {
    secondHalfScoring: AdminTeamAnalyticsRowDto[];
    offensiveDependence: AdminTeamAnalyticsRowDto[];
    discipline: AdminTeamAnalyticsRowDto[];
  } | null;
  players: {
    secondHalfScoring: AdminPlayerAnalyticsRowDto[];
    versatility: AdminPlayerAnalyticsRowDto[];
    discipline: AdminPlayerAnalyticsRowDto[];
  } | null;
}
