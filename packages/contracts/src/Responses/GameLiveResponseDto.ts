import type { GameStatus } from "../types";
import type { GameScore } from "../types";
import type { GameEventType } from "../types";
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
  playoffSlot?: string;
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
