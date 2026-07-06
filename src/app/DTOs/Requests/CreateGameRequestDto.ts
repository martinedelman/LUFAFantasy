import type { GamePhase, GameStatus } from "@/entities/Game";

export type GameOfficialAssignmentRole = "referee" | "down_judge" | "side_judge" | "table_judge";

export interface GameOfficialAssignmentRequestDto {
  judgeId: string;
  role: GameOfficialAssignmentRole;
}

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
  phase?: GamePhase;
  week?: number;
  round?: string;
  status?: GameStatus;
  officials?: GameOfficialAssignmentRequestDto[];
}
