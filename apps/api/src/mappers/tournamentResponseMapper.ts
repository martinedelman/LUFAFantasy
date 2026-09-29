import type { Tournament } from "@lufa/sports/entities/Tournament";
import type { TournamentResponseDto } from "@lufa/contracts";

export function toTournamentResponseDto(tournament: Tournament): TournamentResponseDto {
  return {
    _id: tournament.id,
    name: tournament.name,
    description: tournament.description,
    season: tournament.season,
    year: tournament.year,
    startDate: tournament.startDate.toISOString(),
    endDate: tournament.endDate.toISOString(),
    registrationDeadline: tournament.registrationDeadline?.toISOString(),
    status: tournament.status,
    format: tournament.format,
    playoffCriteria: tournament.playoffCriteria,
    divisions: tournament.divisions,
    participatingTeams: tournament.participatingTeams,
    rules: tournament.rules,
    prizes: tournament.prizes,
    // Mongo documents have no modality; they are all flag.
    modality: tournament.modality || "flag",
    createdAt: tournament.createdAt?.toISOString(),
    updatedAt: tournament.updatedAt?.toISOString(),
  };
}
