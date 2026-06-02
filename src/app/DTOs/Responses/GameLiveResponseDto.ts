import type { GameStatus } from "@/entities/Game";
import type { GameScore } from "@/entities/valueObjects/Score";
import type { GameEventType } from "@/entities/Game";
import type { PlayerSummaryResponseDto } from "./PlayerSummaryResponseDto";
import type { TeamSummaryResponseDto } from "./TeamSummaryResponseDto";

export interface GameEventResponseDto {
  _id?: string;
  quarter: number;
  time?: string;
  type: GameEventType;
  team: TeamSummaryResponseDto | string;
  player?: PlayerSummaryResponseDto | string;
  description?: string;
  yards?: number;
  points?: number;
  details?: unknown;
}

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
  week?: number;
  round?: string;
  officials: Array<{
    judgeId?: string;
    name: string;
    role: "referee" | "down_judge" | "side_judge" | "table_judge";
  }>;
  score: GameScore;
  events: GameEventResponseDto[];
  presentPlayers?: {
    home: Array<PlayerSummaryResponseDto | string>;
    away: Array<PlayerSummaryResponseDto | string>;
  };
}
