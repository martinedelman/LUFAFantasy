import type { GamePhase, GameStatus, GameStatistics, Modality } from "../types";
import type { GameScore } from "../types";
import type { GameEventResponseDto } from "./GameLiveResponseDto";
import type { PlayerSummaryResponseDto } from "./PlayerSummaryResponseDto";
import type { TeamSummaryResponseDto } from "./TeamSummaryResponseDto";

export interface GameResponseDto {
  _id?: string;
  tournament:
    | string
    | {
        _id: string;
        name: string;
        year: number;
        modality: Modality;
      };
  division:
    | string
    | {
        _id: string;
        name: string;
        category: string;
      };
  homeTeam: TeamSummaryResponseDto | string | null;
  awayTeam: TeamSummaryResponseDto | string | null;
  venue: {
    name: string;
    address: string;
  };
  scheduledDate: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: GameStatus;
  phase: GamePhase;
  playoffSlot?: string;
  week?: number;
  round?: string;
  officials: Array<{
    judgeId?: string;
    name: string;
    role: "referee" | "down_judge" | "side_judge" | "table_judge";
  }>;
  score: GameScore;
  statistics: GameStatistics;
  presentPlayers?: {
    home: Array<PlayerSummaryResponseDto | string>;
    away: Array<PlayerSummaryResponseDto | string>;
  };
  events: GameEventResponseDto[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
