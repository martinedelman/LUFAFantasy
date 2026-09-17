export type AdminAnalyticsSubject = "teams" | "players";

export interface AdminAnalyticsTotalsDto {
  entities: number;
  games: number;
  points: number;
  touchdowns: number;
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
  discipline: number;
  penalties: number;
  unsportsmanlike: number;
}

export interface AdminAnalyticsResponseDto {
  subject: AdminAnalyticsSubject;
  totals: AdminAnalyticsTotalsDto;
  teams: {
    performance: AdminTeamAnalyticsRowDto[];
    scoring: AdminTeamAnalyticsRowDto[];
    discipline: AdminTeamAnalyticsRowDto[];
  } | null;
  players: {
    points: AdminPlayerAnalyticsRowDto[];
    touchdowns: AdminPlayerAnalyticsRowDto[];
    discipline: AdminPlayerAnalyticsRowDto[];
  } | null;
}
