export type GameModality = "flag" | "tackle";

export interface NextGameResponseDto {
  id: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  modality: GameModality;
  venue: string;
  venueAddress?: string;
  scheduledDate: string;
  status: string;
  score: {
    home: number;
    away: number;
  };
}
