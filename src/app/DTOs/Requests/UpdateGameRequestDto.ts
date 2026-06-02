import type { GameStatus } from "@/entities/Game";
import type { GameOfficialAssignmentRequestDto } from "./CreateGameRequestDto";

export interface UpdateGameRequestDto {
  id: string;
  homeTeam?: string | null;
  awayTeam?: string | null;
  scheduledDate?: string;
  status?: GameStatus;
  week?: number;
  round?: string;
  officials?: GameOfficialAssignmentRequestDto[];
}
