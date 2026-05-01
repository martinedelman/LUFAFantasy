import type { GameStatus, GameStatistics } from "@/entities/Game";
import type { GameScore } from "@/entities/valueObjects/Score";

export interface GameResponseDto {
  _id?: string;
  tournament: string;
  division: string;
  homeTeam: string | null;
  awayTeam: string | null;
  venue: {
    name: string;
    address: string;
  };
  scheduledDate: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: GameStatus;
  week?: number;
  round?: string;
  score: GameScore;
  statistics: GameStatistics;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
