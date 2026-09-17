export type AdminAnalyticsSubject = "teams" | "players";

export interface AdminAnalyticsTotalsDto {
  entities: number;
  games: number;
  points: number;
  touchdowns: number;
  latePoints: number;
  defensiveDisruptions: number;
  interceptions: number;
  sacks: number;
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
  latePoints: number;
  defensiveDisruptions: number;
  interceptions: number;
  sacks: number;
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
  latePoints: number;
  defensiveDisruptions: number;
  interceptions: number;
  sacks: number;
  discipline: number;
  penalties: number;
  unsportsmanlike: number;
}

export interface AdminAnalyticsResponseDto {
  subject: AdminAnalyticsSubject;
  totals: AdminAnalyticsTotalsDto;
  teams: {
    lateScoring: AdminTeamAnalyticsRowDto[];
    defense: AdminTeamAnalyticsRowDto[];
    discipline: AdminTeamAnalyticsRowDto[];
  } | null;
  players: {
    lateScoring: AdminPlayerAnalyticsRowDto[];
    defense: AdminPlayerAnalyticsRowDto[];
    discipline: AdminPlayerAnalyticsRowDto[];
  } | null;
}
