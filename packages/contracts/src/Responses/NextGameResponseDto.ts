export interface NextGameResponseDto {
  id: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  venue: string;
  scheduledDate: string;
  status: string;
  score: {
    home: number;
    away: number;
  };
}
