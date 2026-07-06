import type { GamePhase, GameStatus } from "@/entities/Game";
import type { GameOfficialAssignmentRequestDto } from "./CreateGameRequestDto";

export interface UpdateGameRequestDto {
  id: string;
  homeTeam?: string | null;
  awayTeam?: string | null;
  scheduledDate?: string;
  status?: GameStatus;
  phase?: GamePhase;
  week?: number;
  round?: string;
  officials?: GameOfficialAssignmentRequestDto[];
}
