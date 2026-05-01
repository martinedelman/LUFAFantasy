import type { GameStatus } from "@/entities/Game";

export interface CreateGameRequestDto {
  tournament: string;
  division: string;
  homeTeam?: string | null;
  awayTeam?: string | null;
  venue: {
    name: string;
    address: string;
  };
  scheduledDate: string;
  week?: number;
  round?: string;
  status?: GameStatus;
}
