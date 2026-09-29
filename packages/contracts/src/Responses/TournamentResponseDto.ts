import type {
  Modality,
  PlayoffCriteria,
  TournamentFormat,
  TournamentPrize,
  TournamentRules,
  TournamentStatus,
} from "../types";

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
  modality: Modality;
  createdAt?: string;
  updatedAt?: string;
}
