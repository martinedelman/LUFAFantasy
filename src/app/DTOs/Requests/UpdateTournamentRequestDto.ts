import type { TournamentFormat, TournamentPrize, TournamentRules, TournamentStatus } from "@/entities/Tournament";

export interface UpdateTournamentRequestDto {
  name: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  format: TournamentFormat;
  description?: string;
  registrationDeadline?: string;
  divisions?: string[];
  rules?: TournamentRules;
  prizes?: TournamentPrize[];
}
