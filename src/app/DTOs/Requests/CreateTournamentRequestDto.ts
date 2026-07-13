import type {
  PlayoffCriteria,
  TournamentFormat,
  TournamentPrize,
  TournamentRules,
  TournamentStatus,
} from "@/entities/Tournament";

export interface CreateTournamentRequestDto {
  name: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  format: TournamentFormat;
  playoffCriteria?: PlayoffCriteria;
  description?: string;
  registrationDeadline?: string;
  divisions?: string[];
  participatingTeams?: string[];
  rules?: TournamentRules;
  prizes?: TournamentPrize[];
}
