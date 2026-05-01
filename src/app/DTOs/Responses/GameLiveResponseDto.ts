import type { GameStatus } from "@/entities/Game";
import type { GameScore } from "@/entities/valueObjects/Score";
import type { TeamSummaryResponseDto } from "./TeamSummaryResponseDto";

export interface GameLiveResponseDto {
  _id: string;
  status: GameStatus;
  homeTeam: TeamSummaryResponseDto | null;
  awayTeam: TeamSummaryResponseDto | null;
  tournament: {
    _id: string;
    name: string;
  };
  division: {
    _id: string;
    name: string;
  };
  venue: {
    name: string;
    address: string;
  };
  scheduledDate: string;
  actualStartTime?: string;
  actualEndTime?: string;
  score: GameScore;
  presentPlayers?: {
    home: string[];
    away: string[];
  };
}
