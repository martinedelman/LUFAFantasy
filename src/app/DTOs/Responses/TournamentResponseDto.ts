import type {
  PlayoffCriteria,
  TournamentFormat,
  TournamentPrize,
  TournamentRules,
  TournamentStatus,
} from "@/entities/Tournament";

export interface TournamentResponseDto {
  _id?: string;
  name: string;
  description?: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  status: TournamentStatus;
  format: TournamentFormat;
  playoffCriteria?: PlayoffCriteria;
  divisions: unknown[];
  participatingTeams?: unknown[];
  rules?: TournamentRules;
  prizes?: TournamentPrize[];
  createdAt?: string;
  updatedAt?: string;
}
